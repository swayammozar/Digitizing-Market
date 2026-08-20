"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Where the visitor has dragged each desktop icon, as a percentage of the
 * viewport so an arrangement survives a resized window.
 *
 * Only icons that have actually been moved are stored; everything else falls
 * back to the hand-placed scatter in Desktop.tsx. macOS remembers where you
 * put things, and an icon that snapped home on reload would feel broken.
 */
interface IconPositions {
  positions: Record<string, { x: number; y: number }>;
  place: (id: string, x: number, y: number) => void;
  reset: () => void;
}

export const useIconPositions = create<IconPositions>()(
  persist(
    (set) => ({
      positions: {},
      place: (id, x, y) =>
        set((s) => ({ positions: { ...s.positions, [id]: { x, y } } })),
      reset: () => set({ positions: {} }),
    }),
    { name: "dm-icons" },
  ),
);

/** Keeps a dragged icon clear of the menu bar, the dock, and both edges. */
export function clampIcon(
  xPercent: number,
  yPercent: number,
  viewport: { width: number; height: number },
): { x: number; y: number } {
  const marginX = (56 / viewport.width) * 100;
  const top = (36 / viewport.height) * 100;
  const bottom = 100 - (150 / viewport.height) * 100;

  return {
    x: Math.min(Math.max(xPercent, marginX), 100 - marginX),
    y: Math.min(Math.max(yPercent, top), Math.max(top, bottom)),
  };
}
