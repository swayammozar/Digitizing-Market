"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase for the browser. Uses the publishable (anon) key, which is safe to
 * ship — every table it can reach is guarded by row level security, so the key
 * grants no more than the signed-in user is allowed to see.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
