import type { Metadata } from "next";
import { BUSINESS } from "@/lib/business";
import LegalPage, { Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Refunds & Cancellation — Digitizing Market",
  description:
    "When Digitizing Market refunds a purchase, how long it takes, and how to ask.",
};

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refunds & Cancellation"
      intro="Designs are delivered instantly and cannot be returned once downloaded, so this page sets out plainly when we do refund — which is more often than the first sentence suggests."
    >
      <Section heading="Cancellation">
        <p>
          A purchase completes the moment payment clears and the files become
          available, so there is no delivery window in which to cancel. You can
          remove anything from your cart before paying.
        </p>
        <p>
          Custom digitizing is different: it is quoted first, and you can decline
          the quote at no cost. Once you accept and work begins, cancellation is
          only possible before the digitized file is sent to you.
        </p>
      </Section>

      <Section heading="When we refund in full">
        <p>We refund, without argument, if:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>A file will not open, is corrupt, or the download fails and we cannot fix it.</li>
          <li>A format listed on the product page is missing from the zip.</li>
          <li>
            The design does not stitch out as shown — not variation from your
            fabric or thread, but the design itself being wrong.
          </li>
          <li>You were charged twice, or charged for something you did not buy.</li>
          <li>You bought the same design twice by mistake.</li>
        </ul>
        <p>
          In most of these cases we would rather fix the file than take your
          money back, and usually can within a day. If you would still prefer a
          refund after that, you get one.
        </p>
      </Section>

      <Section heading="When we do not refund">
        <p>
          We do not refund simply for a change of mind after downloading, because
          the file cannot be returned and you still have it. We also cannot
          refund because a design did not suit your fabric, your machine was set
          up differently than expected, or the finished result did not match what
          you pictured — every listing shows the real stitch-out, the exact
          dimensions and the stitch count before you buy.
        </p>
        <p>
          If you have not downloaded the design and tell us promptly, we will
          usually refund anyway. Ask.
        </p>
      </Section>

      <Section heading="How to ask">
        <p>
          Email{" "}
          <a className="text-[#0a66c2] hover:underline" href={`mailto:${BUSINESS.email}`}>
            {BUSINESS.email}
          </a>{" "}
          with the email address you bought under and the name of the design. A
          photo of the stitch-out helps enormously if something went wrong on the
          machine.
        </p>
        <p>
          We reply within one working day, and decide within three.
        </p>
      </Section>

      <Section heading="How long a refund takes">
        <p>
          Once approved, we issue the refund immediately to the original payment
          method. It then takes as long as the provider takes — typically 5 to 7
          working days for Razorpay, and up to 10 for PayPal, depending on your
          bank. We have no way to speed that up once it has left our side.
        </p>
      </Section>
    </LegalPage>
  );
}
