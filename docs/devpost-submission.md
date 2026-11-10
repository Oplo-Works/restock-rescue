# Restock Rescue — Devpost Submission Draft

**Project title:** Restock Rescue
**Tagline:** Agentic B2B wholesale restock planner with server-validated quotes and PayPal Orders v2 checkout.
**Built with:** paypal, gemini, nextjs, typescript, tailwindcss
**Live demo:** https://restock-rescue.vercel.app
**Repo:** https://github.com/Oplo-Works/restock-rescue
**Built fresh during the hackathon period:** Yes — this project was built fresh during the PayPal AI Hackathon.

## What it does

Restock Rescue turns an independent boutique owner's budget and plain-language buying instruction (e.g., "Prioritize earrings, but I need at least one necklace for the display table") into a validated, payable wholesale restock basket in one screen:

1. **Ask** — the owner enters a budget and priority instruction for Northstar Jewelry Supply (fictional wholesale merchant).
2. **Validated basket** — Gemini proposes 3–6 SKUs with pack counts and reasons; the server recomputes every price in integer cents from its own catalog, enforces the budget, the ≥60% earring pack-share and must-include-category constraints, repairs an over-budget basket deterministically (or falls back to a labeled deterministic basket), and issues an HMAC-SHA256 signed quote (15-minute expiry) binding quote ID, lines, and total.
3. **Approval + payment** — the owner reviews the basket and its "Considered & Skipped" tradeoff log, ticks a human-intent checkbox, and pays the exact signed basket through PayPal Orders v2 sandbox checkout. The capture is re-verified against the signed quote before a green COMPLETED receipt (with real Capture ID) is shown.

Every basket is labeled by source: "AI recommendation — server validated", "Deterministic fallback — AI unavailable", or "Sample basket — preset, not AI output". Nothing is presented as AI output that is not.

## The problem + target users

Independent fashion-jewelry boutiques restock from wholesalers under time pressure with a fixed budget. They must weigh recent sales velocity against stock on hand across a catalog, protect best-sellers, satisfy display and category needs, and stay in budget — usually in a spreadsheet, from memory, while running the shop. Guessing wrong means stockouts on the best sellers and cash tied up in slow lines.

Restock Rescue targets those owners (and small multi-location retailers): it converts a budget and one sentence of intent into an inspectable, priced, payable basket — with the tradeoffs shown, not hidden — in under a minute. All demo data is synthetic; Northstar Jewelry Supply is fictional.

## How PayPal and AI are used

**PayPal (Orders API v2 + JS SDK):** `@paypal/react-paypal-js` renders the checkout buttons only after the owner ticks the approval checkbox. `POST /api/paypal/create-order` verifies the HMAC signed quote, recomputes the total from the server catalog, and creates the order with `intent: CAPTURE`, itemized units (packs × 6), `custom_id = quoteId`, and idempotency key `${quoteId}:create`. `POST /api/paypal/capture-order` re-verifies the quote, checks the PayPal order's `custom_id` and amount against it, captures with `${quoteId}:capture`, handles `ORDER_ALREADY_CAPTURED` by returning the existing receipt, and displays the verified COMPLETED capture. This is a sandbox checkout (not production) — a real PayPal sandbox capture, never real money.

**AI (Google Gemini):** `gemini-3.8-flash` via `@google/genai` in JSON-schema mode (fallback `gemini-3.5-flash-lite` via env) receives the catalog with sales/stock signals and the parsed constraints, under a 9-rule system prompt that forbids price calculation. The server — never the model — owns money: zod-validated output passes a shared cents-based validator; over-budget output gets one deterministic repair pass (lowest urgency-ratio line reduced/dropped, required category and earring share protected); failure falls back to an explicitly labeled deterministic basket. The pipeline guarantees a valid basket OR a user-visible error state.

**Trust boundary:** the HMAC signed quote proves server issuance and basket integrity only — it does not prove owner approval. The checkbox is the human-intent signal; PayPal buyer approval authorizes the payment.

## How it was built

Next.js 14 (App Router), TypeScript, Tailwind CSS, single-screen workbench (Ask → Validated Basket → Skipped → Receipt). Money is integer cents end-to-end (catalog `priceCents`, `budgetCents`, `totalCents`) to eliminate float drift across validation, signing, and PayPal `item_total` reconciliation. `src/lib` separates concerns: `data.ts` (16-SKU synthetic catalog, constraint parser, presets), `validate.ts` (validator, repair, fallback), `quote.ts` (HMAC sign/verify, in-memory quote store + rate limiter), `ai.ts` (Gemini recommender), `paypal.ts` (OAuth, create/get/capture). Six vitest tests cover Scenario A/B arithmetic ($180.00 / $139.80), deterministic repair, both fallback baskets ($151.80 / $149.40), and quote tampering (`signature_mismatch`). Deployed on Vercel; no database. Quote store and rate limiter are in-memory only; single-instance demo limitation. Not production.

## Challenges faced

- **Sandbox approval stalls:** the PayPal sandbox buyer-approval UI repeatedly hung on a spinner — while the order had actually reached APPROVED server-side. Verifying state via `GET /v2/checkout/orders/{id}` (instead of trusting the UI) let us capture the approved $1.00 gate order and obtain a real COMPLETED Capture ID.
- **Model availability:** `gemini-3.8-flash` returned persistent 503s on the free tier during the build; the plan's env-configurable fallback (`gemini-3.5-flash-lite`) kept live AI working without code changes, and the deterministic fallback kept the demo valid even with AI down.
- **Money integrity:** AI output can't be trusted with prices, so the design rejects any AI-supplied price fields, recomputes totals from the catalog in cents, and signs the result — tampering with a single pack count breaks the signature.

## What's next

- Persist quotes/orders (the in-memory store is a demo limitation) and add multi-instance-safe rate limiting.
- Merchant accounts with real catalog/sales imports (CSV/ POS integrations) in place of synthetic fixtures.
- Owner profiles with standing priorities, reorder history, and low-stock alerts.
- Production PayPal onboarding, payouts/reconciliation reporting, and multi-buyer approval roles.

## Third-party SDKs and APIs

PayPal Orders API v2 and PayPal JS SDK (`@paypal/react-paypal-js`) for sandbox checkout; Google Gemini API via `@google/genai` for basket recommendations; Next.js, React, Tailwind CSS, zod, and vitest as the application/test stack.
