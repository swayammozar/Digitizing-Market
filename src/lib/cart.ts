"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Currency } from "./types";

interface CartStore {
  /** Product slugs. A design is a file — owning two of one means nothing. */
  items: string[];
  currency: Currency;
  add: (slug: string) => void;
  remove: (slug: string) => void;
  clear: () => void;
  setCurrency: (currency: Currency) => void;
}

export const useCart = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      currency: "USD",

      add: (slug) =>
        set((s) => (s.items.includes(slug) ? s : { items: [...s.items, slug] })),

      remove: (slug) =>
        set((s) => ({ items: s.items.filter((i) => i !== slug) })),

      clear: () => set({ items: [] }),

      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: "dm-cart",
      partialize: (s) => ({ items: s.items, currency: s.currency }),
    },
  ),
);

/**
 * False while rendering on the server and during hydration, true afterwards.
 *
 * The server has no cart, so it always renders zero items. localStorage is
 * synchronous, so the client's first render already knows the real count — and
 * a badge that disagrees with the server's HTML is a hydration mismatch.
 * Anything derived from saved state waits on this.
 *
 * useSyncExternalStore is what makes it safe: React deliberately uses the
 * server snapshot for the hydration pass and the client snapshot immediately
 * after, which is the one sanctioned way to render two different things.
 * The store never changes, so `subscribe` has nothing to do.
 */
const noopSubscribe = () => () => {};

export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
