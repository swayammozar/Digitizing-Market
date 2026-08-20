import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { extractMatching, listZipEntries } from './zip.mjs';
import { parseDstHeader } from './dst.mjs';

/**
 * Pulls the text out of a PDF's flate-compressed content streams.
 * Wilcom production sheets draw each glyph separately, so the extracted
 * text has a space between every character ("H : 3 5 5 .7 m m"). Removing
 * all whitespace is therefore the correct normalisation here, not a hack â€”
 * the real token boundaries are the labels themselves.
 */
export function pdfToDenseText(buf) {
  let raw = '';
  let i = 0;
  for (;;) {
    const s = buf.indexOf('stream', i);
    if (s < 0) break;
    let start = s + 6;
    if (buf[start] === 0x0d) start += 1;
    if (buf[start] === 0x0a) start += 1;
    const e = buf.indexOf('endstream', start);
    if (e < 0) break;
    try {
      raw += zlib.inflateSync(buf.subarray(start, e)).toString('latin1');
    } catch { /* not a flate stream â€” skip */ }
    i = e + 9;
  }

  const parts = [];
  for (const m of raw.matchAll(/\((?:\\.|[^()\\])*\)/g)) {
    parts.push(m[0].slice(1, -1).replace(/\\([()\\])/g, '$1'));
  }
  return parts.join('').replace(/\s+/g, '');
}

/**
 * Reads height, width, stitch count and colour count from a Wilcom sheet.
 *
 * The four headline numbers are printed as a row of labels followed by a row
 * of values, so they arrive concatenated: "Stitches:Colors:Colorchanges:
 * Stops:207416556" is 207416 / 5 / 5 / 6. Stitches are recovered by summing
 * the per-colour breakdown, which is unambiguous, and the remaining digits
 * then split cleanly.
 */
export function parseWilcomSpecs(dense) {
  const mm = (label) => {
    const m = dense.match(new RegExp(`${label}:(\\d+(?:\\.\\d+)?)mm`));
    return m ? Number(m[1]) : null;
  };
  const heightMm = mm('H');
  const widthMm = mm('W');

  // Per-colour rows look like "1.142494Red3" = index "1.", colour slot "1",
  // stitches "42494", description "Red", code "3".
  const rows = [...dense.matchAll(/(\d+)\.(\d)(\d+)([A-Za-z]+)\d+Brand:/g)];
  const stitches = rows.reduce((sum, r) => sum + Number(r[3]), 0) || null;
  const colors = rows.length ? new Set(rows.map((r) => r[2])).size : null;
  // Distinct thread names in the order they are first stitched. A colour can
  // occupy several slots, so this is usually shorter than `colors`.
  const colorNames = [...new Set(rows.map((r) => r[4]))];

  return {
    heightMm, widthMm, stitches, colors,
    colorNames: colorNames.length ? colorNames : null,
    colorBlocks: rows.length || null,
  };
}

const HOOP_MM = [
  [100, 100, '4x4'],
  [130, 180, '5x7'],
  [160, 260, '6x10'],
  [200, 300, '8x12'],
];

/** Smallest standard hoop the design fits, or null if it exceeds them all. */
export function hoopFor(widthMm, heightMm) {
  if (!widthMm || !heightMm) return null;
  const w = Math.min(widthMm, heightMm);
  const h = Math.max(widthMm, heightMm);
  for (const [hw, hh, label] of HOOP_MM) {
    if (w <= hw && h <= hh) return label;
  }
  return null;
}

// Machine formats we know how to describe, in the order the shop lists them.
export const FORMAT_MACHINES = {
  PES: 'Brother / Babylock / Deco',
  DST: 'Tajima / Barudan / Melco / Brother / Babylock',
  VP3: 'Husqvarna / Viking / Pfaff',
  JEF: 'Janome / Elna / Kenmore',
  EXP: 'Melco / Bernina',
  HUS: 'Husqvarna / Viking',
  VIP: 'Husqvarna / Viking / Pfaff (older models)',
  XXX: 'Singer',
};
// Not stitch formats, so never advertised:
//   EMB  editable Wilcom source â€” a buyer with it can re-export and resell
//   INF  Melco colour-information sidecar that rides along with EXP
//   BMP  bitmap preview image
const NOT_A_FORMAT = new Set([
  'EMB', 'PDF', 'HTML', 'TXT', 'JPG', 'JPEG', 'PNG', 'BMP', 'INF', 'DOC', 'RTF',
]);

/** The machine formats actually present inside a product's zips. */
export async function formatsForProduct(productDir, relFiles) {
  const found = new Set();
  for (const rel of relFiles) {
    if (path.extname(rel).toLowerCase() !== '.zip') continue;
    const buf = await fs.readFile(path.join(productDir, rel));
    for (const e of listZipEntries(buf)) {
      const ext = path.extname(e.name).replace('.', '').toUpperCase();
      if (ext && !NOT_A_FORMAT.has(ext)) found.add(ext);
    }
  }
  const known = Object.keys(FORMAT_MACHINES).filter((f) => found.has(f));
  const unknown = [...found].filter((f) => !(f in FORMAT_MACHINES)).sort();
  return { formats: [...known, ...unknown], known, unknown };
}

/** Renders the "Formats included" block from what the zip really contains. */
export function formatsBlock({ formats, known }) {
  if (!formats.length) return '';
  const lines = [`ðŸ“ Formats included: ${formats.join(', ')}`];
  for (const f of known) lines.push(`â€¢ ${f} â€” ${FORMAT_MACHINES[f]}`);
  return lines.join('\n');
}

/**
 * Measures a product from the files inside its zip.
 *
 * Size and stitch count come from the DST header: every product ships a DST,
 * and it is machine data rather than a rendering. Thread-colour count comes
 * only from a Wilcom production sheet, because DST records colour *changes*
 * (a reused palette inflates that number) and some products ship an
 * image-only PDF with nothing to read.
 */
export async function specsForProduct(productDir, relFiles) {
  const sizes = [];
  let colors = null;
  let colorNames = null;

  for (const rel of relFiles) {
    if (path.extname(rel).toLowerCase() !== '.zip') continue;
    const buf = await fs.readFile(path.join(productDir, rel));

    for (const dst of extractMatching(buf, (n) => n.toLowerCase().endsWith('.dst'))) {
      const h = parseDstHeader(dst.data);
      if (h?.stitches && h.widthMm && h.heightMm) {
        sizes.push({
          source: dst.name, stitches: h.stitches,
          widthMm: h.widthMm, heightMm: h.heightMm,
        });
      }
    }

    for (const pdf of extractMatching(buf, (n) => n.toLowerCase().endsWith('.pdf'))) {
      const parsed = parseWilcomSpecs(pdfToDenseText(pdf.data));
      // Same design at every size, so one reading of the palette is enough.
      if (parsed.colors) colors = Math.max(colors ?? 0, parsed.colors);
      if (parsed.colorNames && !colorNames) colorNames = parsed.colorNames;
    }
  }

  // Identical designs exported twice under different names would otherwise
  // be listed as two sizes.
  const seen = new Set();
  const unique = sizes.filter((s) => {
    const key = `${s.stitches}:${s.widthMm}:${s.heightMm}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Largest first, matching how the shop lists "2 sizes".
  return unique
    .sort((a, b) => b.stitches - a.stitches)
    .map((s) => ({ ...s, colors, colorNames }));
}

const fmt = (n) => n.toLocaleString('en-US');
const mm1 = (n) => n.toFixed(1);
// "an 8x12 hoop", "a 5x7 hoop".
const article = (label) => (/^[80]/.test(label) ? 'an' : 'a');

/** Renders the "Design details" block in the shop's established house style. */
export function designDetailsBlock(specs) {
  // Some products ship an image-only PDF with no text layer, so there is
  // nothing to parse. Keep the section and the one claim that is always
  // true rather than dropping it â€” the numbers can be filled in later.
  if (!specs.length) {
    return 'âœ‚ï¸ Design details\nâ€¢ Manually digitized for a smooth, clean stitch-out';
  }

  const sizes = specs.map((s) => {
    const hoop = hoopFor(s.widthMm, s.heightMm);
    const size = `${mm1(s.widthMm)} Ã— ${mm1(s.heightMm)} mm`;
    return hoop ? `${size} (fits ${article(hoop)} ${hoop} hoop)` : size;
  });

  const lines = ['âœ‚ï¸ Design details'];
  lines.push(sizes.length > 1
    ? `â€¢ Available in ${sizes.length} sizes: ${sizes.join(' and ')}`
    : `â€¢ Size: ${sizes[0]}`);

  const biggest = specs[0];
  lines.push(`â€¢ Stitch count: ~${fmt(Math.round(biggest.stitches / 100) * 100)}${
    specs.length > 1 ? ' (large size)' : ''}`);
  // Only from a Wilcom sheet; omitted rather than guessed from the DST.
  if (biggest.colors) {
    lines.push(`â€¢ Colors: ${biggest.colors} thread color${biggest.colors === 1 ? '' : 's'}`);
  }
  lines.push('â€¢ Manually digitized for a smooth, clean stitch-out');
  return lines.join('\n');
}

