import type { Metadata } from "next";
import Link from "next/link";
import { designs } from "@/lib/catalog";
import { BUSINESS } from "@/lib/business";
import LegalPage, { Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Pricing — Digitizing Market",
  description:
    "What a machine embroidery design costs at Digitizing Market, in dollars and rupees, and what is included.",
};

export default function PricingPage() {
  // Read from the catalog rather than restated here, so a price change cannot
  // leave this page quietly contradicting the shop.
  const sample = designs[0];
  const usd = sample?.priceUsd ?? 9.99;
  const inr = sample?.priceInr ?? 849;

  const everySamePrice = designs.every(
    (d) => d.priceUsd === usd && d.priceInr === inr,
  );

  return (
    <LegalPage
      title="Pricing"
      intro={`Every design in the shop is the same price, and that price includes every file format. There are no bundles to work out and nothing is charged per machine.`}
    >
      <Section heading="What a design costs">
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
          <table className="w-full text-[15px]">
            <tbody>
              <tr className="border-b border-black/10">
                <td className="px-4 py-3 text-black/60">
                  One design, paying in dollars
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  ${usd.toFixed(2)} USD
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-black/60">
                  One design, paying in rupees
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  ₹{inr.toLocaleString("en-IN")} INR
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {everySamePrice ? (
          <p>
            All {designs.length} designs currently in the shop are this price.
            Buying several at once simply adds up; there is no minimum and no
            subscription.
          </p>
        ) : (
          <p>
            Most designs are this price. The price of any individual design is
            always shown on its own page before you add it to the cart.
          </p>
        )}
        <p>
          The rupee price is a fixed amount, not a live conversion, so it does
          not move with the exchange rate between you opening the shop and
          paying. Your currency is chosen automatically and you can switch it
          yourself at any time.
        </p>
      </Section>

      <Section heading="What is included">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Every machine format the design was digitized in — commonly DST, PES,
            JEF, VP3 and EXP. You are not charged per format.
          </li>
          <li>Both sizes, where a design was digitized at two sizes.</li>
          <li>A PDF colour chart listing threads in stitching order.</li>
          <li>
            Unlimited re-downloads from your library, for as long as you have an
            account.
          </li>
          <li>
            A commercial licence to stitch and sell finished items, with no
            per-item royalty.
          </li>
        </ul>
        <p>
          There are no delivery charges, because nothing is delivered physically.
        </p>
      </Section>

      <Section heading="Custom digitizing">
        <p>
          Custom work is priced per job, because the effort depends entirely on
          the artwork — a simple wordmark and a photorealistic portrait are not
          the same piece of work. Send us the artwork and we quote before any
          payment is taken. Most quotes come back within one working day, and you
          are free to decline at no cost.
        </p>
      </Section>

      <Section heading="Taxes">
        <p>
          Prices are shown inclusive of any tax that applies. You will not find
          an extra amount added at the payment step.
        </p>
      </Section>

      <Section heading="Payment methods">
        <p>
          Paying in rupees goes through Razorpay, which accepts cards, UPI,
          netbanking and wallets. Paying in dollars goes through PayPal, which
          accepts PayPal balances and cards without needing a PayPal account.
          Card details are handled by those providers and never reach{" "}
          {BUSINESS.brand}.
        </p>
        <p>
          <Link href="/" className="text-[#0a66c2] hover:underline">
            Browse the designs
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
