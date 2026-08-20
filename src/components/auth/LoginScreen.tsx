"use client";

import Image from "next/image";
import { useState } from "react";
import { continueAsGuest } from "@/lib/guest";
import { createClient } from "@/lib/supabase/client";
import { useClock } from "@/lib/useClock";
import { BatteryIcon, WifiIcon } from "../system/StatusIcons";

type Mode = "signin" | "signup";
type Step = "email" | "password";

/**
 * The macOS login screen, as the front door.
 *
 * One field at a time, the way Apple asks for an Apple ID: the email is
 * confirmed, then the password appears in its place. A single capsule keeps the
 * screen as quiet as the real thing, where there is only ever a password to
 * type.
 *
 * Guest sits underneath, which macOS also has. A shop nobody can see without an
 * account is a shop search engines cannot index and casual visitors do not
 * join, so this is a first impression rather than a gate.
 */
export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [asleep, setAsleep] = useState(false);

  const reset = (next: Mode) => {
    setMode(next);
    setStep("email");
    setPassword("");
    setError(null);
    setNotice(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    // The email step only advances; nothing is sent until there is a password
    // to send with it.
    if (step === "email") {
      setStep("password");
      return;
    }

    setBusy(true);
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
        reset("signin");
      }
      // A session means Supabase signed them straight in, and Shell swaps this
      // screen for the desktop on its own.
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
          ? "That password is not right for this account."
          : signInError.message,
      );
      setPassword("");
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
      <StatusBar />

      <div className="flex w-full max-w-[264px] flex-col items-center">
        <Avatar />

        <h1 className="desktop-label mt-3.5 text-[18px] font-semibold tracking-tight text-white">
          Digitizing Market
        </h1>

        <p className="desktop-label mt-1 h-[16px] text-center text-[12.5px] text-white/70">
          {step === "password" ? email : mode === "signin" ? "Sign in" : "Create an account"}
        </p>

        <form onSubmit={submit} className="mt-4 w-full">
          <div className="relative">
            {step === "email" ? (
              <input
                key="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-field pr-10"
              />
            ) : (
              <input
                key="password"
                type="password"
                required
                autoFocus
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-field pr-10"
              />
            )}

            <button
              type="submit"
              disabled={busy}
              aria-label={step === "email" ? "Continue" : "Sign in"}
              className="absolute right-1 top-1 grid h-[30px] w-[30px] place-items-center rounded-full bg-white/25 text-white transition-colors hover:bg-white/45 disabled:opacity-50"
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

        <div className="mt-2.5 h-[30px] w-full">
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-black/50 px-3 py-1.5 text-center text-[12px] text-white"
            >
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-lg bg-black/50 px-3 py-1.5 text-center text-[12px] text-white">
              {notice}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            step === "password"
              ? reset(mode)
              : reset(mode === "signin" ? "signup" : "signin")
          }
          className="desktop-label text-[12.5px] text-white/80 underline-offset-2 hover:underline"
        >
          {step === "password"
            ? "Use a different email"
            : mode === "signin"
              ? "Create an account"
              : "I already have an account"}
        </button>

        <div className="mt-6 flex w-full items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-white/25" />
          <span className="desktop-label text-[11px] uppercase tracking-wider text-white/55">
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

/**
 * Black disc, white mark. The spool is the shop's own, so the login screen
 * says which machine you are sitting at — but reduced to two colours, because
 * an avatar competing with the wallpaper is the one thing this screen cannot
 * afford.
 */
function Avatar() {
  return (
    <span className="grid h-[96px] w-[96px] place-items-center overflow-hidden rounded-full bg-[#121212] shadow-[0_8px_28px_rgba(0,0,0,.45)] ring-1 ring-white/25">
      <Image
        src="/ui/custom.png"
        alt=""
        width={128}
        height={128}
        priority
        className="h-[64%] w-[64%] object-contain"
      />
    </span>
  );
}

/** The menu bar as it appears before login: status only, no menus. */
function StatusBar() {
  const ms = useClock();

  return (
    <div className="absolute inset-x-0 top-0 flex h-7 items-center justify-end gap-3 px-4 text-white">
      <WifiIcon />
      <BatteryIcon showPercent />

      {/* Empty on the server, where the visitor's clock is not knowable. */}
      {ms > 0 && (
        <span className="tabular text-[12.5px] font-medium">
          {new Date(ms).toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
          {"  "}
          {new Date(ms).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>
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
