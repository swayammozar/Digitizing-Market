"use client";

import Image from "next/image";
import { bySlug, formatPrice, mediaUrl, price } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useWindows, type WindowState } from "@/lib/windows";
import Checkout from "../checkout/Checkout";
import WindowFrame from "./WindowFrame";

export default function CartWindow({ win }: { win: WindowState }) {
  const slugs = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const currency = useCart((s) => s.currency);
  const open = useWindows((s) => s.open);

  const items = slugs.map(bySlug).filter((p) => p !== undefined);
  const total = items.reduce((sum, p) => sum + price(p, currency), 0);

  return (
    <WindowFrame
      win={win}
      subtitle={`${items.length} ${items.length === 1 ? "design" : "designs"}`}
    >
      <div className="flex h-full flex-col">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-[14px] font-medium text-[color:var(--label-on-panel)]">
              Your cart is empty
            </p>
            <p className="max-w-[280px] text-[12.5px] text-[color:var(--label-on-panel-secondary)]">
              Open a folder on the desktop and double-click a design to see it.
            </p>
            <button
              type="button"
              onClick={() =>
                open({ kind: "folder", target: "All", title: "All Designs" })
              }
              className="mt-1 rounded-lg bg-[color:var(--color-system-blue)] px-3.5 py-2 text-[13px] font-medium text-white transition-[filter] hover:brightness-110"
            >
              Browse all designs
            </button>
          </div>
        ) : (
          <>
            <ul className="scroll-thin min-h-0 flex-1 overflow-auto p-3">
              {items.map((product) => (
                <li
                  key={product.slug}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-black/[.04]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      open({
                        kind: "product",
                        target: product.slug,
                        title: product.name,
                      })
                    }
                    className="shrink-0"
                    aria-label={`Open ${product.name}`}
                  >
                    <Image
                      src={mediaUrl(product.media.icon)}
                      alt=""
                      width={160}
                      height={128}
                      className="h-[44px] w-[55px] rounded-md object-cover"
                    />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[color:var(--label-on-panel)]">
                      {product.name}
                    </p>
                    <p className="truncate text-[11.5px] text-[color:var(--label-on-panel-secondary)]">
                      {product.formats.join(" · ")}
                    </p>
                  </div>

                  <span className="tabular shrink-0 text-[13px] font-medium text-[color:var(--label-on-panel)]">
                    {formatPrice(price(product, currency), currency)}
                  </span>

                  <button
                    type="button"
                    onClick={() => remove(product.slug)}
                    aria-label={`Remove ${product.name} from cart`}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-black/35 transition-colors hover:bg-black/10 hover:text-black/70"
                  >
                    <svg width="11" height="11" viewBox="0 0 10 10" aria-hidden>
                      <path
                        d="M1 1l8 8M9 1L1 9"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>

            <div className="shrink-0">
              <Checkout
                total={total}
                currency={currency}
                onPaid={() =>
                  open({
                    kind: "downloads",
                    target: "downloads",
                    title: "My Downloads",
                  })
                }
              />
            </div>
          </>
        )}
      </div>
    </WindowFrame>
  );
}
