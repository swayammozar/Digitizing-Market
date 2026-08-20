"use client";

import { create } from "zustand";

export type WindowKind =
  | "folder"
  | "product"
  | "service"
  | "cart"
  | "downloads"
  | "page";

export interface WindowState {
  id: string;
  kind: WindowKind;
  title: string;
  /** Category name, product slug, or page key depending on `kind`. */
  target: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  minimized: boolean;
  zoomed: boolean;
  /** Position and size before zooming, so the green button can restore. */
  restore: { x: number; y: number; width: number; height: number } | null;
}

const MENU_BAR = 28;
const DOCK_RESERVE = 104;
const CASCADE = 28;

const DEFAULT_SIZE: Record<WindowKind, { width: number; height: number }> = {
  folder: { width: 860, height: 560 },
  product: { width: 940, height: 620 },
  service: { width: 880, height: 620 },
  cart: { width: 560, height: 520 },
  downloads: { width: 760, height: 540 },
  page: { width: 620, height: 480 },
};

interface WindowStore {
  windows: WindowState[];
  topZ: number;
  open: (spec: {
    kind: WindowKind;
    target: string;
    title: string;
    width?: number;
    height?: number;
  }) => void;
  close: (id: string) => void;
  focus: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, width: number, height: number) => void;
  minimize: (id: string) => void;
  toggleZoom: (id: string, viewport: { width: number; height: number }) => void;
  restoreWindow: (id: string) => void;
}

/**
 * Places a new window near the centre, nudged down-right for each window
 * already open, the way macOS cascades. Wraps back to the top once the
 * cascade would push a window off-screen.
 */
function nextPosition(
  count: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const vw = typeof window === "undefined" ? 1440 : window.innerWidth;
  const vh = typeof window === "undefined" ? 900 : window.innerHeight;

  const step = count % 6;
  const baseX = Math.max(16, (vw - width) / 2 - CASCADE * 2.5);
  const baseY = Math.max(MENU_BAR + 12, (vh - DOCK_RESERVE - height) / 2 - 20);

  return {
    x: Math.min(baseX + step * CASCADE, Math.max(16, vw - width - 16)),
    y: Math.min(
      baseY + step * CASCADE,
      Math.max(MENU_BAR + 12, vh - DOCK_RESERVE - 120),
    ),
  };
}

export const useWindows = create<WindowStore>((set, get) => ({
  windows: [],
  topZ: 10,

  open: ({ kind, target, title, width, height }) => {
    const id = `${kind}:${target}`;
    const existing = get().windows.find((w) => w.id === id);

    // Opening something already open raises and un-minimises it instead of
    // stacking a duplicate — same as clicking a running app in the dock.
    if (existing) {
      set((s) => ({
        topZ: s.topZ + 1,
        windows: s.windows.map((w) =>
          w.id === id ? { ...w, z: s.topZ + 1, minimized: false } : w,
        ),
      }));
      return;
    }

    const size = {
      width: width ?? DEFAULT_SIZE[kind].width,
      height: height ?? DEFAULT_SIZE[kind].height,
    };
    const vw = typeof window === "undefined" ? 1440 : window.innerWidth;
    const vh = typeof window === "undefined" ? 900 : window.innerHeight;
    const fitted = {
      width: Math.min(size.width, vw - 32),
      height: Math.min(size.height, vh - MENU_BAR - DOCK_RESERVE),
    };

    set((s) => ({
      topZ: s.topZ + 1,
      windows: [
        ...s.windows,
        {
          id,
          kind,
          title,
          target,
          ...nextPosition(s.windows.length, fitted.width, fitted.height),
          ...fitted,
          z: s.topZ + 1,
          minimized: false,
          zoomed: false,
          restore: null,
        },
      ],
    }));
  },

  close: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

  focus: (id) =>
    set((s) => {
      const target = s.windows.find((w) => w.id === id);
      if (!target || target.z === s.topZ) return s;
      return {
        topZ: s.topZ + 1,
        windows: s.windows.map((w) =>
          w.id === id ? { ...w, z: s.topZ + 1 } : w,
        ),
      };
    }),

  move: (id, x, y) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),

  resize: (id, width, height) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, width, height } : w,
      ),
    })),

  minimize: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: true } : w,
      ),
    })),

  toggleZoom: (id, viewport) =>
    set((s) => ({
      topZ: s.topZ + 1,
      windows: s.windows.map((w) => {
        if (w.id !== id) return w;
        if (w.zoomed && w.restore) {
          return { ...w, ...w.restore, zoomed: false, restore: null, z: s.topZ + 1 };
        }
        return {
          ...w,
          restore: { x: w.x, y: w.y, width: w.width, height: w.height },
          x: 16,
          y: MENU_BAR + 10,
          width: viewport.width - 32,
          height: viewport.height - MENU_BAR - DOCK_RESERVE,
          zoomed: true,
          z: s.topZ + 1,
        };
      }),
    })),

  restoreWindow: (id) =>
    set((s) => ({
      topZ: s.topZ + 1,
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: false, z: s.topZ + 1 } : w,
      ),
    })),
}));

export const WINDOW_CHROME = { MENU_BAR, DOCK_RESERVE };
