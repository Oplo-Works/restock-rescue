# Restock Rescue

Agentic B2B wholesale restock planner with server-validated quotes and PayPal Orders v2 checkout.

Built fresh during the PayPal AI Hackathon by Minkyu Park. Merchant: **Northstar Jewelry Supply** (fictional).

**Live demo:** https://restock-rescue.vercel.app

## Project overview

Restock Rescue turns a boutique owner's budget and buying instruction into a server-validated restock basket, signs it with an HMAC-SHA256 signed quote, and settles the exact basket via PayPal Orders v2 sandbox checkout.

The workflow is the product: the AI proposes the basket → the server validates every price and the budget in integer cents and issues a signed quote → the owner signals human intent via a checkbox → PayPal buyer approval authorizes payment for that exact validated basket. The pipeline guarantees a valid basket OR a user-visible error state.

## Prerequisites

- Node.js 20+ and npm
- A PayPal Developer account with a Sandbox REST app, a Sandbox **Business** account (merchant; public business name "Northstar Jewelry Supply"), and a Sandbox **Personal** account (buyer, with sufficient USD balance)
- A Google Gemini API key from Google AI Studio
- A random `BASKET_SIGNING_SECRET` (32+ bytes; generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

## Install and run

```bash
npm install
cp .env.example .env.local   # then fill in your own values (see table below)
npm run dev                  # http://localhost:3000
npx vitest run               # 6 unit tests: validator, repair, fallback, tamper
```

## Environment variables

See `.env.example`. `.env.local` is never committed.

| Variable | Where | Purpose |
|---|---|---|
| `PAYPAL_CLIENT_ID` | Server | PayPal Sandbox REST app client ID |
| `PAYPAL_CLIENT_SECRET` | Server | PayPal Sandbox REST app secret |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Browser | Same client ID, used by the PayPal JS SDK |
| `GEMINI_API_KEY` | Server | Google AI Studio key for Gemini recommendations |
| `BASKET_SIGNING_SECRET` | Server | HMAC-SHA256 signing secret (32+ chars; app throws at startup if missing) |

Optional: `GEMINI_MODEL` overrides the default model `gemini-3.8-flash` (e.g., `gemini-3.5-flash-lite`).

## How to use the demo

1. Open the live demo (or http://localhost:3000).
2. Enter a budget (default $250) and a buying instruction (e.g., "Prioritize earrings. I need to restock for this weekend."), then click **Get My Restock Plan** — this calls the live Gemini AI; the server validates the result (or repairs it, or falls back deterministically and labels it as such).
3. Or click **Scenario A ($250 — Live AI)** / **Scenario B ($150 — Live AI)** for the two narrated scenarios through the same live AI path.
4. Review the validated basket, the budget bar, and the "Considered & Skipped" tradeoff log. Note the signed quote ID and expiry (15 minutes).
5. Tick "I have reviewed this basket…" — the PayPal sandbox buttons appear. Pay as the sandbox Personal buyer. A green receipt card shows the real PayPal Capture ID.
6. Deterministic non-AI samples (same validator + signer, explicitly badged "Sample basket — preset, not AI output"): open https://restock-rescue.vercel.app/?demo=preset-a ($180.00 / $250, 42 units) or https://restock-rescue.vercel.app/?demo=preset-b ($139.80 / $150, 30 units), or use the "Sample Preset" buttons.

### Judge testing guide (sandbox accounts)

- Business (merchant): `sb-northstar@business.example.com` — account identifiers only; passwords are never shared. Log in at https://developer.paypal.com (Sandbox → Accounts) with your own developer account to create/use your own sandbox buyer.
- Personal (buyer used in testing): `sb-7rr9p53835706@personal.example.com`
- Test steps: budget `250`, instruction "Prioritize earrings" → expect a validated basket within budget with an AI/fallback badge; then open `?demo=preset-b` for the deterministic $139.80 basket and complete a sandbox capture to see a COMPLETED receipt with a real Capture ID.
- This is a **sandbox checkout (not production)** — a real PayPal sandbox capture, never real money.

## Synthetic data disclosure

All catalog, sales, and stock data are synthetic and for demo only. Northstar Jewelry Supply is a fictional merchant. The 16 SKUs, prices, stock levels, and Oct 27 – Nov 9 sales figures are seeded fixtures created for this demo; no real employer name, catalog, or business data is used anywhere.

## Tamper test (signed-quote verification)

The signed quote is an HMAC-SHA256 token (`payload.signature`, 15-minute expiry) binding the quote ID, budget, SKU/pack lines, and total. Any modification invalidates it:

1. Run `npx vitest run` — Test 6 tampers with `packs` in a signed payload and expects `signature_mismatch`.
2. Or live: get a token from `POST /api/recommend`, change any character in the payload segment, then:
   ```bash
   curl -X POST http://localhost:3000/api/paypal/create-order \
     -H "Content-Type: application/json" \
     -d '{"token":"<TAMPERED_TOKEN>"}'
   ```
   Expected: HTTP 400 with `{"error":"signature_mismatch"}`.

Cryptographic boundary: **HMAC proves server issuance + integrity only, not owner approval; checkbox is a human-intent signal**, and PayPal buyer approval authorizes the payment. Prices are always recomputed server-side from the catalog; client- or AI-supplied prices are rejected.

Quote store and rate limiter are in-memory only; single-instance demo limitation. Not production.

## How it was built

Next.js 14 (App Router) + TypeScript + Tailwind CSS; Google Gemini (`gemini-3.8-flash` via `@google/genai`, JSON-schema mode; fallback `gemini-3.5-flash-lite` via `GEMINI_MODEL`) proposes baskets; a shared cents-based validator + deterministic repair + deterministic fallback guarantee a valid basket or a visible error; HMAC-SHA256 signed quotes (15-min TTL, idempotency keys `${quoteId}:create` / `${quoteId}:capture`) bind checkout; PayPal Orders API v2 + `@paypal/react-paypal-js` settle the exact basket; zod validates AI output; vitest covers arithmetic, repair, fallback, and tamper cases. No database.

## License

MIT — see [LICENSE](LICENSE).
