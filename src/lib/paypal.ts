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
