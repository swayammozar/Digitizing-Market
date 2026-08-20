"use client";

import { useBattery } from "@/lib/useBattery";

/**
 * The wifi and battery marks that appear in both status bars — the macOS one
 * on the login screen and the iOS one above the springboard.
 *
 * Shared because they are the same glyphs at the same weight, and two copies
 * would drift the moment one of them was adjusted.
 */

export function WifiIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M3.5 9.5a13 13 0 0 1 17 0M6.5 13a8.5 8.5 0 0 1 11 0M9.5 16.4a4 4 0 0 1 5 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="19.4" r="1.15" fill="currentColor" />
    </svg>
  );
}

/**
 * Draws the real charge level where the browser exposes it. Chrome and Edge
 * implement the Battery Status API; Firefox and Safari removed it as a
 * fingerprinting risk, and an unknown battery renders full rather than
 * inventing a number about someone's device.
 */
export function BatteryIcon({ showPercent = false }: { showPercent?: boolean }) {
  const battery = useBattery();

  return (
    <span
      className="flex items-center gap-1"
      aria-label={
        battery.known ? `Battery ${Math.round(battery.level * 100)} percent` : "Battery"
      }
    >
      {showPercent && battery.known && (
        <span className="tabular text-[12px] font-medium">
          {Math.round(battery.level * 100)}%
        </span>
      )}
      <svg width="25" height="13" viewBox="0 0 25 13" aria-hidden>
        <rect
          x="0.75"
          y="0.75"
          width="20"
          height="11.5"
          rx="3.4"
          stroke="currentColor"
          strokeOpacity="0.55"
          strokeWidth="1.1"
          fill="none"
        />
        <path d="M22.4 4.4v4.2a2.2 2.2 0 0 0 0-4.2z" fill="currentColor" fillOpacity="0.55" />
        <rect
          x="2.3"
          y="2.3"
          width={Math.max(2, 17 * battery.level)}
          height="8.4"
          rx="2"
          // Red below 20%, as iOS does — unless it is charging, when a low
          // level is not a warning.
          fill={battery.charging || battery.level > 0.2 ? "currentColor" : "#ff5f57"}
        />
      </svg>
    </span>
  );
}

/** Cellular bars. Decorative: a browser cannot see signal strength. */
export function SignalIcon() {
  return (
    <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden>
      {[0, 1, 2, 3].map((bar) => (
        <rect
          key={bar}
          x={bar * 4.6}
          y={9 - bar * 2.6}
          width="3"
          height={4 + bar * 2.6}
          rx="1"
          fill="currentColor"
          fillOpacity={bar === 3 ? 0.4 : 1}
        />
      ))}
    </svg>
  );
}
