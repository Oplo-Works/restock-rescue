import { describe, expect, it, vi, beforeEach } from "vitest";

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
  Type: {
    OBJECT: "OBJECT",
    ARRAY: "ARRAY",
    STRING: "STRING",
    INTEGER: "INTEGER",
  },
  Schema: class {},
}));

import { generateValidatedRecommendation } from "../lib/ai";

const IRREPARABLE = {
  // All necklaces on a "prioritize earrings + necklace" brief: earring share
  // 0% fails validation, and repair cannot fix it within budget/category rules.
  selected: [
    { skuId: "N-01", packs: 1, reason: "14 sold, 3 in stock" },
    { skuId: "N-02", packs: 1, reason: "9 sold, 6 in stock" },
    { skuId: "N-03", packs: 1, reason: "6 sold, 8 in stock" },
  ],
  skipped: [],
};

const VALID = {
  selected: [
    { skuId: "E-02", packs: 2, reason: "22 sold, 0 in stock" },
    { skuId: "E-01", packs: 1, reason: "18 sold, 2 in stock" },
    { skuId: "E-05", packs: 1, reason: "12 sold, 1 in stock" },
    { skuId: "N-01", packs: 1, reason: "14 sold, 3 in stock" },
  ],
  skipped: [],
};

describe("ai.ts irreparable-branch retry (mocked Gemini)", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    process.env.GEMINI_API_KEY = "test-key-not-real";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("makes one fresh Gemini call with the failure reason after validate+repair fail, then validates the new proposal", async () => {
    generateContentMock
      .mockResolvedValueOnce({ text: JSON.stringify(IRREPARABLE) })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID) });

    const basket = await generateValidatedRecommendation(
      150,
      "Prioritize earrings, but I need at least one necklace for the display table."
    );

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    const retryContents = String(
      generateContentMock.mock.calls[1][0].contents
    );
    expect(retryContents).toContain("earring_share_too_low");
    expect(basket.source).toBe("ai");
    expect(basket.totalCents).toBe(13980);
    const logged = (console.error as any).mock.calls
      .map((c: unknown[]) => String(c[0]))
      .join("\n");
    expect(logged).toContain("validate_failed");
    expect(logged).toContain("repair_failed");
  });

  it("falls back (labeled) when both Gemini calls throw", async () => {
    generateContentMock.mockRejectedValue(new Error("503 unavailable"));

    const basket = await generateValidatedRecommendation(
      250,
      "Prioritize earrings. I need to restock for this weekend."
    );

    expect(basket.source).toBe("fallback");
    expect(basket.totalCents).toBe(15180);
    const logged = (console.error as any).mock.calls
      .map((c: unknown[]) => String(c[0]))
      .join("\n");
    expect(logged).toContain("ai_call_1_failed");
    expect(logged).toContain("ai_call_2_retry_failed");
  });
});
