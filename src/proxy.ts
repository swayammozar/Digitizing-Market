import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every request and writes the rotated
 * cookies back onto the response. Without this a signed-in buyer is quietly
 * logged out when their access token expires mid-session.
 *
 * Named `proxy`, not `middleware`: Next.js 16 renamed the file and the export.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // The catalog, cart and product windows all work without Supabase, so a
  // deployment without credentials should still serve the shop rather than
  // failing every request.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        for (const { name, value, options } of items) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Must be getUser(), not getSession(): only getUser() revalidates the token
  // with Supabase rather than trusting whatever the cookie claims.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image files, which never carry a
    // session and would only add latency.
    "/((?!_next/static|_next/image|favicon.ico|media|ui|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
