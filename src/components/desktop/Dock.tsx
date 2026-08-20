"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { useCart, useCartHydrated } from "@/lib/cart";
import { useWindows, type WindowKind } from "@/lib/windows";

const BASE = 52;
const MAX_SCALE = 1.6;
/** How far along the dock the cursor's pull reaches, in pixels. */
const REACH = 105;

type DockAction =
  | { type: "window"; kind: WindowKind; target: string; title: string }
  | { type: "link"; href: string };

type GlyphKind = "custom" | "cart" | "downloads";

interface DockItem {
  id: string;
  label: string;
  image?: string;
  glyph?: GlyphKind;
  action: DockAction;
}

type DockEntry = DockItem | { separator: true };

const ITEMS: DockEntry[] = [
  {
    id: "finder",
    label: "All Designs",
    image: "/ui/finder.png",
    action: { type: "window", kind: "folder", target: "All", title: "All Designs" },
  },
  {
    id: "custom",
    label: "Custom Digitizing",
    glyph: "custom",
    action: {
      type: "window",
      kind: "service",
      target: "custom-digitizing",
      title: "Custom Digitizing",
    },
  },
  {
    id: "cart",
    label: "Cart",
    glyph: "cart",
    action: { type: "window", kind: "cart", target: "cart", title: "Cart" },
  },
  {
    id: "downloads",
    label: "My Downloads",
    glyph: "downloads",
    action: {
      type: "window",
      kind: "downloads",
      target: "downloads",
      title: "My Downloads",
    },
  },
  { separator: true },
  {
    id: "instagram",
    label: "Instagram",
    image: "/ui/instagram.png",
    action: { type: "link", href: "https://instagram.com" },
  },
  {
    id: "etsy",
    label: "Etsy shop",
    image: "/ui/etsy.png",
    action: { type: "link", href: "https://www.etsy.com/shop/DigitizingView" },
  },
];

/**
 * Tiles are drawn here rather than baked into the images so the glyphs stay a
 * single system: same gradients, same optical size, and a glyph can be swapped
 * for artwork without redrawing its background. `art` is line art already
 * centred at the right scale by scripts/prepare-icons.mjs; `path` is drawn
 * inline. A glyph supplies one or the other.
 */
const GLYPHS: Record<
  GlyphKind,
  { tint: string; path?: React.ReactNode; art?: string }
> = {
  custom: {
    tint: "linear-gradient(160deg,#8e7cff,#5a43e8)",
    art: "/ui/custom.png",
  },
  cart: {
    tint: "linear-gradient(160deg,#ffb454,#f0762b)",
    path: (
      <>
        <path
          d="M4.5 6.4h2l1.7 9.3a1.7 1.7 0 0 0 1.7 1.4h6.6a1.7 1.7 0 0 0 1.7-1.3l1.2-5.9H7.4"
          stroke="white"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="10.4" cy="19.4" r="1.25" fill="white" />
        <circle cx="16.4" cy="19.4" r="1.25" fill="white" />
      </>
    ),
  },
  downloads: {
    tint: "linear-gradient(160deg,#4fd0e8,#1c8fd6)",
    path: (
      <>
        <path
          d="M12 4.6v9.8m0 0 3.6-3.6M12 14.4l-3.6-3.6"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M5 16.6v1.2a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8v-1.2"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
};

export default function Dock() {
  const [cursorX, setCursorX] = useState<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  /**
   * Resting centres, captured when the cursor arrives and before anything has
   * grown. Magnification is measured against these rather than against live
   * positions: once icons start scaling they push each other sideways, and
   * feeding that back into the scale calculation makes the dock oscillate.
   *
   * Held in state, not a ref, because the render reads it — a ref read during
   * render would not re-run this component when the measurements change.
   */
  const [restingCentres, setRestingCentres] = useState<Map<string, number>>(
    () => new Map(),
  );

  const open = useWindows((s) => s.open);
  const windows = useWindows((s) => s.windows);
  const cartCount = useCart((s) => s.items.length);
  const hydrated = useCartHydrated();

  const captureCentres = useCallback(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const map = new Map<string, number>();
    for (const el of dock.querySelectorAll<HTMLElement>("[data-dock-id]")) {
      const rect = el.getBoundingClientRect();
      map.set(el.dataset.dockId!, rect.left + rect.width / 2);
    }
    setRestingCentres(map);
  }, []);

  const scaleFor = (id: string) => {
    const centre = restingCentres.get(id);
    if (cursorX === null || centre === undefined) return 1;
    const distance = Math.abs(cursorX - centre);
    if (distance > REACH) return 1;
    const t = 1 - distance / REACH;
    return 1 + (MAX_SCALE - 1) * (t * t * (3 - 2 * t)); // smoothstep
  };

  const runningFor = (item: DockItem) => {
    if (item.action.type !== "window") return false;
    const { kind, target } = item.action;
    return windows.some((w) => w.kind === kind && w.target === target);
  };

  const activate = (item: DockItem) => {
    if (item.action.type === "link") {
      window.open(item.action.href, "_blank", "noopener,noreferrer");
      return;
    }
    const { kind, target, title } = item.action;
    open({ kind, target, title });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[9000] flex justify-center pb-2.5">
      <div
        ref={dockRef}
        onMouseEnter={() => {
          captureCentres();
        }}
        onMouseMove={(e) => setCursorX(e.clientX)}
        onMouseLeave={() => setCursorX(null)}
        className="glass pointer-events-auto flex items-end gap-2 rounded-[var(--radius-dock)] px-2.5 pb-2 pt-2"
      >
        {ITEMS.map((entry, i) =>
          "separator" in entry ? (
            <div
              key={`sep-${i}`}
              className="mx-1 h-[44px] w-px self-center bg-white/25"
              aria-hidden
            />
          ) : (
            <DockIcon
              key={entry.id}
              item={entry}
              size={BASE * scaleFor(entry.id)}
              running={runningFor(entry)}
              badge={entry.id === "cart" && hydrated ? cartCount : 0}
              onActivate={() => activate(entry)}
            />
          ),
        )}
      </div>
    </div>
  );
}

function DockIcon({
  item,
  size,
  running,
  badge,
  onActivate,
}: {
  item: DockItem;
  size: number;
  running: boolean;
  badge: number;
  onActivate: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const glyph = item.glyph ? GLYPHS[item.glyph] : null;

  return (
    <div className="relative flex flex-col items-center justify-end">
      {hovered && (
        <span className="glass glass-thick pointer-events-none absolute -top-10 whitespace-nowrap rounded-md px-2 py-1 text-[12px] font-medium text-[color:var(--label-on-panel)]">
          {item.label}
        </span>
      )}

      <button
        type="button"
        data-dock-id={item.id}
        onClick={onActivate}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={item.label}
        className="relative block origin-bottom transition-transform duration-100 ease-out active:scale-90"
        style={{ width: size, height: size }}
      >
        {item.image ? (
          <Image
            src={item.image}
            alt=""
            width={128}
            height={128}
            className="h-full w-full rounded-[22%] object-cover drop-shadow-[0_4px_8px_rgba(0,0,0,.3)]"
            priority
          />
        ) : glyph ? (
          <span
            className="grid h-full w-full place-items-center overflow-hidden rounded-[22%] shadow-[inset_0_1px_0_rgba(255,255,255,.45),0_4px_8px_rgba(0,0,0,.3)]"
            style={{ background: glyph.tint }}
          >
            {glyph.art ? (
              // Already inset to the glyph scale by prepare-icons.mjs, so it
              // fills the tile rather than being scaled again here.
              <Image
                src={glyph.art}
                alt=""
                width={512}
                height={512}
                className="h-full w-full object-contain"
                priority
              />
            ) : (
              <svg
                width={size * 0.62}
                height={size * 0.62}
                viewBox="0 0 24 24"
                aria-hidden
              >
                {glyph.path}
              </svg>
            )}
          </span>
        ) : null}

        {badge > 0 && (
          <span className="tabular absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[color:var(--color-hanko)] px-1 text-center text-[11px] font-bold leading-[18px] text-white shadow-md">
            {badge}
          </span>
        )}
      </button>

      <span
        className={`mt-1 h-[3px] w-[3px] shrink-0 rounded-full bg-white/85 transition-opacity ${
          running ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />
    </div>
  );
}
