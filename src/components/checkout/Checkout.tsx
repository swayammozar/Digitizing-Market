"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/catalog";
import { payWithRazorpay } from "@/lib/checkout";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/useSession";
import type { Currency } from "@/lib/types";
import SignInForm from "../auth/SignInForm";
import PayPalButton from "./PayPalButton";

/**
 * The checkout panel that sits at the foot of the cart.
 *
 * It moves through three states — sign in, pay, done — rather than opening
 * anything new, so the buyer never loses sight of what they are buying.
 *
 * The gateway follows the currency, not the other way round: Razorpay settles
 * in rupees and this shop's PayPal account in dollars, so switching currency in
 * the menu bar switches the payment method with it.
 */
export default function Checkout({
  total,
  currency,
  onPaid,
}: {
  total: number;
  currency: Currency;
  onPaid: () => void;
}) {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const { user, ready } = useSession();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const settle = () => {
    clear();
    setDone(true);
    onPaid();
  };

  if (done) {
    return (
      <div className="border-t border-black/10 bg-white/50 p-5 text-center">
        <p className="text-[15px] font-semibold text-[color:var(--label-on-panel)]">
          Paid — the files are yours
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--label-on-panel-secondary)]">
          Open My Downloads to get them. They stay there for good.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="border-t border-black/10 bg-white/40 p-4">
        <div className="h-11 w-full animate-pulse rounded-lg bg-black/10" aria-hidden />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="border-t border-black/10 bg-white/50">
        <SignInForm reason="Your designs are saved to your account, so you can download them again any time." />
      </div>
    );
  }

  return (
    <div className="border-t border-black/10 bg-white/50 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[13px] text-[color:var(--label-on-panel-secondary)]">
          Total
        </span>
        <span className="tabular text-[20px] font-semibold text-[color:var(--label-on-panel)]">
          {formatPrice(total, currency)}
        </span>
      </div>

      {currency === "INR" ? (
        <button
          type="button"
          disabled={busy || items.length === 0}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const result = await payWithRazorpay({ items, email: user.email });
            setBusy(false);
            if (result.status === "paid") settle();
            else if (result.status === "error") setError(result.message);
          }}
          className="w-full rounded-lg bg-[color:var(--color-hanko)] px-4 py-3 text-[15px] font-semibold text-white transition-[filter,transform] hover:brightness-110 active:scale-[.99] disabled:opacity-60"
        >
          {busy ? "Opening Razorpay…" : "Pay with Razorpay"}
        </button>
      ) : (
        <PayPalButton items={items} onPaid={settle} onError={setError} />
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md bg-[color:var(--color-hanko)]/12 px-3 py-2 text-[12.5px] text-[color:var(--color-hanko)]"
        >
          {error}
        </p>
      )}

      <p className="mt-2.5 text-center text-[11.5px] text-[color:var(--label-on-panel-secondary)]">
        {currency === "INR"
          ? "Cards, UPI and netbanking through Razorpay."
          : "Card or PayPal balance. No account needed."}
      </p>
    </div>
  );
}
