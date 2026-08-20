import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  CheckoutError,
  priceCart,
  recordPendingOrder,
} from "@/lib/server/fulfilment";
import { createPayPalOrder } from "@/lib/server/paypal";
import { createRazorpayOrder } from "@/lib/server/razorpay";

/**
 * Starts a checkout.
 *
 * The request carries a gateway and a list of slugs. It does not carry prices,
 * and any it did carry would be ignored — the total is rebuilt from the catalog
 * here, sent to the gateway from here, and compared against the gateway's own
 * figure before anything is granted.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Purchases attach to an account, because the library has to belong to
    // someone in order to still be there tomorrow.
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to check out." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      gateway?: string;
      items?: unknown;
    };

    if (body.gateway !== "paypal" && body.gateway !== "razorpay") {
      return NextResponse.json({ error: "Unknown payment method." }, { status: 400 });
    }

    // Razorpay settles in rupees and PayPal in dollars for this shop, so the
    // gateway determines the currency rather than the other way round. A
    // client asking for INR through PayPal simply cannot arise.
    const currency = body.gateway === "razorpay" ? "INR" : "USD";
    const cart = priceCart(body.items, currency);

    if (body.gateway === "paypal") {
      const order = await createPayPalOrder({
        total: cart.total,
        items: cart.items,
      });
      await recordPendingOrder({
        userId: user.id,
        gateway: "paypal",
        gatewayOrderId: order.id,
        cart,
      });
      return NextResponse.json({
        gateway: "paypal",
        orderId: order.id,
        total: cart.total,
        currency,
      });
    }

    const order = await createRazorpayOrder({
      total: cart.total,
      receipt: `dm_${user.id.slice(0, 8)}_${Date.now()}`,
    });
    await recordPendingOrder({
      userId: user.id,
      gateway: "razorpay",
      gatewayOrderId: order.id,
      cart,
    });
    return NextResponse.json({
      gateway: "razorpay",
      orderId: order.id,
      amount: order.amount, // paise, which is what Razorpay Checkout expects
      total: cart.total,
      currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("checkout/create", error);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 },
    );
  }
}
