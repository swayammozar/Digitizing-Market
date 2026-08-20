"use client";

import Image from "next/image";
import { useState } from "react";
import {
  byCategory,
  categoryCounts,
  categoryOrder,
  designs,
  mediaUrl,
} from "@/lib/catalog";
import { useWindows, type WindowState } from "@/lib/windows";
import type { Product } from "@/lib/types";
import WindowFrame from "./WindowFrame";

export default function FolderWindow({ win }: { win: WindowState }) {
  const open = useWindows((s) => s.open);
  const [query, setQuery] = useState("");

  const all = win.target === "All";
  const source = all ? designs : byCategory(win.target);

  const needle = query.trim().toLowerCase();
  const items = needle
    ? source.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.tags.some((t) => t.toLowerCase().includes(needle)),
      )
    : source;

  return (
    <WindowFrame
      win={win}
      subtitle={`${items.length} ${items.length === 1 ? "design" : "designs"}${
        needle ? ` matching “${query.trim()}”` : ""
      }`}
      toolbar={
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search designs"
          className="h-[26px] w-[150px] rounded-md border border-black/10 bg-white/70 px-2.5 text-[12.5px] text-[color:var(--label-on-panel)] placeholder:text-black/35 focus:border-[color:var(--color-system-blue)] focus:outline-none"
        />
      }
    >
      <div className="flex h-full min-h-0">
        <Sidebar
          active={win.target}
          onSelect={(category) =>
            open({
              kind: "folder",
              target: category,
              title: category === "All" ? "All Designs" : category,
            })
          }
        />

        <div className="scroll-thin min-w-0 flex-1 overflow-auto p-5">
          {items.length === 0 ? (
            <p className="mt-16 text-center text-[13px] text-[color:var(--label-on-panel-secondary)]">
              No design matches “{query.trim()}”. Try a shape, an animal, or a
              mood — “skull”, “snake”, “floral”.
            </p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-x-3 gap-y-5">
              {items.map((product) => (
                <li key={product.slug}>
                  <DesignTile
                    product={product}
                    onOpen={() =>
                      open({
                        kind: "product",
                        target: product.slug,
                        title: product.name,
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </WindowFrame>
  );
}

function Sidebar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (category: string) => void;
}) {
  const entries = [
    { key: "All", label: "All Designs", count: designs.length },
    ...categoryOrder.map((c) => ({ key: c, label: c, count: categoryCounts[c] })),
  ];

  return (
    <nav
      className="scroll-thin w-[186px] shrink-0 overflow-auto border-r border-black/10 bg-white/25 p-2.5"
      aria-label="Categories"
    >
      <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--label-on-panel-secondary)]">
        Library
      </p>
      <ul className="space-y-0.5">
        {entries.map((entry) => (
          <li key={entry.key}>
            <button
              type="button"
              onClick={() => onSelect(entry.key)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
                active === entry.key
                  ? "bg-[color:var(--color-system-blue)] text-white"
                  : "text-[color:var(--label-on-panel)] hover:bg-black/[.06]"
              }`}
            >
              <svg width="14" height="12" viewBox="0 0 74 62" aria-hidden className="shrink-0">
                <path
                  d="M3 9.5A4.5 4.5 0 0 1 7.5 5h17.2a4.5 4.5 0 0 1 3.1 1.25l3.4 3.3A4.5 4.5 0 0 0 34.3 11H66.5A4.5 4.5 0 0 1 71 15.5v37A4.5 4.5 0 0 1 66.5 57h-59A4.5 4.5 0 0 1 3 52.5Z"
                  fill={active === entry.key ? "#ffffff" : "#39b3f0"}
                />
              </svg>
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              <span
                className={`tabular text-[11.5px] ${
                  active === entry.key
                    ? "text-white/75"
                    : "text-[color:var(--label-on-panel-secondary)]"
                }`}
              >
                {entry.count}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function DesignTile({
  product,
  onOpen,
}: {
  product: Product;
  onOpen: () => void;
}) {
  const [selected, setSelected] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setSelected(true)}
      onDoubleClick={onOpen}
      onBlur={() => setSelected(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
      className="flex w-full flex-col items-center gap-2 rounded-lg p-1.5"
      aria-label={product.name}
    >
      <Image
        src={mediaUrl(product.media.icon)}
        alt=""
        width={320}
        height={256}
        className={`aspect-[5/4] w-full rounded-lg object-cover shadow-[0_2px_8px_rgba(0,0,0,.18)] transition-transform ${
          selected ? "ring-2 ring-[color:var(--color-system-blue)]" : ""
        }`}
      />
      <span
        className={`max-w-full truncate rounded px-1.5 py-0.5 text-[12.5px] font-medium ${
          selected
            ? "bg-[color:var(--color-system-blue)] text-white"
            : "text-[color:var(--label-on-panel)]"
        }`}
      >
        {product.name}
      </span>
    </button>
  );
}
