"use client";

import { type WindowState } from "@/lib/windows";
import WindowFrame from "./WindowFrame";

/**
 * The buyer's permanent library. Accounts and order history arrive with the
 * Supabase work; until then this states plainly what the window is for rather
 * than pretending to list files.
 */
export default function DownloadsWindow({ win }: { win: WindowState }) {
  return (
    <WindowFrame win={win} subtitle="Everything you have bought">
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-b from-[#4fd0e8] to-[#1c8fd6]">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M12 4.6v9.8m0 0 3.6-3.6M12 14.4l-3.6-3.6"
              stroke="white"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M5 16.6v1.2a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8v-1.2"
              stroke="white"
              strokeWidth="1.9"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </span>
        <p className="text-[14px] font-medium text-[color:var(--label-on-panel)]">
          Sign in to see your designs
        </p>
        <p className="max-w-[34ch] text-[12.5px] leading-relaxed text-[color:var(--label-on-panel-secondary)]">
          Every design you buy stays here, and you can download it again as many
          times as you like — new machine, new computer, years later.
        </p>
      </div>
    </WindowFrame>
  );
}
