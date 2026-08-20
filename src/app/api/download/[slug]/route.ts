import { NextResponse } from "next/server";
import { bySlug } from "@/lib/catalog";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/** Long enough to start a download on a slow connection, short enough that a
    leaked link is worthless by the time it is shared. */
const LINK_LIFETIME_SECONDS = 300;

/**
 * Hands out a design file — the one route standing between a paying customer
 * and a 226 MB bucket of paid work.
 *
 * Three things have to be true, in this order: there is a signed-in user, that
 * user has a downloads row for this design, and the design exists. Only then is
 * a signed URL minted, and it expires in five minutes.
 *
 * The URL is never stored and never reused: each request signs a fresh one, so
 * revoking access is a matter of deleting a row rather than chasing links.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to download your designs." },
      { status: 401 },
    );
  }

  const product = bySlug(slug);
  if (!product?.zipKey) {
    return NextResponse.json({ error: "No such design." }, { status: 404 });
  }

  // Row level security already limits this to the caller's own rows; the
  // explicit user_id filter means a policy change can never silently widen it.
  const { data: entitlement } = await supabase
    .from("downloads")
    .select("id, download_count")
    .eq("user_id", user.id)
    .eq("product_slug", slug)
    .maybeSingle();

  if (!entitlement) {
    // Deliberately not "you do not own this": the answer is the same whether
    // the design exists and is unowned or the slug was guessed.
    return NextResponse.json(
      { error: "That design is not in your library." },
      { status: 403 },
    );
  }

  // Signing needs the service role: product-files has no read policy at all,
  // which is what keeps it unreachable by any other route.
  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("product-files")
    .createSignedUrl(product.zipKey, LINK_LIFETIME_SECONDS, {
      download: `${product.name.replace(/[^\w\s-]/g, "")} - Digitizing Market.zip`,
    });

  if (error || !signed) {
    console.error("download signing failed", slug, error);
    return NextResponse.json(
      { error: "Could not prepare that download. Try again in a moment." },
      { status: 500 },
    );
  }

  // Recorded for support ("it says I already downloaded it"), not enforced —
  // a buyer re-downloading a file they own is normal, not suspicious.
  await admin
    .from("downloads")
    .update({
      download_count: (entitlement.download_count ?? 0) + 1,
      last_download: new Date().toISOString(),
    })
    .eq("id", entitlement.id);

  return NextResponse.json({ url: signed.signedUrl, expiresIn: LINK_LIFETIME_SECONDS });
}
