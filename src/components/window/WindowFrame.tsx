"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWindows, WINDOW_CHROME, type WindowState } from "@/lib/windows";
import { capturePointer } from "@/lib/pointer";

const MIN_WIDTH = 420;
const MIN_HEIGHT = 320;

interface Props {
  win: WindowState;
  /** Shown beneath the title in the toolbar, the way Finder shows item counts. */
  subtitle?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

export default function WindowFrame({ win, subtitle, toolbar, children }: Props) {
  const { close, focus, move, resize, minimize, toggleZoom } = useWindows();
  const topZ = useWindows((s) => s.topZ);
  const focused = win.z === topZ;

  const drag = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);
  const stretch = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
  } | null>(null);
  const [interacting, setInteracting] = useState(false);

  const onTitlePointerDown = (e: React.PointerEvent) => {
    // Buttons inside the title bar must not start a drag.
    if ((e.target as HTMLElement).closest("button")) return;
    focus(win.id);
    if (win.zoomed) return;
    drag.current = {
      pointerId: e.pointerId,
      dx: e.clientX - win.x,
      dy: e.clientY - win.y,
    };
    capturePointer(e.currentTarget as HTMLElement, e.pointerId);
    setInteracting(true);
  };

  const onResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    focus(win.id);
    stretch.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      width: win.width,
      height: win.height,
    };
    capturePointer(e.currentTarget as HTMLElement, e.pointerId);
    setInteracting(true);
  };

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (drag.current?.pointerId === e.pointerId) {
        const maxY = window.innerHeight - 40;
        move(
          win.id,
          e.clientX - drag.current.dx,
          // A window may be dragged partly off the left, right and bottom, but
          // never up under the menu bar, where its title bar would be lost.
          Math.min(Math.max(e.clientY - drag.current.dy, WINDOW_CHROME.MENU_BAR), maxY),
        );
      }
      if (stretch.current?.pointerId === e.pointerId) {
        const s = stretch.current;
        resize(
          win.id,
          Math.max(MIN_WIDTH, s.width + (e.clientX - s.startX)),
          Math.max(MIN_HEIGHT, s.height + (e.clientY - s.startY)),
        );
      }
    },
    [move, resize, win.id],
  );

  const endInteraction = useCallback((e: PointerEvent) => {
    if (drag.current?.pointerId === e.pointerId) drag.current = null;
    if (stretch.current?.pointerId === e.pointerId) stretch.current = null;
    if (!drag.current && !stretch.current) setInteracting(false);
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endInteraction);
    window.addEventListener("pointercancel", endInteraction);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endInteraction);
      window.removeEventListener("pointercancel", endInteraction);
    };
  }, [onPointerMove, endInteraction]);

  if (win.minimized) return null;

  return (
    <section
      className="glass glass-thick animate-window-open absolute flex flex-col overflow-hidden rounded-[var(--radius-window)]"
      style={{
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.z,
        boxShadow: focused
          ? "var(--glass-shadow-focused)"
          : "var(--glass-shadow)",
        // Dragging over a backdrop-filtered surface is expensive; freezing the
        // transition keeps the window glued to the cursor.
        transition: interacting ? "none" : "box-shadow .2s ease",
      }}
      onPointerDown={() => focus(win.id)}
      aria-label={win.title}
    >
      <header
        onPointerDown={onTitlePointerDown}
        onDoubleClick={() =>
          toggleZoom(win.id, {
            width: window.innerWidth,
            height: window.innerHeight,
          })
        }
        className={`flex h-[46px] shrink-0 items-center gap-3 border-b border-black/10 px-3.5 ${
          win.zoomed ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        }`}
        style={{ background: "rgba(255,255,255,.28)" }}
      >
        <div className="group flex items-center gap-2">
          <TrafficLight
            color="var(--color-system-red)"
            label={`Close ${win.title}`}
            onClick={() => close(win.id)}
            glyph={
              <path d="M3.1 3.1l3.8 3.8M6.9 3.1L3.1 6.9" stroke="#7d0d08" strokeWidth="1.1" strokeLinecap="round" />
            }
            dimmed={!focused}
          />
          <TrafficLight
            color="var(--color-system-amber)"
            label={`Minimise ${win.title}`}
            onClick={() => minimize(win.id)}
            glyph={<path d="M2.8 5h4.4" stroke="#96590a" strokeWidth="1.1" strokeLinecap="round" />}
            dimmed={!focused}
          />
          <TrafficLight
            color="var(--color-system-green)"
            label={win.zoomed ? `Restore ${win.title}` : `Zoom ${win.title}`}
            onClick={() =>
              toggleZoom(win.id, {
                width: window.innerWidth,
                height: window.innerHeight,
              })
            }
            glyph={
              <path
                d="M3.4 6.6V3.4h3.2M6.6 3.4 3.4 6.6"
                stroke="#0b6b18"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            }
            dimmed={!focused}
          />
        </div>

        <div className="min-w-0 flex-1 text-center">
          <h2
            className={`truncate text-[13.5px] font-semibold ${
              focused
                ? "text-[color:var(--label-on-panel)]"
                : "text-[color:var(--label-on-panel-secondary)]"
            }`}
          >
            {win.title}
          </h2>
          {subtitle && (
            <p className="truncate text-[11px] text-[color:var(--label-on-panel-secondary)]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">{toolbar}</div>
      </header>

      <div className="scroll-thin min-h-0 flex-1 overflow-auto">{children}</div>

      {!win.zoomed && (
        <div
          onPointerDown={onResizePointerDown}
          className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
          role="presentation"
        />
      )}
    </section>
  );
}

function TrafficLight({
  color,
  label,
  onClick,
  glyph,
  dimmed,
}: {
  color: string;
  label: string;
  onClick: () => void;
  glyph: React.ReactNode;
  dimmed: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-[12px] w-[12px] place-items-center rounded-full transition-colors"
      style={{
        background: dimmed ? "rgba(0,0,0,.18)" : color,
        boxShadow: "inset 0 0 0 .5px rgba(0,0,0,.12)",
      }}
    >
      {/* macOS only draws the glyphs once the pointer is over the cluster. */}
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        className="opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      >
        {glyph}
      </svg>
    </button>
  );
}
