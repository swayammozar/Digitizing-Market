/**
 * Checks whether this shop is safe to take real money.
 *
 *   npx tsx scripts/preflight-live.mts            checks .env.local
 *   npx tsx scripts/preflight-live.mts --site URL also checks a deployment
 *
 * Every check here exists because the same class of mistake has already
 * happened at least once: credentials that carried invisible characters, a
 * public key that reached one environment and not another, a gateway that
 * authenticated in test and failed in live. Going live is the moment those
 * stop being annoyances and start being lost sales, so nothing is assumed.
 *
 * Exits non-zero if anything would take money without delivering files.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { cleanEnv, cleanToken } from "../src/lib/env.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env.local") });

const siteFlag = process.argv.indexOf("--site");
const SITE = siteFlag > -1 ? process.argv[siteFlag + 1]?.replace(/\/$/, "") : null;

type Level = "pass" | "warn" | "fail";
const results: { level: Level; label: string; detail?: string }[] = [];

const record = (level: Level, label: string, detail?: string) =>
  results.push({ level, label, detail });

const pass = (l: string, d?: string) => record("pass", l, d);
const warn = (l: string, d?: string) => record("warn", l, d);
const fail = (l: string, d?: string) => record("fail", l, d);

// ---------------------------------------------------------------------------
// Gateways
// ---------------------------------------------------------------------------

const paypalEnv = cleanEnv(process.env.PAYPAL_ENV) === "live" ? "live" : "sandbox";
const paypalHost =
  paypalEnv === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const paypalId = cleanToken(process.env.PAYPAL_CLIENT_ID);
const paypalSecret = cleanEnv(process.env.PAYPAL_CLIENT_SECRET);
const paypalPublicId = cleanToken(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID);

async function paypalToken(): Promise<string | null> {
  if (!paypalId || !paypalSecret) return null;
  const response = await fetch(`${paypalHost}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${paypalId}:${paypalSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) return null;
  return ((await response.json()) as { access_token: string }).access_token;
}

async function checkPayPal() {
  if (!paypalId || !paypalSecret) {
    fail("PayPal credentials missing");
    return;
  }

  if (paypalEnv === "live") pass("PAYPAL_ENV is live");
  else warn("PAYPAL_ENV is sandbox", "No real money will move until this is 'live'.");

  // The browser gets its own copy of the client id. They have disagreed before,
  // and a mismatch means the button charges through a different account than
  // the server verifies against.
  if (paypalPublicId !== paypalId) {
    fail(
      "NEXT_PUBLIC_PAYPAL_CLIENT_ID does not match PAYPAL_CLIENT_ID",
      "The button and the server would use different accounts.",
    );
  } else {
    pass("PayPal client id matches between browser and server");
  }

  const token = await paypalToken();
  if (!token) {
    fail(
      `PayPal rejected these credentials against ${paypalEnv}`,
      "Live credentials are a different pair from sandbox ones.",
    );
    return;
  }
  pass(`PayPal authenticates against ${paypalEnv}`);

  // A registered webhook is what rescues a buyer who closes the tab.
  const hooks = await fetch(`${paypalHost}/v1/notifications/webhooks`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  const list = (hooks as { webhooks?: { url: string; event_types: { name: string }[] }[] } | null)
    ?.webhooks;

  if (!list?.length) {
    fail(
      "No PayPal webhook registered",
      "A buyer who closes the tab after paying would get nothing.",
    );
  } else {
    const ours = list.find((w) => w.url.includes("/api/webhooks/paypal"));
    if (!ours) {
      fail("No PayPal webhook points at /api/webhooks/paypal");
    } else if (!ours.event_types.some((e) => e.name === "PAYMENT.CAPTURE.COMPLETED")) {
      fail("PayPal webhook is not subscribed to PAYMENT.CAPTURE.COMPLETED");
    } else {
      pass("PayPal webhook registered", ours.url);
    }
  }

  if (!cleanEnv(process.env.PAYPAL_WEBHOOK_ID)) {
    fail(
      "PAYPAL_WEBHOOK_ID is not set",
      "Without it every webhook fails signature checks and is ignored.",
    );
  } else {
    pass("PAYPAL_WEBHOOK_ID is set");
  }
}

// ---------------------------------------------------------------------------

const razorpayId = cleanToken(process.env.RAZORPAY_KEY_ID);
const razorpaySecret = cleanEnv(process.env.RAZORPAY_KEY_SECRET);

async function checkRazorpay() {
  if (!razorpayId || !razorpaySecret) {
    fail("Razorpay credentials missing");
    return;
  }

  if (razorpayId.startsWith("rzp_live_")) pass("Razorpay is using a live key");
  else if (razorpayId.startsWith("rzp_test_"))
    warn("Razorpay is using a test key", "No real money will move.");
  else warn("Razorpay key id has an unfamiliar prefix", razorpayId.slice(0, 9));

  const auth = `Basic ${Buffer.from(`${razorpayId}:${razorpaySecret}`).toString("base64")}`;
  const ok = await fetch("https://api.razorpay.com/v1/orders?count=1", {
    headers: { Authorization: auth },
  })
    .then((r) => r.ok)
    .catch(() => false);

  if (ok) pass("Razorpay authenticates");
  else fail("Razorpay rejected these credentials");

  if (!cleanEnv(process.env.RAZORPAY_WEBHOOK_SECRET)) {
    fail(
      "RAZORPAY_WEBHOOK_SECRET is not set",
      "Without it every webhook fails signature checks and is ignored.",
    );
  } else {
    pass("RAZORPAY_WEBHOOK_SECRET is set");
  }

  // Razorpay only exposes this on some plans; absence proves nothing.
  const hooks = await fetch("https://api.razorpay.com/v1/webhooks", {
    headers: { Authorization: auth },
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  const items = (hooks as { items?: { url: string; active: boolean }[] } | null)?.items;
  if (items?.length) {
    const ours = items.find((w) => w.url.includes("/api/webhooks/razorpay") && w.active);
    if (ours) pass("Razorpay webhook registered", ours.url);
    else fail("No active Razorpay webhook points at /api/webhooks/razorpay");
  } else {
    warn(
      "Could not read Razorpay webhooks from the API",
      "Confirm by eye in Dashboard → Settings → Webhooks.",
    );
  }
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

async function checkShop() {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    fail("Supabase credentials missing");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // A known password on a live shop is an open door, however little is behind it.
  const { data: users } = await supabase.auth.admin.listUsers();
  const test = users?.users.find((u) => u.email === "test@digitizingmarket.com");
  if (test) {
    fail(
      "The test account still exists",
      "test@digitizingmarket.com — its password is in the repo history.",
    );
  } else {
    pass("No test account");
  }

  // Every sellable design must have its file, or a paid customer gets a 500.
  const { products } = (await import("../src/data/products.json", {
    with: { type: "json" },
  })) as unknown as { products: { slug: string; zipKey: string | null; isService: boolean }[] };

  const sellable = products.filter((p) => !p.isService && p.zipKey);
  const { data: stored } = await supabase.storage.from("product-files").list("", { limit: 1000 });
  const names = new Set((stored ?? []).map((f) => f.name));
  const missing = sellable.filter((p) => !names.has(p.zipKey!));

  if (missing.length) {
    fail(
      `${missing.length} design file(s) missing from storage`,
      missing.map((p) => p.slug).join(", "),
    );
  } else {
    pass(`All ${sellable.length} design files present in storage`);
  }

  // A public bucket would make the paywall decorative.
  const { data: buckets } = await supabase.storage.listBuckets();
  const paid = buckets?.find((b) => b.id === "product-files");
  if (!paid) fail("The product-files bucket is missing");
  else if (paid.public) fail("product-files is PUBLIC", "Anyone could download every design.");
  else pass("product-files is private");
}

// ---------------------------------------------------------------------------
// Deployment
// ---------------------------------------------------------------------------

async function checkDeployment() {
  if (!SITE) return;

  const html = await fetch(SITE).then((r) => (r.ok ? r.text() : null)).catch(() => null);
  if (!html) {
    fail(`Could not reach ${SITE}`);
    return;
  }
  pass(`${SITE} is reachable`);

  // The deployed client id is readable, and has differed from the local one
  // before — a variable added to the host but never rebuilt looks identical
  // from the dashboard and is absent from the bundle.
  if (paypalId) {
    const sources = [...html.matchAll(/src="(\/_next\/[^"]+\.js)"/g)].map((m) => m[1]);
    let found: string | undefined;
    for (const src of sources) {
      const body = await fetch(SITE + src).then((r) => r.text()).catch(() => "");
      const match = body.match(new RegExp(`"([^"]*${paypalId.slice(0, 10)}[^"]*)"`));
      if (match) {
        found = cleanToken(match[1]);
        break;
      }
    }
    if (!found) {
      fail(
        "The deployed bundle has no PayPal client id",
        "Add it to the host and redeploy — NEXT_PUBLIC values are baked in at build time.",
      );
    } else if (found !== paypalId) {
      fail("The deployed PayPal client id differs from the local one");
    } else {
      pass("The deployed PayPal client id matches");
    }
  }

  for (const hook of ["paypal", "razorpay"]) {
    const status = await fetch(`${SITE}/api/webhooks/${hook}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then((r) => r.status)
      .catch(() => 0);
    if (status === 401) pass(`/api/webhooks/${hook} is live and refusing unsigned requests`);
    else fail(`/api/webhooks/${hook} answered ${status}`, "Expected 401 for an unsigned request.");
  }
}

// ---------------------------------------------------------------------------

console.log("Preflight for taking real money\n");

await checkPayPal();
await checkRazorpay();
await checkShop();
await checkDeployment();

const mark = { pass: "  ok  ", warn: " warn ", fail: " FAIL " } as const;
for (const r of results) {
  console.log(`${mark[r.level]} ${r.label}`);
  if (r.detail) console.log(`        ${r.detail}`);
}

const failures = results.filter((r) => r.level === "fail").length;
const warnings = results.filter((r) => r.level === "warn").length;

console.log(
  `\n${results.filter((r) => r.level === "pass").length} passed, ` +
    `${warnings} warning(s), ${failures} failure(s)`,
);
console.log(
  failures === 0
    ? warnings === 0
      ? "\nReady to take real money."
      : "\nNothing is broken, but the warnings above mean this is still a test setup."
    : "\nNot ready. Each failure above can take money without delivering files.",
);

process.exit(failures === 0 ? 0 : 1);
