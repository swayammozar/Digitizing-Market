export interface DesignSize {
  widthMm: number;
  heightMm: number;
  stitches: number;
}

export interface DesignSpecs {
  sizes: DesignSize[];
  /** Stitch count of the largest size, rounded to the nearest hundred. */
  stitches: number;
  /** Thread colours from the Wilcom sheet; null when the PDF had no text layer. */
  colors: number | null;
  colorNames: string[] | null;
}

export interface Product {
  slug: string;
  folder: string;
  /** Short name, used on desktop icons and in folder windows. */
  name: string;
  /** Headline half of the shop's SEO title. */
  title: string;
  tagline: string;
  seoTitle: string;
  description: string;
  category: string | null;
  tags: string[];
  priceUsd: number;
  priceInr: number;
  isService: boolean;
  featured: boolean;
  specs: DesignSpecs | null;
  formats: string[];
  formatMachines: Record<string, string>;
  media: {
    icon: string;
    images: string[];
    video: string | null;
  };
  zipKey: string | null;
}

export interface Catalog {
  generatedAt: string;
  categoryOrder: string[];
  products: Product[];
}

export type Currency = "USD" | "INR";
