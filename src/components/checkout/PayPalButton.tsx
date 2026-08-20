"use client";

import { useEffect, useRef, useState } from "react";
import {
  confirmPayPalOrder,
  createPayPalOrder,
  loadScript,
  paypalSdkUrl,
} from "@/lib/checkout";

interface PayPalButtonsApi {
  Buttons: (config: Record<string, unknown>) => {
    render: (target: HTMLElement) => Promise<void>;
  };
}

declare global {
  interface Window {
    paypal?: PayPalButtonsApi;
  }
}

/** Inlined at build time, so it is a constant rather than component state. */
const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

/**
 * PayPal insists on rendering its own button — it opens a popup, and a popup
 * only survives a browser's blocker if it was opened by a genuine click on
 * PayPal's own element.
 */
export default function PayPalButton({
  items,
  onPaid,
  onError,
}: {
  items: string[];
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(Boolean(CLIENT_ID));

  // The button is mounted once and must still call the current handlers with
  // the current cart. Kept in a ref, refreshed after each render rather than
  // during it, and read at click time.
  const handlers = useRef({ items, onPaid, onError });
  useEffect(() => {
    handlers.current = { items, onPaid, onError };
  });

  useEffect(() => {
    if (!CLIENT_ID) return;

    let cancelled = false;

    loadScript(paypalSdkUrl(CLIENT_ID), "paypal-sdk")
      .then(() => {
        if (cancelled || !host.current || !window.paypal) return;
        setLoading(false);

        return window.paypal
          .Buttons({
            style: { layout: "horizontal", height: 44, tagline: false },
            createOrder: () => createPayPalOrder(handlers.current.items),
            onApprove: async (data: { orderID: string }) => {
              try {
                await confirmPayPalOrder(data.orderID);
                handlers.current.onPaid();
              } catch (error) {
                handlers.current.onError(
                  error instanceof Error ? error.message : "Payment failed.",
                );
              }
            },
            onError: () =>
              handlers.current.onError("PayPal could not complete the payment."),
            // Cancelling is a decision, not a fault — say nothing.
            onCancel: () => {},
          })
          .render(host.current);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setLoading(false);
        handlers.current.onError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID) {
    return (
      <p className="rounded-md bg-black/[.06] px-3 py-2.5 text-center text-[12.5px] text-[color:var(--label-on-panel-secondary)]">
        Card payment is not switched on yet. Switch the currency to ₹ to pay
        through Razorpay, or email us and we will send an invoice.
      </p>
    );
  }

  return (
    <div>
      {loading && (
        <div className="h-11 w-full animate-pulse rounded-lg bg-black/10" aria-hidden />
      )}
      <div ref={host} />
    </div>
  );
}
