import { NextResponse } from "next/server";
import { grantDownloads } from "@/lib/server/fulfilment";
import { verifyPayPalWebhook } from "@/lib/server/paypal";

/**
 * PayPal's backstop. If the buyer pays and then closes the tab before the
 * confirm call lands, this still delivers their files.
 *
 * The body is read as raw text because the signature covers the exact bytes
 * PayPal sent; parsing and re-serialising would change them.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!(await verifyPayPalWebhook({ headers: request.headers, rawBody }))) {
    // 401 rather than 400: PayPal retries on 5xx, and a request that failed
    // verification will never start passing it.
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    event_type?: string;
    resource?: {
      id?: string;
      status?: string;
      amount?: { value?: string; currency_code?: string };
      supplementary_data?: { related_ids?: { order_id?: string } };
    };
  };

  if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
    // Acknowledged so PayPal stops resending an event we simply do not act on.
    return NextResponse.json({ ok: true, ignored: event.event_type });
  }

  const capture = event.resource;
  const orderId = capture?.supplementary_data?.related_ids?.order_id;
  if (!orderId || !capture?.id || !capture.amount?.value) {
    return NextResponse.json({ ok: true, ignored: "incomplete capture" });
  }

  const result = await grantDownloads({
    gatewayOrderId: orderId,
    gatewayPaymentId: capture.id,
    paidAmount: Number(capture.amount.value),
    paidCurrency: capture.amount.currency_code ?? "USD",
  });

  if (!result.granted) {
    console.error("paypal webhook could not fulfil", orderId, result.reason);
  }

  // Always 200 once the signature is good. A retry storm helps nobody, and the
  // failure is recorded above for us rather than for PayPal.
  return NextResponse.json({ ok: true });
}
