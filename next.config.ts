import type { NextConfig } from "next";

/**
 * Product images are served from Supabase Storage in production, and
 * next/image refuses any remote host that is not allowlisted here — without
 * this every product icon 400s once NEXT_PUBLIC_MEDIA_BASE_URL points at
 * Supabase, while still working locally from /public/media.
 *
 * Derived from the env var rather than hardcoded, so moving to a different
 * Supabase project or a CDN needs no code change.
 */
const mediaHost = process.env.NEXT_PUBLIC_MEDIA_BASE_URL
  ? new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: mediaHost
      ? [{ protocol: "https", hostname: mediaHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
