/**
 * Exercises fulfilment against the real database, using the pending orders a
 * checkout has just created.
 *
 * The gateway's own approval step needs a human at a payment sheet, so this
 * covers everything either side of it: that a mismatched amount is refused,
 * that a correct one grants the files, and that running it twice — which the
 * browser and the webhook both do — grants them exactly once.
 *
 *   npx tsx --conditions=react-server scripts/verify-fulfilment.mts
 *
 * The condition flag resolves the `server-only` guard to its empty build, the
 * same way a React Server Component does, so the module can be loaded outside
 * Next without weakening the guard in the app itself.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env.local") });

const { grantDownloads } = await import("../src/lib/server/fulfilment.js");
const { createAdminClient } = await import("../src/lib/supabase/server.js");

const supabase = createAdminClient();
let failures = 0;

function check(name: string, passed: boolean, detail = "") {
  if (passed) {
    console.log(`  ok    ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

const { data: orders } = await supabase
  .from("orders")
  .select("id, gateway, gateway_order_id, amount, currency, status")
  .eq("status", "pending")
  .order("created_at", { ascending: false })
  .limit(10);

const paypal = orders?.find((o) => o.gateway === "paypal");
const razorpay = orders?.find((o) => o.gateway === "razorpay");

if (!paypal || !razorpay) {
  console.error(
    "Needs one pending order per gateway. Run a checkout in the browser first.",
  );
  process.exit(1);
}

console.log("fulfilment");

// A gateway reporting a different amount than we recorded means something was
// tampered with in between. Nothing should be granted, and the order should be
// marked failed rather than left pending for a webhook to retry.
const wrong = await grantDownloads({
  gatewayOrderId: paypal.gateway_order_id,
  gatewayPaymentId: "TEST_WRONG_AMOUNT",
  paidAmount: 0.01,
  paidCurrency: "USD",
});
check("a mismatched amount is refused", !wrong.granted, wrong.reason);

const { data: afterWrong } = await supabase
  .from("orders")
  .select("status")
  .eq("id", paypal.id)
  .single();
check("the mismatched order is marked failed", afterWrong?.status === "failed",
  `status is ${afterWrong?.status}`);

const { count: leaked } = await supabase
  .from("downloads")
  .select("*", { count: "exact", head: true })
  .eq("order_id", paypal.id);
check("nothing was granted for it", leaked === 0, `${leaked} row(s) exist`);

// The correct amount, as the gateway would report it.
const right = await grantDownloads({
  gatewayOrderId: razorpay.gateway_order_id,
  gatewayPaymentId: "pay_TEST_CORRECT",
  paidAmount: Number(razorpay.amount),
  paidCurrency: razorpay.currency,
});
check("a matching amount is granted", right.granted, right.reason);

const { data: paid } = await supabase
  .from("orders")
  .select("status, gateway_payment_id, paid_at")
  .eq("id", razorpay.id)
  .single();
check("the order is marked paid", paid?.status === "paid", `status is ${paid?.status}`);
check("the payment id is recorded", paid?.gateway_payment_id === "pay_TEST_CORRECT");

const { data: granted } = await supabase
  .from("downloads")
  .select("product_slug")
  .eq("order_id", razorpay.id);
check("both designs landed in the library", granted?.length === 2,
  `got ${granted?.length ?? 0}: ${granted?.map((g) => g.product_slug).join(", ")}`);

// The browser and the webhook race to confirm the same payment; the loser must
// be a no-op rather than a second grant.
const replay = await grantDownloads({
  gatewayOrderId: razorpay.gateway_order_id,
  gatewayPaymentId: "pay_TEST_CORRECT",
  paidAmount: Number(razorpay.amount),
  paidCurrency: razorpay.currency,
});
check("a replayed confirmation is harmless", replay.granted, replay.reason);

const { count: afterReplay } = await supabase
  .from("downloads")
  .select("*", { count: "exact", head: true })
  .eq("order_id", razorpay.id);
check("the replay granted nothing extra", afterReplay === 2, `now ${afterReplay} row(s)`);

console.log(failures === 0 ? "\nall passed" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
