// Turns the supplied "velina" logo (a dark script wordmark with a pink leaf,
// set on an off-white square with a lot of empty margin) into the web-ready
// marks:
//
//   velina-logo.png       cropped to the artwork, the paper knocked out
//   velina-logo-dark.png  the same, with the near-black wordmark lifted to
//                         cream so it stays readable on the dark theme
//   icon-192 / icon-512 / icon-512-maskable / apple-touch-icon
//                         the mark centred on the shop's paper colour
//
// The source file stays the one place the logo is defined; re-running this
// reproduces every output exactly.
//
// Run from frontend/:  node scripts/logo-velina.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const icons = path.join(here, "..", "public", "icons");
const SOURCE = path.join(icons, "velina-logo-source.png");

// The artwork's paper is #fbfaf8, so anything this bright is page, not ink.
// Between the two thresholds the edge keeps a partial alpha, so the script's
// hairline strokes don't come out with a jagged white fringe.
const OPAQUE_BELOW = 224;
const CLEAR_ABOVE = 246;
// The darkest pixel in the source — the wordmark's own ink.
const INK_FLOOR = 35;
// Cream the wordmark becomes on the dark theme, over the paper it sits on
// (--color-ink and --color-paper, dark shop).
const DARK_INK = [242, 237, 227];
const DARK_PAPER = [22, 19, 14];
// Where a coloured stroke has feathered this close to the page, the dark cut
// pulls it down to its own paper for the same reason.
const FEATHER_FROM = 205;
// The light shop's paper, behind the mark on the square app icons.
const PAPER = { r: 245, g: 242, b: 236, alpha: 1 };

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

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

    let a = 255;
    if (brightest >= CLEAR_ABOVE) a = 0;
    else if (brightest > OPAQUE_BELOW) {
      a = Math.round(((CLEAR_ABOVE - brightest) / (CLEAR_ABOVE - OPAQUE_BELOW)) * 255);
    }
    a = Math.min(a, data[i + 3]);
    light[i + 3] = a;
    dark[i + 3] = a;
    alpha[y * width + x] = a;

    // Dark theme: the near-neutral lettering is inverted rather than merely
    // tinted. Its own ink becomes cream and its anti-aliased skirt becomes the
    // dark paper, so the strokes stay as smooth on a dark ground as the
    // supplied artwork is on a light one. The pink leaves and the tan stem are
    // left as drawn — they already read well against a dark surface — beyond
    // darkening the near-white pixels where they feather into the page.
    const neutral = brightest - Math.min(r, g, b) < 26;
    if (a > 0 && neutral) {
      const t = clamp01((brightest - INK_FLOOR) / (CLEAR_ABOVE - INK_FLOOR));
      for (let c = 0; c < 3; c++)
        dark[i + c] = Math.round(DARK_INK[c] + (DARK_PAPER[c] - DARK_INK[c]) * t);
    } else if (a > 0 && brightest > FEATHER_FROM) {
      const t = clamp01((brightest - FEATHER_FROM) / (CLEAR_ABOVE - FEATHER_FROM));
      for (let c = 0; c < 3; c++)
        dark[i + c] = Math.round(data[i + c] + (DARK_PAPER[c] - data[i + c]) * t);
    }
  }
}

// ── Crop to the artwork ─────────────────────────────────────────────
let minX = width;
let minY = height;
let maxX = -1;
let maxY = -1;
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++)
    if (alpha[y * width + x] > 16) {
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
const lightPng = await sharp(light, raw).extract(region).png().toBuffer();
const darkPng = await sharp(dark, raw).extract(region).png().toBuffer();

await sharp(lightPng).toFile(path.join(icons, "velina-logo.png"));
await sharp(darkPng).toFile(path.join(icons, "velina-logo-dark.png"));

// ── Square app icons ────────────────────────────────────────────────
// The wordmark is wide, so it is fitted to a share of the tile and centred on
// the shop's paper. The maskable cut keeps well inside the safe-area circle.
async function tile(size, inset) {
  const box = Math.round(size * inset);
  const mark = await sharp(lightPng)
    .resize({ width: box, height: box, fit: "inside" })
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: PAPER },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toBuffer();
}

for (const [name, size, inset] of [
  ["icon-192.png", 192, 0.84],
  ["icon-512.png", 512, 0.84],
  ["icon-512-maskable.png", 512, 0.6],
  ["apple-touch-icon.png", 180, 0.84],
]) {
  await sharp(await tile(size, inset)).toFile(path.join(icons, name));
  console.log(`wrote ${name}`);
}

console.log(
  `source ${width}×${height} → crop ${region.width}×${region.height} ` +
    `(ratio ${(region.width / region.height).toFixed(2)}:1)`,
);
