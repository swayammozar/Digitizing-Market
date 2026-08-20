"use client";

import { useEffect, useRef, useState } from "react";
import { useCart, useCartHydrated } from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";
import { useClock } from "@/lib/useClock";
import { useSession } from "@/lib/useSession";
import { useWindows } from "@/lib/windows";
import type { Currency } from "@/lib/types";

interface MenuItem {
  label: string;
  page?: string;
  divider?: boolean;
}

const MENUS: { title: string; items: MenuItem[] }[] = [
  {
    title: "Digitizing Market",
    items: [
      { label: "About this shop", page: "about" },
      { label: "", divider: true },
      { label: "Licence terms", page: "licence" },
      { label: "Contact", page: "contact" },
    ],
  },
  {
    title: "Designs",
    items: [
      { label: "Formats & compatibility", page: "formats" },
      { label: "How to stitch a design", page: "howto" },
      { label: "", divider: true },
      { label: "Custom digitizing", page: "custom" },
    ],
  },
  {
    title: "Help",
    items: [
      { label: "Frequently asked questions", page: "faq" },
      { label: "Refunds", page: "refunds" },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  about: "About this shop",
  licence: "Licence terms",
  contact: "Contact",
  formats: "Formats & compatibility",
  howto: "How to stitch a design",
  faq: "Frequently asked questions",
  refunds: "Refunds",
};

/**
 * Shows who is signed in and offers the way out. Signed out it is a plain
 * shortcut into the library, which is where the sign-in form lives — there is
 * no separate login screen to send anyone to.
 */
function AccountMenu() {
  const { user, ready } = useSession();
  const [open, setOpen] = useState(false);
  const openWindow = useWindows((s) => s.open);

  if (!ready) return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() =>
          openWindow({ kind: "downloads", target: "downloads", title: "My Downloads" })
        }
        className="rounded px-2 py-0.5 font-medium transition-colors hover:bg-white/15"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`grid h-[19px] w-[19px] place-items-center rounded-full bg-white/25 text-[10px] font-bold uppercase transition-colors hover:bg-white/40 ${
          open ? "bg-white/40" : ""
        }`}
        title={user.email ?? "Account"}
      >
        {(user.email ?? "?").charAt(0)}
      </button>

      {open && (
        <div
          role="menu"
          className="glass glass-thick animate-window-open absolute right-0 top-[calc(100%+6px)] min-w-[220px] overflow-hidden rounded-[10px] p-1.5"
        >
          <p className="truncate px-2.5 py-1.5 text-[12px] text-[color:var(--label-on-panel-secondary)]">
            {user.email}
          </p>
          <div className="my-1 h-px bg-black/10" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openWindow({
                kind: "downloads",
                target: "downloads",
                title: "My Downloads",
              });
            }}
            className="w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-[color:var(--label-on-panel)] transition-colors hover:bg-[color:var(--color-system-blue)] hover:text-white"
          >
            My Downloads
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await createClient().auth.signOut();
            }}
            className="w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-[color:var(--label-on-panel)] transition-colors hover:bg-[color:var(--color-system-blue)] hover:text-white"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Clock() {
  const ms = useClock();

  // Zero is the server's sentinel, where there is no clock to read.
  if (ms === 0) return <span className="w-[104px]" aria-hidden />;
  const now = new Date(ms);

  return (
    <span className="tabular text-[13px] font-medium">
      {now.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}
      {"  "}
      {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
    </span>
  );
}

export default function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const items = useCart((s) => s.items);
  const hydrated = useCartHydrated();
  const currency = useCart((s) => s.currency);
  const setCurrency = useCart((s) => s.setCurrency);
  const open = useWindows((s) => s.open);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const openPage = (page: string) => {
    setOpenMenu(null);
    if (page === "custom") {
      open({ kind: "service", target: "custom-digitizing", title: "Custom Digitizing" });
      return;
    }
    open({ kind: "page", target: page, title: PAGE_TITLES[page] ?? page });
  };

  const cycleCurrency = () => {
    const next: Currency = currency === "USD" ? "INR" : "USD";
    setCurrency(next);
  };

  return (
    <div
      ref={barRef}
      className="glass glass-thin fixed inset-x-0 top-0 z-[9999] flex h-7 items-center gap-1 px-3 text-[13px] text-white"
      style={{ borderRadius: 0 }}
    >
      <span className="mr-1 text-[15px] leading-none" aria-hidden>
        🧵
      </span>

      {MENUS.map((menu, i) => (
        <div key={menu.title} className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === menu.title ? null : menu.title)}
            onMouseEnter={() => openMenu && setOpenMenu(menu.title)}
            className={`rounded px-2.5 py-0.5 transition-colors ${
              i === 0 ? "font-semibold" : "font-normal"
            } ${
              openMenu === menu.title
                ? "bg-white/25"
                : "hover:bg-white/15"
            }`}
            aria-expanded={openMenu === menu.title}
            aria-haspopup="menu"
          >
            {menu.title}
          </button>

          {openMenu === menu.title && (
            <div
              role="menu"
              className="glass glass-thick animate-window-open absolute left-0 top-[calc(100%+4px)] min-w-[228px] overflow-hidden rounded-[10px] p-1.5"
            >
              {menu.items.map((item, j) =>
                item.divider ? (
                  <div key={j} className="my-1.5 h-px bg-black/10" />
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    onClick={() => item.page && openPage(item.page)}
                    className="w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-[color:var(--label-on-panel)] transition-colors hover:bg-[color:var(--color-system-blue)] hover:text-white"
                  >
                    {item.label}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={cycleCurrency}
          title={currency === "USD" ? "Switch to rupees" : "Switch to dollars"}
          className="tabular rounded px-2 py-0.5 font-medium transition-colors hover:bg-white/15"
        >
          {currency === "USD" ? "$ USD" : "₹ INR"}
        </button>

        <button
          type="button"
          onClick={() => open({ kind: "cart", target: "cart", title: "Cart" })}
          className="relative rounded px-1.5 py-0.5 transition-colors hover:bg-white/15"
          aria-label={`Cart, ${items.length} ${items.length === 1 ? "design" : "designs"}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M3 5h2.2l2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.55L20.6 9H6.4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="10" cy="20.2" r="1.3" fill="currentColor" />
            <circle cx="17" cy="20.2" r="1.3" fill="currentColor" />
          </svg>
          {hydrated && items.length > 0 && (
            <span className="tabular absolute -right-1 -top-0.5 min-w-[15px] rounded-full bg-[color:var(--color-hanko)] px-1 text-center text-[10px] font-bold leading-[15px] text-white">
              {items.length}
            </span>
          )}
        </button>

        <AccountMenu />
        <Clock />
      </div>
    </div>
  );
}
