"use client";

import { useEffect, useState } from "react";

interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
}

export interface BatteryState {
  /** 0 to 1. */
  level: number;
  charging: boolean;
  /** False when the browser will not say, so the icon can stay generic. */
  known: boolean;
}

/**
 * The real battery level, where the browser exposes it.
 *
 * Chrome and Edge implement the Battery Status API; Firefox and Safari removed
 * it as a fingerprinting risk. Rather than fake a number, an unknown battery
 * renders as a plain full icon — the status bar is set dressing, and set
 * dressing should not invent facts about someone's laptop.
 */
export function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>({
    level: 1,
    charging: false,
    known: false,
  });

  useEffect(() => {
    const api = (
      navigator as Navigator & { getBattery?: () => Promise<BatteryManager> }
    ).getBattery;
    if (!api) return;

    let battery: BatteryManager | null = null;
    let cancelled = false;

    const update = () => {
      if (!battery || cancelled) return;
      setState({ level: battery.level, charging: battery.charging, known: true });
    };

    api
      .call(navigator)
      .then((result) => {
        if (cancelled) return;
        battery = result;
        update();
        battery.addEventListener("levelchange", update);
        battery.addEventListener("chargingchange", update);
      })
      .catch(() => {
        // Permissions policy can block it; the generic icon covers that.
      });

    return () => {
      cancelled = true;
      battery?.removeEventListener("levelchange", update);
      battery?.removeEventListener("chargingchange", update);
    };
  }, []);

  return state;
}
