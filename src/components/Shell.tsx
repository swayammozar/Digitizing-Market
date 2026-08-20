"use client";

import Desktop from "./desktop/Desktop";

/**
 * The visitor lands straight on the shop.
 *
 * There was a macOS login screen here. It looked right and cost sales: a store
 * nobody can see without an account is one search engines cannot index and
 * casual visitors do not join. Signing in is asked for at the only point it is
 * actually needed — paying, where the purchase has to attach to somebody.
 *
 * Desktop picks the desktop or the springboard from the viewport.
 */
export default function Shell() {
  return <Desktop />;
}
