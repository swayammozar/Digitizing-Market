"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { designs, mediaUrl } from "@/lib/catalog";
import { useCart, useCartHydrated } from "@/lib/cart";
import type { Product } from "@/lib/types";
import MobileSheet, { type SheetTarget } from "./MobileSheet";

/**
 * The iPhone home screen. Four columns, five rows, and the rest of the
 * catalog on the next page — the arrangement iOS itself uses, because it is
 * the one a thumb already knows.
 *
 * Twenty per page rather than twenty-four: six rows overflow the shortest
 * phones once the label and the dock are accounted for, and a home screen
 * that scrolls vertically stops reading as a home screen.
 */
const PER_PAGE = 20;

interface DockItem {
  key: string;
  label: string;
  tile: React.ReactNode;
  /** Opens a sheet, or leaves for an external shop when `href` is set. */
  target?: SheetTarget;
  href?: string;
}

const DOCK: DockItem[] = [
  {
    key: "service",
    target: { kind: "service" },
    label: "Custom",
    tile: (
      <span
        className="grid h-full w-full place-items-center overflow-hidden rounded-[22%]"
        style={{ background: "linear-gradient(160deg,#8e7cff,#5a43e8)" }}
      >
        <Image src="/ui/custom.png" alt="" width={128} height={128} className="h-full w-full object-contain" />
      </span>
    ),
  },
  {
    key: "cart",
    target: { kind: "cart" },
    label: "Cart",
    tile: (
      <span
        className="grid h-full w-full place-items-center rounded-[22%]"
        style={{ background: "linear-gradient(160deg,#ffb454,#f0762b)" }}
      >
        <svg width="60%" height="60%" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M4.5 6.4h2l1.7 9.3a1.7 1.7 0 0 0 1.7 1.4h6.6a1.7 1.7 0 0 0 1.7-1.3l1.2-5.9H7.4"
            stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"
          />
          <circle cx="10.4" cy="19.4" r="1.25" fill="white" />
          <circle cx="16.4" cy="19.4" r="1.25" fill="white" />
        </svg>
      </span>
    ),
  },
  {
    key: "downloads",
    target: { kind: "downloads" },
    label: "Downloads",
    tile: (
      <span
        className="grid h-full w-full place-items-center rounded-[22%]"
        style={{ background: "linear-gradient(160deg,#4fd0e8,#1c8fd6)" }}
      >
        <svg width="60%" height="60%" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 4.6v9.8m0 0 3.6-3.6M12 14.4l-3.6-3.6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M5 16.6v1.2a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8v-1.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
      </span>
    ),
  },
  {
    key: "etsy",
    href: "https://www.etsy.com/shop/DigitizingView",
    label: "Etsy",
    tile: (
      <Image src="/ui/etsy.png" alt="" width={128} height={128} className="h-full w-full rounded-[22%] object-cover" />
    ),
  },
];

export default function Springboard() {
  const [page, setPage] = useState(0);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const pager = useRef<HTMLDivElement>(null);

  const currency = useCart((s) => s.currency);
  const setCurrency = useCart((s) => s.setCurrency);
  const cartCount = useCart((s) => s.items.length);
  const hydrated = useCartHydrated();

  // The catalog plus one Help tile, which is where the licence, formats and
  // FAQ live now that there is no menu bar to hang them from.
  const pages: (Product | "help")[][] = [];
  const entries: (Product | "help")[] = [...designs, "help"];
  for (let i = 0; i < entries.length; i += PER_PAGE) {
    pages.push(entries.slice(i, i + PER_PAGE));
  }

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden select-none">
      <Wallpaper />

      <header className="flex shrink-0 items-center justify-between px-5 pb-1 pt-3">
        <span className="desktop-label text-[15px] font-semibold text-white">
          Digitizing Market
        </span>
        <button
          type="button"
          onClick={() => setCurrency(currency === "USD" ? "INR" : "USD")}
          className="desktop-label tabular rounded-full bg-black/20 px-2.5 py-1 text-[12px] font-medium text-white"
        >
          {currency === "USD" ? "$ USD" : "₹ INR"}
        </button>
      </header>

      {/* Native horizontal paging: scroll-snap gives real momentum and rubber
          banding, which a pointer-event reimplementation never quite matches. */}
      <div
        ref={pager}
        onScroll={(e) => {
          const el = e.currentTarget;
          setPage(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]{display:none}"
      >
        {pages.map((items, i) => (
          <section
            key={i}
            aria-label={`Page ${i + 1} of ${pages.length}`}
            className="grid w-full shrink-0 snap-start grid-cols-4 content-start gap-x-2 gap-y-4 px-4 pt-2"
          >
            {items.map((entry) =>
              entry === "help" ? (
                <AppIcon
                  key="help"
                  label="Help"
                  onOpen={() => setSheet({ kind: "help" })}
                  tile={
                    <span className="grid h-full w-full place-items-center rounded-[22%] bg-white/85">
                      <span className="text-[26px] font-semibold text-[#5a43e8]">?</span>
                    </span>
                  }
                />
              ) : (
                <AppIcon
                  key={entry.slug}
                  label={entry.name}
                  onOpen={() => setSheet({ kind: "product", slug: entry.slug })}
                  tile={
                    <Image
                      src={mediaUrl(entry.media.icon)}
                      alt=""
                      width={256}
                      height={256}
                      className="h-full w-full rounded-[22%] object-cover"
                    />
                  }
                />
              ),
            )}
          </section>
        ))}
      </div>

      {pages.length > 1 && (
        <div className="flex shrink-0 justify-center gap-1.5 py-2.5" aria-hidden>
          {pages.map((_, i) => (
            <span
              key={i}
              className={`h-[7px] w-[7px] rounded-full transition-opacity ${
                i === page ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      <nav
        className="glass mx-3 mb-3 flex shrink-0 items-center justify-around rounded-[26px] px-2 py-2.5"
        aria-label="Dock"
      >
        {DOCK.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-label={item.label}
            onClick={() => {
              if (item.href) {
                window.open(item.href, "_blank", "noopener,noreferrer");
              } else if (item.target) {
                setSheet(item.target);
              }
            }}
            className="relative block h-[58px] w-[58px] transition-transform active:scale-90"
          >
            {item.tile}
            {item.label === "Cart" && hydrated && cartCount > 0 && (
              <span className="tabular absolute -right-1 -top-1 min-w-[20px] rounded-full bg-[color:var(--color-hanko)] px-1 text-center text-[11px] font-bold leading-[20px] text-white">
                {cartCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {sheet && (
        <MobileSheet
          target={sheet}
          onClose={() => setSheet(null)}
          onNavigate={setSheet}
        />
      )}
    </main>
  );
}

function AppIcon({
  label,
  tile,
  onOpen,
}: {
  label: string;
  tile: React.ReactNode;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col items-center gap-1.5"
      aria-label={label}
    >
      <span className="block h-[62px] w-[62px] overflow-hidden rounded-[22%] shadow-[0_3px_8px_rgba(0,0,0,.3)] transition-transform active:scale-90">
        {tile}
      </span>
      <span className="desktop-label line-clamp-2 w-full text-center text-[11px] font-medium leading-tight text-white">
        {label}
      </span>
    </button>
  );
}

function Wallpaper() {
  return (
    <div className="absolute inset-0 -z-10">
      <Image
        src="/ui/wallpaper.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Slightly darker than the desktop's: phone labels sit directly over the
          wallpaper with no window chrome to separate them from it. */}
      <div className="absolute inset-0 bg-black/15" aria-hidden />
    </div>
  );
}
