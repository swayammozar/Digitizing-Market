"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the visitor has chosen to look around without an account.
 *
 * Kept in sessionStorage rather than localStorage on purpose: the login screen
 * is the first impression, so it should happen once per visit rather than once
 * per person. Surviving a refresh within the same tab is enough; coming back
 * tomorrow should feel like sitting down at the machine again.
 */
const KEY = "dm-guest";

let listeners: (() => void)[] = [];

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    // Private browsing can refuse storage. Letting the visitor in beats
    // trapping them on a login screen they cannot get past.
    return true;
  }
}

/** Cached so useSyncExternalStore sees a stable value between changes. */
let snapshot = false;
let initialised = false;

function getSnapshot(): boolean {
  if (!initialised) {
    snapshot = read();
    initialised = true;
  }
  return snapshot;
}

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((listener) => listener !== onChange);
  };
}

export function continueAsGuest() {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // Storage refused; the in-memory flag below still gets them through.
  }
  snapshot = true;
  initialised = true;
  for (const listener of listeners) listener();
}

export function useIsGuest(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
