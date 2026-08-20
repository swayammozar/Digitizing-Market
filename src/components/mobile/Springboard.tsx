"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { designs, mediaUrl } from "@/lib/catalog";
import { useCart, useCartHydrated } from "@/lib/cart";
import { useClock } from "@/lib/useClock";
import { useViewport } from "@/lib/desktopLayout";
import { BatteryIcon, SignalIcon, WifiIcon } from "../system/StatusIcons";
import type { Currency, Product } from "@/lib/types";
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

/**
 * Measured from the rendered grid: an icon with a two-line label occupies 96px
 * and rows repeat every 111px, so five rows need 540px of clear space.
 */
const ROW_PITCH = 111;
const ICON_BLOCK = 96;
/** Status bar, page dots, dock, and the margins around them. */
const CHROME = 31 + 27 + 78 + 20;

/**
 * How much to shrink the icons so five rows still clear the dock.
 *
 * A short phone cannot fit five rows at full size — at 568px they overlap the
 * dock outright. Showing fewer icons per page instead would cost every common
 * phone a row to accommodate a rare one, so the grid keeps its twenty and the
 * icons give up the difference. The floor stops labels becoming unreadable.
 */
function springboardScale(viewportHeight: number): number {
  const available = viewportHeight - CHROME;
  const needed = (PER_PAGE / 4 - 1) * ROW_PITCH + ICON_BLOCK;
  return Math.min(1, Math.max(0.72, available / needed));
}

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

  const viewport = useViewport();
  const iconScale = springboardScale(viewport.height);

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

      <StatusBar
        currency={currency}
        onToggleCurrency={() => setCurrency(currency === "USD" ? "INR" : "USD")}
      />

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
            /**
             * A full page spreads its rows through the whole height, which
             * both drops the first row clear of the status bar and closes the
             * dead band that otherwise sits above the page dots. Letting the
             * browser divide the leftover space is exact and cannot overflow,
             * where computing a gap from estimated row heights can.
             *
             * The last page holds five icons, and spreading those would strand
             * them mid-screen. It stays top-aligned, as iOS leaves a partial
             * page.
             */
            className={`grid w-full shrink-0 snap-start grid-cols-4 gap-x-2 px-4 ${
              items.length === PER_PAGE ? "content-evenly py-1" : "content-start pt-2"
            }`}
            style={items.length === PER_PAGE ? undefined : { rowGap: 16 * iconScale }}
          >
            {items.map((entry) =>
              entry === "help" ? (
                <AppIcon
                  key="help"
                  label="Help"
                  scale={iconScale}
                  onOpen={() => setSheet({ kind: "help" })}
                  tile={
                    <Image
                      src="/ui/settings.png"
                      alt=""
                      width={256}
                      height={256}
                      className="h-full w-full rounded-[22%] object-cover"
                    />
                  }
                />
              ) : (
                <AppIcon
                  key={entry.slug}
                  label={entry.name}
                  scale={iconScale}
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

/**
 * The iOS status bar, carrying the shop's name in the middle of it: time on the
 * left, brand and currency centred, radios and battery on the right.
 *
 * Laid out as a three-column grid rather than space-between, because the two
 * edges hold different amounts — a short clock against three icons — and
 * spacing them apart would leave the middle off-centre by the difference. Equal
 * `1fr` tracks put the centre column in the true middle whatever they contain.
 *
 * Sized to survive a 320px phone: everything on one line is tight, so the type
 * is small and the shop name truncates before it can push the battery off.
 */
function StatusBar({
  currency,
  onToggleCurrency,
}: {
  currency: Currency;
  onToggleCurrency: () => void;
}) {
  const ms = useClock();

  return (
    <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-0.5 pt-2 text-white">
      <span className="desktop-label tabular text-[13px] font-semibold">
        {/* Empty on the server, where the visitor's clock is not knowable. */}
        {ms > 0
          ? new Date(ms)
              .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
              // iOS shows no meridiem in the status bar.
              .replace(/\s?[ap]\.?m\.?/i, "")
          : ""}
      </span>

      <span className="flex min-w-0 items-center gap-1.5">
        <span className="desktop-label truncate text-[13.5px] font-semibold">
          Digitizing Market
        </span>
        <button
          type="button"
          onClick={onToggleCurrency}
          aria-label={
            currency === "USD"
              ? "Prices in dollars, switch to rupees"
              : "Prices in rupees, switch to dollars"
          }
          className="desktop-label tabular shrink-0 rounded-full bg-black/30 px-2 py-0.5 text-[11px] font-medium"
        >
          {currency === "USD" ? "$ USD" : "₹ INR"}
        </button>
      </span>

      <span className="flex items-center justify-end gap-1.5">
        <SignalIcon />
        <WifiIcon size={14} />
        <BatteryIcon />
      </span>
    </div>
  );
}

function AppIcon({
  label,
  tile,
  onOpen,
  scale = 1,
}: {
  label: string;
  tile: React.ReactNode;
  onOpen: () => void;
  scale?: number;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col items-center"
      style={{ gap: 6 * scale }}
      aria-label={label}
    >
      <span
        className="block overflow-hidden rounded-[22%] shadow-[0_3px_8px_rgba(0,0,0,.3)] transition-transform active:scale-90"
        style={{ width: 62 * scale, height: 62 * scale }}
      >
        {tile}
      </span>
      <span
        className="desktop-label line-clamp-2 w-full text-center font-medium leading-tight text-white"
        // Shrinks more slowly than the tile: a label has to stay readable even
        // when the icon above it has given up a quarter of its size.
        style={{ fontSize: 11 * Math.max(scale, 0.88) }}
      >
        {label}
      </span>
    </button>
  );
}

/**
 * iOS blurs the wallpaper behind the home screen, and it is doing real work:
 * icon labels sit directly on it with no window chrome to separate them, so a
 * sharp photograph competes with every label at once.
 *
 * It also solves a problem this particular wallpaper has. The source is
 * 1200x665 and upscales on any modern phone; blurred, there is no detail left
 * to look soft.
 */
function Wallpaper() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <Image
        src="/ui/wallpaper.jpg"
        alt=""
        fill
        priority
        // Deliberately small: the result is blurred past recognition, so a
        // larger download would buy nothing but bandwidth.
        sizes="480px"
        // Blur samples beyond the element's edges and drags transparency
        // inward, leaving pale borders. Scaling up first pushes those edges
        // off-screen.
        className="scale-125 object-cover blur-[26px]"
      />
      <div className="absolute inset-0 bg-black/25" aria-hidden />
    </div>
  );
}
