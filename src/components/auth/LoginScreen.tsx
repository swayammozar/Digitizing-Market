"use client";

import Image from "next/image";
import { useState } from "react";
import { continueAsGuest } from "@/lib/guest";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

/**
 * The macOS login screen, as the front door.
 *
 * Everything about it is the real thing — heavily blurred wallpaper, a round
 * avatar, the name beneath it, a capsule password field, and the power row
 * along the bottom — with one addition that is also genuinely macOS: Guest.
 *
 * Guest is what keeps this from costing sales. A shop nobody can see without
 * an account is a shop search engines cannot index and casual visitors do not
 * join, so the login screen is a first impression here rather than a gate.
 */
export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [asleep, setAsleep] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      setBusy(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (!data.session) {
        setNotice("Check your email to confirm your account, then sign in.");
        setMode("signin");
      }
      // A session means Supabase signed them straight in, and useSession
      // swaps this screen for the desktop on its own.
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "That email and password do not match an account."
          : signInError.message,
      );
    }
  };

  if (asleep) {
    return (
      <button
        type="button"
        onClick={() => setAsleep(false)}
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black"
        aria-label="Wake"
      >
        <span className="text-[13px] text-white/25">Click to wake</span>
      </button>
    );
  }

  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden px-6">
      <Backdrop />

      <div className="flex w-full max-w-[280px] flex-col items-center">
        <span className="grid h-[104px] w-[104px] place-items-center overflow-hidden rounded-full bg-white/85 shadow-[0_6px_24px_rgba(0,0,0,.35)] ring-1 ring-white/40">
          <Image
            src="/ui/custom.png"
            alt=""
            width={128}
            height={128}
            priority
            className="h-[74%] w-[74%] object-contain [filter:invert(18%)_sepia(64%)_saturate(3200%)_hue-rotate(340deg)]"
          />
        </span>

        <h1 className="desktop-label mt-3.5 text-[19px] font-semibold tracking-tight text-white">
          Digitizing Market
        </h1>
        <p className="desktop-label mt-1 text-center text-[12.5px] text-white/70">
          {mode === "signin"
            ? "Sign in for your designs, or look around as a guest"
            : "Create an account to keep your designs"}
        </p>

        <form onSubmit={submit} className="mt-5 w-full space-y-2">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-field"
          />

          <div className="relative">
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-field pr-10"
            />
            <button
              type="submit"
              disabled={busy}
              aria-label={mode === "signin" ? "Sign in" : "Create account"}
              className="absolute right-1 top-1 grid h-[30px] w-[30px] place-items-center rounded-full bg-white/25 text-white transition-colors hover:bg-white/40 disabled:opacity-50"
            >
              {busy ? (
                <span className="block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden>
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              )}
            </button>
          </div>
        </form>

        {error && (
          <p
            role="alert"
            className="mt-2.5 rounded-lg bg-black/45 px-3 py-1.5 text-center text-[12px] text-white"
          >
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-2.5 rounded-lg bg-black/45 px-3 py-1.5 text-center text-[12px] text-white">
            {notice}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="desktop-label mt-3 text-[12.5px] text-white/80 underline-offset-2 hover:underline"
        >
          {mode === "signin" ? "Create an account" : "I already have an account"}
        </button>

        <div className="mt-6 flex w-full items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-white/25" />
          <span className="desktop-label text-[11px] uppercase tracking-wider text-white/60">
            or
          </span>
          <span className="h-px flex-1 bg-white/25" />
        </div>

        <button
          type="button"
          onClick={continueAsGuest}
          className="glass mt-4 flex w-full items-center justify-center gap-2.5 rounded-full px-4 py-2.5 text-[13.5px] font-medium text-white transition-transform active:scale-[.98]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.7" fill="none" />
            <path
              d="M5.5 19.5a6.5 6.5 0 0 1 13 0"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          Continue as Guest
        </button>
      </div>

      <div className="absolute bottom-7 flex items-center gap-11">
        <PowerButton label="Restart" onClick={() => window.location.reload()}>
          <path
            d="M12 5V2.5M12 5a7 7 0 1 1-6.3 4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M9.4 3.1 12 5 9.4 6.9z" fill="currentColor" />
        </PowerButton>
        <PowerButton label="Sleep" onClick={() => setAsleep(true)}>
          <path
            d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
            fill="none"
          />
        </PowerButton>
      </div>
    </main>
  );
}

function PowerButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 text-white/75 transition-colors hover:text-white"
    >
      <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-white/15">
        <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
          {children}
        </svg>
      </span>
      <span className="desktop-label text-[11.5px]">{label}</span>
    </button>
  );
}

function Backdrop() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <Image
        src="/ui/wallpaper.jpg"
        alt=""
        fill
        priority
        sizes="640px"
        // Scaled before blurring so the blur's soft edges fall outside the
        // viewport instead of leaving pale borders.
        className="scale-125 object-cover blur-[34px]"
      />
      <div className="absolute inset-0 bg-black/35" aria-hidden />
    </div>
  );
}
