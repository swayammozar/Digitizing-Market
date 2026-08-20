import { NextResponse } from "next/server";
import { grantDownloads } from "@/lib/server/fulfilment";
import { toRupees, verifyRazorpayWebhook } from "@/lib/server/razorpay";

/**
 * Razorpay's backstop, for the buyer who pays and then closes the tab.
 *
 * Read as raw text: Razorpay signs the exact bytes it sent, so parsing and
 * re-serialising the JSON would invalidate the signature.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyRazorpayWebhook({ rawBody, signature })) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number; // paise
          currency?: string;
        };
      };
    };
  };

  if (event.event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.id || !payment.order_id || payment.amount === undefined) {
    return NextResponse.json({ ok: true, ignored: "incomplete payment" });
  }

  const result = await grantDownloads({
    gatewayOrderId: payment.order_id,
    gatewayPaymentId: payment.id,
    paidAmount: toRupees(payment.amount),
    paidCurrency: payment.currency ?? "INR",
  });

  if (!result.granted) {
    console.error("razorpay webhook could not fulfil", payment.order_id, result.reason);
  }

  return NextResponse.json({ ok: true });
}
