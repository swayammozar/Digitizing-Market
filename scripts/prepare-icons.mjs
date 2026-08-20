/**
 * Normalises dock icons, which arrive from stock sources in two shapes.
 *
 * "tile" — a finished app icon that should fill its slot edge to edge. These
 * are often exported onto a larger canvas with a padded, sometimes
 * semi-transparent border; dropped in as-is they render visibly smaller than
 * their neighbours and show a pale plate behind them, because CSS rounds the
 * *canvas* rather than the artwork. Trimmed to the real bounds and given a
 * rounded-rect alpha mask at the dock's own corner radius.
 *
 * "glyph" — line art that sits on top of one of the dock's gradient tiles,
 * the way an SF Symbol does. Trimmed, then centred at the same optical size as
 * the hand-drawn glyphs beside it, on a transparent canvas. The tile itself is
 * drawn in CSS, so no mask is applied here.
 *
 * Icons already drawn to Apple's icon grid (Finder) are deliberately absent:
 * their padding is intentional, and trimming would leave them oversized.
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
/** Matches the dock's `rounded-[22%]`, so mask and CSS agree. */
const RADIUS = Math.round(SIZE * 0.22);
/** Matches the 0.62 scale the SVG glyphs are drawn at inside their tiles. */
const GLYPH_INSET = 0.62;

const ICONS = [
  { from: "instagram icon.png", to: "instagram.png", mode: "tile" },
  { from: "custom icon.png", to: "custom.png", mode: "glyph" },
];

const roundedMask = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}">
     <rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" ry="${RADIUS}" fill="#fff"/>
   </svg>`,
);

async function buildTile(src) {
  // trim() uses the top-left pixel as the background reference, which is
  // exactly the padded border being removed.
  const trimmed = await sharp(src)
    .trim({ threshold: 10 })
    .resize(SIZE, SIZE, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  return sharp(trimmed).composite([{ input: roundedMask, blend: "dest-in" }]).png();
}

async function buildGlyph(src) {
  const art = Math.round(SIZE * GLYPH_INSET);
  const trimmed = await sharp(src)
    .trim({ threshold: 8 })
    // `inside` preserves the aspect ratio — this artwork is wider than it is
    // tall, and stretching it to a square would distort the needle.
    .resize(art, art, { fit: "inside" })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, gravity: "centre" }])
    .png();
}

async function main() {
  for (const { from, to, mode } of ICONS) {
    const src = path.join(SOURCE, from);
    const before = await sharp(src).metadata();

    const pipeline = mode === "tile" ? await buildTile(src) : await buildGlyph(src);
    const info = await pipeline.toFile(path.join(OUT, to));

    console.log(
      `${from}: ${before.width}x${before.height} -> ${info.width}x${info.height} (${mode})`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
