// Tajima DST files open with a 512-byte ASCII header describing the design.
// It is the most reliable spec source available: every product ships a DST,
// and unlike the PDF it is machine data rather than a picture of the design.
//
//   LA:Ironman         \r    label
//   ST: 207416\r             stitch count
//   CO:  5\r                 colour changes
//   +X: 1306\r-X: 1306\r     horizontal extents, in 0.1 mm from centre
//   +Y: 1779\r-Y: 1779\r     vertical extents

const FIELD = {
  stitches: /ST:\s*(\d+)/,
  colorChanges: /CO:\s*(\d+)/,
  xPlus: /\+X:\s*(\d+)/,
  xMinus: /-X:\s*(\d+)/,
  yPlus: /\+Y:\s*(\d+)/,
  yMinus: /-Y:\s*(\d+)/,
  label: /LA:(.{0,16}?)\s*\r/,
};

/** Reads the header of a DST buffer. Returns null if it is not a DST. */
export function parseDstHeader(buf) {
  const head = buf.subarray(0, 512).toString('latin1');
  if (!head.startsWith('LA:')) return null;

  const num = (re) => {
    const m = head.match(re);
    return m ? Number(m[1]) : null;
  };

  const xPlus = num(FIELD.xPlus);
  const xMinus = num(FIELD.xMinus);
  const yPlus = num(FIELD.yPlus);
  const yMinus = num(FIELD.yMinus);
  const stitches = num(FIELD.stitches);
  const colorChanges = num(FIELD.colorChanges);

  const mm = (a, b) => (a === null || b === null ? null : (a + b) / 10);

  return {
    label: (head.match(FIELD.label)?.[1] ?? '').trim(),
    stitches,
    // CO counts colour CHANGES, not distinct threads, and the two differ:
    // Eat What is CO=10 but its Wilcom sheet says 5 thread colours (a
    // palette gets reused across blocks). Never quote this as "colors" —
    // that number only comes from the Wilcom production sheet.
    colorChanges,
    widthMm: mm(xPlus, xMinus),
    heightMm: mm(yPlus, yMinus),
  };
}
