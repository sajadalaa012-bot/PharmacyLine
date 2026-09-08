import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(here, "..", "public", "icons", "almasa-logo-source.png");
const iconsDir = path.join(here, "..", "public", "icons");

const OPAQUE_BELOW = 232;
const CLEAR_ABOVE = 248;
const DARK_INK = [242, 237, 227];

// Load raw rgba from source
const { data, info } = await sharp(SOURCE)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;

// Create transparent buffer
// We want:
// 1. Diamond (X: 60..350, Y: 390..635)
// 2. Divider line: trimmed/shortened to match the diamond & AL-MASA bounds (Y: 394..630)
// 3. AL-MASA: shifted down so its vertical center matches the diamond's vertical center!
// Diamond vertical center is around 512.
// AL-MASA original vertical center was around 458. Shift AL-MASA down by +54 pixels!

const diaCenterY = (396 + 627) / 2; // 511.5
const almasaCenterY = (412 + 505) / 2; // 458.5
const dy = Math.round(diaCenterY - almasaCenterY); // +53px shift

const outLight = Buffer.alloc(width * height * 4, 0); // all transparent
const outDark = Buffer.alloc(width * height * 4, 0);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const brightest = Math.max(r, g, b);

    let alpha = 255;
    if (brightest >= CLEAR_ABOVE) alpha = 0;
    else if (brightest > OPAQUE_BELOW) {
      alpha = Math.round(((CLEAR_ABOVE - brightest) / (CLEAR_ABOVE - OPAQUE_BELOW)) * 255);
    }
    alpha = Math.min(alpha, data[idx + 3]);
    if (alpha <= 10) continue;

    // Is it diamond? (x < 360)
    if (x < 360 && y >= 390 && y <= 635) {
      const outIdx = (y * width + x) * 4;
      outLight[outIdx] = r;
      outLight[outIdx + 1] = g;
      outLight[outIdx + 2] = b;
      outLight[outIdx + 3] = alpha;

      outDark[outIdx] = r;
      outDark[outIdx + 1] = g;
      outDark[outIdx + 2] = b;
      outDark[outIdx + 3] = alpha;
    }

    // Is it divider line? (x between 365 and 385, y between 390 and 635)
    if (x >= 365 && x <= 385 && y >= 390 && y <= 635) {
      const outIdx = (y * width + x) * 4;
      outLight[outIdx] = r;
      outLight[outIdx + 1] = g;
      outLight[outIdx + 2] = b;
      outLight[outIdx + 3] = alpha;

      outDark[outIdx] = r;
      outDark[outIdx + 1] = g;
      outDark[outIdx + 2] = b;
      outDark[outIdx + 3] = alpha;
    }

    // Is it AL-MASA text? (x > 385, y < 515) -> Shift by dy
    if (x > 385 && y >= 405 && y <= 515) {
      const targetY = y + dy;
      if (targetY >= 0 && targetY < height) {
        const outIdx = (targetY * width + x) * 4;
        outLight[outIdx] = r;
        outLight[outIdx + 1] = g;
        outLight[outIdx + 2] = b;
        outLight[outIdx + 3] = alpha;

        // Dark theme: lift near-black ink to cream
        const neutral = brightest - Math.min(r, g, b) < 26;
        if (neutral && brightest < 120) {
          const mix = 1 - brightest / 120;
          outDark[outIdx] = Math.round(r + (DARK_INK[0] - r) * mix);
          outDark[outIdx + 1] = Math.round(g + (DARK_INK[1] - g) * mix);
          outDark[outIdx + 2] = Math.round(b + (DARK_INK[2] - b) * mix);
        } else {
          outDark[outIdx] = r;
          outDark[outIdx + 1] = g;
          outDark[outIdx + 2] = b;
        }
        outDark[outIdx + 3] = alpha;
      }
    }
  }
}

// Find non-transparent bounds of outLight
let cropMinX = width, cropMaxX = 0, cropMinY = height, cropMaxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4;
    if (outLight[idx + 3] > 16) {
      if (x < cropMinX) cropMinX = x;
      if (x > cropMaxX) cropMaxX = x;
      if (y < cropMinY) cropMinY = y;
      if (y > cropMaxY) cropMaxY = y;
    }
  }
}

const pad = 6;
const left = Math.max(0, cropMinX - pad);
const top = Math.max(0, cropMinY - pad);
const region = {
  left,
  top,
  width: Math.min(width - left, cropMaxX - cropMinX + 1 + pad * 2),
  height: Math.min(height - top, cropMaxY - cropMinY + 1 + pad * 2)
};

const raw = { raw: { width, height, channels: 4 } };
await sharp(outLight, raw).extract(region).png().toFile(path.join(iconsDir, "test-reverted-centered.png"));
await sharp(outDark, raw).extract(region).png().toFile(path.join(iconsDir, "test-reverted-dark-centered.png"));

console.log("Extracted reverted centered logo:", region);
