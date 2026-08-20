"use client";

import Image from "next/image";
import { categoryCounts, categoryOrder, featured, mediaUrl } from "@/lib/catalog";
import { useWindows } from "@/lib/windows";
import DesktopIcon from "./DesktopIcon";
import MenuBar from "./MenuBar";
import Dock from "./Dock";
import WindowLayer from "../window/WindowLayer";

/**
 * Icon placement is hand-set rather than laid out on a grid, because the GIF's
 * desktop is scattered and a grid reads like a file manager instead.
 *
 * The positions dodge the two busy regions of the wallpaper: the yellow
 * katakana across the top-left, and the cat that fills the centre and lower
 * middle. Everything sits on flat cyan, which is why the labels need no plate
 * behind them.
 */
const SPOTS: Record<string, { x: number; y: number }> = {
  "Tattoo & Dark": { x: 6, y: 30 },
  "Animals": { x: 16, y: 47 },
  "Floral & Nature": { x: 5, y: 64 },
  "Streetwear & Urban": { x: 79, y: 26 },
  "Japanese & Anime": { x: 90, y: 43 },
  "Faith & Festive": { x: 77, y: 59 },
  "Food & Drink": { x: 88, y: 75 },
};

const FEATURED_SPOT = { x: 60, y: 10 };

export default function Desktop() {
  const open = useWindows((s) => s.open);

  return (
    <main className="fixed inset-0 select-none overflow-hidden">
      <Wallpaper />
      <MenuBar />

      <div className="absolute inset-0 pt-7">
        {categoryOrder.map((category, i) => {
          const spot = SPOTS[category];
          if (!spot) return null;
          return (
            <DesktopIcon
              key={category}
              id={category}
              variant="folder"
              label={category}
              count={categoryCounts[category]}
              x={spot.x}
              y={spot.y}
              delay={120 + i * 55}
              onOpen={() =>
                open({ kind: "folder", target: category, title: category })
              }
            />
          );
        })}

        {featured.map((product) => (
          <DesktopIcon
            key={product.slug}
            id={product.slug}
            variant="design"
            label={product.name}
            image={mediaUrl(product.media.icon)}
            x={FEATURED_SPOT.x}
            y={FEATURED_SPOT.y}
            delay={90}
            onOpen={() =>
              open({
                kind: "product",
                target: product.slug,
                title: product.name,
              })
            }
          />
        ))}
      </div>

      <WindowLayer />
      <Dock />
    </main>
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
      {/* The source is 1200x665, so it upscales on a large display. A fine
          grain sits over it: print stock has texture, and the noise reads as
          paper rather than as a soft photograph. */}
      <div
        className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />
    </div>
  );
}
