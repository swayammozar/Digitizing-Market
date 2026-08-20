/**
 * Cleaning for values that arrive by copy-paste into a hosting dashboard.
 *
 * This is not defensive programming for its own sake. Twice now a value pasted
 * into Vercel has carried something invisible with it — a leading tab on the
 * storage URL, and a trailing literal "\n" on the PayPal client id. Both
 * produced failures that pointed nowhere near the cause: images that 404'd
 * while curl worked, and a payment SDK reporting a connection problem when the
 * connection was fine.
 *
 * A credential is a machine value being retyped by a human through two
 * clipboards and a web form. Treating it as trusted input is the mistake.
 */

/**
 * Whitespace and escape sequences at either end of a value.
 *
 * `\n` written as two literal characters is what a newline becomes when it
 * survives a paste through a form that escapes it. It has to be removed as a
 * pair: dropping only the backslash welds a stray "n" onto the end of the
 * token, which is worse than leaving it alone — an id that is wrong by one
 * character fails in exactly the same way but looks correct.
 *
 * Only the ends are touched. A secret is free to contain anything in the
 * middle, and rewriting that would be its own kind of bug.
 */
const EDGE_JUNK_START = /^(?:\\[nrt]|\s)+/;
const EDGE_JUNK_END = /(?:\\[nrt]|\s)+$/;

/** Strips surrounding whitespace, escapes, and wrapping quotes. */
export function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value
    .replace(EDGE_JUNK_START, "")
    .replace(EDGE_JUNK_END, "")
    .replace(/^(['"])([\s\S]*)\1$/, "$2")
    .replace(EDGE_JUNK_START, "")
    .replace(EDGE_JUNK_END, "");
  return trimmed || undefined;
}

/**
 * Keeps only the characters a token can legally contain.
 *
 * PayPal client ids and Razorpay key ids are URL-safe base64 and ASCII
 * respectively — no whitespace, no backslashes, no quotes. Anything else came
 * from the clipboard rather than the provider, and silently dropping it turns
 * a baffling network error into a working checkout.
 */
export function cleanToken(value: string | undefined): string | undefined {
  const cleaned = cleanEnv(value)?.replace(/[^A-Za-z0-9._-]/g, "");
  return cleaned || undefined;
}
