"use client";

import { designs } from "@/lib/catalog";
import { type WindowState } from "@/lib/windows";
import WindowFrame from "./WindowFrame";

interface Page {
  subtitle: string;
  blocks: { heading?: string; body: string }[];
}

const PAGES: Record<string, Page> = {
  about: {
    subtitle: "Digitizing Market",
    blocks: [
      {
        body: `We digitize embroidery designs by hand. Every file in this shop was punched stitch by stitch, test-stitched on a real machine, and photographed on real fabric — no auto-traced vectors, no untested files.`,
      },
      {
        heading: "What you get",
        body: `A zip with every common machine format, both sizes where the design has two, and a PDF colour chart listing the threads in stitching order. Download it the moment you pay, and again whenever you need it.`,
      },
      {
        heading: "What this is not",
        body: `These are stitch files, not patches or finished garments. Nothing is posted to you.`,
      },
    ],
  },
  licence: {
    subtitle: "What you may do with a design",
    blocks: [
      {
        heading: "You may",
        body: `Stitch the design onto items you sell, on any scale, without paying us again. Use it for client work. Change its colours and resize it within reason.`,
      },
      {
        heading: "You may not",
        body: `Resell, share or give away the digital file itself, in any format, including as part of a bundle or a design pack. The licence covers what you stitch, not the file.`,
      },
      {
        heading: "One buyer, one licence",
        body: `The licence belongs to the account that bought it. A studio with several machines is fine; several businesses sharing one download is not.`,
      },
    ],
  },
  formats: {
    subtitle: "Which file your machine needs",
    blocks: [
      {
        body: `Every design ships with all of these, so you do not have to know the answer before you buy.`,
      },
      {
        heading: "Brother, Babylock, Bernina Deco",
        body: `Use PES. If your machine is older and refuses it, use DST.`,
      },
      {
        heading: "Tajima, Barudan, Melco, most commercial machines",
        body: `Use DST. It carries no colour information, which is why the PDF chart is included.`,
      },
      {
        heading: "Husqvarna Viking, Pfaff",
        body: `Use VP3.`,
      },
      {
        heading: "Janome, Elna, Kenmore",
        body: `Use JEF.`,
      },
    ],
  },
  howto: {
    subtitle: "From download to stitched",
    blocks: [
      {
        heading: "1. Unzip it",
        body: `Open the zip and find the folder for your format. Copy that single file to a USB stick or send it to your machine directly.`,
      },
      {
        heading: "2. Hoop and stabilise",
        body: `Match the stabiliser to the fabric, not to the design: cut-away for knits and anything stretchy, tear-away for woven fabric like denim or canvas.`,
      },
      {
        heading: "3. Follow the colour chart",
        body: `The PDF lists thread colours in the order the machine will ask for them. Designs with a DST file rely on it entirely, since DST stores no colours.`,
      },
      {
        heading: "4. Test first",
        body: `Stitch once on a scrap of the same fabric before you commit to the finished garment. It takes ten minutes and saves a hoodie.`,
      },
    ],
  },
  faq: {
    subtitle: "Common questions",
    blocks: [
      {
        heading: "How soon do I get the files?",
        body: `Immediately. The download appears as soon as payment clears, and stays in My Downloads for good.`,
      },
      {
        heading: "Can you resize a design for me?",
        body: `Large changes need re-digitizing, because stitch density does not scale. Send us a message and we will re-punch it properly.`,
      },
      {
        heading: "My machine will not read the file",
        body: `Check you are using the right format for your brand, and that the file sits in the root folder of the USB stick rather than inside a folder. If it still fails, email us and we will convert it.`,
      },
      {
        heading: "Do you take custom work?",
        body: `Yes — open Custom Digitizing in the dock. Send artwork, get a quote, usually within a day.`,
      },
    ],
  },
  refunds: {
    subtitle: "Digital files, so read this first",
    blocks: [
      {
        body: `Because a design is delivered instantly and cannot be returned once downloaded, we do not offer refunds simply for a change of mind.`,
      },
      {
        heading: "We will always fix a broken file",
        body: `If a design will not open, is missing a format, or does not stitch out as shown, tell us. We will repair it, re-punch it, or refund you in full.`,
      },
      {
        heading: "Bought the same design twice?",
        body: `Email us and we will refund the duplicate. Your library will not show it twice.`,
      },
    ],
  },
  contact: {
    subtitle: "Talk to a person",
    blocks: [
      {
        body: `Questions about a design, a machine that will not cooperate, or custom work — email hello@digitizingmarket.com and you will hear back within a day.`,
      },
      {
        heading: "Custom digitizing",
        body: `Open Custom Digitizing in the dock and send the artwork with your request. It reaches us with the details already attached, which is faster than email.`,
      },
    ],
  },
};

export default function InfoWindow({ win }: { win: WindowState }) {
  const page = PAGES[win.target];

  if (!page) {
    return (
      <WindowFrame win={win}>
        <p className="p-8 text-[13px] text-[color:var(--label-on-panel-secondary)]">
          This page has not been written yet.
        </p>
      </WindowFrame>
    );
  }

  return (
    <WindowFrame win={win} subtitle={page.subtitle}>
      <article className="mx-auto max-w-[62ch] p-7">
        {page.blocks.map((block, i) => (
          <section key={i} className={i > 0 ? "mt-5" : undefined}>
            {block.heading && (
              <h3 className="mb-1.5 text-[13.5px] font-semibold text-[color:var(--label-on-panel)]">
                {block.heading}
              </h3>
            )}
            <p className="text-[13px] leading-relaxed text-[color:var(--label-on-panel-secondary)]">
              {block.body}
            </p>
          </section>
        ))}

        {win.target === "about" && (
          <p className="tabular mt-6 border-t border-black/10 pt-4 text-[12px] text-[color:var(--label-on-panel-secondary)]">
            {designs.length} designs in the shop today.
          </p>
        )}
      </article>
    </WindowFrame>
  );
}
