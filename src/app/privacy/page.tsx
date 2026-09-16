import type { Metadata } from "next";
import { BUSINESS } from "@/lib/business";
import LegalPage, { Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Digitizing Market",
  description:
    "What Digitizing Market collects, why, who it is shared with, and how to have it deleted.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`This explains what ${BUSINESS.brand} collects about you, why, and what you can ask us to do with it. We are ${BUSINESS.legalName}, ${BUSINESS.city}, ${BUSINESS.state}, ${BUSINESS.country}, and we are responsible for the information described here.`}
    >
      <Section heading="What we collect">
        <p>
          <strong>When you browse.</strong> Nothing that identifies you. You can
          look at every design without an account. Your browser stores your cart
          and your currency choice on your own device, and that never reaches us
          until you check out.
        </p>
        <p>
          <strong>When you create an account.</strong> Your email address and a
          password, which is stored hashed — we cannot read it.
        </p>
        <p>
          <strong>When you buy.</strong> What you bought, what you paid, the
          currency, and the payment provider&rsquo;s reference for the
          transaction. <strong>We never receive your card details.</strong> Those
          go directly to PayPal or Razorpay and are never on our servers.
        </p>
        <p>
          <strong>When you request custom digitizing.</strong> Your email, the
          artwork you upload, and the details you type about size, format and
          placement.
        </p>
      </Section>

      <Section heading="Why we hold it">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            To give you the files you paid for, and to keep them available in
            your library afterwards.
          </li>
          <li>To verify a payment before releasing a download.</li>
          <li>To answer you when something goes wrong, or to quote custom work.</li>
          <li>To meet tax and accounting obligations on our sales records.</li>
        </ul>
        <p>
          We do not sell your information, rent it, or use it for advertising
          profiles. We do not send marketing email unless you ask us to.
        </p>
      </Section>

      <Section heading="Who else sees it">
        <p>We use a small number of providers, each for one job:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Supabase</strong> — accounts, order records and file storage.
          </li>
          <li>
            <strong>Vercel</strong> — hosting and delivery of the site.
          </li>
          <li>
            <strong>PayPal</strong> and <strong>Razorpay</strong> — taking
            payment. They handle your card details under their own privacy
            policies, not ours.
          </li>
        </ul>
        <p>
          Beyond these, we share your information only where the law requires it.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p>
          Your account and purchase history stay for as long as you have an
          account, because a library you cannot reach is not a library. Sales
          records are kept as long as tax rules require, even after an account
          closes. Custom digitizing artwork is deleted once the job is finished
          and the quote period has passed.
        </p>
      </Section>

      <Section heading="Cookies and similar storage">
        <p>
          We use no advertising or tracking cookies. The site stores two things
          on your device: a sign-in session so you stay signed in, and your cart
          and currency preference. Clearing your browser storage removes them and
          signs you out.
        </p>
      </Section>

      <Section heading="Your choices">
        <p>You can ask us to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Tell you what we hold about you.</li>
          <li>Correct anything that is wrong.</li>
          <li>
            Delete your account. Note that this removes your library, and the
            designs you bought will no longer be downloadable.
          </li>
        </ul>
        <p>
          Email{" "}
          <a className="text-[#0a66c2] hover:underline" href={`mailto:${BUSINESS.email}`}>
            {BUSINESS.email}
          </a>{" "}
          and we will respond within 30 days.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          Design files sit in private storage that is not publicly reachable.
          When you download one, the server checks your session, confirms you own
          that design, and issues a link that expires within minutes. Passwords
          are hashed. Payments are verified on our server against the payment
          provider, never on the strength of what a browser claims.
        </p>
        <p>
          No system is perfect. If we ever discover a breach affecting your
          information, we will tell you.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          This shop is not intended for children under 18, and we do not
          knowingly collect their information.
        </p>
      </Section>
    </LegalPage>
  );
}
