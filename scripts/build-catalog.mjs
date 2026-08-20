/**
 * Builds the product catalog from two sources that already exist:
 *
 *   listings.csv   the shop copy — title, description, tags, category
 *   Products/      the real assets — images, videos, and the design zips
 *
 * Nothing here is authored by hand. Sizes, stitch counts and the format list
 * are read out of each product's own zip, so what the site advertises can
 * never drift from what the buyer actually downloads.
 *
 *   node scripts/build-catalog.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { specsForProduct, formatsForProduct, FORMAT_MACHINES } from './lib/specs.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SOURCE = path.resolve(ROOT, '..', 'DigitizingMarket');
const PRODUCTS_DIR = path.join(SOURCE, 'Products');
const LISTINGS_CSV = path.resolve(ROOT, '..', 'etsy-tool', 'listings.csv');
const OUT = path.join(ROOT, 'src', 'data', 'products.json');

const PRICE_USD = 9.99;
// A stored round number, not a live FX call: the rate moving must never change
// a price mid-checkout, and no third-party API can take the shop down.
const PRICE_INR = 849;

/**
 * Two of the CSV's seven sections hold only two products each, which would
 * leave the desktop with folders barely worth opening. Religious & Faith and
 * the two unsectioned Christmas designs combine into one folder of four.
 */
const CATEGORY = {
  'Animals': 'Animals',
  'Tattoo & Dark': 'Tattoo & Dark',
  'Floral & Nature': 'Floral & Nature',
  'Streetwear & Urban': 'Streetwear & Urban',
  'Japanese & Anime': 'Japanese & Anime',
  'Food & Drink': 'Food & Drink',
  'Religious & Faith': 'Faith & Festive',
};
// Rows the CSV left unsectioned.
const UNSECTIONED = {
  'Christmas Tree': 'Faith & Festive',
  'Reindeer': 'Faith & Festive',
};

export const CATEGORY_ORDER = [
  'Tattoo & Dark',
  'Animals',
  'Floral & Nature',
  'Streetwear & Urban',
  'Japanese & Anime',
  'Faith & Festive',
  'Food & Drink',
];

/** The design that gets its own icon on the desktop, outside any folder. */
const FEATURED = 'Dripping Skull';

const SERVICE_FOLDER = 'Custom Digitizing';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * The CSV title is a long Etsy SEO string ("X Machine Embroidery Design |
 * ..."). Desktop icons need the short name, so the folder name is the label
 * and the SEO title is kept for the product window and page metadata.
 */
export function shortTitle(folder) {
  return folder
    .replace(/\s+\d+$/, '')     // "Possessed 3" -> "Possessed"
    .replace(/\bSankes\b/, 'Snakes'); // typo in the folder name
}

/** Splits the CSV's pipe-padded title into its headline and subtitle halves. */
export function splitTitle(csvTitle) {
  const [head, ...rest] = csvTitle.split('|').map((s) => s.trim());
  return { head, sub: rest.join(' | ') };
}

function applyBlocks(description, detailsBlock, formatsBlockText) {
  return description
    .split('{{DESIGN_DETAILS}}').join(detailsBlock)
    .split('{{FORMATS}}').join(formatsBlockText)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Reformats the shop's plain-text details block into structured fields the
 * product window can lay out itself, rather than dumping a wall of text.
 */
function specFields(specs) {
  if (!specs.length) return null;
  const biggest = specs[0];
  return {
    sizes: specs.map((s) => ({
      widthMm: Number(s.widthMm.toFixed(1)),
      heightMm: Number(s.heightMm.toFixed(1)),
      stitches: s.stitches,
    })),
    stitches: Math.round(biggest.stitches / 100) * 100,
    colors: biggest.colors ?? null,
    colorNames: biggest.colorNames ?? null,
  };
}

async function main() {
  const csv = parse(await fs.readFile(LISTINGS_CSV, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
  });
  const byFolder = new Map(csv.map((r) => [r.folder, r]));

  const folders = (await fs.readdir(PRODUCTS_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const products = [];
  const warnings = [];

  for (const folder of folders) {
    const row = byFolder.get(folder);
    if (!row) {
      warnings.push(`${folder}: no row in listings.csv — skipped`);
      continue;
    }

    const dir = path.join(PRODUCTS_DIR, folder);
    const files = await fs.readdir(dir);

    const images = files
      .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
      .sort();
    const videos = files.filter((f) => path.extname(f).toLowerCase() === '.mp4');
    const zips = files.filter((f) => path.extname(f).toLowerCase() === '.zip');

    const slug = slugify(folder);
    const isService = folder === SERVICE_FOLDER;

    if (!images.length) warnings.push(`${folder}: no images`);
    if (!isService && !zips.length) warnings.push(`${folder}: no zip — cannot be sold`);

    // Reading the zip is the slow part (a few hundred MB of inflate), so it
    // is skipped for the service, which has no design files.
    let specs = [];
    let formatInfo = { formats: [], known: [] };
    if (zips.length) {
      specs = await specsForProduct(dir, zips);
      formatInfo = await formatsForProduct(dir, zips);
      if (!specs.length) warnings.push(`${folder}: zip had no readable DST specs`);
    }

    const { head, sub } = splitTitle(row.title);
    const detailsBlock = ''; // structured into `specs` instead of inlined
    const formatsBlockText = '';

    products.push({
      slug,
      folder,
      name: shortTitle(folder),
      title: head,
      tagline: sub,
      seoTitle: row.title,
      description: applyBlocks(row.description, detailsBlock, formatsBlockText),
      category: isService
        ? null
        : CATEGORY[row.shop_section] ?? UNSECTIONED[folder] ?? null,
      tags: (row.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
      priceUsd: PRICE_USD,
      priceInr: PRICE_INR,
      isService,
      featured: folder === FEATURED,
      specs: specFields(specs),
      formats: formatInfo.formats,
      formatMachines: Object.fromEntries(
        formatInfo.known.map((f) => [f, FORMAT_MACHINES[f]]),
      ),
      // Source filenames. process-media.mjs rewrites these to processed paths.
      source: {
        dir: folder,
        images,
        video: videos[0] ?? null,
        zip: zips[0] ?? null,
      },
      media: {
        icon: `${slug}/icon.webp`,
        images: images.map((_, i) => `${slug}/${i + 1}.webp`),
        video: videos.length ? `${slug}/preview.mp4` : null,
      },
      zipKey: zips.length ? `${slug}.zip` : null,
    });
  }

  const uncategorised = products.filter((p) => !p.isService && !p.category);
  for (const p of uncategorised) warnings.push(`${p.folder}: no category`);

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    categoryOrder: CATEGORY_ORDER,
    products,
  }, null, 2)}\n`);

  const counts = CATEGORY_ORDER.map(
    (c) => `${c}: ${products.filter((p) => p.category === c).length}`,
  );
  console.log(`Wrote ${products.length} products to ${path.relative(ROOT, OUT)}`);
  console.log(counts.join('\n'));
  console.log(`services: ${products.filter((p) => p.isService).length}`);
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  ! ${w}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
