"use client";

import { useSyncExternalStore } from "react";

/**
 * The wall clock, shared by the menu bar and the login screen.
 *
 * An external store rather than component state: the server cannot know the
 * visitor's time, and useSyncExternalStore is the one hook that lets the server
 * and client render different things on purpose without it counting as a
 * hydration mismatch.
 *
 * One interval serves every subscriber and stops when the last one leaves.
 */
let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  now = Date.now();
  listeners.add(onChange);
  timer ??= setInterval(() => {
    now = Date.now();
    for (const listener of listeners) listener();
  }, 10_000);

  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Milliseconds, or 0 on the server where there is no clock to read. */
export function useClock(): number {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => 0,
  );
}
