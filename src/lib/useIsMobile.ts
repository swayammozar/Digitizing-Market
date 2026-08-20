"use client";

import { useSyncExternalStore } from "react";

/**
 * A desktop metaphor cannot survive a 375px screen — windows outgrow the
 * viewport and dragging fights with scrolling — so phones get an iOS
 * springboard instead. This decides which one renders.
 *
 * Matches Tailwind's `md` breakpoint so CSS and JS agree on where the two
 * interfaces swap.
 */
const QUERY = "(max-width: 767px)";

let query: MediaQueryList | null = null;

function mediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined") return null;
  query ??= window.matchMedia(QUERY);
  return query;
}

function subscribe(onChange: () => void) {
  const mql = mediaQuery();
  if (!mql) return () => {};
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => mediaQuery()?.matches ?? false,
    // The server cannot know the viewport. It renders the desktop, and
    // useSyncExternalStore swaps to the springboard during hydration without
    // this counting as a mismatch.
    () => false,
  );
}
