import { NextRequest, NextResponse } from "next/server";
import { PRESET_FIXTURES, parseConstraints } from "@/lib/data";
import { checkRateLimit, signQuote } from "@/lib/quote";
import { validateBasket } from "@/lib/validate";
import { generateValidatedRecommendation } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    if (!checkRateLimit(ip, 10)) {
      return NextResponse.json(
        {
          error:
            "Rate limit reached (max 10 requests per minute). Please wait a moment and try again.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const presetKey = body?.preset as "preset-a" | "preset-b" | undefined;

    if (presetKey && PRESET_FIXTURES[presetKey]) {
      const fixture = PRESET_FIXTURES[presetKey];
      const constraints = parseConstraints(fixture.instruction);
      const basket = validateBasket(
        fixture.selected,
        fixture.skipped,
        fixture.budgetDollars,
        constraints,
        { source: "preset", repaired: false }
      );
      const { quote, token } = signQuote({
        budgetCents: basket.budgetCents,
        lines: basket.selected.map((s) => ({ sku: s.skuId, packs: s.packs })),
        totalCents: basket.totalCents,
      });

      return NextResponse.json({ basket, quote, token });
    }

    const budgetDollars = Number(body?.budget);
    const instruction = String(body?.instruction ?? "").slice(0, 300);

    const basket = await generateValidatedRecommendation(
      budgetDollars,
      instruction
    );
    const { quote, token } = signQuote({
      budgetCents: basket.budgetCents,
      lines: basket.selected.map((s) => ({ sku: s.skuId, packs: s.packs })),
      totalCents: basket.totalCents,
    });

    return NextResponse.json({ basket, quote, token });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err?.message ??
          "Could not build a valid restock basket for these constraints. Please adjust your budget or try again.",
      },
      { status: 422 }
    );
  }
}
