"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { bySlug, mediaUrl } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import SignInForm from "../auth/SignInForm";

interface Entitlement {
  product_slug: string;
  granted_at: string;
}

/**
 * The buyer's permanent library.
 *
 * Rows are read straight from Supabase under row level security, so this can
 * only ever show what the signed-in account actually owns. The file itself is
 * not linked here — pressing Download asks the server for a fresh signed URL
 * that expires in minutes, so nothing on this page is worth copying.
 */
export default function DownloadsLibrary() {
  const { user, ready } = useSession();
  const [rows, setRows] = useState<Entitlement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  // Every state update happens after an await, so nothing is set synchronously
  // while the effect body runs. `cancelled` covers the buyer signing out while
  // the query is still in flight.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("downloads")
        .select("product_slug, granted_at")
        .order("granted_at", { ascending: false });

      if (cancelled) return;
      if (queryError) {
        setError("Could not load your designs. Try again in a moment.");
        return;
      }
      setRows(data ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const download = async (slug: string) => {
    setPending(slug);
    setError(null);
    try {
      const response = await fetch(`/api/download/${encodeURIComponent(slug)}`, {
        method: "POST",
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not prepare that download.");
      }
      // Navigating rather than opening a tab: the signed URL carries a
      // Content-Disposition, so the browser saves the file without the shop
      // going anywhere.
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download that file.");
    } finally {
      setPending(null);
    }
  };

  if (!ready) {
    return (
      <div className="space-y-2 p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-black/10" />
        ))}
      </div>
    );
  }

  if (!user) {
    return <SignInForm reason="Sign in to see the designs you have bought." />;
  }

  if (rows === null) {
    return (
      <div className="space-y-2 p-5">
        {[0, 1].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-black/10" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-[15px] font-medium text-[color:var(--label-on-panel)]">
          Nothing here yet
        </p>
        <p className="mx-auto mt-2 max-w-[34ch] text-[13px] leading-relaxed text-[color:var(--label-on-panel-secondary)]">
          Designs you buy appear here, and stay for good — new machine, new
          computer, years later.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-md bg-[color:var(--color-hanko)]/12 px-3 py-2 text-[12.5px] text-[color:var(--color-hanko)]"
        >
          {error}
        </p>
      )}

      <ul className="space-y-1">
        {rows.map((row) => {
          const product = bySlug(row.product_slug);
          if (!product) return null;

          return (
            <li
              key={row.product_slug}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-black/[.04]"
            >
              <Image
                src={mediaUrl(product.media.icon)}
                alt=""
                width={160}
                height={128}
                className="h-[46px] w-[58px] shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-[color:var(--label-on-panel)]">
                  {product.name}
                </p>
                <p className="truncate text-[11.5px] text-[color:var(--label-on-panel-secondary)]">
                  {product.formats.join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => download(row.product_slug)}
                disabled={pending === row.product_slug}
                className="shrink-0 rounded-lg bg-[color:var(--color-system-blue)] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-60"
              >
                {pending === row.product_slug ? "Preparing…" : "Download"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
