/**
 * Creates (or resets) a confirmed test account, so the login screen and the
 * checkout can be exercised without waiting on a confirmation email.
 *
 *   node scripts/create-test-user.mjs
 *
 * This account is for testing only. Delete it before launch — a known
 * password on a live site is an open door, however little sits behind it:
 * Supabase Dashboard -> Authentication -> Users -> delete.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env.local") });

const EMAIL = process.env.TEST_USER_EMAIL ?? "test@digitizingmarket.com";
const PASSWORD = process.env.TEST_USER_PASSWORD ?? "DigiTest2026!";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // createUser with email_confirm skips the confirmation mail entirely, which
  // is the whole point — a test account should not depend on an inbox.
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });

  if (!error) {
    console.log(`Created ${EMAIL}`);
    console.log(`Password: ${PASSWORD}`);
    console.log(`User id: ${data.user?.id}`);
    return;
  }

  // Re-running should reset the password rather than fail, so the credentials
  // below are always the ones that actually work.
  const alreadyExists =
    error.message.toLowerCase().includes("already") ||
    error.status === 422;

  if (!alreadyExists) {
    console.error(`Could not create the user: ${error.message}`);
    process.exit(1);
  }

  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error(`Could not look up existing users: ${listError.message}`);
    process.exit(1);
  }

  const existing = list.users.find((user) => user.email === EMAIL);
  if (!existing) {
    console.error(`${EMAIL} reported as existing but was not found.`);
    process.exit(1);
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    existing.id,
    { password: PASSWORD, email_confirm: true },
  );
  if (updateError) {
    console.error(`Could not reset the password: ${updateError.message}`);
    process.exit(1);
  }

  console.log(`${EMAIL} already existed — password reset.`);
  console.log(`Password: ${PASSWORD}`);
  console.log(`User id: ${existing.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
