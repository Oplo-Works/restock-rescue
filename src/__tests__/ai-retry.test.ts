import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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

function chatResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(payload) } }],
    }),
  };
}

const fetchMock = vi.fn();

describe("ai.ts irreparable-branch retry (mocked Meta Model API)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.MODEL_API_KEY = "test-key-not-real";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("makes one fresh AI call with the failure reason after validate+repair fail, then validates the new proposal", async () => {
    fetchMock
      .mockResolvedValueOnce(chatResponse(IRREPARABLE))
      .mockResolvedValueOnce(chatResponse(VALID));

    const basket = await generateValidatedRecommendation(
      150,
      "Prioritize earrings, but I need at least one necklace for the display table."
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(firstBody.model).toBe("muse-spark-1.3");
    expect(firstBody.temperature).toBeUndefined();
    const retryBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    const retryContents = String(retryBody.messages[1].content);
    expect(retryContents).toContain("earring_share_too_low");
    expect(basket.source).toBe("ai");
    expect(basket.totalCents).toBe(13980);
    const logged = (console.error as any).mock.calls
      .map((c: unknown[]) => String(c[0]))
      .join("\n");
    expect(logged).toContain("validate_failed");
    expect(logged).toContain("repair_failed");
  });

  it("falls back (labeled) when both AI calls throw", async () => {
    fetchMock.mockRejectedValue(new Error("503 unavailable"));

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
