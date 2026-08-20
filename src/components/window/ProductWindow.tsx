"use client";

import Image from "next/image";
import { useState } from "react";
import { bySlug, formatPrice, mediaUrl, price } from "@/lib/catalog";
import { threadHex, threadLabel } from "@/lib/threadColors";
import { useCart } from "@/lib/cart";
import { useWindows, type WindowState } from "@/lib/windows";
import type { DesignSpecs, Product } from "@/lib/types";
import WindowFrame from "./WindowFrame";

export default function ProductWindow({ win }: { win: WindowState }) {
  const product = bySlug(win.target);
  const currency = useCart((s) => s.currency);
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const open = useWindows((s) => s.open);

  if (!product) {
    return (
      <WindowFrame win={win}>
        <p className="p-8 text-[13px] text-[color:var(--label-on-panel-secondary)]">
          That design is no longer in the shop.
        </p>
      </WindowFrame>
    );
  }

  const inCart = items.includes(product.slug);

  return (
    <WindowFrame win={win} subtitle={product.tagline}>
      <div className="grid h-full grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
        <Gallery product={product} />

        <div className="scroll-thin overflow-auto border-l border-black/10 bg-white/30 p-6">
          <h3 className="text-[19px] font-semibold leading-tight text-[color:var(--label-on-panel)]">
            {product.title}
          </h3>
          <p className="mt-1 text-[13px] text-[color:var(--label-on-panel-secondary)]">
            {product.tagline}
          </p>

          <div className="my-5 flex items-baseline gap-2.5">
            <span className="tabular text-[27px] font-semibold tracking-tight text-[color:var(--color-hanko)]">
              {formatPrice(price(product, currency), currency)}
            </span>
            <span className="text-[12.5px] text-[color:var(--label-on-panel-secondary)]">
              instant download
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              add(product.slug);
              open({ kind: "cart", target: "cart", title: "Cart" });
            }}
            disabled={inCart}
            className="w-full rounded-lg bg-[color:var(--color-hanko)] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[.99] disabled:cursor-default disabled:bg-black/10 disabled:text-black/45"
          >
            {inCart ? "In your cart" : "Add to cart"}
          </button>

          {product.specs && <Specs specs={product.specs} />}

          <Section title="Formats included">
            <ul className="space-y-1.5">
              {product.formats.map((format) => (
                <li key={format} className="flex gap-2.5 text-[12.5px]">
                  <span className="tabular w-[38px] shrink-0 font-semibold text-[color:var(--label-on-panel)]">
                    {format}
                  </span>
                  <span className="text-[color:var(--label-on-panel-secondary)]">
                    {product.formatMachines[format] ?? "Most machines"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-[color:var(--label-on-panel-secondary)]">
              A PDF colour chart is included with every design.
            </p>
          </Section>

          <Section title="About this design">
            <div className="space-y-2.5 text-[12.5px] leading-relaxed text-[color:var(--label-on-panel-secondary)]">
              {product.description
                .split("\n")
                .filter((line) => line.trim())
                .slice(0, 4)
                .map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
            </div>
          </Section>
        </div>
      </div>
    </WindowFrame>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="stitch-rule mb-3 text-[color:var(--label-on-panel)]" />
      <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--label-on-panel-secondary)]">
        {title}
      </h4>
      {children}
    </section>
  );
}

/**
 * Everything here is read out of the design's own files at build time — the
 * DST header for size and stitch count, the Wilcom sheet for the palette. A
 * shop that shows you the thread colours before you buy is telling you it has
 * actually opened the file.
 */
function Specs({ specs }: { specs: DesignSpecs }) {
  return (
    <Section title="Design details">
      <dl className="space-y-2 text-[12.5px]">
        {specs.sizes.map((size, i) => (
          <div key={i} className="flex justify-between gap-4">
            <dt className="text-[color:var(--label-on-panel-secondary)]">
              {specs.sizes.length > 1 ? (i === 0 ? "Large" : "Small") : "Size"}
            </dt>
            <dd className="tabular text-[color:var(--label-on-panel)]">
              {size.widthMm} × {size.heightMm} mm
              <span className="text-[color:var(--label-on-panel-secondary)]">
                {" "}
                · {size.stitches.toLocaleString()} stitches
              </span>
            </dd>
          </div>
        ))}
      </dl>

      {specs.colorNames && (
        <div className="mt-4">
          <p className="mb-2 text-[12.5px] text-[color:var(--label-on-panel-secondary)]">
            {specs.colors} thread {specs.colors === 1 ? "colour" : "colours"}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {specs.colorNames.map((name) => (
              <li
                key={name}
                title={threadLabel(name)}
                className="flex items-center gap-1.5 rounded-full bg-white/60 py-1 pl-1 pr-2.5"
              >
                <span
                  className="h-[15px] w-[15px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.16)]"
                  style={{ background: threadHex(name) }}
                  aria-hidden
                />
                <span className="text-[11.5px] text-[color:var(--label-on-panel)]">
                  {threadLabel(name)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function Gallery({ product }: { product: Product }) {
  const shots = [
    ...(product.media.video ? [{ kind: "video" as const, src: product.media.video }] : []),
    ...product.media.images.map((src) => ({ kind: "image" as const, src })),
  ];
  const [active, setActive] = useState(0);
  const current = shots[active];

  return (
    <div className="flex min-h-0 flex-col gap-3 p-5">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[var(--radius-panel)] bg-black/[.06]">
        {current?.kind === "video" ? (
          <video
            key={current.src}
            src={mediaUrl(current.src)}
            className="h-full w-full object-contain"
            controls
            loop
            muted
            playsInline
            // Nothing downloads until the buyer asks to watch it.
            preload="none"
            poster={mediaUrl(product.media.images[0])}
          />
        ) : current ? (
          <Image
            src={mediaUrl(current.src)}
            alt={product.title}
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-contain"
          />
        ) : null}
      </div>

      {shots.length > 1 && (
        <ul className="flex shrink-0 gap-2">
          {shots.map((shot, i) => (
            <li key={shot.src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={
                  shot.kind === "video" ? "Stitch-out video" : `View ${i + 1}`
                }
                aria-current={i === active}
                className={`relative block h-[52px] w-[64px] overflow-hidden rounded-md transition-[box-shadow] ${
                  i === active
                    ? "ring-2 ring-[color:var(--color-system-blue)]"
                    : "ring-1 ring-black/10 hover:ring-black/25"
                }`}
              >
                <Image
                  src={mediaUrl(
                    shot.kind === "video" ? product.media.images[0] : shot.src,
                  )}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
                {shot.kind === "video" && (
                  <span className="absolute inset-0 grid place-items-center bg-black/35">
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                      <path d="M5.5 3.5v9l7-4.5z" fill="white" />
                    </svg>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
