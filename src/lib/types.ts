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
