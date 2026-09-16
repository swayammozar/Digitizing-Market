import Link from "next/link";
import { LEGAL_PAGES } from "../legal/LegalPage";
import { BUSINESS } from "@/lib/business";

/**
 * Policy links, on the desktop itself.
 *
 * A macOS desktop has no footer, and this is the one concession to not being
 * one. It has to exist and has to be visible: payment providers verify a shop
 * by looking for these pages, and a reviewer who opens the site and finds a
 * wallpaper with app icons has no way to reach policies that live behind a
 * double-click. Search engines have the same problem.
 *
 * Rendered on the server with real anchors, so the links are in the HTML rather
 * than appearing once JavaScript has run. Kept to the bottom-left corner, away
 * from the centred dock, at a size that reads as a system watermark rather than
 * as chrome.
 */
export default function DesktopFooter() {
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-[8000] px-4 pb-3">
      <nav
        aria-label="Legal and company information"
        className="desktop-label pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-white/65"
        /**
         * The dock is centred and roughly 390px wide, so a percentage width
         * clears it on a wide screen and runs underneath it on a narrow one.
         * Measuring from the centre outwards instead keeps a constant gap at
         * every size: half the viewport, less half the dock, less breathing
         * room. The floor stops it collapsing to nothing on a small laptop —
         * the links wrap onto a second line rather than disappearing.
         */
        style={{ maxWidth: "max(150px, calc(50vw - 230px))" }}
      >
        {LEGAL_PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            // The full name is what a reviewer scans for, so it stays in the
            // markup even though the corner shows the short one.
            aria-label={page.label}
            className="underline-offset-2 transition-colors hover:text-white hover:underline"
          >
            {page.short}
          </Link>
        ))}
        <span className="text-white/40">
          © {new Date().getFullYear()} {BUSINESS.legalName}
        </span>
      </nav>
    </footer>
  );
}
