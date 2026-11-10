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
