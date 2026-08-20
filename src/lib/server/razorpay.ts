import "server-only";

import crypto from "node:crypto";
import { CheckoutError } from "@/lib/pricing";
import { cleanEnv, cleanToken } from "@/lib/env";

/**
 * Razorpay Orders, over fetch. The npm SDK wraps the same two REST calls.
 *
 * Razorpay works in the smallest currency unit, so every amount crossing this
 * boundary is paise, not rupees. Mixing the two up by a factor of a hundred is
 * the classic way to charge someone ₹84,900 for a ₹849 design, so the
 * conversion happens in exactly one place, here.
 */

const HOST = "https://api.razorpay.com/v1";

function config() {
  const keyId = cleanToken(process.env.RAZORPAY_KEY_ID);
  const keySecret = cleanEnv(process.env.RAZORPAY_KEY_SECRET);
  if (!keyId || !keySecret) {
    throw new CheckoutError("Razorpay is not configured on this deployment.", 503);
  }
  return { keyId, keySecret };
}

export const toPaise = (rupees: number) => Math.round(rupees * 100);
export const toRupees = (paise: number) => paise / 100;

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const { keyId, keySecret } = config();
  const response = await fetch(`${HOST}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (body as { error?: { description?: string } }).error?.description ??
      `Razorpay returned ${response.status}`;
    throw new CheckoutError(message, 502);
  }
  return body as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
}

export async function createRazorpayOrder(params: {
  total: number; // rupees
  receipt: string;
}): Promise<RazorpayOrder> {
  return call<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: toPaise(params.total),
      currency: "INR",
      // Razorpay caps this at 40 characters and rejects anything longer.
      receipt: params.receipt.slice(0, 40),
    }),
  });
}

/**
 * Confirms a payment really came from Razorpay.
 *
 * The browser hands back an order id, a payment id and a signature. Razorpay
 * signs `order_id|payment_id` with the key secret, which only the server has —
 * so recomputing the HMAC proves the payment is genuine and was not assembled
 * by whoever is holding the page open.
 *
 * Compared with timingSafeEqual: a plain === leaks, through how long it takes
 * to fail, roughly how much of a forged signature was right.
 */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = config();

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  const given = Buffer.from(params.signature, "utf8");
  const mine = Buffer.from(expected, "utf8");
  if (given.length !== mine.length) return false;
  return crypto.timingSafeEqual(given, mine);
}

/** Same idea for webhooks, where Razorpay signs the entire raw body. */
export function verifyRazorpayWebhook(params: {
  rawBody: string;
  signature: string | null;
}): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !params.signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(params.rawBody)
    .digest("hex");

  const given = Buffer.from(params.signature, "utf8");
  const mine = Buffer.from(expected, "utf8");
  if (given.length !== mine.length) return false;
  return crypto.timingSafeEqual(given, mine);
}

export interface RazorpayPayment {
  id: string;
  status: string;
  amount: number; // paise
  currency: string;
  order_id: string;
}

/**
 * Fetches a payment straight from Razorpay. A valid signature proves the
 * message is authentic, but not that the money actually settled — only the
 * payment's own status does that.
 */
export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });
}
