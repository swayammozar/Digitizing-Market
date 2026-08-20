"use client";

import Image from "next/image";
import { useState } from "react";
import { bySlug, mediaUrl } from "@/lib/catalog";
import { type WindowState } from "@/lib/windows";
import WindowFrame from "./WindowFrame";

const FORMATS = ["DST", "PES", "JEF", "VP3", "EXP", "Not sure"];
const PLACEMENTS = [
  "Left chest",
  "Full back",
  "Cap front",
  "Sleeve",
  "Tote or bag",
  "Something else",
];

export default function ServiceWindow({ win }: { win: WindowState }) {
  const product = bySlug("custom-digitizing");
  const [sent, setSent] = useState(false);
  const [file, setFile] = useState<string | null>(null);

  return (
    <WindowFrame win={win} subtitle="Your artwork, digitized for embroidery">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <div className="scroll-thin overflow-auto p-5">
          <h3 className="text-[18px] font-semibold text-[color:var(--label-on-panel)]">
            Send us artwork, get back a stitch file
          </h3>
          <p className="mt-2 max-w-[54ch] text-[13px] leading-relaxed text-[color:var(--label-on-panel-secondary)]">
            A logo, a drawing, a photo of a patch — anything you want stitched.
            We digitize it by hand, not by auto-trace, and send back every
            machine format with a colour chart. Most jobs come back within 24
            hours.
          </p>

          {product && (
            <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {product.media.images.map((src, i) => (
                <li key={src}>
                  <Image
                    src={mediaUrl(src)}
                    alt={`Digitizing sample ${i + 1}`}
                    width={400}
                    height={400}
                    className="aspect-square w-full rounded-lg object-cover shadow-[0_2px_8px_rgba(0,0,0,.16)]"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="scroll-thin overflow-auto border-l border-black/10 bg-white/30 p-5">
          {sent ? (
            <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[color:var(--color-system-green)]/20">
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
                  <path
                    d="m4.5 10.5 3.5 3.5 7.5-8"
                    stroke="var(--color-system-green)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </span>
              <p className="text-[14px] font-semibold text-[color:var(--label-on-panel)]">
                Request received
              </p>
              <p className="max-w-[30ch] text-[12.5px] text-[color:var(--label-on-panel-secondary)]">
                We&rsquo;ll email you a quote within one working day.
              </p>
            </div>
          ) : (
            <form
              className="space-y-3.5"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <Field label="Your email">
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="dm-input"
                />
              </Field>

              {/* Not wrapped in Field: the control is itself a label, and a
                  label inside a label is invalid. */}
              <label className="block cursor-pointer">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--label-on-panel-secondary)]">
                  Artwork
                </span>
                <span className="flex items-center gap-2.5 rounded-lg border border-dashed border-black/25 px-3 py-2.5 text-[12.5px] text-[color:var(--label-on-panel-secondary)] transition-colors hover:border-[color:var(--color-system-blue)] hover:text-[color:var(--label-on-panel)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="shrink-0">
                    <path
                      d="M12 16V4m0 0 4 4m-4-4L8 8M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                  <span className="truncate">
                    {file ?? "Choose a file — PNG, JPG, SVG, PDF or AI"}
                  </span>
                </span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,.pdf,.ai,.eps"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Width (mm)">
                  <input
                    type="number"
                    min={10}
                    max={400}
                    placeholder="90"
                    className="dm-input tabular"
                  />
                </Field>
                <Field label="Format">
                  <select className="dm-input" defaultValue="DST">
                    {FORMATS.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Placement">
                <select className="dm-input" defaultValue="Left chest">
                  {PLACEMENTS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>

              <Field label="Anything we should know">
                <textarea
                  rows={3}
                  placeholder="Thread colours to match, deadline, fabric…"
                  className="dm-input resize-none"
                />
              </Field>

              <button
                type="submit"
                className="w-full rounded-lg bg-[color:var(--color-hanko)] px-4 py-2.5 text-[14px] font-semibold text-white transition-[filter,transform] hover:brightness-110 active:scale-[.99]"
              >
                Request a quote
              </button>
              <p className="text-center text-[11.5px] text-[color:var(--label-on-panel-secondary)]">
                No payment now. We quote first, you decide after.
              </p>
            </form>
          )}
        </div>
      </div>
    </WindowFrame>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--label-on-panel-secondary)]">
        {label}
      </span>
      {children}
    </label>
  );
}
