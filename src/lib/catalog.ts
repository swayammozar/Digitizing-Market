import raw from "@/data/products.json";
import type { Catalog, Currency, Product } from "./types";

const catalog = raw as Catalog;

export const products: Product[] = catalog.products;

export const designs = products.filter((p) => !p.isService);

export const service = products.find((p) => p.isService) ?? null;

export const categoryOrder = catalog.categoryOrder;

export function byCategory(category: string): Product[] {
  return designs.filter((p) => p.category === category);
}

export function bySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export const featured = designs.filter((p) => p.featured);

export const categoryCounts: Record<string, number> = Object.fromEntries(
  categoryOrder.map((c) => [c, byCategory(c).length]),
);

/** Where processed media is served from — Supabase Storage in production. */
const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "/media";

export function mediaUrl(key: string): string {
  return `${MEDIA_BASE}/${key}`;
}

export function price(product: Product, currency: Currency): number {
  return currency === "INR" ? product.priceInr : product.priceUsd;
}

export function formatPrice(amount: number, currency: Currency): string {
  return currency === "INR"
    ? `₹${amount.toLocaleString("en-IN")}`
    : `$${amount.toFixed(2)}`;
}
