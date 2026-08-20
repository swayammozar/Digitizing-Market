"use client";

import { useSyncExternalStore } from "react";

export interface Viewport {
  width: number;
  height: number;
}

/** Kept clear so nothing hides under the menu bar, the dock, or the edges. */
const INSET = { top: 44, bottom: 132, side: 58 };
/**
 * Measured footprint of one icon, not an estimate: 98px wide, and 112px tall
 * once a two-line label is included — eleven of the designs have names long
 * enough to wrap. Undercounting this is what lets jitter push icons into each
 * other, so these track the rendered size.
 */
const ICON = { width: 100, height: 113 };

const SERVER_VIEWPORT: Viewport = { width: 1440, height: 900 };
let snapshot: Viewport = SERVER_VIEWPORT;

function readViewport(): Viewport {
  if (typeof window === "undefined") return SERVER_VIEWPORT;
  const width = window.innerWidth;
  const height = window.innerHeight;
  // Returning a fresh object every call would make useSyncExternalStore loop,
  // so the cached one is reused until the size actually changes.
  if (width !== snapshot.width || height !== snapshot.height) {
    snapshot = { width, height };
  }
  return snapshot;
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

export function useViewport(): Viewport {
  return useSyncExternalStore(subscribe, readViewport, () => SERVER_VIEWPORT);
}

/**
 * A stable pseudo-random number in [0, 1) derived from a string.
 *
 * The scatter has to be identical on the server and the client, and identical
 * between renders — Math.random() would reshuffle the whole desktop on every
 * repaint. Hashing the icon's own name means its offset is a property of the
 * icon rather than of when it was drawn.
 */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Lays icons out on an invisible grid, then pushes each one off its slot by an
 * amount derived from its name.
 *
 * A plain grid reads as a file manager; a truly random scatter overlaps and
 * hides labels. Jitter is capped at whatever slack the slot has left over
 * after the icon is placed in it, so icons can never collide however many
 * there are or however small the window gets.
 *
 * Returns percentages, so an arrangement survives a resize and matches the
 * positions saved when a visitor drags an icon somewhere else.
 */
export function scatterLayout(
  ids: string[],
  viewport: Viewport,
): { positions: Record<string, { x: number; y: number }>; scale: number } {
  const usableWidth = Math.max(ICON.width, viewport.width - INSET.side * 2);
  const usableHeight = Math.max(
    ICON.height,
    viewport.height - INSET.top - INSET.bottom,
  );

  // Fifty-one icons at full size need more area than a 1280x720 window has,
  // so the icons shrink until they fit rather than being allowed to collide.
  // Shrinking widens the grid too — narrower icons mean more columns, which
  // means fewer rows — so this converges quickly.
  let scale = 1;
  let columns = 1;
  let rows = 1;
  for (let attempt = 0; attempt < 14; attempt += 1) {
    columns = Math.max(1, Math.floor(usableWidth / (ICON.width * scale)));
    rows = Math.max(1, Math.ceil(ids.length / columns));
    if (rows * ICON.height * scale <= usableHeight || scale <= 0.68) break;
    scale -= 0.04;
  }

  const columnWidth = usableWidth / columns;
  const rowHeight = usableHeight / rows;

  // Whatever space the icon does not occupy is free to jitter into, halved so
  // two neighbours drifting toward each other still cannot meet, and capped so
  // the scatter stays gentle.
  const jitterX = Math.min(18, Math.max(0, (columnWidth - ICON.width * scale) / 2));
  const jitterY = Math.min(16, Math.max(0, (rowHeight - ICON.height * scale) / 2));

  const positions: Record<string, { x: number; y: number }> = {};

  ids.forEach((id, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    const centreX = INSET.side + column * columnWidth + columnWidth / 2;
    const centreY = INSET.top + row * rowHeight + rowHeight / 2;

    // Two different hashes per icon so horizontal and vertical drift are not
    // correlated, which would line everything up on a diagonal.
    const x = centreX + (hash(id) * 2 - 1) * jitterX;
    const y = centreY + (hash(`${id}#y`) * 2 - 1) * jitterY;

    positions[id] = {
      x: (x / viewport.width) * 100,
      y: (y / viewport.height) * 100,
    };
  });

  return { positions, scale };
}
