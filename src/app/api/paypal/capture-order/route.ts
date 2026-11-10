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
