/**
 * Wilcom production sheets name thread colours rather than numbering them, so
 * the catalog carries names like "EmeraldBlack". These are the 21 names that
 * actually appear across the shop's designs, matched to embroidery floss
 * rather than to web colours — machine thread is duller and deeper than sRGB
 * primaries, and swatches drawn with `red` or `cyan` look like nothing on a
 * spool.
 */
const THREAD: Record<string, string> = {
  Black: "#1a1a1a",
  White: "#f5f3ee",
  Grey: "#8e8e93",
  Red: "#c8102e",
  DarkRed: "#7b1e28",
  Pink: "#f06e9e",
  Magenta: "#c6297e",
  Purple: "#6b3fa0",
  Blue: "#1b5fbf",
  DarkBlue: "#12305e",
  PowderBlue: "#a8c8e0",
  Cyan: "#17b6d6",
  Turquoise: "#12a594",
  Green: "#2e9e4f",
  DarkGreen: "#1b5e38",
  EmeraldBlack: "#123328",
  Yellow: "#f2c230",
  Orange: "#ee7623",
  Brown: "#6b4326",
  Khaki: "#9a8b5e",
  Sand: "#d9c49a",
};

/** Mid grey for a name we have not mapped, so a new design still renders. */
const FALLBACK = "#9b9b9f";

export function threadHex(name: string): string {
  return THREAD[name] ?? FALLBACK;
}

/** "EmeraldBlack" -> "Emerald black", for the swatch tooltip. */
export function threadLabel(name: string): string {
  const spaced = name.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}
