import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CheckoutError, grantDownloads } from "@/lib/server/fulfilment";
import { capturePayPalOrder } from "@/lib/server/paypal";
import {
  fetchRazorpayPayment,
  toRupees,
  verifyRazorpaySignature,
} from "@/lib/server/razorpay";

/**
 * Finishes a checkout after the buyer has been through the gateway.
 *
 * Nothing the browser sends is taken as proof of payment. For PayPal the
 * capture is performed here and its own response is the evidence; for Razorpay
 * the signature is checked against the key secret and then the payment is
 * fetched from Razorpay to confirm it actually settled — a valid signature only
 * proves the message is authentic, not that money moved.
 *
 * The webhook runs the same fulfilment, so whichever arrives first wins and the
 * other becomes a no-op.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to check out." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      gateway?: string;
      orderId?: string;
      paymentId?: string;
      signature?: string;
    };

    if (body.gateway === "paypal") {
      if (!body.orderId) {
        return NextResponse.json({ error: "Missing order." }, { status: 400 });
      }

      const capture = await capturePayPalOrder(body.orderId);
      if (capture.status !== "COMPLETED") {
        return NextResponse.json(
          { error: `PayPal reported the payment as ${capture.status}.` },
          { status: 402 },
        );
      }

      const result = await grantDownloads({
        gatewayOrderId: capture.orderId,
        gatewayPaymentId: capture.captureId,
        paidAmount: capture.amount,
        paidCurrency: capture.currency,
      });

      if (!result.granted) {
        return NextResponse.json(
          { error: result.reason ?? "Payment could not be verified." },
          { status: 402 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (body.gateway === "razorpay") {
      const { orderId, paymentId, signature } = body;
      if (!orderId || !paymentId || !signature) {
        return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
      }

      if (!verifyRazorpaySignature({ orderId, paymentId, signature })) {
        return NextResponse.json(
          { error: "That payment could not be verified." },
          { status: 400 },
        );
      }

      const payment = await fetchRazorpayPayment(paymentId);
      if (payment.status !== "captured" && payment.status !== "authorized") {
        return NextResponse.json(
          { error: `Razorpay reported the payment as ${payment.status}.` },
          { status: 402 },
        );
      }
      // A signature is valid for the pair it was made from, so this also
      // guarantees the payment belongs to the order being fulfilled.
      if (payment.order_id !== orderId) {
        return NextResponse.json({ error: "Payment does not match order." }, { status: 400 });
      }

      const result = await grantDownloads({
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        paidAmount: toRupees(payment.amount),
        paidCurrency: payment.currency,
      });

      if (!result.granted) {
        return NextResponse.json(
          { error: result.reason ?? "Payment could not be verified." },
          { status: 402 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown payment method." }, { status: 400 });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("checkout/confirm", error);
    return NextResponse.json(
      { error: "Could not confirm the payment. If you were charged, contact us." },
      { status: 500 },
    );
  }
}
