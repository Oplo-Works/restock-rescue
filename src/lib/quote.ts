import crypto from "crypto";
import { CATALOG } from "./data";
import { SignedQuotePayload } from "./types";

export const PACK_SIZE = 6;

export interface QuoteRecord {
  quoteId: string;
  budgetCents: number;
  totalCents: number;
  lines: Array<{ sku: string; packs: number }>;
  paypalOrderId?: string;
  used: boolean;
  captureId?: string;
  capturedReceipt?: Record<string, unknown>;
  createdAt: number;
}

const globalForQuotes = globalThis as unknown as {
  quoteStore?: Map<string, QuoteRecord>;
  rateLimitStore?: Map<string, number[]>;
};

export const quoteStore: Map<string, QuoteRecord> =
  globalForQuotes.quoteStore ?? new Map<string, QuoteRecord>();
globalForQuotes.quoteStore = quoteStore;

export const rateLimitStore: Map<string, number[]> =
  globalForQuotes.rateLimitStore ?? new Map<string, number[]>();
globalForQuotes.rateLimitStore = rateLimitStore;

export function getSigningSecret(): string {
  const secret = process.env.BASKET_SIGNING_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      "CRITICAL: BASKET_SIGNING_SECRET environment variable is missing or shorter than 32 characters."
    );
  }
  return secret;
}

export function signQuote(params: {
  budgetCents: number;
  lines: Array<{ sku: string; packs: number }>;
  totalCents: number;
  nowSeconds?: number;
}): { quote: SignedQuotePayload; token: string } {
  const secret = getSigningSecret();
  const iat = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  const sortedLines = [...params.lines]
    .map((l) => ({ sku: l.sku, packs: l.packs }))
    .sort((a, b) => a.sku.localeCompare(b.sku));

  const quote: SignedQuotePayload = {
    v: 1,
    quoteId: crypto.randomUUID(),
    budgetCents: params.budgetCents,
    lines: sortedLines,
    totalCents: params.totalCents,
    iat,
    exp: iat + 900,
  };

  const payloadStr = Buffer.from(JSON.stringify(quote), "utf8").toString(
    "base64url"
  );
  const sigStr = crypto
    .createHmac("sha256", secret)
    .update(payloadStr)
    .digest("base64url");

  quoteStore.set(quote.quoteId, {
    quoteId: quote.quoteId,
    budgetCents: quote.budgetCents,
    totalCents: quote.totalCents,
    lines: sortedLines,
    used: false,
    createdAt: iat,
  });

  return { quote, token: `${payloadStr}.${sigStr}` };
}

export function verifyQuote(
  token: string,
  nowSeconds?: number
): SignedQuotePayload {
  const secret = getSigningSecret();
  if (!token || typeof token !== "string") {
    throw new Error("invalid_token_format");
  }
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("invalid_token_format");
  }
  const [payloadStr, providedSig] = parts;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payloadStr)
    .digest("base64url");

  const providedBuf = Buffer.from(providedSig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    throw new Error("signature_mismatch");
  }

  let parsed: SignedQuotePayload;
  try {
    parsed = JSON.parse(
      Buffer.from(payloadStr, "base64url").toString("utf8")
    ) as SignedQuotePayload;
  } catch {
    throw new Error("invalid_token_payload");
  }

  if (parsed.v !== 1 || !parsed.quoteId || !Array.isArray(parsed.lines)) {
    throw new Error("invalid_token_schema");
  }

  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  if (now > parsed.exp) {
    throw new Error("quote_expired");
  }

  if (
    !Number.isInteger(parsed.budgetCents) ||
    parsed.budgetCents <= 0 ||
    parsed.budgetCents > 1_000_000
  ) {
    throw new Error("invalid_budget");
  }

  if (parsed.lines.length < 3 || parsed.lines.length > 6) {
    throw new Error("invalid_item_count");
  }

  // Recompute total exclusively from CATALOG
  const seen = new Set<string>();
  let recomputedTotalCents = 0;
  for (const line of parsed.lines) {
    const sku = CATALOG.get(line.sku);
    if (!sku) throw new Error(`unknown_sku:${line.sku}`);
    if (seen.has(line.sku)) throw new Error(`duplicate_sku:${line.sku}`);
    seen.add(line.sku);
    if (!Number.isInteger(line.packs) || line.packs < 1 || line.packs > 2) {
      throw new Error("invalid_packs");
    }
    recomputedTotalCents += line.packs * PACK_SIZE * sku.priceCents;
  }

  if (recomputedTotalCents !== parsed.totalCents) {
    throw new Error("total_mismatch");
  }
  if (recomputedTotalCents > parsed.budgetCents) {
    throw new Error("budget_exceeded");
  }

  return parsed;
}

export function checkRateLimit(ip: string, maxPerMinute = 10): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const recent = (rateLimitStore.get(ip) ?? []).filter((t) => t > windowStart);
  if (recent.length >= maxPerMinute) {
    rateLimitStore.set(ip, recent);
    return false;
  }
  recent.push(now);
  rateLimitStore.set(ip, recent);
  return true;
}
