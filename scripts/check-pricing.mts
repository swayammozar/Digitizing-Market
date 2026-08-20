/**
 * Checks the one function that decides what a buyer is charged.
 *
 * Everything else in checkout can be retried or refunded; getting this wrong
 * means either giving designs away or overcharging, so it is worth asserting
 * rather than assuming.
 *
 *   npx tsx scripts/check-pricing.mts
 */
import { priceCart, CheckoutError } from "../src/lib/pricing.js";

let failures = 0;

function check(name: string, run: () => void) {
  try {
    run();
    console.log(`  ok    ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${error instanceof Error ? error.message : error}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function expectRejection(items: unknown, why: string) {
  try {
    priceCart(items, "USD");
  } catch (error) {
    assert(error instanceof CheckoutError, `${why}: threw the wrong error type`);
    return;
  }
  throw new Error(`${why}: was accepted`);
}

console.log("priceCart");

check("prices come from the catalog, not the request", () => {
  // A tampered client sends objects carrying its own prices. They are strings
  // to the pricer, and anything that is not a known slug is refused outright.
  const cart = priceCart(["dripping-skull", "bonsai"], "USD");
  assert(cart.total === 19.98, `expected 19.98, got ${cart.total}`);
  assert(
    cart.items.every((item) => item.price === 9.99),
    "a line item was not at catalog price",
  );
});

check("rupee prices are the stored INR figure, not a conversion", () => {
  const cart = priceCart(["dripping-skull"], "INR");
  assert(cart.total === 849, `expected 849, got ${cart.total}`);
});

check("a repeated slug is charged once", () => {
  const cart = priceCart(["bonsai", "bonsai", "bonsai"], "USD");
  assert(cart.items.length === 1, `expected 1 item, got ${cart.items.length}`);
  assert(cart.total === 9.99, `expected 9.99, got ${cart.total}`);
});

check("three designs do not produce a floating point total", () => {
  const cart = priceCart(["bonsai", "lion", "wolf"], "USD");
  // 9.99 * 3 is 29.970000000000002 unrounded, which a gateway would reject.
  assert(cart.total === 29.97, `expected 29.97, got ${cart.total}`);
});

check("an unknown slug is refused", () => {
  expectRejection(["not-a-real-design"], "unknown slug");
});

check("the custom digitizing service cannot be bought as a file", () => {
  expectRejection(["custom-digitizing"], "service");
});

check("an empty cart is refused", () => {
  expectRejection([], "empty cart");
});

check("a non-array is refused", () => {
  expectRejection({ slug: "bonsai" }, "object instead of array");
});

check("an absurdly large cart is refused", () => {
  expectRejection(Array(200).fill("bonsai"), "oversized cart");
});

check("objects posing as slugs are discarded", () => {
  expectRejection([{ slug: "bonsai", price: 0.01 }], "object line item");
});

console.log(failures === 0 ? "\nall passed" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
