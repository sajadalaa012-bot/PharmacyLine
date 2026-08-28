// Turns the supplied AL-MASA logo (dark artwork on a white square, with a lot
// of empty margin) into two web-ready marks:
//
//   almasa-logo.png       cropped to the artwork, white knocked out
//   almasa-logo-dark.png  the same, with the near-black wordmark lifted to
//                         cream so it stays readable on the dark theme
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

const { data, info } = await sharp(SOURCE)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const light = Buffer.from(data);
const dark = Buffer.from(data);

let minX = width;
let minY = height;
let maxX = -1;
let maxY = -1;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightest = Math.max(r, g, b);

    // Anti-aliased edges sit between the two thresholds and keep a partial
    // alpha, so the mark doesn't come out with a jagged white fringe.
    let alpha = 255;
    if (brightest >= CLEAR_ABOVE) alpha = 0;
    else if (brightest > OPAQUE_BELOW) {
      alpha = Math.round(((CLEAR_ABOVE - brightest) / (CLEAR_ABOVE - OPAQUE_BELOW)) * 255);
    }
    alpha = Math.min(alpha, data[i + 3]);
    light[i + 3] = alpha;
    dark[i + 3] = alpha;

    if (alpha > 16) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    // Dark theme: only the near-neutral black wordmark is repainted — the gold
    // diamond and Arabic line already read well against a dark surface.
    const neutral = brightest - Math.min(r, g, b) < 26;
    if (alpha > 0 && neutral && brightest < 120) {
      const mix = 1 - brightest / 120; // deepest black gets the full cream
      dark[i] = Math.round(r + (DARK_INK[0] - r) * mix);
      dark[i + 1] = Math.round(g + (DARK_INK[1] - g) * mix);
      dark[i + 2] = Math.round(b + (DARK_INK[2] - b) * mix);
    }
  }
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
