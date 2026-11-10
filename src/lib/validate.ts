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
    const rawAny = it as unknown as Record<string, unknown>;
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
