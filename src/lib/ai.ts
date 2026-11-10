import { GoogleGenAI, Type, Schema } from "@google/genai";
import { z } from "zod";
import { CATALOG_ITEMS, parseConstraints } from "./data";
import {
  buildFallbackBasket,
  repairBasket,
  validateBasket,
} from "./validate";
import { ValidatedBasket } from "./types";

export const SYSTEM_PROMPT = `You are a wholesale buying assistant for an independent fashion jewelry boutique. Recommend a restock basket from the supplied catalog. You are NOT a calculator. You MUST NOT calculate totals or prices. You will output ONLY valid JSON matching the schema below.
1. Use ONLY SKUs from the catalog. Never invent a SKU.
2. \`packs\` must be an integer, 1 or 2. Each pack = 6 units.
3. Prefer SKUs with high \`soldLast14Days\` AND low \`stockOnHand\` (stockout risk).
4. Respect the owner's instruction as a hard priority. "Prioritize earrings" means at least 60% of packs (pack count, not budget) should be earrings.
5. Recommend 3–6 distinct SKUs. Do not recommend more than 6.
6. If a SKU has \`stockOnHand >= 10\` and \`soldLast14Days < 8\`, do not recommend it unless the owner explicitly asks for it.
7. For each selected item, give a \`reason\` in under 15 words that cites a specific number from the data (e.g. "22 sold, 0 in stock"). Do not include dollar amounts or totals in reasons — the server fills in prices.
8. For \`skipped\`, choose 0–3 SKUs that a reasonable buyer would consider, and explain in under 20 words why they were cut (budget, stock coverage, or higher-priority items). A skipped SKU must never also be selected.
9. The server enforces the budget: any basket over budget is repaired or rejected. Aim under budget by preferring cheaper lines when options are close — do not compute totals.`;

export const AiBasketZodSchema = z.object({
  selected: z
    .array(
      z.object({
        skuId: z.string(),
        packs: z.number().int().min(1).max(2),
        reason: z.string().max(120),
      })
    )
    .min(3)
    .max(6),
  skipped: z
    .array(
      z.object({
        skuId: z.string(),
        reason: z.string().max(120),
      })
    )
    .min(0)
    .max(3),
});

const GEMINI_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    selected: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skuId: { type: Type.STRING },
          packs: { type: Type.INTEGER },
          reason: { type: Type.STRING },
        },
        required: ["skuId", "packs", "reason"],
      },
    },
    skipped: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skuId: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ["skuId", "reason"],
      },
    },
  },
  required: ["selected", "skipped"],
};

function buildUserPrompt(
  budgetDollars: number,
  instruction: string,
  retryHint?: string
): string {
  const budgetCents = Math.round(budgetDollars * 100);
  const constraints = parseConstraints(instruction);
  const catalogForPrompt = CATALOG_ITEMS.map((c) => ({
    skuId: c.skuId,
    name: c.name,
    category: c.category,
    onePackCostCents: c.priceCents * 6,
    stockOnHand: c.stockOnHand,
    soldLast14Days: c.soldLast14Days,
  }));

  return JSON.stringify({
    budgetCents,
    ownerInstruction: instruction,
    parsedHardConstraints: constraints,
    catalog: catalogForPrompt,
    ...(retryHint ? { retryInstruction: retryHint } : {}),
  });
}

async function callGeminiOnce(
  budgetDollars: number,
  instruction: string,
  retryHint?: string
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  const response = await ai.models.generateContent({
    model: modelName,
    contents: buildUserPrompt(budgetDollars, instruction, retryHint),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      thinkingConfig: { thinkingBudget: 256 },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  return JSON.parse(text);
}

export async function generateValidatedRecommendation(
  budgetDollars: number,
  instruction: string
): Promise<ValidatedBasket> {
  const constraints = parseConstraints(instruction);

  let rawJson: unknown = null;
  try {
    rawJson = await callGeminiOnce(budgetDollars, instruction);
  } catch {
    try {
      rawJson = await callGeminiOnce(
        budgetDollars,
        instruction,
        "Return ONLY JSON, no markdown."
      );
    } catch {
      rawJson = null;
    }
  }

  if (rawJson && typeof rawJson === "object") {
    const parsed = AiBasketZodSchema.safeParse(rawJson);
    const candidateSelected = parsed.success
      ? parsed.data.selected
      : Array.isArray((rawJson as any).selected)
      ? (rawJson as any).selected
      : null;
    const candidateSkipped = parsed.success
      ? parsed.data.skipped
      : Array.isArray((rawJson as any).skipped)
      ? (rawJson as any).skipped
      : [];

    if (candidateSelected) {
      // 1. Direct validation pass
      try {
        return validateBasket(
          candidateSelected,
          candidateSkipped,
          budgetDollars,
          constraints,
          { source: "ai", repaired: false }
        );
      } catch {
        // 2. Single deterministic repair attempt
        try {
          return repairBasket(
            candidateSelected,
            candidateSkipped,
            budgetDollars,
            constraints
          );
        } catch {
          // Fall through to deterministic fallback
        }
      }
    }
  }

  // 3. Explicit deterministic fallback (must also pass validateBasket)
  return buildFallbackBasket(budgetDollars, constraints);
}
