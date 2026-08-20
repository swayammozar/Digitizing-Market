import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Receives a custom digitizing enquiry.
 *
 * The form previously showed "Request received" and sent nothing, which is
 * worse than having no form: the customer believes they have asked and the shop
 * never hears. Everything here exists to make that impossible — a failure is
 * reported rather than swallowed.
 *
 * No account is required. Someone asking for a quote has not bought anything
 * yet, and making them sign up first loses more enquiries than it prevents.
 */

const MAX_ARTWORK_BYTES = 15 * 1024 * 1024;
const ARTWORK_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/postscript", // .ai and .eps
]);

const FORMATS = new Set(["DST", "PES", "JEF", "VP3", "EXP", "Not sure"]);

export async function POST(request: Request) {
  try {
    const form = await request.formData();

    const email = String(form.get("email") ?? "").trim();
    // Deliberately loose: the only thing worth rejecting is something that
    // could not possibly reach anyone.
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "That email address does not look right." },
        { status: 400 },
      );
    }

    const notes = String(form.get("notes") ?? "").slice(0, 4000);
    const placement = String(form.get("placement") ?? "").slice(0, 80) || null;

    const formatRaw = String(form.get("format") ?? "").trim();
    const format = FORMATS.has(formatRaw) ? formatRaw : null;

    const widthRaw = Number(form.get("widthMm"));
    const widthMm =
      Number.isFinite(widthRaw) && widthRaw >= 5 && widthRaw <= 600
        ? Math.round(widthRaw)
        : null;

    // A signed-in visitor gets the request tied to their account so it appears
    // alongside their orders; a guest simply does not.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();

    let artworkPath: string | null = null;
    const artwork = form.get("artwork");

    if (artwork instanceof File && artwork.size > 0) {
      if (artwork.size > MAX_ARTWORK_BYTES) {
        return NextResponse.json(
          { error: "That file is over 15 MB. Send a smaller version or email it." },
          { status: 413 },
        );
      }
      if (artwork.type && !ARTWORK_TYPES.has(artwork.type)) {
        return NextResponse.json(
          { error: "Send a PNG, JPG, SVG, PDF, AI or EPS." },
          { status: 415 },
        );
      }

      // Namespaced by day and randomised: two people sending "logo.png" must
      // not overwrite each other, and the original name is untrusted input.
      const extension = artwork.name.split(".").pop()?.toLowerCase().slice(0, 5) ?? "dat";
      const safeExtension = /^[a-z0-9]+$/.test(extension) ? extension : "dat";
      const key = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${safeExtension}`;

      const { error: uploadError } = await admin.storage
        .from("custom-artwork")
        .upload(key, artwork, { contentType: artwork.type || undefined, upsert: false });

      if (uploadError) {
        console.error("custom artwork upload failed", uploadError);
        return NextResponse.json(
          { error: "The artwork could not be uploaded. Try again, or email it to us." },
          { status: 502 },
        );
      }
      artworkPath = key;
    }

    const { error } = await admin.from("custom_requests").insert({
      user_id: user?.id ?? null,
      email,
      artwork_path: artworkPath,
      width_mm: widthMm,
      format,
      placement,
      notes: notes || null,
    });

    if (error) {
      console.error("custom request insert failed", error);
      return NextResponse.json(
        { error: "The request could not be saved. Please email hello@digitizingmarket.com." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("custom-request", error);
    return NextResponse.json(
      { error: "Something went wrong. Please email hello@digitizingmarket.com." },
      { status: 500 },
    );
  }
}
