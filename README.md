# Digitizing Market

A shop for machine embroidery designs, built as a working macOS desktop. Designs
are icons on a wallpaper; double-clicking one opens a draggable window where it
can be bought and downloaded.

## Running it

```bash
npm install
npm run dev
```

Requires **Node 22 or newer** (`@supabase/supabase-js` will not run on Node 20).

## Where the content comes from

Nothing in the catalog is written by hand. Two sources feed it:

| Source | Provides |
|---|---|
| `../etsy-tool/listings.csv` | titles, descriptions, tags, categories |
| `../DigitizingMarket/Products/` | images, videos, and the design zips |

Sizes, stitch counts, thread palettes and the format list are read out of each
product's **own zip** — the DST header for dimensions and stitch count, the
Wilcom production sheet for the thread colours. What the shop advertises
therefore cannot drift from what the buyer receives.

### Rebuilding assets

```bash
npm run catalog   # listings.csv + zips -> src/data/products.json
npm run media     # compress images and videos -> public/media (gitignored)
npm run upload    # push media and design zips to Supabase Storage
npm run assets    # all three, in order
```

`npm run media` turns 388 MB of source images and video into about 24 MB. The
videos are the reason it exists: at their original size, Supabase's free egress
allowance would run out after roughly fifteen product views.

## Architecture

- **Next.js 16** (App Router, Turbopack) · React 19 · Tailwind v4 · Supabase
- The catalog is **static JSON**, generated at build time — no database read to
  browse the shop.
- Supabase handles accounts, orders, the download library, and file storage.

### Storage buckets

| Bucket | Contents | Access |
|---|---|---|
| `public-media` | images, preview videos | public |
| `product-files` | the 44 design zips | **private** |
| `custom-artwork` | artwork sent with quote requests | private |

`product-files` has no row level security policy at all, which means only the
service role can reach it. A zip URL never goes to the browser: downloading
calls a server route that checks the session, confirms the buyer owns that
design, and mints a signed link that expires in minutes.

### A note on CSS

Custom styles live in `@layer components`, not unlayered. Tailwind v4 puts its
utilities in `@layer utilities`, and unlayered CSS outranks every layer — so a
bare `.glass { position: relative }` silently beats `class="absolute"`. Keep new
component styles inside the layer.

Write `backdrop-filter` **unprefixed only**. Lightning CSS adds vendor prefixes
from the browser targets, and hand-writing `-webkit-backdrop-filter` alongside
it makes it collapse both into the prefixed version, which Chrome ignores.

## Deploying

1. Create a Supabase project, then run `supabase/schema.sql` in the SQL editor.
2. Copy `.env.example` to `.env.local` and fill in the three Supabase values.
3. `npm run upload` to push media and design files to Storage.
4. Push to GitHub, import the repo in Vercel, and add the same environment
   variables there. Set the framework preset to **Next.js**.

## Not built yet

Accounts, checkout (PayPal and Razorpay), signed downloads, and the iOS
springboard for phones. `DownloadsWindow` and the cart's checkout button are
placeholders until then.
