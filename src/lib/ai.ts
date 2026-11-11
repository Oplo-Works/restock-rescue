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

// Plain JSON Schema for Meta Model API structured output
// (response_format: { type: "json_schema" }) — same basket shape the
// validator expects from the previous provider.
const BASKET_JSON_SCHEMA = {
  type: "object",
  properties: {
    selected: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skuId: { type: "string" },
          packs: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["skuId", "packs", "reason"],
      },
    },
    skipped: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skuId: { type: "string" },
          reason: { type: "string" },
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

// 30s: matches the recording runbook rule ("generation over ~30s -> abandon
// the take"); a hung AI call fails fast into retry/fallback instead of
// hanging until the platform limit.
const AI_TIMEOUT_MS = 30_000;

// Meta Model API (OpenAI-compatible Chat Completions). Model fixed by
// product decision; endpoint/auth per https://dev.meta.ai/docs —
// POST https://api.meta.ai/v1/chat/completions, Bearer MODEL_API_KEY.
const META_MODEL_API_URL = "https://api.meta.ai/v1/chat/completions";
const META_MODEL = "muse-spark-1.3";

function describeAiError(err: unknown): string {
  const e = err as {
    name?: unknown;
    message?: unknown;
    status?: unknown;
    code?: unknown;
    response?: { status?: unknown };
  } | null;
  const name = typeof e?.name === "string" ? e.name : "Error";
  const status = e?.status ?? e?.response?.status ?? e?.code;
  const message =
    typeof e?.message === "string" ? e.message.slice(0, 300) : String(err).slice(0, 300);
  return `name=${name}${status !== undefined ? ` status=${String(status)}` : ""} message=${message}`;
}

function logAiFailure(label: string, err: unknown): void {
  // Error messages / validation codes only — never the API key or prompt.
  console.error(`[restock-ai] ${label}: ${describeAiError(err)}`);
}

async function callModelOnce(
  budgetDollars: number,
  instruction: string,
  retryHint?: string
): Promise<unknown> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) {
    throw new Error("Missing MODEL_API_KEY");
  }

  const res = await fetch(META_MODEL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: META_MODEL,
      // Spark reasons by default at "high", which blows the 30s timeout on
      // the full catalog prompt; "minimal" matches the previous provider's
      // small thinking budget. The server validator remains the safety net.
      reasoning_effort: "minimal",
      messages: [
        { role: "developer", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(budgetDollars, instruction, retryHint),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "RestockBasket", schema: BASKET_JSON_SCHEMA },
      },
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = "";
    try {
      const errBody = (await res.json()) as {
        error?: { message?: string; code?: string; type?: string };
      };
      detail = errBody?.error?.message || errBody?.error?.code || "";
    } catch {
      // Non-JSON error body — status alone is enough for the failure log.
    }
    const err = new Error(
      `Meta Model API request failed (${res.status})${detail ? `: ${detail}` : ""}`
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from Meta Model API");
  return JSON.parse(text);
}

interface ProposalAttempt {
  basket: ValidatedBasket | null;
  /** Why validate+repair rejected the proposal (null when basket is set). */
  failure: string | null;
  /** True only when a proposal existed but validate AND repair both failed. */
  irreparable: boolean;
}

function attemptProposal(
  rawJson: unknown,
  budgetDollars: number,
  constraints: ReturnType<typeof parseConstraints>
): ProposalAttempt {
  if (!rawJson || typeof rawJson !== "object") {
    return { basket: null, failure: null, irreparable: false };
  }
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

  if (!candidateSelected) {
    return { basket: null, failure: null, irreparable: false };
  }

  let validationError: unknown = null;
  // 1. Direct validation pass
  try {
    return {
      basket: validateBasket(
        candidateSelected,
        candidateSkipped,
        budgetDollars,
        constraints,
        { source: "ai", repaired: false }
      ),
      failure: null,
      irreparable: false,
    };
  } catch (err) {
    validationError = err;
    logAiFailure("validate_failed", err);
  }

  // 2. Single deterministic repair attempt
  try {
    return {
      basket: repairBasket(
        candidateSelected,
        candidateSkipped,
        budgetDollars,
        constraints
      ),
      failure: null,
      irreparable: false,
    };
  } catch (err) {
    logAiFailure("repair_failed", err);
    return {
      basket: null,
      failure: `validation: ${describeAiError(validationError)}; repair: ${describeAiError(err)}`,
      irreparable: true,
    };
  }
}

export async function generateValidatedRecommendation(
  budgetDollars: number,
  instruction: string
): Promise<ValidatedBasket> {
  const constraints = parseConstraints(instruction);

  let rawJson: unknown = null;
  try {
    rawJson = await callModelOnce(budgetDollars, instruction);
  } catch (err) {
    logAiFailure("ai_call_1_failed", err);
    try {
      rawJson = await callModelOnce(
        budgetDollars,
        instruction,
        "Return ONLY JSON, no markdown."
      );
    } catch (retryErr) {
      logAiFailure("ai_call_2_retry_failed", retryErr);
      rawJson = null;
    }
  }

  const attempt = attemptProposal(rawJson, budgetDollars, constraints);
  if (attempt.basket) return attempt.basket;

  // 3. Irreparable branch only: ONE fresh AI sample told WHY the previous
  // proposal failed, then through the same validate -> repair chain.
  // Total AI calls per request stays <= 3.
  if (attempt.irreparable) {
    try {
      const retryJson = await callModelOnce(
        budgetDollars,
        instruction,
        `Your previous basket was rejected by the server validator (${attempt.failure}). Return a NEW JSON basket that fixes this: use ONLY catalog SKUs, 3-6 distinct SKUs, packs integer 1 or 2, include the required category if the instruction names one, keep at least 60% of packs as earrings when asked to prioritize earrings, and prefer cheaper lines to stay under budget. Return ONLY JSON, no markdown.`
      );
      const retryAttempt = attemptProposal(
        retryJson,
        budgetDollars,
        constraints
      );
      if (retryAttempt.basket) return retryAttempt.basket;
    } catch (err) {
      logAiFailure("ai_call_3_irreparable_retry_failed", err);
    }
  }

  // 4. Explicit deterministic fallback (must also pass validateBasket)
  return buildFallbackBasket(budgetDollars, constraints);
}
