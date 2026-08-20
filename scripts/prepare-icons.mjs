/**
 * Normalises dock icons that ship with dead space around the artwork.
 *
 * Stock logo PNGs are often exported onto a larger canvas with a padded — and
 * sometimes semi-transparent white — border. Dropped into the dock as-is, such
 * an icon renders visibly smaller than its neighbours and shows a pale plate
 * behind it, because CSS rounds the *canvas*, not the logo.
 *
 * Each icon here is trimmed to its real bounds, redrawn at a common size, and
 * given a rounded-rect alpha mask matching the dock's own corner radius, so
 * nothing of the old border survives in the corners.
 *
 * Icons already drawn to Apple's icon grid (Finder) are deliberately absent:
 * their padding is intentional, and trimming would make them oversized.
 *
 *   node scripts/prepare-icons.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE = path.resolve(ROOT, "..", "DigitizingMarket");
const OUT = path.join(ROOT, "public", "ui");

const SIZE = 512;
/** Matches the dock's `rounded-[22%]`, so the mask and the CSS agree. */
const RADIUS = Math.round(SIZE * 0.22);

const ICONS = [{ from: "instagram icon.png", to: "instagram.png" }];

const mask = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}">
     <rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" ry="${RADIUS}" fill="#fff"/>
   </svg>`,
);

async function main() {
  for (const { from, to } of ICONS) {
    const src = path.join(SOURCE, from);
    const before = await sharp(src).metadata();

    const trimmed = await sharp(src)
      // Uses the top-left pixel as the background reference, which is exactly
      // the padded border we want gone.
      .trim({ threshold: 10 })
      .resize(SIZE, SIZE, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();

    const info = await sharp(trimmed)
      .composite([{ input: mask, blend: "dest-in" }])
      .png()
      .toFile(path.join(OUT, to));

    console.log(
      `${from}: ${before.width}x${before.height} -> ${info.width}x${info.height} ` +
        `(border removed, corners masked)`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
