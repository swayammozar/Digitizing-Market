"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

export interface SessionState {
  user: User | null;
  /** False until Supabase has answered; the UI must not guess in between. */
  ready: boolean;
}

/**
 * The signed-in user, kept in step with Supabase.
 *
 * onAuthStateChange fires immediately with the restored session and again on
 * every sign in, sign out and token refresh, so one subscription covers both
 * the initial read and everything after it.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ user: null, ready: false });

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, ready: true });
    });

    // A tab restored from bfcache can miss the initial event, so the current
    // user is also fetched once directly.
    supabase.auth.getUser().then(({ data }) => {
      setState((current) =>
        current.ready ? current : { user: data.user ?? null, ready: true },
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
