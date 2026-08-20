import "server-only";

import { CheckoutError } from "@/lib/pricing";

/**
 * PayPal Orders v2, over plain fetch rather than an SDK — we use three
 * endpoints and the SDK would add a dependency for each of them.
 *
 * Sandbox and live are the same API on different hosts, chosen by
 * PAYPAL_ENV so going live is an environment change, never a code change.
 */

const HOSTS = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};

function config() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new CheckoutError("PayPal is not configured on this deployment.", 503);
  }
  const env = process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
  return { clientId, secret, host: HOSTS[env] };
}

/**
 * PayPal tokens last eight hours. Caching one avoids an extra round trip on
 * every checkout; the early expiry keeps a token from being used in the second
 * it would lapse mid-request.
 */
let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const { clientId, secret, host } = config();
  const response = await fetch(`${host}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new CheckoutError("Could not reach PayPal. Try again in a moment.", 502);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const { host } = config();
  const response = await fetch(`${host}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      (body as { message?: string; details?: { description?: string }[] }).details?.[0]
        ?.description ??
      (body as { message?: string }).message ??
      `PayPal returned ${response.status}`;
    throw new CheckoutError(detail, 502);
  }
  return body as T;
}

export interface PayPalOrder {
  id: string;
  status: string;
}

export async function createPayPalOrder(params: {
  total: number;
  items: { name: string; price: number }[];
}): Promise<PayPalOrder> {
  const value = params.total.toFixed(2);

  return call<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value,
            // PayPal rejects the order unless the line items add up to exactly
            // the total, so the breakdown is sent alongside them.
            breakdown: { item_total: { currency_code: "USD", value } },
          },
          items: params.items.map((item) => ({
            name: item.name.slice(0, 127),
            quantity: "1",
            unit_amount: { currency_code: "USD", value: item.price.toFixed(2) },
            category: "DIGITAL_GOODS",
          })),
        },
      ],
      application_context: {
        brand_name: "Digitizing Market",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING", // nothing is posted
      },
    }),
  });
}

export interface PayPalCapture {
  orderId: string;
  captureId: string;
  status: string;
  amount: number;
  currency: string;
}

/**
 * Captures an approved order and reports back what PayPal says was actually
 * taken — not what the browser claimed. The caller compares that against the
 * recorded order before granting anything.
 */
export async function capturePayPalOrder(orderId: string): Promise<PayPalCapture> {
  const body = await call<{
    id: string;
    status: string;
    purchase_units?: {
      payments?: {
        captures?: {
          id: string;
          status: string;
          amount: { value: string; currency_code: string };
        }[];
      };
    }[];
  }>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST" });

  const capture = body.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture) {
    throw new CheckoutError("PayPal accepted the order but reported no payment.", 502);
  }

  return {
    orderId: body.id,
    captureId: capture.id,
    status: capture.status,
    amount: Number(capture.amount.value),
    currency: capture.amount.currency_code,
  };
}

/**
 * Asks PayPal to verify a webhook signature. Doing it server-side like this
 * rather than reimplementing the crypto means the certificate rotation and
 * algorithm choices stay PayPal's problem.
 */
export async function verifyPayPalWebhook(params: {
  headers: Headers;
  rawBody: string;
}): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  const required = [
    "paypal-auth-algo",
    "paypal-cert-url",
    "paypal-transmission-id",
    "paypal-transmission-sig",
    "paypal-transmission-time",
  ];
  if (required.some((header) => !params.headers.get(header))) return false;

  try {
    const result = await call<{ verification_status: string }>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: JSON.stringify({
          auth_algo: params.headers.get("paypal-auth-algo"),
          cert_url: params.headers.get("paypal-cert-url"),
          transmission_id: params.headers.get("paypal-transmission-id"),
          transmission_sig: params.headers.get("paypal-transmission-sig"),
          transmission_time: params.headers.get("paypal-transmission-time"),
          webhook_id: webhookId,
          webhook_event: JSON.parse(params.rawBody),
        }),
      },
    );
    return result.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
