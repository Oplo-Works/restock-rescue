"use client";

import React, { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
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
      <div className="min-h-screen overflow-x-clip bg-porcelain font-sans text-ink flex flex-col justify-between">
        <header className="bg-evergreen text-porcelain">
          <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-12">
            <div>
              <p className="text-[13px] font-bold tracking-[0.22em]">
                RESTOCK RESCUE
              </p>
              <p className="mt-0.5 text-xs text-porcelain/70">
                Northstar Jewelry Supply — Fall Restock | Sandbox Mode
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="hidden text-[11px] text-porcelain/60 md:inline">
                Based on sales from Oct 27 – Nov 9 and current stock coverage.
              </span>
              <span className="rounded-full border border-champagne/60 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-champagne">
                SYNTHETIC DATA
              </span>
              <span className="rounded-full border border-porcelain/40 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-porcelain">
                SANDBOX
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1280px] px-5 pt-8 md:px-12">
          <h1 className="font-display text-4xl leading-tight text-evergreen md:text-5xl">
            Restock with confidence.
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Build your next purchase with AI assistance.
          </p>
        </div>

        <main className="mx-auto w-full max-w-[1280px] flex-1 space-y-5 px-5 py-6 md:px-12">
          {/* ERROR BANNER */}
          {errorMsg && (
            <div className="flex items-center justify-between rounded-2xl border border-error/30 bg-error-bg p-4 text-error">
              <div>
                <p className="text-sm font-semibold">Action Required</p>
                <p className="mt-0.5 text-xs">{errorMsg}</p>
              </div>
              <button
                type="button"
                onClick={() => requestRecommendation()}
                className="h-10 rounded-xl bg-error px-4 text-xs font-semibold text-white transition hover:opacity-90"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ONE CONTINUOUS WORKBENCH */}
          <section className="overflow-hidden rounded-[20px] border border-line bg-white shadow-card">
            <div className="grid lg:grid-cols-[34%_minmax(0,1fr)]">
              {/* 01 · BUYING PLAN */}
              <div className="min-w-0 space-y-5 p-5 sm:p-6 lg:border-r lg:border-line">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-secondary">
                  <span className="text-champagne">01</span>
                  <span className="mx-2 text-line">·</span>YOUR BUYING PLAN
                </p>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.12em] text-secondary">
                    PURCHASE BUDGET (USD)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="10000"
                    step="1"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="h-[50px] w-full rounded-xl border border-line bg-white px-4 text-2xl font-bold tabular-nums text-evergreen outline-none transition focus:border-evergreen-soft"
                  />
                  <p className="mt-1.5 text-[11px] text-muted">
                    Maximum spending limit.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.12em] text-secondary">
                    BUYER PRIORITY / CONSTRAINT
                  </label>
                  <textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-line bg-surface-muted/60 px-4 py-3 text-sm text-ink outline-none transition focus:border-evergreen-soft"
                    placeholder="e.g., Prioritize earrings, need one necklace for display"
                  />
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => requestRecommendation()}
                  className="flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-evergreen text-sm font-semibold text-white transition duration-150 hover:bg-evergreen-soft disabled:opacity-50"
                >
                  <Sparkles size={18} strokeWidth={1.8} />
                  {loading ? "Validating Restock Plan..." : "Generate restock basket"}
                </button>
                <p className="-mt-3 text-center text-[11px] text-muted">
                  AI-assisted buying recommendations.
                </p>

                <div className="border-t border-line pt-4">
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
                      className="rounded-lg border border-line bg-white px-3 py-2 font-medium text-secondary transition hover:border-evergreen-soft hover:text-evergreen"
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
                      className="rounded-lg border border-line bg-white px-3 py-2 font-medium text-secondary transition hover:border-evergreen-soft hover:text-evergreen"
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
                      className="rounded-lg border border-line bg-white px-3 py-2 font-medium text-secondary transition hover:border-evergreen-soft hover:text-evergreen"
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
                      className="rounded-lg border border-line bg-white px-3 py-2 font-medium text-secondary transition hover:border-evergreen-soft hover:text-evergreen"
                    >
                      Sample Preset B (Non-AI)
                    </button>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted">
                    1 pack = 6 units. Max 2 packs per SKU. Prices come exclusively from the server catalog.
                  </p>
                </div>
              </div>

              {/* RIGHT COLUMN: 02 + 03 */}
              <div className="min-w-0">
                {/* 02 · BASKET */}
                <div className="space-y-5 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold tracking-[0.16em] text-secondary">
                      <span className="text-champagne">02</span>
                      <span className="mx-2 text-line">·</span>YOUR BASKET
                    </p>
                    {basket && (
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                          basket.source === "ai"
                            ? "border-success/30 bg-success-bg text-success"
                            : "border-warning/30 bg-warning-bg text-warning"
                        }`}
                      >
                        {basket.sourceBadge}
                      </span>
                    )}
                  </div>

                  {basket ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-success/25 bg-success-bg px-4 py-3 text-success">
                      <ShieldCheck size={19} strokeWidth={1.8} className="shrink-0" />
                      <p className="text-[13px] font-semibold">
                        Basket validated — Prices, pack quantities, and budget checked. PASSED
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-muted px-4 py-3 text-secondary">
                      <ShieldCheck size={19} strokeWidth={1.8} className="shrink-0" />
                      <p className="text-[13px] font-medium">Awaiting validation.</p>
                    </div>
                  )}

                  {basket && quote ? (
                    <>
                      {resetNotice && (
                        <div className="rounded-xl border border-line bg-porcelain px-4 py-2.5 text-xs font-medium text-evergreen">
                          New basket, new signature. Approval resets.
                        </div>
                      )}

                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-base font-semibold text-evergreen">
                          Validated basket ({basket.totalUnits} units,{" "}
                          {basket.selected.length} SKUs)
                        </h2>
                        {basket.repaired && basket.repairNote && (
                          <span className="rounded-full border border-warning/30 bg-warning-bg px-2.5 py-1 text-[11px] font-semibold text-warning">
                            {basket.repairNote}
                          </span>
                        )}
                      </div>
                      <p className="-mt-3 text-[11px] text-muted">
                        Wholesale price, tax &amp; shipping excluded for demo clarity.
                      </p>

                      {/* BUDGET SUMMARY */}
                      <div className="rounded-2xl border border-line bg-porcelain/60 p-4">
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          <div className="min-w-0">
                            <p className="text-[9px] font-semibold tracking-[0.1em] text-muted sm:text-[10px] sm:tracking-[0.12em]">TOTAL BUDGET</p>
                            <p className="mt-1 text-sm font-bold tabular-nums text-evergreen sm:text-base">{formatMoney(basket.budgetCents)}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-semibold tracking-[0.1em] text-muted sm:text-[10px] sm:tracking-[0.12em]">VALIDATED PURCHASE</p>
                            <p className="mt-1 text-sm font-bold tabular-nums text-evergreen sm:text-base">{formatMoney(basket.totalCents)}</p>
                          </div>
                          <div className="min-w-0 text-right">
                            <p className="text-[9px] font-semibold tracking-[0.1em] text-muted sm:text-[10px] sm:tracking-[0.12em]">REMAINING</p>
                            <p className="mt-1 text-sm font-bold tabular-nums text-evergreen sm:text-base">{formatMoney(basket.remainingCents)}</p>
                          </div>
                        </div>
                        <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-line">
                          <div
                            className="h-full bg-evergreen transition-all duration-200"
                            style={{ width: `${Math.min(100, basket.budgetUsedPct)}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[11px] tabular-nums text-secondary">
                          {formatMoney(basket.totalCents)} / {formatMoney(basket.budgetCents)} — {basket.budgetUsedPct}% used, {formatMoney(basket.remainingCents)} left · Earring pack share: {basket.earringPackSharePct}% ({basket.totalPacks} total packs)
                        </p>
                      </div>

                      {/* PRODUCT LIST */}
                      <ul className="divide-y divide-line">
                        {basket.selected.map((line) => (
                          <li key={line.skuId} className="flex gap-4 py-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-[11px] font-bold tracking-wide text-evergreen">
                              {line.skuId}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-snug text-ink">{line.name}</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-secondary">{line.reason}</p>
                              <p className="mt-1 text-[11px] tabular-nums text-muted">
                                {line.skuId} · {line.category} · {line.soldLast14Days} sold / {line.stockOnHand} in stock · {line.packs} {line.packs === 1 ? "pack" : "packs"} ({line.units} units @ {formatMoney(line.unitPriceCents)})
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold tabular-nums text-evergreen">{formatMoney(line.lineTotalCents)}</p>
                              <p className="mt-0.5 text-[11px] tabular-nums text-muted">pack {formatMoney(line.packPriceCents)}</p>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {/* SKIPPED SECTION (ALWAYS RENDERED, NOT COLLAPSIBLE) */}
                      {basket.skipped.length > 0 && (
                        <div className="rounded-2xl bg-surface-muted/70 p-4">
                          <h3 className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-secondary">
                            CONSIDERED &amp; SKIPPED (TRADEOFF LOG)
                          </h3>
                          <ul className="space-y-1.5 text-xs leading-relaxed text-secondary">
                            {basket.skipped.map((sk) => (
                              <li key={sk.skuId}>
                                <span className="font-semibold text-ink">
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
                      <div className="flex flex-wrap justify-between gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[11px] text-muted">
                        <span>
                          Signed Quote ID:{" "}
                          <code className="font-mono text-secondary">{quote.quoteId}</code>
                        </span>
                        <span>
                          HMAC-SHA256 proves server issuance + integrity only (expires{" "}
                          {new Date(quote.exp * 1000).toLocaleTimeString()}).
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="py-6 text-center text-sm text-muted">
                      Your validated basket will appear here.
                    </p>
                  )}
                </div>

                {/* 03 · REVIEW & APPROVE */}
                <div className="space-y-4 border-t border-line p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold tracking-[0.16em] text-secondary">
                      <span className="text-champagne">03</span>
                      <span className="mx-2 text-line">·</span>REVIEW &amp; APPROVE
                    </p>
                    {basket ? (
                      <span className="rounded-full border border-success/30 bg-success-bg px-3 py-1 text-[11px] font-semibold text-success">
                        Validated
                      </span>
                    ) : (
                      <span className="rounded-full border border-line bg-surface-muted px-3 py-1 text-[11px] font-semibold text-secondary">
                        Awaiting validation
                      </span>
                    )}
                  </div>

                  {basket && !receipt && (
                    <>
                      <p className="text-[13px] text-secondary">
                        Validated basket confirmed. Review the exact purchase total before payment.
                      </p>
                      <div className="flex items-baseline justify-between rounded-2xl border border-line bg-porcelain/60 px-4 py-3">
                        <span className="text-[11px] font-semibold tracking-[0.12em] text-muted">EXACT TOTAL</span>
                        <span className="text-xl font-bold tabular-nums text-evergreen">{formatMoney(basket.totalCents)}</span>
                      </div>

                      <label className="flex cursor-pointer select-none items-start gap-3">
                        <input
                          type="checkbox"
                          checked={approved}
                          onChange={(e) => {
                            setApproved(e.target.checked);
                            setCancelMsg(null);
                          }}
                          className="mt-0.5 h-5 w-5 shrink-0 rounded border-line accent-[#172B2B]"
                        />
                        <span className="text-sm font-medium text-ink">
                          I have reviewed this basket. I understand this is the exact
                          basket PayPal will charge.
                        </span>
                      </label>

                      {cancelMsg && (
                        <div className="rounded-xl border border-warning/30 bg-warning-bg px-4 py-2.5 text-xs text-warning">
                          {cancelMsg}
                        </div>
                      )}

                      {approved && (
                        <div className="max-w-md space-y-2">
                          <p className="text-[11px] font-semibold tracking-[0.12em] text-muted">
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
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* COMPLETED RECEIPT */}
          {receipt && (
            <section className="space-y-3 rounded-[20px] border border-success/40 bg-success-bg p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-bold text-evergreen">
                  <CheckCircle2 size={20} strokeWidth={1.8} className="text-success" />
                  Sandbox Payment Completed — Verified Receipt
                </h2>
                <span className="rounded-full bg-success px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  Status: {receipt.status}
                </span>
              </div>
              <p className="text-xs text-success">
                Sandbox checkout (not production) — Real PayPal Orders v2 sandbox capture verified against signed quote.
              </p>
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-success/25 bg-white p-4 text-sm md:grid-cols-3">
                <div>
                  <span className="block text-[11px] text-muted">PayPal Capture ID</span>
                  <span className="font-mono font-bold tabular-nums text-ink">{receipt.captureId}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-muted">PayPal Order ID</span>
                  <span className="font-mono font-semibold tabular-nums text-ink">{receipt.orderId}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-muted">Amount Captured</span>
                  <span className="font-bold tabular-nums text-success">
                    ${receipt.amountValue} {receipt.currencyCode}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-muted">Payer</span>
                  <span className="font-medium text-ink">
                    {receipt.payerName} ({receipt.payerEmail})
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-muted">Timestamp</span>
                  <span className="font-mono text-xs tabular-nums text-secondary">{receipt.capturedAt}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-muted">Basket Summary</span>
                  <span className="font-semibold tabular-nums text-ink">
                    {receipt.totalUnits} units, {receipt.skuCount} SKUs —{" "}
                    {receipt.merchantName}
                  </span>
                </div>
              </div>
            </section>
          )}
        </main>

        <footer className="bg-evergreen px-5 py-4 text-[11px] text-porcelain/60 md:px-12">
          <div className="mx-auto flex w-full max-w-[1280px] flex-wrap justify-between gap-2">
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
