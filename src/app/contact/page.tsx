import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/lib/business";
import LegalPage, { Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Contact Us — Digitizing Market",
  description:
    "How to reach Digitizing Market about an order, a file that will not open, or custom digitizing work.",
};

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact Us"
      intro="A real person answers, usually within one working day."
    >
      <Section heading="Email">
        <p>
          <a
            className="text-[17px] font-semibold text-[#0a66c2] hover:underline"
            href={`mailto:${BUSINESS.email}`}
          >
            {BUSINESS.email}
          </a>
        </p>
        <p>
          The best route for anything about an order. Include the email address
          you bought under and the name of the design, and we can find it
          immediately.
        </p>
      </Section>

      <Section heading="Phone">
        <p>
          <a
            className="text-[17px] font-semibold text-[#0a66c2] hover:underline"
            href={`tel:${BUSINESS.phoneHref}`}
          >
            {BUSINESS.phone}
          </a>
        </p>
        <p>Monday to Saturday, 10am to 7pm IST.</p>
      </Section>

      <Section heading="Address">
        <p>
          {BUSINESS.legalName}
          <br />
          {BUSINESS.city}, {BUSINESS.state}
          <br />
          {BUSINESS.country}
        </p>
        <p>
          We are a digital business and do not operate a walk-in counter, so
          please email or call rather than visiting.
        </p>
      </Section>

      <Section heading="Custom digitizing">
        <p>
          For custom work, the quote form on the shop is faster than email — it
          takes your artwork and the size, format and placement together, so we
          can quote without a round of questions. Open{" "}
          <Link href="/" className="text-[#0a66c2] hover:underline">
            the shop
          </Link>{" "}
          and choose Custom Digitizing from the dock.
        </p>
      </Section>

      <Section heading="A file will not open">
        <p>
          Tell us which design and which machine. Nine times in ten it is the
          wrong format for the brand, or the file sitting inside a folder on the
          USB stick rather than at its root — both of which we can sort out in
          one reply. If it is our mistake, we repair the file or refund you in
          full.
        </p>
      </Section>
    </LegalPage>
  );
}
