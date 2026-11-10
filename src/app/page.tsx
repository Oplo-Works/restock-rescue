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
