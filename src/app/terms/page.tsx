import type { Metadata } from "next";
import { BUSINESS } from "@/lib/business";
import LegalPage, { Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms & Conditions — Digitizing Market",
  description:
    "The terms for buying machine embroidery designs from Digitizing Market, including what a licence allows and what it does not.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      intro={`These terms govern your use of ${BUSINESS.domain} and anything you buy from it. ${BUSINESS.brand} is operated by ${BUSINESS.legalName}, ${BUSINESS.city}, ${BUSINESS.state}, ${BUSINESS.country}. By buying a design you agree to them.`}
    >
      <Section heading="What we sell">
        <p>
          We sell digital machine embroidery designs. Each purchase is a set of
          stitch files — DST, PES, JEF, VP3, EXP and others depending on the
          design — together with a PDF colour chart, delivered as a single zip
          you download from this site.
        </p>
        <p>
          <strong>Nothing physical is shipped.</strong> You are not buying a
          patch, a garment or a printed item, and no parcel will arrive. You are
          buying files that instruct an embroidery machine.
        </p>
      </Section>

      <Section heading="Your licence">
        <p>When you buy a design, you may:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Stitch it onto items you sell, in any quantity, without paying us
            again or reporting sales to us.
          </li>
          <li>Use it for client work and commissions.</li>
          <li>
            Recolour it, and resize it within the limits the design allows.
            Large changes need re-digitizing, because stitch density does not
            scale.
          </li>
          <li>Use it on as many of your own machines as you like.</li>
        </ul>
        <p>You may not:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Resell, share, gift or redistribute the digital file itself, in any
            format, including as part of a bundle, pack or membership.
          </li>
          <li>Upload it to a file-sharing service or another marketplace.</li>
          <li>
            Claim authorship of the design, or register it as your own
            intellectual property.
          </li>
        </ul>
        <p>
          The licence covers what you stitch, not the file. Copyright in every
          design remains with {BUSINESS.legalName}.
        </p>
      </Section>

      <Section heading="One buyer, one licence">
        <p>
          A licence belongs to the account that bought it. A studio running
          several machines is one buyer. Several separate businesses sharing one
          download are not, and each needs its own licence.
        </p>
      </Section>

      <Section heading="Your account">
        <p>
          Buying requires an account, because your designs are kept in a library
          you can return to. Keep your password to yourself — anyone who signs in
          as you can download everything you have bought. Tell us promptly if you
          think someone else has access.
        </p>
      </Section>

      <Section heading="Payment">
        <p>
          Payments are handled by PayPal or Razorpay depending on your currency.
          We never see or store your card details. Prices are shown before you
          pay and include all charges; your bank or card issuer may separately
          apply a currency conversion fee we have no part in.
        </p>
      </Section>

      <Section heading="Custom digitizing">
        <p>
          Custom work is quoted individually before any payment is taken. When
          you send artwork you confirm you have the right to have it digitized.
          We do not check ownership of artwork customers supply, and we are not
          responsible for infringement arising from artwork you send us.
        </p>
      </Section>

      <Section heading="What we do not promise">
        <p>
          Every design is test-stitched before it is listed. Even so, results
          vary with your machine, stabiliser, thread, tension and fabric, and we
          cannot guarantee a particular outcome on a particular material. We
          strongly recommend stitching a test on a scrap of the same fabric
          before committing to a finished garment.
        </p>
        <p>
          Our liability for any claim relating to a design is limited to what you
          paid for that design.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          We may update these terms. The version in force is the one published
          here on the day you buy, and the date at the top of this page tells you
          when it last changed.
        </p>
      </Section>

      <Section heading="Governing law">
        <p>
          These terms are governed by the laws of {BUSINESS.country}, and the
          courts of {BUSINESS.city}, {BUSINESS.state} have jurisdiction over any
          dispute arising from them.
        </p>
      </Section>
    </LegalPage>
  );
}
