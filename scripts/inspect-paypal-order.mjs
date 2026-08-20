/**
 * Reads a PayPal order back from the API, to see what PayPal thinks it is.
 *
 * The checkout popup reports failures as "Things don't appear to be working",
 * which is the same message for a dozen unrelated causes. The order itself
 * carries the payee, the currency and the status, which narrows it.
 *
 *   node scripts/inspect-paypal-order.mjs <order-id>
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env.local") });

const orderId = process.argv[2];
if (!orderId) {
  console.error("Usage: node scripts/inspect-paypal-order.mjs <order-id>");
  process.exit(1);
}

const id = (process.env.PAYPAL_CLIENT_ID ?? "").trim();
const secret = (process.env.PAYPAL_CLIENT_SECRET ?? "").trim();
const host = "https://api-m.sandbox.paypal.com";

const token = await (
  await fetch(`${host}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })
).json();

const response = await fetch(`${host}/v2/checkout/orders/${orderId}`, {
  headers: { Authorization: `Bearer ${token.access_token}` },
});
const order = await response.json();

if (!response.ok) {
  console.log(`PayPal returned ${response.status}`);
  console.log(JSON.stringify(order, null, 2).slice(0, 800));
  process.exit(1);
}

const unit = order.purchase_units?.[0];
console.log("order      :", order.id);
console.log("status     :", order.status);
console.log("intent     :", order.intent);
console.log("amount     :", unit?.amount?.value, unit?.amount?.currency_code);
console.log("payee      :", JSON.stringify(unit?.payee ?? {}, null, 2));
if (order.links) {
  console.log("approve url:", order.links.find((l) => l.rel === "approve")?.href ?? "none");
}
