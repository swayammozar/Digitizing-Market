"use client";

import { useIsGuest } from "@/lib/guest";
import { useSession } from "@/lib/useSession";
import LoginScreen from "./auth/LoginScreen";
import Desktop from "./desktop/Desktop";

/**
 * Decides what the visitor lands on.
 *
 * The machine boots to a login screen, and either signing in or choosing Guest
 * takes them to the desktop. Guest lasts the browser session, so the moment
 * happens on arrival rather than on every refresh.
 */
export default function Shell() {
  const { user, ready } = useSession();
  const guest = useIsGuest();

  // Supabase is asked for the stored session before anything renders. Showing
  // the login screen first and then yanking it away from someone who is
  // already signed in looks like a bug.
  if (!ready) return <BootScreen />;

  if (!user && !guest) return <LoginScreen />;

  return <Desktop />;
}

/**
 * The moment between the page arriving and Supabase answering. Deliberately
 * almost nothing — a wallpaper-coloured field, so the login screen fades up
 * out of it rather than replacing a white flash.
 */
function BootScreen() {
  return (
    <div
      className="fixed inset-0 grid place-items-center"
      style={{ background: "#2b6d80" }}
    >
      <span
        className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white/70"
        role="status"
        aria-label="Starting up"
      />
    </div>
  );
}
