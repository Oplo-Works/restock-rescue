# Restock Rescue

Agentic B2B wholesale restock planner with server-validated quotes and PayPal Orders v2 checkout.

Built for the PayPal AI Hackathon. Merchant: **Northstar Jewelry Supply** (fictional).

> All catalog, sales, and stock data are synthetic and for demo only.

## Overview

Restock Rescue turns a boutique owner's budget and buying instruction into a server-validated restock basket, signs it with an HMAC-SHA256 signed quote, and settles the exact basket via PayPal Orders v2 sandbox checkout.

The AI proposes the basket. The server checks every price and the budget in integer cents, and issues a signed quote proving server issuance and integrity only. The owner signals human intent via a checkbox, and PayPal buyer approval authorizes the payment.

## Status

Sprint 1 in progress — see build plan in `docs/`.

## Stack

Next.js 14+ (App Router), TypeScript, Tailwind CSS, `@google/genai` (gemini-3.8-flash), `@paypal/react-paypal-js`, PayPal Orders API v2, zod, vitest. No database.

Quote store and rate limiter are in-memory only; single-instance demo limitation. Not production.

## License

MIT — see [LICENSE](LICENSE).
