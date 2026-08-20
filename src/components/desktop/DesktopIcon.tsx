"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { clampIcon, useIconPositions } from "@/lib/desktopIcons";
import { capturePointer } from "@/lib/pointer";

/** Pointer travel before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 4;

interface Props {
  /** Category name or product slug — the key its position is saved under. */
  id: string;
  label: string;
  /** Home position as a percentage of the viewport, used until it is moved. */
  x: number;
  y: number;
  /** Entrance delay in ms — icons settle in one after another on load. */
  delay: number;
  onOpen: () => void;
  /** A folder renders the flat Big Sur folder; a design renders its artwork. */
  variant: "folder" | "design";
  image?: string;
  count?: number;
}

export default function DesktopIcon({
  id,
  label,
  x,
  y,
  delay,
  onOpen,
  variant,
  image,
  count,
}: Props) {
  const [selected, setSelected] = useState(false);
  const [dragging, setDragging] = useState(false);

  const saved = useIconPositions((s) => s.positions[id]);
  const place = useIconPositions((s) => s.place);

  const position = saved ?? { x, y };

  const gesture = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    setSelected(true);
    gesture.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: (position.x / 100) * window.innerWidth,
      originY: (position.y / 100) * window.innerHeight,
      moved: false,
    };
    capturePointer(e.currentTarget as HTMLElement, e.pointerId);
  };

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const g = gesture.current;
      if (!g || g.pointerId !== e.pointerId) return;

      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;

      // A press that never travels is a click, and must not consume the
      // double-click that opens the folder.
      if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!g.moved) {
        g.moved = true;
        setDragging(true);
      }

      const next = clampIcon(
        ((g.originX + dx) / window.innerWidth) * 100,
        ((g.originY + dy) / window.innerHeight) * 100,
        { width: window.innerWidth, height: window.innerHeight },
      );
      place(id, next.x, next.y);
    },
    [id, place],
  );

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (gesture.current?.pointerId !== e.pointerId) return;
    gesture.current = null;
    setDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onDoubleClick={onOpen}
      onBlur={() => setSelected(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`animate-icon-settle absolute flex w-[104px] -translate-x-1/2 flex-col items-center gap-1.5 rounded-lg p-1.5 ${
        dragging ? "z-50 cursor-grabbing" : "cursor-default"
      }`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        animationDelay: `${delay}ms`,
        // A dragged icon lifts off the desktop and follows the cursor exactly;
        // any transition here would make it lag behind.
        opacity: dragging ? 0.85 : undefined,
      }}
      aria-label={count === undefined ? label : `${label}, ${count} designs`}
    >
      <span
        className={`relative block overflow-hidden transition-transform duration-150 ${
          variant === "folder" ? "h-[66px] w-[74px]" : "h-[62px] w-[78px]"
        } ${selected && !dragging ? "scale-[0.97]" : ""}`}
      >
        {variant === "folder" ? (
          <FolderGlyph />
        ) : (
          <Image
            src={image!}
            alt=""
            width={320}
            height={256}
            draggable={false}
            className="h-full w-full rounded-[10px] object-cover shadow-[0_3px_10px_rgba(0,0,0,.35)] ring-1 ring-white/25"
          />
        )}
        {selected && (
          <span className="absolute inset-0 rounded-[10px] bg-[color:var(--color-system-blue)]/30" />
        )}
      </span>

      <span
        className={`desktop-label max-w-full rounded px-1.5 py-0.5 text-[12.5px] font-medium leading-tight text-white ${
          selected ? "bg-[color:var(--color-system-blue)]" : ""
        }`}
      >
        {label}
      </span>
    </button>
  );
}

/**
 * The supplied folder icon is a 96px PNG, which softens on a retina display.
 * The Big Sur folder is two flat shapes and a gradient, so it is redrawn here
 * as vector and stays crisp at any size.
 */
function FolderGlyph() {
  return (
    <svg
      viewBox="0 0 74 62"
      className="h-full w-full drop-shadow-[0_3px_8px_rgba(0,0,0,.32)]"
      aria-hidden
    >
      <defs>
        <linearGradient id="folder-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3aa4e0" />
          <stop offset="100%" stopColor="#1a7fc4" />
        </linearGradient>
        <linearGradient id="folder-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#63cdfb" />
          <stop offset="100%" stopColor="#39b3f0" />
        </linearGradient>
      </defs>
      {/* Back panel with the tab */}
      <path
        d="M3 9.5A4.5 4.5 0 0 1 7.5 5h17.2a4.5 4.5 0 0 1 3.1 1.25l3.4 3.3A4.5 4.5 0 0 0 34.3 11H66.5A4.5 4.5 0 0 1 71 15.5v37A4.5 4.5 0 0 1 66.5 57h-59A4.5 4.5 0 0 1 3 52.5Z"
        fill="url(#folder-back)"
      />
      {/* Front flap, slightly lighter, as in Big Sur */}
      <path
        d="M3 20h68v32.5A4.5 4.5 0 0 1 66.5 57h-59A4.5 4.5 0 0 1 3 52.5Z"
        fill="url(#folder-front)"
      />
      <path d="M3 20h68v1.6H3z" fill="#ffffff" opacity="0.35" />
    </svg>
  );
}
