/**
 * Turns 615 MB of source assets into web media.
 *
 * The videos are the reason this exists: 37 clips at up to 17 MB each would
 * exhaust Supabase's free egress in about fifteen product views. Re-encoded
 * to a 1280x720 box with no audio they land around 1-2 MB, and nothing about
 * how they look on the page changes.
 *
 * Output goes to public/media/, which is gitignored — the same tree is later
 * uploaded to Supabase Storage for production.
 *
 *   node scripts/process-media.mjs           only what is missing
 *   node scripts/process-media.mjs --force   rebuild everything
 *   node scripts/process-media.mjs --images  skip video encoding
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SOURCE = path.resolve(ROOT, '..', 'DigitizingMarket');
const PRODUCTS_DIR = path.join(SOURCE, 'Products');
const OUT = path.join(ROOT, 'public', 'media');
const CATALOG = path.join(ROOT, 'src', 'data', 'products.json');

const force = process.argv.includes('--force');
const imagesOnly = process.argv.includes('--images');

// Desktop icons render around 88px wide, so 640 covers a 2x display with room
// for the larger tiles inside folder windows.
const ICON = { width: 640, height: 512, quality: 80 };
const FULL = { width: 1400, quality: 82 };

const exists = (p) => fs.access(p).then(() => true, () => false);

const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

async function sizeOf(p) {
  try {
    return (await fs.stat(p)).size;
  } catch {
    return 0;
  }
}

async function makeIcon(src, dest) {
  await sharp(src)
    .resize(ICON.width, ICON.height, { fit: 'cover', position: 'centre' })
    .webp({ quality: ICON.quality })
    .toFile(dest);
}

async function makeFull(src, dest) {
  await sharp(src)
    .resize(FULL.width, null, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: FULL.quality })
    .toFile(dest);
}

async function makeVideo(src, dest) {
  await run(ffmpegPath, [
    '-y', '-loglevel', 'error',
    '-i', src,
    // Fit inside 1280x720 without distorting; the second scale guarantees the
    // even dimensions H.264 requires after the first one rounds.
    '-vf', 'scale=w=1280:h=720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264', '-crf', '28', '-preset', 'slow',
    '-pix_fmt', 'yuv420p',
    '-an',                              // stitch-out clips have no useful audio
    '-movflags', '+faststart',          // lets playback start before full load
    dest,
  ], { maxBuffer: 1024 * 1024 * 32 });
}

async function main() {
  const { products } = JSON.parse(await fs.readFile(CATALOG, 'utf8'));

  let srcBytes = 0;
  let outBytes = 0;
  let built = 0;
  let skipped = 0;
  const failures = [];

  for (const p of products) {
    const dir = path.join(PRODUCTS_DIR, p.source.dir);
    const destDir = path.join(OUT, p.slug);
    await fs.mkdir(destDir, { recursive: true });

    // Icon comes from the first image, which is the one the shop leads with.
    const iconSrc = path.join(dir, p.source.images[0]);
    const iconDest = path.join(OUT, p.media.icon);
    if (force || !(await exists(iconDest))) {
      try {
        await makeIcon(iconSrc, iconDest);
        built += 1;
      } catch (err) {
        failures.push(`${p.slug} icon: ${err.message}`);
      }
    } else skipped += 1;

    for (const [i, name] of p.source.images.entries()) {
      const src = path.join(dir, name);
      const dest = path.join(OUT, p.media.images[i]);
      srcBytes += await sizeOf(src);
      if (!force && (await exists(dest))) {
        skipped += 1;
      } else {
        try {
          await makeFull(src, dest);
          built += 1;
        } catch (err) {
          failures.push(`${p.slug} image ${name}: ${err.message}`);
        }
      }
      outBytes += await sizeOf(dest);
    }

    if (p.source.video && !imagesOnly) {
      const src = path.join(dir, p.source.video);
      const dest = path.join(OUT, p.media.video);
      const before = await sizeOf(src);
      srcBytes += before;
      if (!force && (await exists(dest))) {
        skipped += 1;
      } else {
        process.stdout.write(`  encoding ${p.slug} (${mb(before)}) ... `);
        try {
          await makeVideo(src, dest);
          built += 1;
          console.log(mb(await sizeOf(dest)));
        } catch (err) {
          console.log('FAILED');
          failures.push(`${p.slug} video: ${err.message.split('\n')[0]}`);
        }
      }
      outBytes += await sizeOf(dest);
    }
  }

  console.log(`\nbuilt ${built}, skipped ${skipped}`);
  console.log(`source ${mb(srcBytes)} -> output ${mb(outBytes)}`);
  if (failures.length) {
    console.log(`\n${failures.length} failure(s):`);
    for (const f of failures) console.log(`  ! ${f}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
