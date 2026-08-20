"use client";

import type { Currency } from "./types";

/**
 * Drives a purchase from the browser.
 *
 * The client's whole job is to show the gateway's own UI and relay two ids back
 * to the server. It never sees a price it can change, and nothing it reports is
 * believed — the server captures with PayPal, or checks Razorpay's signature
 * and then asks Razorpay what really happened, before any file is released.
 */

export type CheckoutOutcome =
  | { status: "paid" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

/** Both gateways ship a browser SDK; each is fetched once, on first use. */
function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Could not reach the payment provider. Check your connection."));
    document.head.appendChild(script);
  });
}

async function post(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  }
  return data;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayConstructor {
  new (options: Record<string, unknown>): { open: () => void };
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export async function payWithRazorpay(params: {
  items: string[];
  email?: string;
}): Promise<CheckoutOutcome> {
  try {
    const order = (await post("/api/checkout/create", {
      gateway: "razorpay",
      items: params.items,
    })) as { orderId: string; amount: number; keyId: string };

    await loadScript("https://checkout.razorpay.com/v1/checkout.js", "razorpay-sdk");
    if (!window.Razorpay) {
      return { status: "error", message: "Razorpay did not load. Please retry." };
    }

    return await new Promise<CheckoutOutcome>((resolve) => {
      const checkout = new window.Razorpay!({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: "INR",
        name: "Digitizing Market",
        description: `${params.items.length} embroidery design${params.items.length === 1 ? "" : "s"}`,
        prefill: params.email ? { email: params.email } : undefined,
        theme: { color: "#c0392b" },
        handler: async (response: RazorpayResponse) => {
          try {
            await post("/api/checkout/confirm", {
              gateway: "razorpay",
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            resolve({ status: "paid" });
          } catch (error) {
            resolve({
              status: "error",
              message: error instanceof Error ? error.message : "Payment failed.",
            });
          }
        },
        modal: {
          ondismiss: () => resolve({ status: "cancelled" }),
        },
      });
      checkout.open();
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Payment failed.",
    };
  }
}

/**
 * PayPal renders its own button, so this only prepares the order and confirms
 * the result; the button itself is mounted by PayPalButton.
 */
export async function createPayPalOrder(items: string[]): Promise<string> {
  const order = (await post("/api/checkout/create", {
    gateway: "paypal",
    items,
  })) as { orderId: string };
  return order.orderId;
}

export async function confirmPayPalOrder(orderId: string): Promise<void> {
  await post("/api/checkout/confirm", { gateway: "paypal", orderId });
}

export function paypalSdkUrl(clientId: string, currency: Currency = "USD") {
  const params = new URLSearchParams({
    "client-id": clientId,
    currency,
    intent: "capture",
    // Nothing here is a subscription, and the extra funding sources clutter a
    // single-button checkout.
    "disable-funding": "paylater,venmo",
  });
  return `https://www.paypal.com/sdk/js?${params}`;
}

export { loadScript };
