"use client";

import { bySlug } from "@/lib/catalog";
import { useWindows, type WindowState } from "@/lib/windows";
import ProductDetail from "../product/ProductDetail";
import WindowFrame from "./WindowFrame";

export default function ProductWindow({ win }: { win: WindowState }) {
  const product = bySlug(win.target);
  const open = useWindows((s) => s.open);

  if (!product) {
    return (
      <WindowFrame win={win}>
        <p className="p-8 text-[13px] text-[color:var(--label-on-panel-secondary)]">
          That design is no longer in the shop.
        </p>
      </WindowFrame>
    );
  }

  return (
    <WindowFrame win={win} subtitle={product.tagline}>
      <ProductDetail
        product={product}
        onAdded={() => open({ kind: "cart", target: "cart", title: "Cart" })}
      />
    </WindowFrame>
  );
}
