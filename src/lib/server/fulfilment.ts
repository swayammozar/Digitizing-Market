import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import type { PricedCart } from "@/lib/pricing";
import { CheckoutError } from "@/lib/pricing";

/**
 * Order fulfilment. Everything here runs with the service role and must never
 * be reachable from the browser, which is what the `server-only` import above
 * enforces at build time.
 *
 * Pricing lives in lib/pricing.ts instead: it holds no secrets, and the rule
 * deciding what someone is charged should be testable on its own.
 */

export { CheckoutError, priceCart } from "@/lib/pricing";
export type { PricedCart } from "@/lib/pricing";

/**
 * Records an order the moment it is created at the gateway, before the buyer
 * has paid anything.
 *
 * Writing it up front is what makes the webhook a real safety net: if the buyer
 * closes the tab after paying, the webhook arrives with a gateway order id that
 * already resolves to a user and a basket, and can finish the job alone.
 */
export async function recordPendingOrder(params: {
  userId: string;
  gateway: "paypal" | "razorpay";
  gatewayOrderId: string;
  cart: PricedCart;
}): Promise<string> {
  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      user_id: params.userId,
      gateway: params.gateway,
      gateway_order_id: params.gatewayOrderId,
      amount: params.cart.total,
      currency: params.cart.currency,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !order) {
    throw new CheckoutError(
      `Could not start the order: ${error?.message ?? "unknown error"}`,
      500,
    );
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    params.cart.items.map((item) => ({
      order_id: order.id,
      product_slug: item.slug,
      price: item.price,
    })),
  );

  if (itemsError) {
    throw new CheckoutError(`Could not save the order: ${itemsError.message}`, 500);
  }

  return order.id;
}

/**
 * Marks an order paid and grants its downloads.
 *
 * Safe to call more than once for the same order, which matters because the
 * browser and the webhook both race to call it after a successful payment.
 * The early return on an already-paid order makes the second caller a no-op,
 * and the unique constraint on (user_id, product_slug) means a design bought
 * twice still produces one library entry.
 */
export async function grantDownloads(params: {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  /** What the gateway says was actually paid, for cross-checking. */
  paidAmount: number;
  paidCurrency: string;
}): Promise<{ granted: boolean; reason?: string }> {
  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, user_id, amount, currency, status")
    .eq("gateway_order_id", params.gatewayOrderId)
    .single();

  if (error || !order) {
    return { granted: false, reason: "No such order." };
  }
  if (order.status === "paid") {
    return { granted: true, reason: "Already fulfilled." };
  }

  // The gateway is the authority on what was paid. If it does not match what
  // we asked for, something has been tampered with between here and there —
  // flag it and grant nothing.
  const expected = Number(order.amount);
  if (
    Math.abs(expected - params.paidAmount) > 0.01 ||
    order.currency !== params.paidCurrency
  ) {
    await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
    return {
      granted: false,
      reason: `Paid ${params.paidAmount} ${params.paidCurrency}, expected ${expected} ${order.currency}.`,
    };
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("product_slug")
    .eq("order_id", order.id);

  if (items?.length) {
    await supabase.from("downloads").upsert(
      items.map((item) => ({
        user_id: order.user_id,
        product_slug: item.product_slug,
        order_id: order.id,
      })),
      { onConflict: "user_id,product_slug", ignoreDuplicates: true },
    );
  }

  await supabase
    .from("orders")
    .update({
      status: "paid",
      gateway_payment_id: params.gatewayPaymentId,
      paid_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  return { granted: true };
}
