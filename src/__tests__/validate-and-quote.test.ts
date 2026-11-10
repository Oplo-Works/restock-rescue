import { describe, expect, it, beforeAll } from "vitest";
import { PRESET_FIXTURES, parseConstraints } from "../lib/data";
import {
  buildFallbackBasket,
  repairBasket,
  validateBasket,
} from "../lib/validate";
import { signQuote, verifyQuote } from "../lib/quote";

beforeAll(() => {
  process.env.BASKET_SIGNING_SECRET =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
});

describe("Restock Rescue v3 — Validator, Repair, Fallback & Signed Quote Tests", () => {
  it("Test 1: Scenario A fixture validates to $180.00 (18000 cents), 42 units, 7 packs, 72.0% used, 71.4% earrings", () => {
    const fix = PRESET_FIXTURES["preset-a"];
    const res = validateBasket(
      fix.selected,
      fix.skipped,
      fix.budgetDollars,
      parseConstraints(fix.instruction)
    );
    expect(res.totalCents).toBe(18000);
    expect(res.remainingCents).toBe(7000);
    expect(res.totalUnits).toBe(42);
    expect(res.totalPacks).toBe(7);
    expect(res.budgetUsedPct).toBe(72.0);
    expect(res.earringPackSharePct).toBe(71.4);
  });

  it("Test 2: Scenario B fixture validates to $139.80 (13980 cents), 30 units, 5 packs, 93.2% used, 80.0% earrings", () => {
    const fix = PRESET_FIXTURES["preset-b"];
    const res = validateBasket(
      fix.selected,
      fix.skipped,
      fix.budgetDollars,
      parseConstraints(fix.instruction)
    );
    expect(res.totalCents).toBe(13980);
    expect(res.remainingCents).toBe(1020);
    expect(res.totalUnits).toBe(30);
    expect(res.totalPacks).toBe(5);
    expect(res.budgetUsedPct).toBe(93.2);
    expect(res.earringPackSharePct).toBe(80.0);
  });

  it("Test 3 (REQUIRED): Over-budget AI response triggers deterministic repair or fallback and never produces an invalid basket", () => {
    // Over-budget basket on $150 budget: E-02x2 ($50.40) + E-01x2 ($42.00) + E-05x1 ($23.40) + N-01x1 ($45.00) + R-01x1 ($19.20) = $180.00 > $150.00
    // Lowest-ranked selected line is R-01 (13 / 8 = 1.625). Dropping R-01 leaves $160.80 (still > $150).
    // Next, N-01 (ratio 3.5) is protected (required necklace). E-01 and E-05 tie at 6.0; tie-break last in AI array picks E-05, which is 1 pack, so it is dropped → $137.40 ≤ $150.
    const overBudgetSelected = PRESET_FIXTURES["preset-a"].selected;
    const constraints = parseConstraints(
      "Prioritize earrings, but I need at least one necklace for the display table."
    );
    const repaired = repairBasket(overBudgetSelected, [], 150, constraints);
    expect(repaired.totalCents).toBeLessThanOrEqual(15000);
    expect(repaired.repaired).toBe(true);
    expect(repaired.repairNote).toBe("Adjusted to fit budget");
    expect(
      repaired.selected.some((s) => s.category === "Necklaces")
    ).toBe(true);
    expect(repaired.earringPackSharePct).toBeGreaterThanOrEqual(60);
  });

  it("Test 4: Fallback for Scenario A produces $151.80 (15180 cents), 30 units (E-02, E-01, E-05, N-01, B-03 at 1 pack each)", () => {
    const fbA = buildFallbackBasket(
      250,
      parseConstraints("Prioritize earrings. I need to restock for this weekend.")
    );
    expect(fbA.source).toBe("fallback");
    expect(fbA.sourceBadge).toBe("Deterministic fallback — AI unavailable");
    expect(fbA.selected.map((s) => s.skuId)).toEqual([
      "E-02",
      "E-01",
      "E-05",
      "N-01",
      "B-03",
    ]);
    expect(fbA.totalCents).toBe(15180); // 2520 + 2100 + 2340 + 4500 + 3720
    expect(fbA.totalUnits).toBe(30);
  });

  it("Test 5: Fallback for Scenario B produces $149.40 (14940 cents), 30 units (E-02, E-01, E-05, N-01, E-03 at 1 pack each)", () => {
    const fbB = buildFallbackBasket(
      150,
      parseConstraints(
        "Prioritize earrings, but I need at least one necklace for the display table."
      )
    );
    expect(fbB.source).toBe("fallback");
    expect(fbB.selected.map((s) => s.skuId)).toEqual([
      "E-02",
      "E-01",
      "E-05",
      "N-01",
      "E-03",
    ]);
    expect(fbB.totalCents).toBe(14940); // 2520 + 2100 + 2340 + 4500 + 3480
    expect(fbB.totalUnits).toBe(30);
  });

  it("Test 6: Tampering with packs in a signed quote payload throws signature_mismatch", () => {
    const { token, quote } = signQuote({
      budgetCents: 15000,
      lines: [
        { sku: "E-01", packs: 1 },
        { sku: "E-02", packs: 2 },
        { sku: "E-05", packs: 1 },
        { sku: "N-01", packs: 1 },
      ],
      totalCents: 13980,
    });
    const [payloadB64, sigB64] = token.split(".");
    const decoded = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    );
    decoded.lines[0].packs = 2; // Tamper E-01 from 1 pack to 2 packs
    const tamperedPayloadB64 = Buffer.from(
      JSON.stringify(decoded),
      "utf8"
    ).toString("base64url");
    const tamperedToken = `${tamperedPayloadB64}.${sigB64}`;

    expect(() => verifyQuote(tamperedToken, quote.iat + 10)).toThrow(
      "signature_mismatch"
    );
  });
});
