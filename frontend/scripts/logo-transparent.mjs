// Turns the supplied AL-MASA logo (dark artwork on a white square, with a lot
// of empty margin) into two web-ready marks:
//
//   almasa-logo.png       cropped to the artwork, white knocked out
//   almasa-logo-dark.png  the same, with the near-black wordmark lifted to
//                         cream so it stays readable on the dark theme
//
// The supplied artwork sets "AL-MASA" over an Arabic subtitle. The shop wants
// the Latin wordmark alone, so the subtitle is dropped here rather than by
// hand-editing the output: the source file stays the one place the logo is
// defined, and re-running this reproduces both marks exactly.
//
// Run from frontend/:  node scripts/logo-transparent.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(here, "..", "public", "icons", "almasa-logo-source.png");
const OUT = path.join(here, "..", "public", "icons", "almasa-logo.png");
const OUT_DARK = path.join(here, "..", "public", "icons", "almasa-logo-dark.png");

// White below this is fully opaque artwork; above it, fully transparent page.
const OPAQUE_BELOW = 232;
const CLEAR_ABOVE = 248;
// Cream the wordmark becomes on the dark theme (--color-ink, dark shop).
const DARK_INK = [242, 237, 227];
// A vertical run of this many blank rows separates one line of text from the
// next. The gap between the wordmark and the subtitle is ~32px.
const LINE_GAP = 8;

const { data, info } = await sharp(SOURCE)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const light = Buffer.from(data);
const dark = Buffer.from(data);
const alpha = new Uint8Array(width * height);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightest = Math.max(r, g, b);

    // Anti-aliased edges sit between the two thresholds and keep a partial
    // alpha, so the mark doesn't come out with a jagged white fringe.
    let a = 255;
    if (brightest >= CLEAR_ABOVE) a = 0;
    else if (brightest > OPAQUE_BELOW) {
      a = Math.round(((CLEAR_ABOVE - brightest) / (CLEAR_ABOVE - OPAQUE_BELOW)) * 255);
    }
    a = Math.min(a, data[i + 3]);
    light[i + 3] = a;
    dark[i + 3] = a;
    alpha[y * width + x] = a;

    // Dark theme: only the near-neutral black wordmark is repainted — the gold
    // diamond already reads well against a dark surface.
    const neutral = brightest - Math.min(r, g, b) < 26;
    if (a > 0 && neutral && brightest < 120) {
      const mix = 1 - brightest / 120; // deepest black gets the full cream
      dark[i] = Math.round(r + (DARK_INK[0] - r) * mix);
      dark[i + 1] = Math.round(g + (DARK_INK[1] - g) * mix);
      dark[i + 2] = Math.round(b + (DARK_INK[2] - b) * mix);
    }
  }
}

const inked = (x, y) => alpha[y * width + x] > 16;

/** Runs of rows or columns carrying ink, split wherever `minGap` blanks appear. */
function bands(profile, minGap) {
  const out = [];
  let start = null;
  let gap = 0;
  for (let i = 0; i < profile.length; i++) {
    if (profile[i] > 0) {
      if (start === null) start = i;
      gap = 0;
    } else if (start !== null) {
      gap++;
      if (gap >= minGap) {
        out.push([start, i - gap]);
        start = null;
        gap = 0;
      }
    }
  }
  if (start !== null) out.push([start, profile.length - 1 - gap]);
  return out;
}

// ── Find the three elements: diamond | divider | text ───────────────
// They are separated by wide vertical gutters, so a column profile splits
// them without needing any hard-coded coordinates.
const colInk = new Array(width).fill(0);
for (let x = 0; x < width; x++)
  for (let y = 0; y < height; y++) if (inked(x, y)) colInk[x]++;

const columns = bands(colInk, 12);
if (columns.length < 3)
  throw new Error(
    `Expected diamond, divider and text in the source; found ${columns.length} column groups.`,
  );
const [diamondCols, , ] = columns;
// Everything from the gutter after the divider rightwards is the text block.
const textX0 = columns[1][1] + 1;

/** The vertical extent of whatever has ink in a column range. */
function verticalExtent(x0, x1) {
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y++)
    for (let x = x0; x <= x1; x++)
      if (inked(x, y)) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        break;
      }
  return { top, bottom, centre: (top + bottom) / 2 };
}

// ── Drop the subtitle and re-centre the wordmark ─────────────────────
const textRowInk = new Array(height).fill(0);
for (let y = 0; y < height; y++)
  for (let x = textX0; x < width; x++) if (inked(x, y)) textRowInk[y]++;

const lines = bands(textRowInk, LINE_GAP);
if (lines.length > 1) {
  // The wordmark is the top line; everything under it is subtitle.
  const [wordTop, wordBottom] = lines[0];

  // The diamond and the divider share a centre line. With the subtitle gone
  // the wordmark has to come down onto it, or it floats above the mark it is
  // set against.
  const diamond = verticalExtent(diamondCols[0], diamondCols[1]);
  const shift = Math.round(diamond.centre - (wordTop + wordBottom) / 2);

  // Lift the wordmark out, wipe the whole text column, put it back lower.
  const rowBytes = (width - textX0) * channels;
  const keepLight = Buffer.alloc((wordBottom - wordTop + 1) * rowBytes);
  const keepDark = Buffer.alloc((wordBottom - wordTop + 1) * rowBytes);
  for (let y = wordTop; y <= wordBottom; y++) {
    const from = (y * width + textX0) * channels;
    const to = (y - wordTop) * rowBytes;
    light.copy(keepLight, to, from, from + rowBytes);
    dark.copy(keepDark, to, from, from + rowBytes);
  }

  for (let y = 0; y < height; y++)
    for (let x = textX0; x < width; x++) {
      const i = (y * width + x) * channels;
      light[i + 3] = 0;
      dark[i + 3] = 0;
      alpha[y * width + x] = 0;
    }

  for (let y = wordTop; y <= wordBottom; y++) {
    const dest = y + shift;
    if (dest < 0 || dest >= height) continue;
    const from = (y - wordTop) * rowBytes;
    const to = (dest * width + textX0) * channels;
    keepLight.copy(light, to, from, from + rowBytes);
    keepDark.copy(dark, to, from, from + rowBytes);
    for (let x = textX0; x < width; x++)
      alpha[dest * width + x] = light[(dest * width + x) * channels + 3];
  }

  console.log(
    `dropped ${lines.length - 1} subtitle line(s); ` +
      `moved the wordmark ${shift}px onto the diamond's centre line`,
  );
}

// ── Crop to what is left ────────────────────────────────────────────
let minX = width;
let minY = height;
let maxX = -1;
let maxY = -1;
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++)
    if (inked(x, y)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

const pad = 4;
const left = Math.max(0, minX - pad);
const top = Math.max(0, minY - pad);
const region = {
  left,
  top,
  width: Math.min(width - left, maxX - minX + 1 + pad * 2),
  height: Math.min(height - top, maxY - minY + 1 + pad * 2),
};

const raw = { raw: { width, height, channels } };
await sharp(light, raw).extract(region).png().toFile(OUT);
await sharp(dark, raw).extract(region).png().toFile(OUT_DARK);

console.log(
  `source ${width}×${height} → crop ${region.width}×${region.height} ` +
  `(ratio ${(region.width / region.height).toFixed(2)}:1)`
);
