"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { bySlug, formatPrice, mediaUrl, price } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { capturePointer } from "@/lib/pointer";
import ProductDetail from "../product/ProductDetail";

export type SheetTarget =
  | { kind: "product"; slug: string }
  | { kind: "cart" }
  | { kind: "downloads" }
  | { kind: "service" }
  | { kind: "help" };

/** Drag distance past which releasing dismisses the sheet. */
const DISMISS_AT = 110;

export default function MobileSheet({
  target,
  onClose,
  onNavigate,
}: {
  target: SheetTarget;
  onClose: () => void;
  onNavigate: (target: SheetTarget) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointerId: number; startY: number } | null>(null);

  const title = useTitle(target);

  // Escape closes it, and the page behind must not scroll while it is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (drag.current?.pointerId !== e.pointerId) return;
    // Downward only: an upward drag should feel like the sheet is anchored.
    setOffset(Math.max(0, e.clientY - drag.current.startY));
  }, []);

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (drag.current?.pointerId !== e.pointerId) return;
      drag.current = null;
      setDragging(false);
      setOffset((current) => {
        if (current > DISMISS_AT) onClose();
        return current > DISMISS_AT ? current : 0;
      });
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/40"
        style={{ opacity: Math.max(0, 1 - offset / 320) }}
        onClick={onClose}
        aria-hidden
      />

      <div
        className="glass glass-thick relative mt-8 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[18px]"
        style={{
          transform: `translateY(${offset}px)`,
          transition: dragging ? "none" : "transform .28s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <header
          onPointerDown={(e) => {
            drag.current = { pointerId: e.pointerId, startY: e.clientY };
            setDragging(true);
            capturePointer(e.currentTarget as HTMLElement, e.pointerId);
          }}
          // The grabber is the drag handle, so it must not also pan the page.
          className="shrink-0 touch-none px-4 pb-2 pt-2.5"
        >
          <span className="mx-auto block h-[5px] w-[38px] rounded-full bg-black/25" aria-hidden />
          <div className="mt-2 flex items-center justify-between gap-3">
            <h2 className="truncate text-[16px] font-semibold text-[color:var(--label-on-panel)]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/10 text-[color:var(--label-on-panel)]"
            >
              <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden>
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        <div className="scroll-thin min-h-0 flex-1 overflow-auto overscroll-contain">
          <Content target={target} onNavigate={onNavigate} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

function useTitle(target: SheetTarget): string {
  if (target.kind === "product") return bySlug(target.slug)?.name ?? "Design";
  if (target.kind === "cart") return "Cart";
  if (target.kind === "downloads") return "My Downloads";
  if (target.kind === "service") return "Custom Digitizing";
  return "Help";
}

function Content({
  target,
  onNavigate,
  onClose,
}: {
  target: SheetTarget;
  onNavigate: (t: SheetTarget) => void;
  onClose: () => void;
}) {
  if (target.kind === "product") {
    const product = bySlug(target.slug);
    if (!product) {
      return <Message title="Not available" body="That design is no longer in the shop." />;
    }
    return <ProductDetail product={product} onAdded={() => onNavigate({ kind: "cart" })} />;
  }

  if (target.kind === "cart") return <MobileCart onClose={onClose} />;

  if (target.kind === "downloads") {
    return (
      <Message
        title="Sign in to see your designs"
        body="Every design you buy stays here, and you can download it again as many times as you like — new machine, new computer, years later."
      />
    );
  }

  if (target.kind === "service") {
    return (
      <Message
        title="Custom digitizing"
        body="Send us a logo, a drawing, or a photo of a patch and we digitize it by hand — every machine format, with a colour chart. Most jobs come back within 24 hours. Open this page on a computer to attach artwork, or email hello@digitizingmarket.com."
      />
    );
  }

  return <MobileHelp />;
}

function MobileCart({ onClose }: { onClose: () => void }) {
  const slugs = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const currency = useCart((s) => s.currency);

  const items = slugs.map(bySlug).filter((p) => p !== undefined);
  const total = items.reduce((sum, p) => sum + price(p, currency), 0);

  if (items.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-[15px] font-medium text-[color:var(--label-on-panel)]">
          Your cart is empty
        </p>
        <p className="mx-auto mt-2 max-w-[30ch] text-[13px] text-[color:var(--label-on-panel-secondary)]">
          Tap any design on the home screen to see it.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-lg bg-[color:var(--color-system-blue)] px-4 py-2.5 text-[14px] font-medium text-white"
        >
          Browse designs
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <ul className="flex-1 p-3">
        {items.map((product) => (
          <li key={product.slug} className="flex items-center gap-3 rounded-lg p-2">
            <Image
              src={mediaUrl(product.media.icon)}
              alt=""
              width={160}
              height={128}
              className="h-[46px] w-[58px] shrink-0 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-[color:var(--label-on-panel)]">
                {product.name}
              </p>
              <p className="tabular text-[12.5px] text-[color:var(--label-on-panel-secondary)]">
                {formatPrice(price(product, currency), currency)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(product.slug)}
              aria-label={`Remove ${product.name}`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/10 text-black/50"
            >
              <svg width="11" height="11" viewBox="0 0 10 10" aria-hidden>
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-0 border-t border-black/10 bg-white/70 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[13px] text-[color:var(--label-on-panel-secondary)]">Total</span>
          <span className="tabular text-[20px] font-semibold text-[color:var(--label-on-panel)]">
            {formatPrice(total, currency)}
          </span>
        </div>
        <button
          type="button"
          className="w-full rounded-lg bg-[color:var(--color-hanko)] px-4 py-3 text-[15px] font-semibold text-white"
        >
          Check out
        </button>
      </div>
    </div>
  );
}

const HELP = [
  {
    q: "Which file does my machine need?",
    a: "Brother and Babylock use PES. Tajima and most commercial machines use DST. Husqvarna Viking and Pfaff use VP3. Janome uses JEF. Every design includes all of them, so you do not have to decide before buying.",
  },
  {
    q: "How soon do I get the files?",
    a: "Immediately. The download appears as soon as payment clears and stays in My Downloads for good.",
  },
  {
    q: "What may I do with a design?",
    a: "Stitch it onto items you sell, on any scale, without paying again. You may not resell or share the digital file itself.",
  },
  {
    q: "Refunds",
    a: "Files cannot be returned once downloaded, so we do not refund a change of mind. If a design will not open or does not stitch out as shown, we repair it or refund you in full.",
  },
  {
    q: "Talk to a person",
    a: "hello@digitizingmarket.com — you will hear back within a day.",
  },
];

function MobileHelp() {
  return (
    <div className="p-5">
      {HELP.map((item, i) => (
        <section key={item.q} className={i > 0 ? "mt-5" : undefined}>
          <h3 className="mb-1.5 text-[14px] font-semibold text-[color:var(--label-on-panel)]">
            {item.q}
          </h3>
          <p className="text-[13px] leading-relaxed text-[color:var(--label-on-panel-secondary)]">
            {item.a}
          </p>
        </section>
      ))}
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-8 text-center">
      <p className="text-[15px] font-medium text-[color:var(--label-on-panel)]">{title}</p>
      <p className="mx-auto mt-2 max-w-[34ch] text-[13px] leading-relaxed text-[color:var(--label-on-panel-secondary)]">
        {body}
      </p>
    </div>
  );
}
