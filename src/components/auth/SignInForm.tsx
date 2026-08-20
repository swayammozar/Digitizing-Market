"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

/**
 * Sign in and create account, in one form.
 *
 * Presented as a macOS sheet in a window and as an iOS sheet on a phone, so it
 * carries no chrome of its own — only fields.
 */
export default function SignInForm({
  onDone,
  reason,
}: {
  onDone?: () => void;
  /** Why the visitor was asked to sign in, when they did not choose to. */
  reason?: string;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
      // With email confirmation switched on, Supabase returns a user but no
      // session. Saying so beats a form that appears to do nothing.
      if (!data.session) {
        setNotice("Check your email to confirm your account, then sign in.");
        setMode("signin");
        return;
      }
      onDone?.();
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
      return;
    }
    onDone?.();
  };

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-[340px] p-6">
      <h3 className="text-[17px] font-semibold text-[color:var(--label-on-panel)]">
        {mode === "signin" ? "Sign in" : "Create an account"}
      </h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--label-on-panel-secondary)]">
        {reason ??
          "Your designs stay in My Downloads, so you can download them again whenever you need to."}
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--label-on-panel-secondary)]">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="dm-input"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--label-on-panel-secondary)]">
            Password
          </span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="dm-input"
          />
          {mode === "signup" && (
            <span className="mt-1 block text-[11.5px] text-[color:var(--label-on-panel-secondary)]">
              At least 8 characters.
            </span>
          )}
        </label>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md bg-[color:var(--color-hanko)]/12 px-3 py-2 text-[12.5px] text-[color:var(--color-hanko)]"
        >
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-3 rounded-md bg-black/[.06] px-3 py-2 text-[12.5px] text-[color:var(--label-on-panel)]">
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-lg bg-[color:var(--color-system-blue)] px-4 py-2.5 text-[14px] font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-60"
      >
        {busy
          ? "One moment…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setNotice(null);
        }}
        className="mt-3 w-full text-center text-[12.5px] text-[color:var(--color-system-blue)]"
      >
        {mode === "signin"
          ? "No account yet? Create one"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
