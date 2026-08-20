/**
 * Uploads to Supabase Storage.
 *
 *   public-media   processed images and preview videos (~24 MB)
 *   product-files  the 44 design zips (~226 MB) — private, never public
 *
 * Run after build-catalog.mjs and process-media.mjs:
 *
 *   node scripts/upload-storage.mjs            everything not already there
 *   node scripts/upload-storage.mjs --media    public media only
 *   node scripts/upload-storage.mjs --files    design zips only
 *   node scripts/upload-storage.mjs --force    re-upload and overwrite
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * The service role key is required: the zips go to a bucket with no public
 * policy at all, which only the service role can write to.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const MEDIA_DIR = path.join(ROOT, "public", "media");
const PRODUCTS_DIR = path.resolve(ROOT, "..", "DigitizingMarket", "Products");
const CATALOG = path.join(ROOT, "src", "data", "products.json");

dotenv.config({ path: path.join(ROOT, ".env.local") });

const force = process.argv.includes("--force");
const only = process.argv.includes("--media")
  ? "media"
  : process.argv.includes("--files")
    ? "files"
    : "both";

const CONTENT_TYPE = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".zip": "application/zip",
};

const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
    process.exit(1);
  }
  return value;
}

async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

/** Names already in the bucket, so a re-run does not re-send 226 MB. */
async function existingKeys(supabase, bucket, prefix = "") {
  const found = new Set();
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
  });
  if (error) return found;

  for (const item of data) {
    const key = prefix ? `${prefix}/${item.name}` : item.name;
    // A folder has no id; recurse into it.
    if (item.id === null) {
      for (const nested of await existingKeys(supabase, bucket, key)) {
        found.add(nested);
      }
    } else {
      found.add(key);
    }
  }
  return found;
}

async function upload(supabase, bucket, key, absolutePath, present) {
  if (!force && present.has(key)) return { skipped: true, bytes: 0 };

  const body = await fs.readFile(absolutePath);
  const { error } = await supabase.storage.from(bucket).upload(key, body, {
    contentType: CONTENT_TYPE[path.extname(key).toLowerCase()] ?? "application/octet-stream",
    upsert: true,
    cacheControl: "31536000", // a design file never changes under the same key
  });

  if (error) throw new Error(`${bucket}/${key}: ${error.message}`);
  return { skipped: false, bytes: body.length };
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let uploaded = 0;
  let skipped = 0;
  let bytes = 0;
  const failures = [];

  if (only !== "files") {
    const files = await walk(MEDIA_DIR);
    const present = await existingKeys(supabase, "public-media");
    console.log(`public-media: ${files.length} files`);

    for (const rel of files) {
      try {
        const result = await upload(
          supabase, "public-media", rel, path.join(MEDIA_DIR, rel), present,
        );
        if (result.skipped) skipped += 1;
        else {
          uploaded += 1;
          bytes += result.bytes;
        }
      } catch (err) {
        failures.push(err.message);
      }
    }
  }

  if (only !== "media") {
    const { products } = JSON.parse(await fs.readFile(CATALOG, "utf8"));
    const sellable = products.filter((p) => p.zipKey && p.source.zip);
    const present = await existingKeys(supabase, "product-files");
    console.log(`product-files: ${sellable.length} design zips`);

    for (const product of sellable) {
      const source = path.join(PRODUCTS_DIR, product.source.dir, product.source.zip);
      try {
        const result = await upload(
          supabase, "product-files", product.zipKey, source, present,
        );
        if (result.skipped) skipped += 1;
        else {
          uploaded += 1;
          bytes += result.bytes;
          process.stdout.write(`  ${product.zipKey} ${mb(result.bytes)}\n`);
        }
      } catch (err) {
        failures.push(err.message);
      }
    }
  }

  console.log(`\nuploaded ${uploaded} (${mb(bytes)}), skipped ${skipped}`);
  if (failures.length) {
    console.log(`\n${failures.length} failure(s):`);
    for (const f of failures) console.log(`  ! ${f}`);
    process.exitCode = 1;
  } else {
    console.log(
      `\nSet this in .env.local and on Vercel:\n` +
        `NEXT_PUBLIC_MEDIA_BASE_URL=${url}/storage/v1/object/public/public-media`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
