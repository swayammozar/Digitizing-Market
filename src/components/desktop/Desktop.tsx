"use client";

import Image from "next/image";
import { byCategory, categoryCounts, categoryOrder, mediaUrl } from "@/lib/catalog";
import { scatterLayout, useViewport } from "@/lib/desktopLayout";
import { useIsMobile } from "@/lib/useIsMobile";
import { useWindows } from "@/lib/windows";
import Springboard from "../mobile/Springboard";
import DesktopIcon from "./DesktopIcon";
import MenuBar from "./MenuBar";
import Dock from "./Dock";
import WindowLayer from "../window/WindowLayer";

export default function Desktop() {
  const open = useWindows((s) => s.open);
  const isMobile = useIsMobile();
  const viewport = useViewport();

  // Phones get the springboard instead of a scaled-down desktop: windows
  // outgrow a 375px viewport, and dragging one fights with page scrolling.
  if (isMobile) return <Springboard />;

  // Folders first so the categories occupy the top rows and stay easy to find,
  // then every design grouped by the folder it belongs to — the desktop reads
  // in the same order as the sidebar.
  const designs = categoryOrder.flatMap((category) => byCategory(category));
  const ids = [...categoryOrder, ...designs.map((p) => p.slug)];
  const { positions, scale } = scatterLayout(ids, viewport);

  return (
    <main className="fixed inset-0 select-none overflow-hidden">
      <Wallpaper />
      <MenuBar />

      <div className="absolute inset-0 pt-7">
        {categoryOrder.map((category, i) => (
          <DesktopIcon
            key={category}
            id={category}
            variant="folder"
            label={category}
            count={categoryCounts[category]}
            x={positions[category].x}
            y={positions[category].y}
            scale={scale}
            delay={80 + i * 26}
            onOpen={() =>
              open({ kind: "folder", target: category, title: category })
            }
          />
        ))}

        {designs.map((product, i) => (
          <DesktopIcon
            key={product.slug}
            id={product.slug}
            variant="design"
            label={product.name}
            image={mediaUrl(product.media.icon)}
            x={positions[product.slug].x}
            y={positions[product.slug].y}
            scale={scale}
            // Staggered after the folders, and capped so the last icon does
            // not arrive a second and a half after the first.
            delay={260 + Math.min(i, 30) * 16}
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
      {/* With fifty-one icons the wallpaper is backdrop rather than subject, so
          a light scrim keeps every label readable over the yellow katakana and
          the cat's fur alike. */}
      <div className="absolute inset-0 bg-black/20" aria-hidden />
    </div>
  );
}
