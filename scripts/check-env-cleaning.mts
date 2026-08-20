/**
 * Checks that credentials survive being pasted badly.
 *
 * Each case here actually happened: a leading tab on the storage URL, and a
 * trailing literal "\n" on the PayPal client id after a paste into Vercel.
 * Both broke production while localhost was fine, and neither error message
 * pointed anywhere near the cause.
 *
 *   npx tsx scripts/check-env-cleaning.mts
 */
import { cleanEnv, cleanToken } from "../src/lib/env.js";

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    console.log(`  ok    ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}\n        got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
  }
}

const ID = "ASmyPayPalClientId_1234-abcd";

console.log("cleanToken");
check("a clean id is untouched", cleanToken(ID), ID);
check("a trailing literal backslash-n is dropped", cleanToken(`${ID}\\n`), ID);
check("a real trailing newline is dropped", cleanToken(`${ID}\n`), ID);
check("a leading tab is dropped", cleanToken(`\t${ID}`), ID);
check("surrounding spaces are dropped", cleanToken(`  ${ID}  `), ID);
check("wrapping quotes are dropped", cleanToken(`"${ID}"`), ID);
check("an embedded space is dropped", cleanToken(`ASmy PayPal`), "ASmyPayPal");
check("underscores and dashes survive", cleanToken("rzp_test_AbC-123"), "rzp_test_AbC-123");
check("dots survive", cleanToken("a.b.c"), "a.b.c");
check("undefined stays undefined", cleanToken(undefined), undefined);
check("an all-junk value becomes undefined", cleanToken("\\n  "), undefined);

console.log("\ncleanEnv");
check("a secret keeps its punctuation", cleanEnv("s3cr!t/+=key"), "s3cr!t/+=key");
check("a wrapped secret is unwrapped", cleanEnv(`'s3cr!t'`), "s3cr!t");
check("a trailing newline is dropped", cleanEnv("s3cr!t\n"), "s3cr!t");
check("empty becomes undefined", cleanEnv("   "), undefined);
check(
  "a url keeps its slashes",
  cleanEnv("\thttps://x.supabase.co/storage/v1"),
  "https://x.supabase.co/storage/v1",
);

console.log(failures === 0 ? "\nall passed" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
