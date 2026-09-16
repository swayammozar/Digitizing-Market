import Image from "next/image";
import Link from "next/link";
import { BUSINESS, POLICY_UPDATED } from "@/lib/business";

/**
 * The frame every policy page sits in.
 *
 * Deliberately not the glass desktop. These pages exist to be read by three
 * audiences who all want the same thing — a payment provider verifying the
 * business, a search engine indexing it, and a customer checking what happens
 * if a file will not open — and all three are served by plain, high-contrast
 * text at a comfortable measure.
 *
 * Server-rendered with no client JavaScript, so the content is present in the
 * HTML itself. The shop's policies were previously reachable only by clicking
 * through a JavaScript desktop, which meant a reviewer looking for a privacy
 * policy found a wallpaper.
 */
/**
 * `label` is the full name a payment reviewer looks for; `short` is the same
 * link squeezed into the desktop's bottom corner, where the centred dock
 * leaves little room.
 */
export const LEGAL_PAGES = [
  { href: "/terms", label: "Terms & Conditions", short: "Terms" },
  { href: "/privacy", label: "Privacy Policy", short: "Privacy" },
  { href: "/refunds", label: "Refunds & Cancellation", short: "Refunds" },
  { href: "/pricing", label: "Pricing", short: "Pricing" },
  { href: "/contact", label: "Contact Us", short: "Contact" },
] as const;

export default function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-[#f7f6f3] text-[#1c1c1e]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-[760px] items-center gap-3 px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/icon.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg"
            />
            <span className="text-[15px] font-semibold">{BUSINESS.brand}</span>
          </Link>
          <Link
            href="/"
            className="ml-auto text-[13px] text-[#0a66c2] underline-offset-2 hover:underline"
          >
            Back to the shop
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-6 py-10">
        <h1 className="text-[30px] font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-[13px] text-black/50">
          Last updated {POLICY_UPDATED}
        </p>
        {intro && (
          <p className="mt-5 text-[15px] leading-relaxed text-black/70">{intro}</p>
        )}

        <div className="mt-8 space-y-7">{children}</div>

        <section className="mt-12 rounded-xl border border-black/10 bg-white p-5">
          <h2 className="text-[15px] font-semibold">Business details</h2>
          <dl className="mt-3 space-y-1.5 text-[14px] leading-relaxed text-black/70">
            <div>
              <dt className="inline font-medium text-black/80">Registered name: </dt>
              <dd className="inline">{BUSINESS.legalName}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-black/80">Trading as: </dt>
              <dd className="inline">{BUSINESS.brand}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-black/80">Address: </dt>
              <dd className="inline">
                {BUSINESS.city}, {BUSINESS.state}, {BUSINESS.country}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-black/80">Email: </dt>
              <dd className="inline">
                <a className="text-[#0a66c2] hover:underline" href={`mailto:${BUSINESS.email}`}>
                  {BUSINESS.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-black/80">Phone: </dt>
              <dd className="inline">
                <a className="text-[#0a66c2] hover:underline" href={`tel:${BUSINESS.phoneHref}`}>
                  {BUSINESS.phone}
                </a>
              </dd>
            </div>
          </dl>
        </section>
      </main>

      <footer className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[760px] px-6 py-6">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            {LEGAL_PAGES.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="text-black/60 underline-offset-2 hover:text-black hover:underline"
              >
                {page.label}
              </Link>
            ))}
          </nav>
          <p className="mt-4 text-[12.5px] text-black/45">
            © {new Date().getFullYear()} {BUSINESS.legalName}. {BUSINESS.brand} sells
            digital machine embroidery designs. Nothing is shipped physically.
          </p>
        </div>
      </footer>
    </div>
  );
}

/** A titled block of prose, so each page reads as a sequence of answers. */
export function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[17px] font-semibold">{heading}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-black/70">
        {children}
      </div>
    </section>
  );
}
