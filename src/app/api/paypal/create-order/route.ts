import { NextRequest, NextResponse } from "next/server";
import { quoteStore, verifyQuote } from "@/lib/quote";
import { createPayPalOrder } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body?.token as string;
    const quote = verifyQuote(token);

    const existingRecord = quoteStore.get(quote.quoteId);
    if (existingRecord?.used) {
      return NextResponse.json(
        { error: "This quote has already been paid and captured." },
        { status: 409 }
      );
    }

    if (existingRecord?.paypalOrderId) {
      return NextResponse.json({
        orderID: existingRecord.paypalOrderId,
        quoteId: quote.quoteId,
      });
    }

    const { id } = await createPayPalOrder(quote);

    quoteStore.set(quote.quoteId, {
      quoteId: quote.quoteId,
      budgetCents: quote.budgetCents,
      totalCents: quote.totalCents,
      lines: quote.lines,
      paypalOrderId: id,
      used: false,
      createdAt: quote.iat,
    });

    return NextResponse.json({ orderID: id, quoteId: quote.quoteId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to create PayPal order" },
      { status: 400 }
    );
  }
}
