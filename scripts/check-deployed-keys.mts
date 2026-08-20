/**
 * Compares the credentials a deployment is actually running against the ones
 * that work locally, and asks each provider whether it accepts them.
 *
 *   npx tsx scripts/check-deployed-keys.mts [https://your-site]
 *
 * The public PayPal client id is read straight out of the deployed JavaScript,
 * where it is inlined at build time, and cleaned with the app's own function so
 * the comparison reflects what the app really uses. Secrets never leave the
 * server, so those are tested by authenticating rather than by reading.
 *
 * Written because "PayPal rejected these credentials" is true but not
 * actionable: it does not say which of the two is wrong.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { cleanToken, cleanEnv } from "../src/lib/env.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env.local") });

const SITE = (process.argv[2] ?? "https://www.digitizingmarket.com").replace(/\/$/, "");

const localId = cleanToken(process.env.PAYPAL_CLIENT_ID);
const localSecret = cleanEnv(process.env.PAYPAL_CLIENT_SECRET);

if (!localId || !localSecret) {
  console.error("No PayPal credentials in .env.local to compare against.");
  process.exit(1);
}

async function paypalAccepts(id: string, secret: string): Promise<string> {
  const response = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  return response.ok ? "accepted" : `rejected (${response.status})`;
}

/** Pulls the inlined public client id out of the deployed bundle. */
async function deployedClientId(): Promise<string | undefined> {
  const html = await (await fetch(SITE)).text();
  const sources = [...html.matchAll(/src="(\/_next\/[^"]+\.js)"/g)].map((m) => m[1]);
  const prefix = localId!.slice(0, 10);

  for (const src of sources) {
    const body = await (await fetch(SITE + src)).text();
    if (!body.includes(prefix)) continue;
    const found = body.match(new RegExp(`"([^"]*${prefix}[^"]*)"`));
    if (found) return cleanToken(found[1]);
  }
  return undefined;
}

console.log(`checking ${SITE}\n`);

console.log("local credentials (from .env.local)");
console.log(`  client id : ${localId.length} chars`);
console.log(`  secret    : ${localSecret.length} chars`);
console.log(`  PayPal says: ${await paypalAccepts(localId, localSecret)}\n`);

const deployed = await deployedClientId();
console.log("deployed public client id");
if (!deployed) {
  console.log("  not found in the bundle — the variable is missing from the host");
} else {
  console.log(`  ${deployed.length} chars after cleaning`);
  console.log(
    deployed === localId
      ? "  matches the working client id — so the CLIENT ID is fine"
      : "  DIFFERENT from the working client id — the host has the wrong one",
  );
}

console.log("\nconclusion");
if (deployed === localId) {
  console.log("  The client id on the host is correct.");
  console.log("  Since the host still reports rejection, the SECRET is the wrong one.");
  console.log("  Re-paste PAYPAL_CLIENT_SECRET, then redeploy.");
} else {
  console.log("  Re-paste PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET, then redeploy.");
}
