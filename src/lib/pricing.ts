import { bySlug } from "./catalog";
import type { Currency } from "./types";

/**
 * What a cart costs.
 *
 * Deliberately free of the `server-only` guard that fulfilment carries: there
 * are no secrets here, only the rule that decides what someone is charged —
 * and a rule that decides what someone is charged should be testable without
 * standing up a framework around it.
 *
 * The rule itself: a cart arrives as a list of slugs and nothing else. No
 * prices, no totals, no quantities. Everything is rebuilt from the catalog, so
 * a tampered request can only ever buy the wrong designs at the right price,
 * never the right designs at the wrong one.
 */

export interface PricedCart {
  items: { slug: string; name: string; price: number }[];
  total: number;
  currency: Currency;
}

export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

/** More designs than the shop sells means the request is not a real cart. */
const MAX_ITEMS = 60;

export function priceCart(slugs: unknown, currency: Currency): PricedCart {
  if (!Array.isArray(slugs) || slugs.length === 0) {
    throw new CheckoutError("Your cart is empty.", 400);
  }
  if (slugs.length > MAX_ITEMS) {
    throw new CheckoutError("That is more designs than the shop has.", 400);
  }

  // Anything that is not a plain string is dropped here, which is what makes
  // a line item like { slug: "bonsai", price: 0.01 } fail rather than apply.
  const unique = [...new Set(slugs.filter((s): s is string => typeof s === "string"))];
  if (unique.length === 0) {
    throw new CheckoutError("Your cart is empty.", 400);
  }

  const items = unique.map((slug) => {
    const product = bySlug(slug);
    if (!product || product.isService || !product.zipKey) {
      throw new CheckoutError(`"${slug}" is not a design that can be bought.`, 400);
    }
    return {
      slug,
      name: product.name,
      price: currency === "INR" ? product.priceInr : product.priceUsd,
    };
  });

  const total = items.reduce((sum, item) => sum + item.price, 0);

  // Rounded because floating point turns 9.99 x 3 into 29.970000000000002, and
  // a gateway comparing that against its own total would reject the capture.
  return { items, total: Math.round(total * 100) / 100, currency };
}
