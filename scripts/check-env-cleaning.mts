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
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

/**
 * The cleaning functions above were correct the whole time. What broke the
 * webhooks was a read that never called them: the fix for pasted credentials
 * cleaned the API keys and missed both webhook values, so every genuine
 * delivery was rejected as forged while every test here still passed.
 *
 * So this also checks usage, not just behaviour — every environment read in
 * the app must go through cleanEnv or cleanToken.
 */
console.log("\nevery environment read is cleaned");

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

async function sourceFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await sourceFiles(full)));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const raw: string[] = [];
for (const file of await sourceFiles(SRC)) {
  // env.ts defines the cleaners and legitimately has nothing to wrap.
  if (file.endsWith(`${path.sep}env.ts`)) continue;
  const lines = (await fs.readFile(file, "utf8")).split("\n");
  lines.forEach((line, i) => {
    if (!line.includes("process.env.")) return;
    if (/clean(Env|Token)\(\s*process\.env\./.test(line)) return;
    raw.push(`${path.relative(SRC, file)}:${i + 1}  ${line.trim()}`);
  });
}

if (raw.length === 0) {
  console.log("  ok    no raw process.env reads");
} else {
  failures += 1;
  console.log(`  FAIL  ${raw.length} read(s) bypass cleaning:`);
  for (const r of raw) console.log(`        ${r}`);
}

console.log(failures === 0 ? "\nall passed" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
