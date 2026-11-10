# Restock Rescue — FINAL Build Plan (v3) — 2026-11-10

**Status: FINAL AUTHORITATIVE BUILD PLAN (v3 — Self-Contained Execution Document). VERIFIED BY 429 — GO.**
**Submission Deadline:** Thursday, November 12, 2026, 3:00 PM ET
**Internal Target Submit:** Thursday, November 12, 2026, 12:00 PM ET
**Hard Stop Building Gate:** Thursday, November 12, 2026, 10:00 AM ET
**Builder:** Minkyu Park (solo builder, full-time day job; build windows: Tuesday evening + Wednesday evening + Thursday morning)
**Target Prize:** Best Use of Agentic Commerce ($5,000)
**Stack:** Next.js 14+ (App Router), TypeScript, React, Tailwind CSS, @google/genai, @paypal/react-paypal-js, zod, vitest. No database.

**Source:** Written by Gemini (Argon, High thinking) 2026-11-10 06:20–06:35 ET from the v3 brief (`~/workspace/paypal-hackathon-restock-rescue-plan-v3-brief-gemini.md`, = v2 plan + all adopted fixes from GPT, Claude, Perplexity, Muse, Grok ×2). Gemini chat: cloud browser, signed in as Minkyu Park (oploworks@gmail.com).

**Verifier corrections by 429 (2026-11-10, applied in this file — all mechanical, no decision changed):**
1. §2.2 catalog table "Fallback Rank" column was off by one for ranks 8–16 (R-01 #8→#9, N-02 #9→#10, E-04 #10→#11, N-03 #11→#12, B-02 #12→#13, R-02 #13→#14, H-01 #14→#15, S-01 #15→#16; H-02 cell had a messy self-correction note, now clean #8). The footnote rank order was already correct; the table now matches it. Top-5 fallback order was correct in both and is unchanged.
2. §8 Wednesday label "Sprint 2 (~5.5h)" → "(~6.0h)": the steps sum to 2.0+1.5+0.5+0.5+1.5 = 6.0h. (Same slip existed in v2.)
3. §4.6 Test 3 comment corrected to the actual repair trace: drop R-01 → $160.80 (still over), N-01 protected (required necklace), E-01/E-05 tie at 6.0, tie-break last in array picks E-05 (1 pack) → dropped → $137.40 ≤ $150. The test's assertions were already correct and are unchanged.
4. §4.3 earring-share prose corrected to match the code: checked as `earringPacks / totalPacks >= minEarringPackShare` with a 1e-9 epsilon (the prose had claimed integer cross-multiplication).

**Verification result (429, 2026-11-10):** arithmetic PASS (A $180.00, B $139.80, fallback $151.80 / $149.40, all ratios, shares, percentages — recomputed); PayPal bodies PASS (intent CAPTURE, item_total, unit quantities, idempotency `${quoteId}:create` / `:capture`, ORDER_ALREADY_CAPTURED path); model/SDK PASS (gemini-3.8-flash via @google/genai, JSON mode); brand PASS (Northstar only, no La Radiant); language rules PASS (signed quote = server issuance + integrity only; "valid basket OR error state"); §7 checklist PASS (16 items); schedule PASS (45-min PayPal gate first, stop Thu 10:00 AM). **GO — build from this document.**

## §0 Decisions & One-Line Rationales

| # | Decision Area | Final v3 Decision | One-Line Reason |
|---|---|---|---|
| 1 | Fictional merchant brand | Northstar Jewelry Supply (Wholesale Division) | Reads like a realistic B2B jewelry wholesaler while maintaining zero overlap with any real employer brand or proprietary data. |
| 2 | Synthetic data disclosure | Label all catalog, stock, and sales numbers synthetic for demo only | Protects employer boundaries and tells judges explicitly in the header, footer, README, and video that all figures are seeded fixtures. |
| 3 | Runtime AI model & SDK | gemini-3.8-flash via @google/genai (fallback: gemini-3.5-flash-lite) | gemini-3.8-flash is Google's active replacement model supporting structured JSON schema outputs through the current @google/genai SDK. |
| 4 | Money representation | Integer cents everywhere (priceCents, budgetCents, totalCents) | Eliminates IEEE-754 floating-point drift across validation, HMAC signing, UI progress bars, and PayPal item_total reconciliation. |
| 5 | Cryptographic boundary name | Signed quote (quoteId, BASKET_SIGNING_SECRET, 15-min expiry) | The HMAC proves server issuance + integrity only (never owner approval); human intent is captured by the UI checkbox and payment authorization by PayPal buyer login. |
| 6 | HMAC secret handling | BASKET_SIGNING_SECRET (32+ random bytes, throw on startup if missing) | Prevents silent fallback to a hardcoded default key in local or Vercel environments. |
| 7 | Verification route | Cut /api/checkout/verify and /test-paypal | /api/paypal/create-order and /api/paypal/capture-order already verify the token and recompute prices from CATALOG, making a separate verify endpoint redundant. |
| 8 | Shared validator | Single cents-based validateBasket() in src/lib/validate.ts | Guarantees that AI output, repaired baskets, deterministic fallback baskets, labeled demo presets, and PayPal checkout enforce identical rules. |
| 9 | Over-budget AI output handling | Single deterministic repair step before fallback | Reduces or drops the lowest-ranked selected SKU (soldLast14Days / (stockOnHand + 1)) while protecting required categories and the ≥60% earring pack share. |
| 10 | Deterministic fallback | Explicit 1-pack ratio-sorted fallback ($151.80 for A, $149.40 for B) | Guarantees a valid basket or a user-visible error state when Gemini fails, explicitly labeled "Deterministic fallback — AI unavailable" and never presented as AI output. |
| 11 | Labeled demo presets | ?demo=preset-a and ?demo=preset-b query modes | Runs pinned Scenario A ($180.00) and Scenario B ($139.80) fixtures through the real validator and HMAC signer with a visible "Sample basket — preset, not AI output" badge. |
| 12 | PayPal idempotency keys | ${quoteId}:create and ${quoteId}:capture via PayPal-Request-Id | Ensures safe retries of the exact same operation without cross-contaminating create and capture calls or different quotes. |
| 13 | Double-capture resilience | Handle ORDER_ALREADY_CAPTURED by returning existing capture details | Prevents an accidental double-click on the PayPal button from stranding the user on an error screen after payment succeeded. |
| 14 | Video payment target | Pay Scenario B ($139.80, 30 units, 4 SKUs) in the 2:45 video | Matches the narrative sequence (Scenario A → Scenario B → Pay) so the captured receipt matches the basket on screen. |
| 15 | Stop-and-submit gate | Stop building Thursday 10:00 AM ET; do not gate on an exact $180.00 live AI run | Any validated basket within budget + real COMPLETED PayPal sandbox capture + public video + public MIT repo satisfies all judging criteria. |

## §1 Architecture, File Layout, Environment & Signed-Quote Protocol

### 1.1 Exact Directory & File Structure

Every file path in the project is listed below. Do not add extra routes, database layers, or unrequested UI components.

```
restock-rescue/
├── .env.example
├── .env.local                     # Untracked local secrets (never committed)
├── .gitignore
├── LICENSE                        # MIT License (required in repo root)
├── README.md                      # Documentation, judge guide, tamper test, serverless note
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── lib/
    │   ├── types.ts               # All TypeScript interfaces and shared types
    │   ├── data.ts                # 16-SKU catalog (priceCents), Scenario A/B presets, constraint parser
    │   ├── validate.ts            # Cents-based validateBasket(), repairBasket(), buildFallbackBasket()
    │   ├── quote.ts               # HMAC-SHA256 signQuote(), verifyQuote(), in-memory quoteStore & rateLimiter
    │   ├── ai.ts                  # gemini-3.8-flash (@google/genai) JSON-schema recommender + retry/repair/fallback
    │   └── paypal.ts              # PayPal OAuth2 token, createPayPalOrder, getPayPalOrder, capturePayPalOrder
    ├── __tests__/
    │   └── validate-and-quote.test.ts  # Required unit tests (arithmetic, repair-or-fallback, tamper, constraints)
    └── app/
        ├── globals.css
        ├── layout.tsx
        ├── page.tsx               # Single-screen workbench UI (Ask -> Basket -> Receipt)
        └── api/
            ├── recommend/
            │   └── route.ts       # POST /api/recommend (live AI + repair + fallback OR labeled preset)
            └── paypal/
                ├── create-order/
                │   └── route.ts   # POST /api/paypal/create-order (verifies HMAC, recomputes from CATALOG)
                └── capture-order/
                    └── route.ts   # POST /api/paypal/capture-order (re-verifies HMAC + GETs order + captures)
```

### 1.2 Environment Variables (.env.local and .env.example)

Create .env.example (committed) and .env.local (never committed) with these exact five variable names:

```
# PayPal Sandbox REST API credentials (Server-only secret; Public Client ID shared with JS SDK)
PAYPAL_CLIENT_ID="YOUR_SANDBOX_PAYPAL_CLIENT_ID"
PAYPAL_CLIENT_SECRET="YOUR_SANDBOX_PAYPAL_CLIENT_SECRET"
NEXT_PUBLIC_PAYPAL_CLIENT_ID="YOUR_SANDBOX_PAYPAL_CLIENT_ID"

# Google AI Studio API Key for gemini-3.8-flash (Server-only)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# 32+ random bytes encoded as hex or base64 (Server-only; app throws at startup if missing or < 32 chars)
# Generate via: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
BASKET_SIGNING_SECRET="REPLACE_WITH_64_CHAR_HEX_FROM_CRYPTO_RANDOMBYTES_32"
```

### 1.3 Language & Security Boundary Rules

Signed Quote Meaning: The HMAC / signed quote proves server issuance + integrity only. It does NOT prove owner approval. The UI checkbox is a human-intent signal, not a cryptographic approval, and PayPal buyer approval authorizes the payment. Use this exact framing in the UI, README, video close, and Devpost submission.

Pipeline Guarantee Wording: Never write "guarantees a valid basket". State accurately that the pipeline guarantees a valid basket OR a user-visible error state.

Serverless State Limitation: Include this exact one-line note in the README: "Quote store and rate limiter are in-memory only; single-instance demo limitation. Not production."

### 1.4 The Signed-Quote Token Protocol (src/lib/quote.ts)

Canonical Payload Construction: Build the payload string once and sign the exact base64url string (never re-serialize JSON during verification):

```
payloadObj = {
  v: 1,
  quoteId: crypto.randomUUID(),
  budgetCents: 25000,
  lines: [{ sku: "E-01", packs: 2 }, ...], // sorted ascending by sku
  totalCents: 18000,
  iat: Math.floor(Date.now() / 1000),
  exp: iat + 900                           // 15 minutes (900 seconds)
}
payloadBase64Url = Buffer.from(JSON.stringify(payloadObj), "utf8").toString("base64url")
signatureBase64Url = crypto.createHmac("sha256", secret).update(payloadBase64Url).digest("base64url")
token = `${payloadBase64Url}.${signatureBase64Url}`
```

Startup Secret Validation: getSigningSecret() checks process.env.BASKET_SIGNING_SECRET. If it is missing or shorter than 32 characters, it immediately throws Error("CRITICAL: BASKET_SIGNING_SECRET is missing or shorter than 32 characters."). Never provide a fallback default string.

Verification (verifyQuote(token)):

- Splits token on `.` into [payloadPart, sigPart]. Rejects if either part is missing.
- Computes expected HMAC-SHA256 over payloadPart and compares buffers using crypto.timingSafeEqual (checking buffer byte-lengths first).
- Parses payloadPart from base64url, checks v === 1, verifies now <= exp, recomputes every line price and total from CATALOG (ignoring client-supplied prices), checks recomputedTotalCents === payload.totalCents, and checks recomputedTotalCents <= payload.budgetCents.

In-Memory Quote → Order Binding (quoteStore):

Map<string, { quoteId: string; paypalOrderId?: string; totalCents: number; used: boolean; captureId?: string; capturedResponse?: Record<string, unknown>; createdAt: number }>

- In /api/paypal/create-order: If quoteStore.get(quoteId)?.used is true, return HTTP 409 ("Quote already captured"). If paypalOrderId already exists for quoteId, return that existing orderID without creating a duplicate order. Otherwise, call PayPal Orders v2 with custom_id: quoteId and PayPal-Request-Id: "${quoteId}:create", store paypalOrderId, and return { orderID }.
- In /api/paypal/capture-order: Verify token. Look up quoteId in quoteStore. If already marked used: true and capturedResponse is cached, return the cached success receipt immediately. Verify paypalOrderId === orderID (if present in quoteStore). Call GET /v2/checkout/orders/{orderID} on PayPal: require custom_id === quoteId, amount.value === (totalCents / 100).toFixed(2), and status APPROVED (or COMPLETED if already captured). Then call POST /v2/checkout/orders/{orderID}/capture with PayPal-Request-Id: "${quoteId}:capture". If PayPal returns COMPLETED (or ORDER_ALREADY_CAPTURED, handled by reading the existing capture from the GET response), verify the capture amount matches totalCents, mark used = true, cache capturedResponse, and return the receipt.

### 1.5 Complete Implementation of src/lib/types.ts

```ts
export type Category =
  | "Earrings"
  | "Necklaces"
  | "Bracelets"
  | "Rings"
  | "Hair"
  | "Sunglasses";

export interface CatalogItem {
  skuId: string;
  name: string;
  category: Category;
  priceCents: number; // Wholesale unit price in integer cents (1 pack = 6 units)
  stockOnHand: number; // Boutique's current inventory on hand
  soldLast14Days: number; // Boutique's units sold in the last 14 days (Oct 27 - Nov 9)
}

export interface ParsedConstraints {
  mustIncludeCategory?: Category;
  minEarringPackShare?: number; // e.g., 0.6 when instruction prioritizes earrings
}

export interface RawSelectedLine {
  skuId: string;
  packs: number;
  reason: string;
}

export interface RawSkippedLine {
  skuId: string;
  reason: string;
}

export interface EnrichedSelectedLine {
  skuId: string;
  name: string;
  category: Category;
  packs: number;
  units: number; // packs * 6
  unitPriceCents: number;
  packPriceCents: number; // unitPriceCents * 6
  lineTotalCents: number; // packs * 6 * unitPriceCents
  stockOnHand: number;
  soldLast14Days: number;
  reason: string;
}

export interface EnrichedSkippedLine {
  skuId: string;
  name: string;
  category: Category;
  unitPriceCents: number;
  packPriceCents: number;
  stockOnHand: number;
  soldLast14Days: number;
  reason: string;
}

export type BasketSource = "ai" | "fallback" | "preset";

export interface ValidatedBasket {
  source: BasketSource;
  sourceBadge: string; // e.g., "AI recommendation — server validated", "Deterministic fallback — AI unavailable", or "Sample basket — preset, not AI output"
  repaired: boolean;
  repairNote?: string; // "Adjusted to fit budget" when repaired === true
  budgetCents: number;
  totalCents: number;
  remainingCents: number;
  budgetUsedPct: number; // Rounded to 1 decimal place, e.g. 72.0 or 93.2
  totalPacks: number;
  totalUnits: number;
  earringPackSharePct: number;
  selected: EnrichedSelectedLine[];
  skipped: EnrichedSkippedLine[];
}

export interface SignedQuotePayload {
  v: 1;
  quoteId: string;
  budgetCents: number;
  lines: Array<{ sku: string; packs: number }>; // Sorted ascending by sku
  totalCents: number;
  iat: number;
  exp: number;
}

export interface RecommendResponse {
  basket: ValidatedBasket;
  quote: SignedQuotePayload;
  token: string;
}

export interface CaptureReceipt {
  status: "COMPLETED";
  captureId: string;
  orderId: string;
  quoteId: string;
  amountValue: string;
  currencyCode: string;
  payerName: string;
  payerEmail: string;
  capturedAt: string;
  totalUnits: number;
  skuCount: number;
  merchantName: string;
}
```

### 1.6 Complete Implementation of src/lib/quote.ts

```ts
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
```

## §2 Seeded Data, Arithmetic Verification & Scenarios (src/lib/data.ts)

### 2.1 Merchant & Inventory Semantics

Merchant Name: Northstar Jewelry Supply — Wholesale Division (fictional). The PayPal Sandbox Business account must be named Northstar Jewelry Supply.

Header Copy: "Restock Rescue | Northstar Jewelry Supply — Fall Restock | Sandbox Mode"

Subheader Copy: "Based on sales from Oct 27 – Nov 9 and current stock coverage."

Footer / README / Video Copy: "All catalog, sales, and stock data are synthetic and for demo only."

Currency & Tax/Shipping: USD only; tax and shipping are $0.00 ("Wholesale price, tax & shipping excluded for demo clarity").

stockOnHand Definition: The boutique's current inventory on hand (coverage signal), not the wholesaler's warehouse stock. soldLast14Days is the boutique's 14-day sales velocity (demand signal). Never claim "this will sell this weekend".

### 2.2 Complete 16-SKU Wholesale Catalog (Integer Cents & Precomputed Ratios)

Every pack equals 6 units. Therefore 1 pack cost = 6 × priceCents and 2 packs cost = 12 × priceCents. The urgency ratio used by both the repair step and the deterministic fallback is soldLast14Days / (stockOnHand + 1).

| SKU | Product Name | Category | Unit (priceCents) | 1 Pack (6u) | 2 Packs (12u) | Stock (stockOnHand) | Sold 14d (soldLast14Days) | Ratio sold/(stock+1) | Fallback Rank |
|---|---|---|---|---|---|---|---|---|---|
| E-01 | Gold Vermeil Mini Hoop Earrings | Earrings | $3.50 (350) | $21.00 (2100) | $42.00 (4200) | 2 | 18 | 18 / 3 = 6.000 | #2 (tie-break: 18 sold) |
| E-02 | Pearl Drop Stud Earrings — Ivory | Earrings | $4.20 (420) | $25.20 (2520) | $50.40 (5040) | 0 | 22 | 22 / 1 = 22.000 | #1 |
| E-03 | Cubic Zirconia Tennis Studs — Gold | Earrings | $5.80 (580) | $34.80 (3480) | $69.60 (6960) | 4 | 15 | 15 / 5 = 3.000 | #6 |
| E-04 | Resin Tortoise Statement Earrings | Earrings | $4.80 (480) | $28.80 (2880) | $57.60 (5760) | 9 | 7 | 7 / 10 = 0.700 | #11 |
| E-05 | 14k Gold-Plated Huggie Hoops | Earrings | $3.90 (390) | $23.40 (2340) | $46.80 (4680) | 1 | 12 | 12 / 2 = 6.000 | #3 (tie-break: 12 sold) |
| N-01 | Layered Gold Paperclip Necklace | Necklaces | $7.50 (750) | $45.00 (4500) | $90.00 (9000) | 3 | 14 | 14 / 4 = 3.500 | #4 |
| N-02 | Freshwater Pearl Choker — 16" | Necklaces | $9.20 (920) | $55.20 (5520) | $110.40 (11040) | 6 | 9 | 9 / 7 = 1.286 | #10 |
| N-03 | CZ Pendant Necklace — Solitaire | Necklaces | $6.80 (680) | $40.80 (4080) | $81.60 (8160) | 8 | 6 | 6 / 9 = 0.667 | #12 |
| B-01 | Gold Curb Chain Bracelet | Bracelets | $4.50 (450) | $27.00 (2700) | $54.00 (5400) | 5 | 11 | 11 / 6 = 1.833 | #7 |
| B-02 | Beaded Stretch Bracelet Set (3pc) | Bracelets | $5.10 (510) | $30.60 (3060) | $61.20 (6120) | 12 | 8 | 8 / 13 = 0.615 | #13 |
| B-03 | Pearl & Gold Charm Bracelet | Bracelets | $6.20 (620) | $37.20 (3720) | $74.40 (7440) | 2 | 10 | 10 / 3 = 3.333 | #5 |
| R-01 | Adjustable CZ Band Ring — Gold | Rings | $3.20 (320) | $19.20 (1920) | $38.40 (3840) | 7 | 13 | 13 / 8 = 1.625 | #9 |
| R-02 | Stackable Thin Band Ring Set (5pc) | Rings | $4.00 (400) | $24.00 (2400) | $48.00 (4800) | 10 | 5 | 5 / 11 = 0.455 | #14 |
| H-01 | Satin Scrunchie & Clip Set | Hair | $2.80 (280) | $16.80 (1680) | $33.60 (3360) | 15 | 4 | 4 / 16 = 0.250 | #15 (tie-break: 4 sold) |
| H-02 | Pearl Hair Claw Clip — Large | Hair | $3.60 (360) | $21.60 (2160) | $43.20 (4320) | 4 | 9 | 9 / 5 = 1.800 | #8 |
| S-01 | Acrylic Sunglasses — Tortoise | Sunglasses | $8.50 (850) | $51.00 (5100) | $102.00 (10200) | 11 | 3 | 3 / 12 = 0.250 | #16 (tie-break: 3 sold) |

(Note on exact full rank order by soldLast14Days / (stockOnHand + 1) desc: 1. E-02 (22.000), 2. E-01 (6.000, sold 18), 3. E-05 (6.000, sold 12), 4. N-01 (3.500), 5. B-03 (3.333), 6. E-03 (3.000), 7. B-01 (1.833), 8. H-02 (1.800), 9. R-01 (1.625), 10. N-02 (1.286), 11. E-04 (0.700), 12. N-03 (0.667), 13. B-02 (0.615), 14. R-02 (0.455), 15. H-01 (0.250, sold 4), 16. S-01 (0.250, sold 3).)

### 2.3 Scenario A — Happy Path Fixture ($250.00 Budget)

Input Budget: $250.00 (25000 cents)

Input Instruction: "Prioritize earrings. I need to restock for this weekend."

Parsed Constraints: { minEarringPackShare: 0.6 }

| SKU | Product | Packs | Units | Unit Price | Line Total (lineTotalCents) | Reason (No dollar amounts in AI reason; server formats prices) |
|---|---|---|---|---|---|---|
| E-02 | Pearl Drop Stud Earrings — Ivory | 2 | 12 | $4.20 | $50.40 (5040) | Highest recent demand (22 sold in 14 days) and completely sold out (0 in stock). |
| E-01 | Gold Vermeil Mini Hoop Earrings | 2 | 12 | $3.50 | $42.00 (4200) | Second-highest earring demand (18 sold) with only 2 units left on hand. |
| E-05 | 14k Gold-Plated Huggie Hoops | 1 | 6 | $3.90 | $23.40 (2340) | Strong velocity (12 sold) with only 1 unit remaining in stock. |
| N-01 | Layered Gold Paperclip Necklace | 1 | 6 | $7.50 | $45.00 (4500) | Strongest non-earring seller (14 sold) with only 3 units left. |
| R-01 | Adjustable CZ Band Ring — Gold | 1 | 6 | $3.20 | $19.20 (1920) | Consistent volume seller (13 sold) and lowest unit cost among selected lines. |
| TOTAL | 5 SKUs | 7 packs | 42 units | — | $180.00 (18000) | $70.00 remaining (7000 cents) — 72.0% of budget used |

Arithmetic & Constraint Check (Scenario A):

5040 + 4200 + 2340 + 4500 + 1920 = 18000 cents ($180.00).

Units: 12 + 12 + 6 + 6 + 6 = 42 units (7 packs).

Remaining: 25000 - 18000 = 7000 cents ($70.00).

Budget Used: 18000 / 25000 = 72.0%.

Earring Pack Share: (2 + 2 + 1) / 7 = 5 / 7 ≈ 71.4% ≥ 60% ✓.

Skipped Lines in Scenario A (disjoint from selected):

E-03 (Cubic Zirconia Tennis Studs — Gold): "15 sold, but highest earring unit cost; 4 units in stock and cheaper earring lines take priority." (Note: never claim crowding-out in Scenario A because $70.00 remains unspent.)

H-02 (Pearl Hair Claw Clip — Large): "9 sold with 4 still in stock — current coverage is sufficient for this weekend."

### 2.4 Scenario B — The Tradeoff Fixture ($150.00 Budget — Paid in Video)

Input Budget: $150.00 (15000 cents)

Input Instruction: "Prioritize earrings, but I need at least one necklace for the display table."

Parsed Constraints: { minEarringPackShare: 0.6, mustIncludeCategory: "Necklaces" }

| SKU | Product | Packs | Units | Unit Price | Line Total (lineTotalCents) | Tradeoff / Reason |
|---|---|---|---|---|---|---|
| E-02 | Pearl Drop Stud Earrings — Ivory | 2 | 12 | $4.20 | $50.40 (5040) | Kept at 2 packs — #1 seller (22 sold, 0 in stock), non-negotiable. |
| E-01 | Gold Vermeil Mini Hoop Earrings | 1 | 6 | $3.50 | $21.00 (2100) | Reduced from 2 packs to 1 pack (18 sold, 2 in stock) to fit the tighter budget. |
| E-05 | 14k Gold-Plated Huggie Hoops | 1 | 6 | $3.90 | $23.40 (2340) | Kept at 1 pack — 12 sold and only 1 unit left in stock. |
| N-01 | Layered Gold Paperclip Necklace | 1 | 6 | $7.50 | $45.00 (4500) | Kept at 1 pack — 14 sold, 3 in stock, satisfies display necklace requirement. |
| TOTAL | 4 SKUs | 5 packs | 30 units | — | $139.80 (13980) | $10.20 remaining (1020 cents) — 93.2% of budget used |

Arithmetic & Constraint Check (Scenario B):

5040 + 2100 + 2340 + 4500 = 13980 cents ($139.80).

Units: 12 + 6 + 6 + 6 = 30 units (5 packs).

Remaining: 15000 - 13980 = 1020 cents ($10.20).

Budget Used: 13980 / 15000 = 93.2%.

Earring Pack Share: (2 + 1 + 1) / 5 = 4 / 5 = 80.0% ≥ 60% ✓.

Must-Include Category: N-01 has category "Necklaces" ✓.

Skipped Lines in Scenario B (disjoint from selected):

R-01 (Adjustable CZ Band Ring — Gold): "13 sold, but 7 units remain in stock; dropped to protect the display necklace and sold-out pearl studs."

E-03 (Cubic Zirconia Tennis Studs — Gold): "15 sold, 4 in stock; under the tighter budget, one pack crowds out two lower-cost earring lines."

### 2.5 Demo Presets vs. Labeled Preset Mode (?demo=preset-a / ?demo=preset-b)

Standard Preset Buttons on the Form: Clicking "Load Scenario A ($250)" or "Load Scenario B ($150)" populates the budget and instruction inputs and calls the live Gemini AI endpoint (POST /api/recommend with no preset flag). Never display a hardcoded basket disguised as live AI output.

Labeled Demo Preset Mode (?demo=preset-a or ?demo=preset-b): When the page is opened with ?demo=preset-a or ?demo=preset-b (or the user clicks the secondary "Load Pinned Sample (Non-AI)" link), /api/recommend loads the pinned Scenario A ($180.00) or Scenario B ($139.80) fixture, passes it through the exact same validateBasket() and signQuote() pipeline, and returns source: "preset" with sourceBadge: "Sample basket — preset, not AI output". The UI renders an explicit amber banner: "Sample basket — preset, not AI output". It is never presented as AI output.

### 2.6 Complete Implementation of src/lib/data.ts

```ts
import {
  CatalogItem,
  ParsedConstraints,
  RawSelectedLine,
  RawSkippedLine,
} from "./types";

export const CATALOG_ITEMS: CatalogItem[] = [
  { skuId: "E-01", name: "Gold Vermeil Mini Hoop Earrings", category: "Earrings", priceCents: 350, stockOnHand: 2, soldLast14Days: 18 },
  { skuId: "E-02", name: "Pearl Drop Stud Earrings — Ivory", category: "Earrings", priceCents: 420, stockOnHand: 0, soldLast14Days: 22 },
  { skuId: "E-03", name: "Cubic Zirconia Tennis Studs — Gold", category: "Earrings", priceCents: 580, stockOnHand: 4, soldLast14Days: 15 },
  { skuId: "E-04", name: "Resin Tortoise Statement Earrings", category: "Earrings", priceCents: 480, stockOnHand: 9, soldLast14Days: 7 },
  { skuId: "E-05", name: "14k Gold-Plated Huggie Hoops", category: "Earrings", priceCents: 390, stockOnHand: 1, soldLast14Days: 12 },
  { skuId: "N-01", name: "Layered Gold Paperclip Necklace", category: "Necklaces", priceCents: 750, stockOnHand: 3, soldLast14Days: 14 },
  { skuId: "N-02", name: "Freshwater Pearl Choker — 16\"", category: "Necklaces", priceCents: 920, stockOnHand: 6, soldLast14Days: 9 },
  { skuId: "N-03", name: "CZ Pendant Necklace — Solitaire", category: "Necklaces", priceCents: 680, stockOnHand: 8, soldLast14Days: 6 },
  { skuId: "B-01", name: "Gold Curb Chain Bracelet", category: "Bracelets", priceCents: 450, stockOnHand: 5, soldLast14Days: 11 },
  { skuId: "B-02", name: "Beaded Stretch Bracelet Set (3pc)", category: "Bracelets", priceCents: 510, stockOnHand: 12, soldLast14Days: 8 },
  { skuId: "B-03", name: "Pearl & Gold Charm Bracelet", category: "Bracelets", priceCents: 620, stockOnHand: 2, soldLast14Days: 10 },
  { skuId: "R-01", name: "Adjustable CZ Band Ring — Gold", category: "Rings", priceCents: 320, stockOnHand: 7, soldLast14Days: 13 },
  { skuId: "R-02", name: "Stackable Thin Band Ring Set (5pc)", category: "Rings", priceCents: 400, stockOnHand: 10, soldLast14Days: 5 },
  { skuId: "H-01", name: "Satin Scrunchie & Clip Set", category: "Hair", priceCents: 280, stockOnHand: 15, soldLast14Days: 4 },
  { skuId: "H-02", name: "Pearl Hair Claw Clip — Large", category: "Hair", priceCents: 360, stockOnHand: 4, soldLast14Days: 9 },
  { skuId: "S-01", name: "Acrylic Sunglasses — Tortoise", category: "Sunglasses", priceCents: 850, stockOnHand: 11, soldLast14Days: 3 },
];

export const CATALOG = new Map<string, CatalogItem>(
  CATALOG_ITEMS.map((item) => [item.skuId, item])
);

export function parseConstraints(instruction: string): ParsedConstraints {
  const lower = (instruction || "").toLowerCase();
  const constraints: ParsedConstraints = {};

  if (lower.includes("prioritize earring") || lower.includes("focus on earring")) {
    constraints.minEarringPackShare = 0.6;
  }

  if (lower.includes("necklace")) {
    constraints.mustIncludeCategory = "Necklaces";
  } else if (lower.includes("bracelet")) {
    constraints.mustIncludeCategory = "Bracelets";
  } else if (lower.includes("ring") && !lower.includes("earring")) {
    constraints.mustIncludeCategory = "Rings";
  } else if (lower.includes("hair") || lower.includes("clip") || lower.includes("scrunchie")) {
    constraints.mustIncludeCategory = "Hair";
  } else if (lower.includes("sunglass")) {
    constraints.mustIncludeCategory = "Sunglasses";
  }

  return constraints;
}

export const PRESET_FIXTURES: Record<
  "preset-a" | "preset-b",
  {
    budgetDollars: number;
    instruction: string;
    selected: RawSelectedLine[];
    skipped: RawSkippedLine[];
  }
> = {
  "preset-a": {
    budgetDollars: 250,
    instruction: "Prioritize earrings. I need to restock for this weekend.",
    selected: [
      { skuId: "E-02", packs: 2, reason: "Highest recent demand (22 sold in 14 days) and sold out (0 in stock)." },
      { skuId: "E-01", packs: 2, reason: "Second-highest earring demand (18 sold) with only 2 left." },
      { skuId: "E-05", packs: 1, reason: "12 sold, only 1 left in stock." },
      { skuId: "N-01", packs: 1, reason: "Strongest non-earring seller (14 sold) with only 3 left." },
      { skuId: "R-01", packs: 1, reason: "Best value seller: 13 sold, lowest unit cost among selected lines." },
    ],
    skipped: [
      { skuId: "E-03", reason: "15 sold, but highest earring wholesale cost; five cheaper lines selected instead." },
      { skuId: "H-02", reason: "9 sold, 4 in stock — covered for one more week." },
    ],
  },
  "preset-b": {
    budgetDollars: 150,
    instruction: "Prioritize earrings, but I need at least one necklace for the display table.",
    selected: [
      { skuId: "E-02", packs: 2, reason: "Kept — #1 seller (22 sold, 0 in stock), non-negotiable." },
      { skuId: "E-01", packs: 1, reason: "Reduced from 2 packs to 1 (18 sold, 2 in stock) to fit tighter budget." },
      { skuId: "E-05", packs: 1, reason: "Kept — 12 sold and only 1 left in stock." },
      { skuId: "N-01", packs: 1, reason: "Kept — 14 sold, 3 in stock, satisfies display necklace request." },
    ],
    skipped: [
      { skuId: "R-01", reason: "13 sold in 14 days, but 7 still in stock; necklace and pearl studs take priority." },
      { skuId: "E-03", reason: "Under the tighter budget, one pack crowds out two cheaper earring lines." },
    ],
  },
};
```

## §3 PayPal Orders API v2 Integration (src/lib/paypal.ts & API Routes)

### 3.1 Step 0: Tuesday First 45 Minutes — The $1.00 Sandbox Gate

Do not write UI code until all four steps below pass within the first 45 minutes on Tuesday evening:

1. Log into https://developer.paypal.com → Dashboard → My Apps & Credentials → Sandbox. Create a REST API App named Restock Rescue — Hackathon bound to your Sandbox Business account (named Northstar Jewelry Supply). Copy Client ID and Secret into .env.local (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, NEXT_PUBLIC_PAYPAL_CLIENT_ID).
2. Navigate to Sandbox → Accounts. Confirm both (a) the Business seller account and (b) the Personal buyer account exist. Open each account's details and inspect the actual USD balance (do not assume a default $1,000 balance; increase the Personal buyer balance if it is under $500).
3. Run the OAuth2 token test in your terminal (takes under 60 seconds):

```bash
curl -s -X POST https://api-m.sandbox.paypal.com/v1/oauth2/token \
  -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -H "Accept: application/json" \
  -H "Accept-Language: en_US" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials"
```

Verify the JSON response returns "access_token": "A21AA...".

4. Immediately run a $1.00 order create → buyer sandbox login approve → capture test and verify a real COMPLETED Capture ID. If this gate is not green within 45 minutes on Tuesday, cut AI repair complexity or UI polish before writing UI code.

### 3.2 Complete PayPal Request Bodies (Scenario A & Scenario B)

Every call to POST https://api-m.sandbox.paypal.com/v2/checkout/orders MUST include:

- Header Authorization: Bearer <ACCESS_TOKEN>
- Header Content-Type: application/json
- Header PayPal-Request-Id: <quoteId>:create
- intent: "CAPTURE"
- purchase_units[0].custom_id: "<quoteId>"
- purchase_units[0].amount.breakdown.item_total.value equal to amount.value
- purchase_units[0].items[i].quantity in individual units (packs * 6, e.g., "12" for 2 packs, "6" for 1 pack — never pack counts!) so that Σ(quantity × unit_amount) === item_total.value.
- payment_source.paypal.experience_context with shipping_preference: "NO_SHIPPING" and user_action: "PAY_NOW".

Full Create-Order Request Body — Scenario A ($180.00, 42 units, 5 SKUs)

```json
{
  "intent": "CAPTURE",
  "purchase_units": [
    {
      "reference_id": "restock-rescue",
      "custom_id": "550e8400-e29b-41d4-a716-446655440000",
      "amount": {
        "currency_code": "USD",
        "value": "180.00",
        "breakdown": {
          "item_total": {
            "currency_code": "USD",
            "value": "180.00"
          }
        }
      },
      "items": [
        {
          "name": "Gold Vermeil Mini Hoop Earrings",
          "sku": "E-01",
          "unit_amount": { "currency_code": "USD", "value": "3.50" },
          "quantity": "12"
        },
        {
          "name": "Pearl Drop Stud Earrings — Ivory",
          "sku": "E-02",
          "unit_amount": { "currency_code": "USD", "value": "4.20" },
          "quantity": "12"
        },
        {
          "name": "14k Gold-Plated Huggie Hoops",
          "sku": "E-05",
          "unit_amount": { "currency_code": "USD", "value": "3.90" },
          "quantity": "6"
        },
        {
          "name": "Layered Gold Paperclip Necklace",
          "sku": "N-01",
          "unit_amount": { "currency_code": "USD", "value": "7.50" },
          "quantity": "6"
        },
        {
          "name": "Adjustable CZ Band Ring — Gold",
          "sku": "R-01",
          "unit_amount": { "currency_code": "USD", "value": "3.20" },
          "quantity": "6"
        }
      ]
    }
  ],
  "payment_source": {
    "paypal": {
      "experience_context": {
        "shipping_preference": "NO_SHIPPING",
        "user_action": "PAY_NOW"
      }
    }
  }
}
```

Full Create-Order Request Body — Scenario B ($139.80, 30 units, 4 SKUs — Video Capture Target)

```json
{
  "intent": "CAPTURE",
  "purchase_units": [
    {
      "reference_id": "restock-rescue",
      "custom_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "amount": {
        "currency_code": "USD",
        "value": "139.80",
        "breakdown": {
          "item_total": {
            "currency_code": "USD",
            "value": "139.80"
          }
        }
      },
      "items": [
        {
          "name": "Gold Vermeil Mini Hoop Earrings",
          "sku": "E-01",
          "unit_amount": { "currency_code": "USD", "value": "3.50" },
          "quantity": "6"
        },
        {
          "name": "Pearl Drop Stud Earrings — Ivory",
          "sku": "E-02",
          "unit_amount": { "currency_code": "USD", "value": "4.20" },
          "quantity": "12"
        },
        {
          "name": "14k Gold-Plated Huggie Hoops",
          "sku": "E-05",
          "unit_amount": { "currency_code": "USD", "value": "3.90" },
          "quantity": "6"
        },
        {
          "name": "Layered Gold Paperclip Necklace",
          "sku": "N-01",
          "unit_amount": { "currency_code": "USD", "value": "7.50" },
          "quantity": "6"
        }
      ]
    }
  ],
  "payment_source": {
    "paypal": {
      "experience_context": {
        "shipping_preference": "NO_SHIPPING",
        "user_action": "PAY_NOW"
      }
    }
  }
}
```

### 3.3 Complete Implementation of src/lib/paypal.ts

```ts
import { CATALOG } from "./data";
import { PACK_SIZE } from "./quote";
import { CaptureReceipt, SignedQuotePayload } from "./types";

const PAYPAL_BASE_URL = "https://api-m.sandbox.paypal.com";

export function formatCentsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );
  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
      "Accept-Language": "en_US",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal OAuth failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export function buildCreateOrderPayload(quote: SignedQuotePayload) {
  let recomputedTotalCents = 0;
  const items = quote.lines.map((line) => {
    const sku = CATALOG.get(line.sku);
    if (!sku) throw new Error(`Unknown SKU in quote: ${line.sku}`);
    const quantityUnits = line.packs * PACK_SIZE;
    recomputedTotalCents += quantityUnits * sku.priceCents;
    return {
      name: sku.name,
      sku: sku.skuId,
      unit_amount: {
        currency_code: "USD",
        value: formatCentsToDollars(sku.priceCents),
      },
      quantity: String(quantityUnits),
    };
  });

  if (recomputedTotalCents !== quote.totalCents) {
    throw new Error("Catalog total mismatch when building PayPal payload");
  }

  const totalValue = formatCentsToDollars(recomputedTotalCents);

  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: "restock-rescue",
        custom_id: quote.quoteId,
        amount: {
          currency_code: "USD",
          value: totalValue,
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: totalValue,
            },
          },
        },
        items,
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
        },
      },
    },
  };
}

export async function createPayPalOrder(
  quote: SignedQuotePayload
): Promise<{ id: string }> {
  const accessToken = await getPayPalAccessToken();
  const payload = buildCreateOrderPayload(quote);

  const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `${quote.quoteId}:create`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(
      `PayPal create-order failed (${res.status}): ${JSON.stringify(data)}`
    );
  }
  return { id: data.id as string };
}

export async function getPayPalOrder(orderId: string): Promise<any> {
  const accessToken = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `PayPal get-order failed (${res.status}): ${JSON.stringify(data)}`
    );
  }
  return data;
}

export function extractReceiptFromOrderData(
  orderData: any,
  quote: SignedQuotePayload
): CaptureReceipt {
  const pu = orderData?.purchase_units?.[0];
  const capture = pu?.payments?.captures?.[0];
  if (!capture || capture.status !== "COMPLETED" || !capture.id) {
    throw new Error(
      `Payment capture is not COMPLETED (status: ${capture?.status ?? "unknown"})`
    );
  }

  const expectedValue = formatCentsToDollars(quote.totalCents);
  if (capture.amount?.value !== expectedValue) {
    throw new Error(
      `Captured amount (${capture.amount?.value}) does not match signed quote (${expectedValue})`
    );
  }

  const givenName = orderData?.payer?.name?.given_name ?? "Sandbox";
  const surname = orderData?.payer?.name?.surname ?? "Buyer";
  const payerEmail =
    orderData?.payer?.email_address ?? "buyer@sandbox.paypal.com";
  const totalUnits = quote.lines.reduce(
    (sum, line) => sum + line.packs * PACK_SIZE,
    0
  );

  return {
    status: "COMPLETED",
    captureId: capture.id,
    orderId: orderData.id,
    quoteId: quote.quoteId,
    amountValue: capture.amount.value,
    currencyCode: capture.amount.currency_code ?? "USD",
    payerName: `${givenName} ${surname}`.trim(),
    payerEmail,
    capturedAt: capture.create_time ?? new Date().toISOString(),
    totalUnits,
    skuCount: quote.lines.length,
    merchantName: "Northstar Jewelry Supply",
  };
}

export async function verifyAndCapturePayPalOrder(
  orderId: string,
  quote: SignedQuotePayload
): Promise<CaptureReceipt> {
  const existingOrder = await getPayPalOrder(orderId);
  const pu = existingOrder?.purchase_units?.[0];
  const expectedAmount = formatCentsToDollars(quote.totalCents);

  if (pu?.custom_id !== quote.quoteId) {
    throw new Error("Order custom_id does not match signed quoteId");
  }
  if (pu?.amount?.value !== expectedAmount) {
    throw new Error("Order amount does not match signed quote total");
  }

  // If already COMPLETED on PayPal side, return the existing capture receipt
  if (existingOrder.status === "COMPLETED") {
    return extractReceiptFromOrderData(existingOrder, quote);
  }

  if (existingOrder.status !== "APPROVED") {
    throw new Error(
      `Order is not in APPROVED state (current status: ${existingOrder.status})`
    );
  }

  const accessToken = await getPayPalAccessToken();
  const res = await fetch(
    `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `${quote.quoteId}:capture`,
      },
      body: JSON.stringify({}),
      cache: "no-store",
    }
  );

  const captureData = await res.json();

  if (!res.ok) {
    const issue = captureData?.details?.[0]?.issue;
    if (issue === "ORDER_ALREADY_CAPTURED") {
      const refreshedOrder = await getPayPalOrder(orderId);
      return extractReceiptFromOrderData(refreshedOrder, quote);
    }
    if (issue === "INSTRUMENT_DECLINED") {
      throw new Error(
        "INSTRUMENT_DECLINED: The payment method was declined in sandbox. Please try another funding source."
      );
    }
    throw new Error(
      `PayPal capture failed (${res.status}): ${
        issue ?? captureData?.message ?? "Unknown error"
      }`
    );
  }

  return extractReceiptFromOrderData(captureData, quote);
}
```

### 3.4 Complete Implementation of /api/paypal/create-order/route.ts and /api/paypal/capture-order/route.ts

src/app/api/paypal/create-order/route.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import { quoteStore, verifyQuote } from "@/lib/quote";
import { createPayPalOrder } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body?.token as string;
    const quote = verifyQuote(token);

    const existingRecord = quoteStore.get(quote.quoteId);
    if (existingRecord?.used) {
      return NextResponse.json(
        { error: "This quote has already been paid and captured." },
        { status: 409 }
      );
    }

    if (existingRecord?.paypalOrderId) {
      return NextResponse.json({
        orderID: existingRecord.paypalOrderId,
        quoteId: quote.quoteId,
      });
    }

    const { id } = await createPayPalOrder(quote);

    quoteStore.set(quote.quoteId, {
      quoteId: quote.quoteId,
      budgetCents: quote.budgetCents,
      totalCents: quote.totalCents,
      lines: quote.lines,
      paypalOrderId: id,
      used: false,
      createdAt: quote.iat,
    });

    return NextResponse.json({ orderID: id, quoteId: quote.quoteId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to create PayPal order" },
      { status: 400 }
    );
  }
}
```

src/app/api/paypal/capture-order/route.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import { quoteStore, verifyQuote } from "@/lib/quote";
import { verifyAndCapturePayPalOrder } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderID = body?.orderID as string;
    const token = body?.token as string;

    if (!orderID || !token) {
      return NextResponse.json(
        { error: "Missing orderID or signed quote token." },
        { status: 400 }
      );
    }

    const quote = verifyQuote(token);
    const record = quoteStore.get(quote.quoteId);

    // If double-clicked after a successful capture on the same instance, return existing receipt
    if (record?.used && record.capturedReceipt) {
      return NextResponse.json({ receipt: record.capturedReceipt });
    }

    if (record?.paypalOrderId && record.paypalOrderId !== orderID) {
      return NextResponse.json(
        { error: "Order ID does not match the order bound to this quote." },
        { status: 400 }
      );
    }

    const receipt = await verifyAndCapturePayPalOrder(orderID, quote);

    quoteStore.set(quote.quoteId, {
      quoteId: quote.quoteId,
      budgetCents: quote.budgetCents,
      totalCents: quote.totalCents,
      lines: quote.lines,
      paypalOrderId: orderID,
      used: true,
      captureId: receipt.captureId,
      capturedReceipt: receipt as unknown as Record<string, unknown>,
      createdAt: quote.iat,
    });

    return NextResponse.json({ receipt });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to capture PayPal order" },
      { status: 400 }
    );
  }
}
```

## §4 AI Recommender, Shared Validator, Repair & Deterministic Fallback

### 4.1 Model, SDK & JSON Schema Configuration (src/lib/ai.ts)

Primary Model: gemini-3.8-flash via @google/genai.

Fallback Model (only if Google AI Studio free tier lacks gemini-3.8-flash on Tuesday): gemini-3.5-flash-lite (configurable via process.env.GEMINI_MODEL || "gemini-3.8-flash").

Structured Output: Pass responseMimeType: "application/json" and responseSchema matching the exact selected / skipped structure. Do not set temperature: 0.

### 4.2 Exact 9-Rule System Prompt (Copy Verbatim into src/lib/ai.ts)

```
You are a wholesale buying assistant for an independent fashion jewelry boutique. Recommend a restock basket from the supplied catalog. You are NOT a calculator. You MUST NOT calculate totals or prices. You will output ONLY valid JSON matching the schema below.
1. Use ONLY SKUs from the catalog. Never invent a SKU.
2. `packs` must be an integer, 1 or 2. Each pack = 6 units.
3. Prefer SKUs with high `soldLast14Days` AND low `stockOnHand` (stockout risk).
4. Respect the owner's instruction as a hard priority. "Prioritize earrings" means at least 60% of packs (pack count, not budget) should be earrings.
5. Recommend 3–6 distinct SKUs. Do not recommend more than 6.
6. If a SKU has `stockOnHand >= 10` and `soldLast14Days < 8`, do not recommend it unless the owner explicitly asks for it.
7. For each selected item, give a `reason` in under 15 words that cites a specific number from the data (e.g. "22 sold, 0 in stock"). Do not include dollar amounts or totals in reasons — the server fills in prices.
8. For `skipped`, choose 0–3 SKUs that a reasonable buyer would consider, and explain in under 20 words why they were cut (budget, stock coverage, or higher-priority items). A skipped SKU must never also be selected.
9. The server enforces the budget: any basket over budget is repaired or rejected. Aim under budget by preferring cheaper lines when options are close — do not compute totals.
```

### 4.3 Shared Cents-Based Validator, Deterministic Repair & Explicit Fallback (src/lib/validate.ts)

Rules Enforced by validateBasket()

- budget must be finite, positive, and at most $10,000.00 (cents > 0 && cents <= 1_000_000).
- selected must contain 3 to 6 distinct SKUs from CATALOG.
- Every selected[i].packs must be an integer 1 or 2. Any AI-supplied price or total property on a line is rejected ("ai_price_fields_rejected").
- totalCents = Σ(packs * 6 * sku.priceCents) must be <= budgetCents.
- skipped must contain 0 to 3 distinct SKUs from CATALOG, completely disjoint from selected.
- If constraints.mustIncludeCategory is set, at least one selected SKU must belong to that category.
- If constraints.minEarringPackShare is set (e.g., 0.6), earringPacks / totalPacks must be >= constraints.minEarringPackShare (checked as `earringPacks / totalPacks >= minEarringPackShare` with a 1e-9 epsilon).

Rules Enforced by repairBasket()

When validateBasket() fails on an AI response (for example, budget_exceeded), run one deterministic repair pass:

- Deduplicate any repeated SKUs, clamp packs to 1..2, filter out any unknown SKUs, and remove any skipped SKU that overlaps selected.
- While the basket is over budget (totalCents > budgetCents) or has more than 6 items:
  - Rank candidate lines in selected by lowest soldLast14Days / (stockOnHand + 1) ratio first (tie-break: last in the AI's array).
  - Inspect candidates in that order and find the first line where reducing packs from 2 → 1 (if packs === 2) or dropping the line (if packs === 1 and selected.length > 3) does NOT remove the last SKU of constraints.mustIncludeCategory and keeps earringPacks / totalPacks >= constraints.minEarringPackShare.
  - If no candidate can be reduced or dropped without violating mustIncludeCategory, the >= 60% earring share, or the minimum 3-SKU rule, abort repair immediately and fall through to buildFallbackBasket().
- Run validateBasket() on the repaired result. If valid, mark repaired: true and repairNote: "Adjusted to fit budget".

Rules & Arithmetic Verification for buildFallbackBasket()

- Sort all 16 catalog SKUs by soldLast14Days / (stockOnHand + 1) descending; tie-break by soldLast14Days descending, then skuId ascending.
- Iterate through the sorted SKUs and take 1 pack (6 units) each, skipping any SKU whose 1-pack cost (6 * priceCents) would push runningTotalCents over budgetCents. Stop as soon as 5 SKUs are selected.
- Enforce mustIncludeCategory: if set and missing from the selected lines, find the cheapest SKU in mustIncludeCategory that fits (dropping the lowest-ranked non-required selected line if needed).
- Pass the resulting basket through validateBasket(). Label it source: "fallback" and sourceBadge: "Deterministic fallback — AI unavailable". Never present the fallback as AI output.

Fallback Fixture Arithmetic (Verified in Integer Cents — Do NOT Alter):

The deterministic fallback takes 1 pack each and intentionally does NOT reproduce the $180.00 / $139.80 AI baskets:

Scenario A Inputs ($250.00 = 25000 cents, minEarringPackShare: 0.6):

Top 5 SKUs by ratio at 1 pack each:

- E-02 (1 pack = 6 × $4.20 = $25.20 / 2520 cents — note: $25.20 is the 1-pack price; $50.40 is the 2-pack price)
- E-01 (1 pack = 6 × $3.50 = $21.00 / 2100 cents)
- E-05 (1 pack = 6 × $3.90 = $23.40 / 2340 cents)
- N-01 (1 pack = 6 × $7.50 = $45.00 / 4500 cents)
- B-03 (1 pack = 6 × $6.20 = $37.20 / 3720 cents)

Sum of 1-pack addends: 25.20 + 21.00 + 23.40 + 45.00 + 37.20 = $151.80 (15180 cents), 30 units, 5 packs, earring share 3 / 5 = 60.0% ✓.

Scenario B Inputs ($150.00 = 15000 cents, minEarringPackShare: 0.6, mustIncludeCategory: "Necklaces"):

First 4 SKUs at 1 pack each: E-02 ($25.20) + E-01 ($21.00) + E-05 ($23.40) + N-01 ($45.00) = $114.60 (11460 cents).

5th SKU in rank order is B-03 ($37.20): 114.60 + 37.20 = $151.80 > $150.00 → skipped.

6th SKU in rank order is E-03 ($34.80 / 3480 cents): 114.60 + 34.80 = $149.40 (14940 cents) <= $150.00 → selected, reaching 5 SKUs (E-02, E-01, E-05, N-01, E-03), 30 units, 5 packs, earring share 4 / 5 = 80.0% ✓, includes "Necklaces" (N-01) ✓.

### 4.4 Complete Implementation of src/lib/validate.ts

```ts
import { CATALOG, CATALOG_ITEMS } from "./data";
import { PACK_SIZE } from "./quote";
import {
  BasketSource,
  CatalogItem,
  EnrichedSelectedLine,
  EnrichedSkippedLine,
  ParsedConstraints,
  RawSelectedLine,
  RawSkippedLine,
  ValidatedBasket,
} from "./types";

export function urgencyRatio(item: CatalogItem): number {
  return item.soldLast14Days / (item.stockOnHand + 1);
}

export function validateBasket(
  selected: RawSelectedLine[],
  skipped: RawSkippedLine[] | undefined,
  budgetDollars: number,
  constraints?: ParsedConstraints,
  options?: {
    source?: BasketSource;
    repaired?: boolean;
  }
): ValidatedBasket {
  const cents = Math.round(budgetDollars * 100);
  if (!Number.isFinite(budgetDollars) || cents <= 0 || cents > 1_000_000) {
    throw new Error("invalid_budget");
  }
  if (!Array.isArray(selected) || selected.length < 3 || selected.length > 6) {
    throw new Error("invalid_item_count");
  }

  const seen = new Set<string>();
  let totalCents = 0;
  let totalUnits = 0;
  let totalPacks = 0;
  let earringPacks = 0;

  const enrichedSelected: EnrichedSelectedLine[] = [];

  for (const it of selected) {
    if (!it || typeof it !== "object") throw new Error("invalid_line");
    const rawAny = it as Record<string, unknown>;
    if (
      "price" in rawAny ||
      "priceCents" in rawAny ||
      "unitPrice" in rawAny ||
      "lineTotal" in rawAny ||
      "total" in rawAny
    ) {
      throw new Error("ai_price_fields_rejected");
    }

    const sku = CATALOG.get(it.skuId);
    if (!sku) throw new Error("unknown_sku:" + it.skuId);
    if (seen.has(it.skuId)) throw new Error("duplicate_sku:" + it.skuId);
    seen.add(it.skuId);

    if (!Number.isInteger(it.packs) || it.packs < 1 || it.packs > 2) {
      throw new Error("invalid_packs");
    }

    const units = it.packs * PACK_SIZE;
    const packPriceCents = sku.priceCents * PACK_SIZE;
    const lineTotalCents = units * sku.priceCents;

    totalCents += lineTotalCents;
    totalUnits += units;
    totalPacks += it.packs;
    if (sku.category === "Earrings") {
      earringPacks += it.packs;
    }

    enrichedSelected.push({
      skuId: sku.skuId,
      name: sku.name,
      category: sku.category,
      packs: it.packs,
      units,
      unitPriceCents: sku.priceCents,
      packPriceCents,
      lineTotalCents,
      stockOnHand: sku.stockOnHand,
      soldLast14Days: sku.soldLast14Days,
      reason: String(it.reason || "").slice(0, 120),
    });
  }

  if (totalCents > cents) {
    throw new Error("budget_exceeded");
  }

  const skippedArr = skipped ?? [];
  if (skippedArr.length > 3) {
    throw new Error("invalid_skipped_count");
  }

  const skippedSeen = new Set<string>();
  const enrichedSkipped: EnrichedSkippedLine[] = [];
  for (const s of skippedArr) {
    if (seen.has(s.skuId)) throw new Error("skipped_overlaps_selected");
    if (skippedSeen.has(s.skuId)) throw new Error("duplicate_skipped");
    skippedSeen.add(s.skuId);
    const sku = CATALOG.get(s.skuId);
    if (!sku) throw new Error("unknown_skipped_sku:" + s.skuId);

    enrichedSkipped.push({
      skuId: sku.skuId,
      name: sku.name,
      category: sku.category,
      unitPriceCents: sku.priceCents,
      packPriceCents: sku.priceCents * PACK_SIZE,
      stockOnHand: sku.stockOnHand,
      soldLast14Days: sku.soldLast14Days,
      reason: String(s.reason || "").slice(0, 120),
    });
  }

  if (constraints?.mustIncludeCategory) {
    const ok = enrichedSelected.some(
      (it) => it.category === constraints.mustIncludeCategory
    );
    if (!ok) throw new Error("missing_required_category");
  }

  if (constraints?.minEarringPackShare) {
    const requiredShare = constraints.minEarringPackShare;
    if (earringPacks / totalPacks + 1e-9 < requiredShare) {
      throw new Error("earring_share_too_low");
    }
  }

  const source: BasketSource = options?.source ?? "ai";
  const repaired = Boolean(options?.repaired);
  const sourceBadge =
    source === "preset"
      ? "Sample basket — preset, not AI output"
      : source === "fallback"
      ? "Deterministic fallback — AI unavailable"
      : "AI recommendation — server validated";

  return {
    source,
    sourceBadge,
    repaired,
    repairNote: repaired ? "Adjusted to fit budget" : undefined,
    budgetCents: cents,
    totalCents,
    remainingCents: cents - totalCents,
    budgetUsedPct: Number(((totalCents / cents) * 100).toFixed(1)),
    totalPacks,
    totalUnits,
    earringPackSharePct: Number(((earringPacks / totalPacks) * 100).toFixed(1)),
    selected: enrichedSelected,
    skipped: enrichedSkipped,
  };
}

function satisfiesConstraintsAfterChange(
  candidateLines: RawSelectedLine[],
  constraints?: ParsedConstraints
): boolean {
  if (candidateLines.length < 3) return false;
  if (constraints?.mustIncludeCategory) {
    const hasCat = candidateLines.some(
      (l) => CATALOG.get(l.skuId)?.category === constraints.mustIncludeCategory
    );
    if (!hasCat) return false;
  }
  if (constraints?.minEarringPackShare) {
    const totalPacks = candidateLines.reduce((acc, l) => acc + l.packs, 0);
    const earringPacks = candidateLines
      .filter((l) => CATALOG.get(l.skuId)?.category === "Earrings")
      .reduce((acc, l) => acc + l.packs, 0);
    if (earringPacks / totalPacks + 1e-9 < constraints.minEarringPackShare) {
      return false;
    }
  }
  return true;
}

export function repairBasket(
  rawSelected: RawSelectedLine[],
  rawSkipped: RawSkippedLine[] | undefined,
  budgetDollars: number,
  constraints?: ParsedConstraints
): ValidatedBasket {
  const budgetCents = Math.round(budgetDollars * 100);

  // Clean up unknown/duplicate SKUs and clamp packs to 1..2
  const seen = new Set<string>();
  const working: RawSelectedLine[] = [];
  for (const item of rawSelected) {
    if (!item?.skuId || !CATALOG.has(item.skuId) || seen.has(item.skuId)) {
      continue;
    }
    seen.add(item.skuId);
    const clampedPacks = Math.min(2, Math.max(1, Math.round(item.packs || 1)));
    working.push({
      skuId: item.skuId,
      packs: clampedPacks,
      reason: String(item.reason || "Selected based on recent velocity"),
    });
  }

  const computeTotal = (lines: RawSelectedLine[]) =>
    lines.reduce(
      (sum, l) =>
        sum + l.packs * PACK_SIZE * (CATALOG.get(l.skuId)?.priceCents ?? 0),
      0
    );

  // Reduce or drop lowest-ranked line until within 6 items and <= budgetCents
  let guard = 0;
  while (
    (working.length > 6 || computeTotal(working) > budgetCents) &&
    guard < 25
  ) {
    guard++;
    // Rank indices by lowest urgencyRatio first; tie-break: last in the AI's array (larger index first)
    const rankedIndices = working
      .map((line, idx) => ({
        idx,
        line,
        ratio: urgencyRatio(CATALOG.get(line.skuId)!),
      }))
      .sort((a, b) => {
        if (Math.abs(a.ratio - b.ratio) > 1e-9) return a.ratio - b.ratio;
        return b.idx - a.idx;
      });

    let modified = false;
    for (const candidate of rankedIndices) {
      const target = working[candidate.idx];
      // Option 1: if packs === 2 and we don't exceed 6 items, try reducing packs 2 -> 1
      if (target.packs > 1 && working.length <= 6) {
        const nextLines = working.map((l, i) =>
          i === candidate.idx ? { ...l, packs: l.packs - 1 } : l
        );
        if (satisfiesConstraintsAfterChange(nextLines, constraints)) {
          working[candidate.idx].packs -= 1;
          modified = true;
          break;
        }
      }
      // Option 2: drop the line if > 3 lines remain
      if (working.length > 3) {
        const nextLines = working.filter((_, i) => i !== candidate.idx);
        if (satisfiesConstraintsAfterChange(nextLines, constraints)) {
          working.splice(candidate.idx, 1);
          modified = true;
          break;
        }
      }
    }

    if (!modified) {
      throw new Error("repair_impossible_without_violating_constraints");
    }
  }

  const selectedSet = new Set(working.map((w) => w.skuId));
  const seenSkipped = new Set<string>();
  const cleanedSkipped: RawSkippedLine[] = [];
  for (const s of rawSkipped ?? []) {
    if (
      s?.skuId &&
      CATALOG.has(s.skuId) &&
      !selectedSet.has(s.skuId) &&
      !seenSkipped.has(s.skuId) &&
      cleanedSkipped.length < 3
    ) {
      seenSkipped.add(s.skuId);
      cleanedSkipped.push({
        skuId: s.skuId,
        reason: String(s.reason || "Skipped to stay within budget"),
      });
    }
  }

  return validateBasket(working, cleanedSkipped, budgetDollars, constraints, {
    source: "ai",
    repaired: true,
  });
}

export function buildFallbackBasket(
  budgetDollars: number,
  constraints?: ParsedConstraints
): ValidatedBasket {
  const budgetCents = Math.round(budgetDollars * 100);
  if (!Number.isFinite(budgetDollars) || budgetCents <= 0 || budgetCents > 1_000_000) {
    throw new Error("invalid_budget");
  }

  // Sort by soldLast14Days / (stockOnHand + 1) desc, tie-break soldLast14Days desc, then skuId asc
  const sortedCatalog = [...CATALOG_ITEMS].sort((a, b) => {
    const ratioDiff = urgencyRatio(b) - urgencyRatio(a);
    if (Math.abs(ratioDiff) > 1e-9) return ratioDiff;
    if (b.soldLast14Days !== a.soldLast14Days) {
      return b.soldLast14Days - a.soldLast14Days;
    }
    return a.skuId.localeCompare(b.skuId);
  });

  const selected: RawSelectedLine[] = [];
  const skipped: RawSkippedLine[] = [];
  let runningCents = 0;

  for (const sku of sortedCatalog) {
    if (selected.length >= 5) {
      if (skipped.length < 2) {
        skipped.push({
          skuId: sku.skuId,
          reason: `${sku.soldLast14Days} sold, ${sku.stockOnHand} in stock — lower restock urgency.`,
        });
      }
      continue;
    }

    const onePackCents = sku.priceCents * PACK_SIZE;
    if (runningCents + onePackCents <= budgetCents) {
      selected.push({
        skuId: sku.skuId,
        packs: 1,
        reason: `${sku.soldLast14Days} sold in 14 days, ${sku.stockOnHand} in stock.`,
      });
      runningCents += onePackCents;
    } else if (skipped.length < 3) {
      skipped.push({
        skuId: sku.skuId,
        reason: `${sku.soldLast14Days} sold, ${sku.stockOnHand} in stock — skipped to fit budget.`,
      });
    }
  }

  // Enforce mustIncludeCategory if missing
  if (constraints?.mustIncludeCategory) {
    const reqCat = constraints.mustIncludeCategory;
    const hasCategory = selected.some(
      (s) => CATALOG.get(s.skuId)?.category === reqCat
    );
    if (!hasCategory) {
      const cheapestInCategory = [...CATALOG_ITEMS]
        .filter((c) => c.category === reqCat)
        .sort((a, b) => a.priceCents - b.priceCents)[0];

      if (cheapestInCategory) {
        const reqCost = cheapestInCategory.priceCents * PACK_SIZE;
        while (
          selected.length > 0 &&
          (selected.length >= 5 || runningCents + reqCost > budgetCents)
        ) {
          // Drop lowest-ranked non-required line from the tail
          const removed = selected.pop()!;
          runningCents -=
            (CATALOG.get(removed.skuId)?.priceCents ?? 0) * PACK_SIZE;
        }
        if (runningCents + reqCost <= budgetCents) {
          selected.push({
            skuId: cheapestInCategory.skuId,
            packs: 1,
            reason: `${cheapestInCategory.soldLast14Days} sold, ${cheapestInCategory.stockOnHand} in stock — required category.`,
          });
          runningCents += reqCost;
        }
      }
    }
  }

  return validateBasket(selected, skipped.slice(0, 3), budgetDollars, constraints, {
    source: "fallback",
    repaired: false,
  });
}
```

### 4.5 Complete Implementation of src/lib/ai.ts and src/app/api/recommend/route.ts

src/lib/ai.ts

```ts
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
```

src/app/api/recommend/route.ts

```ts
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
```

### 4.6 Complete Unit Test Suite (src/__tests__/validate-and-quote.test.ts)

Every required test is named below with its exact input and expected assertion. Run with npx vitest run.

```ts
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
```

## §5 Single-Screen Workbench UI (src/app/page.tsx)

### 5.1 UI Structure & Required Copy

Header: "Restock Rescue | Northstar Jewelry Supply — Fall Restock | Sandbox Mode" and subtitle "Based on sales from Oct 27 – Nov 9 and current stock coverage."

Step 1 — The Ask Card:

- Budget input ($250.00 default) + instruction textarea.
- Live AI Scenario buttons: "Scenario A ($250 — Weekend Restock)" and "Scenario B ($150 — Display Necklace Tradeoff)" (both call live Gemini AI).
- Labeled Pinned Preset links (?demo=preset-a / ?demo=preset-b): explicitly labeled "Load Pinned Sample A (Preset, Non-AI)" and "Load Pinned Sample B (Preset, Non-AI)".

Step 2 — The Validated Basket Card:

- Source Badge: Shows "AI recommendation — server validated" (emerald), "Deterministic fallback — AI unavailable" (amber), or "Sample basket — preset, not AI output" (amber). If basket.repaired is true, also displays "Adjusted to fit budget".
- Budget Progress Bar:
  - Scenario A displays: "$180.00 / $250.00 — 72% used, $70.00 left"
  - Scenario B displays: "$139.80 / $150.00 — 93.2% used, $10.20 left"
- Selected SKUs Table: Columns for SKU & Product, Category, Velocity (soldLast14Days sold / stockOnHand in stock), Packs & Units (2 packs (12 units)), Line Total ($50.40), and Reason.
- Skipped SKUs Section (Always Rendered, Not Collapsible): Muted card listing each skipped SKU, its 1-pack price, velocity/stock, and why it was skipped.
- Signed Quote Metadata Strip: Displays quoteId, expiration timestamp (15 min TTL), and the statement: "Signed quote proves server issuance and basket integrity only. When the basket changes, a new signature is issued and approval resets."

Step 3 — Human Approval Checkbox & PayPal Sandbox Checkout:

- Checkbox label: "I have reviewed this basket. I understand this is the exact basket PayPal will charge."
- Generating or loading a new basket immediately resets approved to false, clears any prior receipt/error state, and displays the banner: "New basket, new signature. Approval resets."
- PayPal Buttons render only when approved === true and receipt === null.
- Payment label directly above the button: "Sandbox checkout (not production) — Wholesale price, tax & shipping excluded for demo clarity".
- onCancel shows "Payment cancelled — your basket is unchanged."
- onError or failed create/capture shows a plain-language error banner with a "Try Again" button (never a stuck "processing" state).

Step 4 — Completed Sandbox Receipt Card:

- Green card showing Status: COMPLETED, PayPal Capture ID, PayPal Order ID, Signed Quote ID, Amount Captured, Payer Name & Email, Timestamp, and Basket Summary ("30 units, 4 SKUs — Northstar Jewelry Supply").
- Footer: "All catalog, sales, and stock data are synthetic and for demo only. Northstar Jewelry Supply is a fictional merchant."

### 5.2 Complete Implementation of src/app/page.tsx

```tsx
"use client";

import React, { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import {
  CaptureReceipt,
  RecommendResponse,
  SignedQuotePayload,
  ValidatedBasket,
} from "@/lib/types";

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function RestockRescuePage() {
  const [budget, setBudget] = useState<string>("250");
  const [instruction, setInstruction] = useState<string>(
    "Prioritize earrings. I need to restock for this weekend."
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [basket, setBasket] = useState<ValidatedBasket | null>(null);
  const [quote, setQuote] = useState<SignedQuotePayload | null>(null);
  const [token, setToken] = useState<string>("");
  const [approved, setApproved] = useState<boolean>(false);
  const [resetNotice, setResetNotice] = useState<boolean>(false);
  const [receipt, setReceipt] = useState<CaptureReceipt | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  async function requestRecommendation(opts?: {
    budgetOverride?: string;
    instructionOverride?: string;
    preset?: "preset-a" | "preset-b";
  }) {
    const hadPreviousBasket = basket !== null;
    setLoading(true);
    setErrorMsg(null);
    setCancelMsg(null);
    setReceipt(null);
    setApproved(false);
    if (hadPreviousBasket) {
      setResetNotice(true);
    }

    const targetBudget = opts?.budgetOverride ?? budget;
    const targetInstruction = opts?.instructionOverride ?? instruction;

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          opts?.preset
            ? { preset: opts.preset }
            : { budget: Number(targetBudget), instruction: targetInstruction }
        ),
      });
      const data = (await res.json()) as RecommendResponse & { error?: string };
      if (!res.ok || !data.basket || !data.token) {
        throw new Error(
          data.error || "Unable to generate a validated restock basket."
        );
      }
      setBasket(data.basket);
      setQuote(data.quote);
      setToken(data.token);
    } catch (err: any) {
      setErrorMsg(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Support ?demo=preset-a and ?demo=preset-b on initial load
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const demo = params.get("demo");
    if (demo === "preset-a") {
      setBudget("250");
      setInstruction("Prioritize earrings. I need to restock for this weekend.");
      requestRecommendation({ preset: "preset-a" });
    } else if (demo === "preset-b") {
      setBudget("150");
      setInstruction(
        "Prioritize earrings, but I need at least one necklace for the display table."
      );
      requestRecommendation({ preset: "preset-b" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalClientId,
        currency: "USD",
        intent: "capture",
        components: "buttons",
      }}
    >
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        <header className="bg-slate-900 text-white border-b border-slate-800 py-4 px-6">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Restock Rescue | Northstar Jewelry Supply — Fall Restock | Sandbox Mode
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Based on sales from Oct 27 – Nov 9 and current stock coverage.
              </p>
            </div>
            <span className="text-xs font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2.5 py-1 rounded">
              Data: Oct 27 – Nov 9 sales (Synthetic)
            </span>
          </div>
        </header>

        <main className="max-w-5xl w-full mx-auto py-8 px-6 space-y-6 flex-1">
          {/* SECTION 1: THE ASK */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-semibold">
                1. Restock Budget & Buying Instruction
              </h2>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const b = "250";
                    const inst =
                      "Prioritize earrings. I need to restock for this weekend.";
                    setBudget(b);
                    setInstruction(inst);
                    requestRecommendation({
                      budgetOverride: b,
                      instructionOverride: inst,
                    });
                  }}
                  className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
                >
                  Scenario A ($250 — Live AI)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const b = "150";
                    const inst =
                      "Prioritize earrings, but I need at least one necklace for the display table.";
                    setBudget(b);
                    setInstruction(inst);
                    requestRecommendation({
                      budgetOverride: b,
                      instructionOverride: inst,
                    });
                  }}
                  className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
                >
                  Scenario B ($150 — Live AI)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBudget("250");
                    setInstruction(
                      "Prioritize earrings. I need to restock for this weekend."
                    );
                    requestRecommendation({ preset: "preset-a" });
                  }}
                  className="px-2.5 py-1.5 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900"
                >
                  Sample Preset A (Non-AI)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBudget("150");
                    setInstruction(
                      "Prioritize earrings, but I need at least one necklace for the display table."
                    );
                    requestRecommendation({ preset: "preset-b" });
                  }}
                  className="px-2.5 py-1.5 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900"
                >
                  Sample Preset B (Non-AI)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Budget (USD)
                </label>
                <input
                  type="number"
                  min="20"
                  max="10000"
                  step="1"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-semibold"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Buyer Priority / Constraint
                </label>
                <input
                  type="text"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                  placeholder="e.g., Prioritize earrings, need one necklace for display"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                1 pack = 6 units. Max 2 packs per SKU. Prices come exclusively from the server catalog.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => requestRecommendation()}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm"
              >
                {loading ? "Validating Restock Plan..." : "Get My Restock Plan"}
              </button>
            </div>
          </section>

          {/* ERROR BANNER */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-300 text-red-900 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Action Required</p>
                <p className="text-xs mt-0.5">{errorMsg}</p>
              </div>
              <button
                type="button"
                onClick={() => requestRecommendation()}
                className="px-3 py-1.5 rounded bg-red-700 text-white text-xs font-semibold"
              >
                Try Again
              </button>
            </div>
          )}

          {/* SECTION 2: THE BASKET */}
          {basket && quote && (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
              {resetNotice && (
                <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-3.5 py-2 rounded-lg text-xs font-medium">
                  New basket, new signature. Approval resets.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">
                    2. Server-Validated Restock Basket ({basket.totalUnits} units,{" "}
                    {basket.selected.length} SKUs)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Wholesale price, tax &amp; shipping excluded for demo clarity.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                      basket.source === "ai"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-amber-50 text-amber-900 border-amber-300"
                    }`}
                  >
                    {basket.sourceBadge}
                  </span>
                  {basket.repaired && basket.repairNote && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-300">
                      {basket.repairNote}
                    </span>
                  )}
                </div>
              </div>

              {/* BUDGET BAR */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between text-sm font-semibold mb-1.5">
                  <span>
                    {formatMoney(basket.totalCents)} /{" "}
                    {formatMoney(basket.budgetCents)} — {basket.budgetUsedPct}%
                    used, {formatMoney(basket.remainingCents)} left
                  </span>
                  <span className="text-xs text-slate-600">
                    Earring pack share: {basket.earringPackSharePct}% (
                    {basket.totalPacks} total packs)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{
                      width: `${Math.min(100, basket.budgetUsedPct)}%`,
                    }}
                  />
                </div>
              </div>

              {/* SELECTED LINES TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="py-2 pr-3">SKU / Product</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">14d Velocity / Stock</th>
                      <th className="py-2 px-3">Packs (Units)</th>
                      <th className="py-2 px-3">Line Total</th>
                      <th className="py-2 pl-3">Buying Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {basket.selected.map((line) => (
                      <tr key={line.skuId}>
                        <td className="py-3 pr-3 font-medium">
                          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded mr-1.5">
                            {line.skuId}
                          </span>
                          {line.name}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600">
                          {line.category}
                        </td>
                        <td className="py-3 px-3 text-xs">
                          <span className="font-semibold">
                            {line.soldLast14Days} sold
                          </span>{" "}
                          / {line.stockOnHand} in stock
                        </td>
                        <td className="py-3 px-3 font-medium">
                          {line.packs} {line.packs === 1 ? "pack" : "packs"} (
                          {line.units}u @ {formatMoney(line.unitPriceCents)})
                        </td>
                        <td className="py-3 px-3 font-bold">
                          {formatMoney(line.lineTotalCents)}
                        </td>
                        <td className="py-3 pl-3 text-xs text-slate-700">
                          {line.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SKIPPED SECTION (ALWAYS RENDERED, NOT COLLAPSIBLE) */}
              {basket.skipped.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="text-xs font-semibold uppercase text-slate-500 mb-2">
                    Considered &amp; Skipped (Tradeoff Log)
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {basket.skipped.map((sk) => (
                      <li key={sk.skuId}>
                        <span className="font-mono font-semibold text-slate-800">
                          {sk.skuId} {sk.name}
                        </span>{" "}
                        (1 pack = {formatMoney(sk.packPriceCents)};{" "}
                        {sk.soldLast14Days} sold, {sk.stockOnHand} in stock) —{" "}
                        {sk.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SIGNED QUOTE METADATA */}
              <div className="text-xs text-slate-500 bg-slate-50 px-3.5 py-2.5 rounded border border-slate-200 flex flex-wrap justify-between gap-2">
                <span>
                  Signed Quote ID:{" "}
                  <code className="font-mono text-slate-700">
                    {quote.quoteId}
                  </code>
                </span>
                <span>
                  HMAC-SHA256 proves server issuance + integrity only (expires{" "}
                  {new Date(quote.exp * 1000).toLocaleTimeString()}).
                </span>
              </div>

              {/* APPROVAL CHECKBOX & PAYPAL BUTTONS */}
              {!receipt && (
                <div className="pt-3 border-t border-slate-200 space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={approved}
                      onChange={(e) => {
                        setApproved(e.target.checked);
                        setCancelMsg(null);
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    <span className="text-sm font-medium text-slate-800">
                      I have reviewed this basket. I understand this is the exact
                      basket PayPal will charge.
                    </span>
                  </label>

                  {cancelMsg && (
                    <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded">
                      {cancelMsg}
                    </div>
                  )}

                  {approved && (
                    <div className="max-w-md space-y-2">
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Sandbox checkout (not production) — Exact total:{" "}
                        {formatMoney(basket.totalCents)}
                      </p>
                      <PayPalButtons
                        style={{ layout: "vertical" }}
                        createOrder={async () => {
                          setErrorMsg(null);
                          setCancelMsg(null);
                          const res = await fetch("/api/paypal/create-order", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ token }),
                          });
                          const data = await res.json();
                          if (!res.ok || !data.orderID) {
                            throw new Error(
                              data.error || "Failed to create PayPal order"
                            );
                          }
                          return data.orderID as string;
                        }}
                        onApprove={async (data) => {
                          try {
                            const res = await fetch(
                              "/api/paypal/capture-order",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  orderID: data.orderID,
                                  token,
                                }),
                              }
                            );
                            const out = await res.json();
                            if (!res.ok || !out.receipt) {
                              throw new Error(
                                out.error || "Failed to capture PayPal order"
                              );
                            }
                            setReceipt(out.receipt as CaptureReceipt);
                          } catch (err: any) {
                            setErrorMsg(
                              err?.message ||
                                "Payment capture failed. Please try again."
                            );
                          }
                        }}
                        onCancel={() => {
                          setCancelMsg(
                            "Payment cancelled — your basket is unchanged."
                          );
                        }}
                        onError={(err) => {
                          setErrorMsg(
                            `PayPal checkout error: ${
                              err?.message || "Could not complete sandbox payment."
                            }`
                          );
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* SECTION 3: THE COMPLETED RECEIPT */}
          {receipt && (
            <section className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-emerald-950">
                  3. Sandbox Payment Completed — Verified Receipt
                </h2>
                <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold uppercase">
                  Status: {receipt.status}
                </span>
              </div>
              <p className="text-xs text-emerald-900">
                Sandbox checkout (not production) — Real PayPal Orders v2 sandbox capture verified against signed quote.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm bg-white p-4 rounded-lg border border-emerald-200">
                <div>
                  <span className="text-xs text-slate-500 block">
                    PayPal Capture ID
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {receipt.captureId}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">
                    PayPal Order ID
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {receipt.orderId}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">
                    Amount Captured
                  </span>
                  <span className="font-bold text-emerald-700">
                    ${receipt.amountValue} {receipt.currencyCode}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Payer</span>
                  <span className="font-medium text-slate-800">
                    {receipt.payerName} ({receipt.payerEmail})
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">
                    Timestamp
                  </span>
                  <span className="font-mono text-xs text-slate-700">
                    {receipt.capturedAt}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">
                    Basket Summary
                  </span>
                  <span className="font-semibold text-slate-900">
                    {receipt.totalUnits} units, {receipt.skuCount} SKUs —{" "}
                    {receipt.merchantName}
                  </span>
                </div>
              </div>
            </section>
          )}
        </main>

        <footer className="bg-slate-900 text-slate-400 text-xs py-4 px-6 border-t border-slate-800">
          <div className="max-w-5xl mx-auto flex flex-wrap justify-between gap-2">
            <span>
              All catalog, sales, and stock data are synthetic and for demo only.
            </span>
            <span>
              Merchant: Northstar Jewelry Supply (Fictional) | Sandbox Checkout Only
            </span>
          </div>
        </footer>
      </div>
    </PayPalScriptProvider>
  );
}
```

## §6 2:45 Video Script (Pays Scenario B — $139.80, 30 Units, 4 SKUs)

Format: 2 minutes 45 seconds, one continuous 1080p screen capture with voiceover (OBS or Loom, no face cam needed, simple cuts only).

Recording Target: Record Wednesday night on the live deployed Vercel URL (not localhost), upload to YouTube Public, and test the link in an incognito window.

| Timestamp | Shot | Exact On-Screen Action & Voiceover |
|---|---|---|
| 0:00–0:20 | The Problem | Screen: Live Vercel URL showing Northstar Jewelry Supply workbench. Voiceover: "I'm Minkyu. I work in fashion jewelry wholesale, and I've seen how independent boutiques struggle to decide what to restock. They have a $250 budget, a catalog to sort through, and no time. Restock Rescue turns that budget into a purchase they can inspect and pay for." |
| 0:20–0:35 | The Ask (Scenario A) | Screen: Enter $250, enter "Prioritize earrings. I need to restock for this weekend." Click Get My Restock Plan. |
| 0:35–1:05 | The Basket ($180.00) | Screen: Basket appears ($180.00 / $250.00 — 72% used, $70.00 left). Point to the lines and the Skipped section. Voiceover: "Pearl studs — 22 sold, zero left. Hoops — 18 sold, two left. That's 42 units for $180, $70 left over. It didn't just spend my budget." |
| 1:05–1:30 | The Tradeoff (Scenario B) | Screen: Change budget to $150, add "need at least one necklace for the display table." Click Get My Restock Plan. New basket appears ($139.80, 30 units, 4 SKUs: E-02 2 packs $50.40, E-01 1 pack $21.00, E-05 1 pack $23.40, N-01 1 pack $45.00). Point to the reset banner and checkbox. Voiceover: "It protected the pearl studs, the huggie hoops, reduced the mini hoops to one pack, kept the display necklace, and sacrificed the ring. Same data, different decision. New basket, new signature. Approval resets." |
| 1:30–2:15 | The Payment ($139.80) | Screen: Tick the approval checkbox. Click the PayPal button. Log in as the sandbox Personal buyer in the popup and click Pay. Show the green COMPLETED receipt card with the real Capture ID and "30 units, 4 SKUs — Northstar Jewelry Supply". Voiceover: "This is a sandbox checkout — not production — but a real PayPal sandbox capture for the exact basket I just approved. $139.80, 30 units, 4 SKUs." |
| 2:15–2:45 | The Close | Screen: Title slide with GitHub repo URL and live demo URL. Voiceover: "The AI proposed the basket. The server checked every price and the budget, and issued a signed quote proving server issuance and integrity. I signaled my intent via the checkbox, and PayPal buyer approval settled that exact basket. Built for independent boutiques who can't afford to guess." |

## §7 Official Devpost Submission Checklist (All 16 Items Required)

- [ ] 1. Project title (Restock Rescue) + one-line tagline (Agentic B2B wholesale restock planner with server-validated quotes and PayPal Orders v2 checkout).
- [ ] 2. Complete Devpost description sections: What it does; The problem + target users; How PayPal and AI are used; How it was built; Challenges faced; What's next.
- [ ] 3. Tools used identified + explanation of how each was used (PayPal Orders API v2, PayPal JS SDK, Google Gemini gemini-3.8-flash via @google/genai, Next.js, TypeScript, Tailwind CSS).
- [ ] 4. Public GitHub repository URL with root LICENSE file (MIT License detected in GitHub sidebar) and zero .env or secret values in commit history.
- [ ] 5. Complete README.md containing: project overview; prerequisites (Node.js 20+, PayPal Developer account, Sandbox Business + Personal accounts, Gemini API key); install + run steps (npm install, npm run dev, npx vitest run); environment variable table + .env.example; how to use the demo (including ?demo=preset-a and ?demo=preset-b); explicit synthetic data disclosure; tamper test steps (modifying packs in a signed quote triggers signature_mismatch); exact cryptographic boundary statement ("HMAC proves server issuance + integrity only, not owner approval; checkbox is a human-intent signal"); and the exact one-line serverless note: "Quote store and rate limiter are in-memory only; single-instance demo limitation. Not production."
- [ ] 6. Hosted live demo URL on Vercel (https://...vercel.app).
- [ ] 7. YouTube video URL set to Public (not Unlisted or Private), under 3:00 (2:45), verified in an incognito browser window while logged out.
- [ ] 8. High-resolution screenshots uploaded to Devpost, including the green COMPLETED PayPal sandbox receipt card.
- [ ] 9. Devpost "Built with" tags populated: paypal, gemini, nextjs, typescript, tailwindcss.
- [ ] 10. Third-party SDK and API usage disclosure completed on the Devpost form.
- [ ] 11. Brand and permission check passed: merchant is Northstar Jewelry Supply everywhere (code, UI, README, video, Devpost, PayPal Sandbox Business account name); zero real employer names or real business data anywhere.
- [ ] 12. Sandbox test accounts and step-by-step judge testing guide included in both README.md and Devpost testing instructions (Business = merchant, Personal = buyer; account email identifiers only — never passwords). Test steps: enter budget $250.00, instruction "Prioritize earrings", expected result = validated basket within budget + PayPal sandbox capture (plus ?demo=preset-b link for deterministic $139.80 verification).
- [ ] 13. PayPal Sandbox app credentials and Vercel environment variables kept active and unrotated through December 15, 2026, 11:00 AM ET (judging window ends 8:00 AM PT).
- [ ] 14. Explicit statement in the submission that the project was built fresh during the hackathon period.
- [ ] 15. Click the final Submit button on Devpost before 12:00 PM ET Thursday, November 12, 2026 (a saved draft does not count) and verify the public gallery page while logged out.
- [ ] 16. Honest payment labeling verified everywhere: "Sandbox checkout (not production)" and "real PayPal sandbox capture" — zero "real money" claims.

## §8 Build Schedule (Tuesday Evening, Wednesday Evening, Thursday Morning)

Realistic Workload & Gate Rule: Total real work is 14–20 hours (16–18h typical). Because Tuesday and Wednesday evenings offer limited focused hours after a day job, the plan fits only if all cuts hold and the PayPal $1.00 sandbox gate is green in the first 45 minutes on Tuesday. If the PayPal gate is not green by minute 45 on Tuesday, immediately simplify AI repair complexity or UI visual polish before writing UI code.

| Window | Time Block | Numbered Build Deliverable | Planned Hours |
|---|---|---|---|
| Tuesday Evening (Nov 10) | 0:00–0:30 | Step 1: Create public GitHub repo, commit root LICENSE (MIT), .gitignore, .env.example, and skeleton README.md. | 0.5h |
| Sprint 1 (~5.0h) | 0:30–1:00 | Step 2: Initialize Next.js 14+ TypeScript Tailwind app (npm i @google/genai @paypal/react-paypal-js zod and npm i -D vitest) and deploy initial scaffold to Vercel. | 0.5h |
|  | 1:00–1:30 | Step 3 (THE 45-MIN GATE): Create PayPal Sandbox App (Northstar Jewelry Supply), verify Business + Personal account balances, run curl OAuth token test, and complete a $1.00 create → approve → capture test. | 0.5h |
|  | 1:30–2:30 | Step 4: Implement src/lib/types.ts, src/lib/data.ts (16 SKUs in cents + presets), src/lib/validate.ts, src/lib/quote.ts, and run npx vitest run (all 6 unit tests green). | 1.0h |
|  | 2:30–4:00 | Step 5: Implement src/lib/paypal.ts, /api/paypal/create-order/route.ts, and /api/paypal/capture-order/route.ts with ${quoteId}:create / ${quoteId}:capture idempotency and ORDER_ALREADY_CAPTURED handling. | 1.5h |
|  | 4:00–5:00 | Step 6: Implement src/lib/ai.ts (gemini-3.8-flash via @google/genai, JSON schema mode, 9-rule prompt) and /api/recommend/route.ts. Verify live AI + fallback + preset modes. | 1.0h |
| Wednesday Evening (Nov 11) | 0:00–2:00 | Step 7: Implement single-screen UI in src/app/page.tsx (Ask → Validated Basket → Skipped section → Receipt card). | 2.0h |
| Sprint 2 (~6.0h) | 2:00–3:30 | Step 8: Wire PayPal Buttons, approval checkbox reset on basket change ("New basket, new signature. Approval resets."), and error/cancel states. | 1.5h |
|  | 3:30–4:00 | Step 9: Verify budget progress bars (72% for A, 93.2% for B), source badges, and synthetic/sandbox labels. Push to Vercel production. | 0.5h |
|  | 4:00–4:30 | Step 10: Complete README.md (including tamper test and one-line serverless note) and draft all Devpost text sections. | 0.5h |
|  | 4:30–6:00 | Step 11: Record 2:45 demo video on the live Vercel URL (Scenario A → Scenario B → Pay $139.80 → COMPLETED receipt), upload to YouTube Public before midnight. | 1.5h |
| Thursday Morning (Nov 12) | 0:00–1:00 | Step 12: STOP BUILDING AT 10:00 AM ET. Perform fresh git clone install/test check and run live end-to-end verification on the Vercel URL. | 1.0h |
| Sprint 3 (~2.0h + 1.0h buffer) | 1:00–2:00 | Step 13: Fill Devpost form, verify all 16 checklist items in §7, click Submit by 12:00 PM ET, and verify live gallery entry while logged out. | 1.0h |
|  | 2:00–3:00 | Step 14: Contingency buffer before the 3:00 PM ET deadline (strictly for deployment or link access fixes — zero new features). | 1.0h |

### Stop and submit point

**STOP BUILDING Thu 10:00 AM ET.** Submit if: (1) the live URL returns a validated basket within budget, (2) a PayPal sandbox capture completes and displays a real Capture ID, (3) the video is under 3 minutes on YouTube Public, (4) the public GitHub repo has README + MIT License. Do NOT gate on Scenario A producing exactly $180.00. Do not add features. Do not redesign. Do not add Supabase. A submitted working demo beats a perfect unsubmitted one.

## §9 Risks & Mitigations

| # | Risk | Concrete Mitigation Built into v3 |
|---|---|---|
| 1 | PayPal sandbox fails at demo or judging time (OAuth error, insufficient buyer funds, popup blocked, double-click) | Tuesday $1.00 gate verified in first 45 minutes; buyer balance checked manually; ORDER_ALREADY_CAPTURED returns existing receipt; Wednesday video recording + README screenshot provide permanent proof of capture. |
| 2 | Live AI returns malformed JSON, duplicates, or over-budget lines | Enforced by @google/genai JSON schema + 1 retry + deterministic repairBasket() + explicit buildFallbackBasket() + ?demo=preset-a / ?demo=preset-b non-AI sample presets. The pipeline guarantees a valid basket OR a user-visible error state. |
| 3 | Low innovation score ("just another AI wrapper") | Pitch centers on the Agentic Commerce verification workflow: AI proposes → server validates prices & constraints in cents → HMAC signs server-issued quote → human signals intent via checkbox → PayPal buyer approval settles the exact validated basket. |
| 4 | Model availability on AI Studio free tier | Primary model is gemini-3.8-flash via @google/genai; verified Tuesday night with GEMINI_MODEL=gemini-3.5-flash-lite ready as an instant environment-variable fallback. |
| 5 | Public demo URL abused to exhaust Gemini quota | In-memory IP rate limiter (checkRateLimit(ip, 10) — 10 req/min/IP) on /api/recommend; GEMINI_API_KEY stays strictly server-side. |
| 6 | Employer brand or proprietary data leakage | Fictional merchant Northstar Jewelry Supply used everywhere; all 16 SKUs and velocity figures are synthetic and explicitly labeled in UI, README, video, and Devpost. |

## Appendix — Multi-Reviewer Consensus & Verification Log

Main Scenario Arithmetic Verified in Integer Cents:

Scenario A ($250.00 = 25000 cents): E-02×2 ($50.40 / 5040) + E-01×2 ($42.00 / 4200) + E-05×1 ($23.40 / 2340) + N-01×1 ($45.00 / 4500) + R-01×1 ($19.20 / 1920) = $180.00 (18000 cents), 42 units, 7 packs, 72.0% used, $70.00 left. Earrings: 5 / 7 ≈ 71.4% ≥ 60%.

Scenario B ($150.00 = 15000 cents): E-02×2 ($50.40 / 5040) + E-01×1 ($21.00 / 2100) + E-05×1 ($23.40 / 2340) + N-01×1 ($45.00 / 4500) = $139.80 (13980 cents), 30 units, 5 packs, 93.2% used, $10.20 left. Earrings: 4 / 5 = 80.0% ≥ 60%.

Fallback Fixtures Verified in Integer Cents (1 Pack Each):

Fallback A ($250.00 budget): E-02 ($25.20) + E-01 ($21.00) + E-05 ($23.40) + N-01 ($45.00) + B-03 ($37.20) = $151.80 (15180 cents), 30 units, 5 packs. (E-02 at 1 pack is 6 × $4.20 = $25.20, not the 2-pack price of $50.40.)

Fallback B ($150.00 budget): E-02 ($25.20) + E-01 ($21.00) + E-05 ($23.40) + N-01 ($45.00) + E-03 ($34.80) = $149.40 (14940 cents), 30 units, 5 packs (B-03 at $37.20 would total $151.80, exceeding $150.00, so it is skipped and E-03 at $34.80 fits: 114.60 + 34.80 = 149.40).

Tamper Test Guide for README.md (10-Minute Judge Verification):

Run npx vitest run to execute Test 6: Tampering with packs in a signed quote payload throws signature_mismatch, or run the following one-liner in curl against the running server after obtaining a token from /api/recommend:

```bash
curl -X POST http://localhost:3000/api/paypal/create-order \
  -H "Content-Type: application/json" \
  -d '{"token":"eyJ2IjoxLCJxdW90ZUlkIjoi...TAMPERED_PAYLOAD..."}'
```

Expected response: HTTP 400 with {"error":"signature_mismatch"}.
