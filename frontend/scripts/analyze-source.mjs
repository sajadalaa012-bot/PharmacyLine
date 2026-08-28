import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(here, "..", "public", "icons", "almasa-logo-source.png");

const { data, info } = await sharp(SOURCE)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;

// Find connected components / clusters or bounding boxes
// Let's find pixels where brightness < 240 (non-white)
const grid = [];
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const maxVal = Math.max(r, g, b);
    if (maxVal < 235) {
      grid.push({ x, y, r, g, b });
    }
  }
}

// Bounding box of all elements:
let minX = width, maxX = 0, minY = height, maxY = 0;
for (const p of grid) {
  if (p.x < minX) minX = p.x;
  if (p.x > maxX) maxX = p.x;
  if (p.y < minY) minY = p.y;
  if (p.y > maxY) maxY = p.y;
}

console.log("Overall content bounds:", { minX, maxX, minY, maxY });

// Let's find vertical divider X coordinate
// Vertical divider is thin and tall, around middle X (around 350-400)
const xHist = new Array(width).fill(0);
for (const p of grid) xHist[p.x]++;

let dividerX = 0;
let maxDividerCount = 0;
for (let x = 340; x < 400; x++) {
  if (xHist[x] > maxDividerCount) {
    maxDividerCount = xHist[x];
    dividerX = x;
  }
}
console.log("Divider line around X:", dividerX);

// Check Arabic text Y range (it is on the right of divider, below AL-MASA)
const rightGrid = grid.filter(p => p.x > dividerX + 15);
let almasaMinY = height, almasaMaxY = 0;
let arabicMinY = height, arabicMaxY = 0;

for (const p of rightGrid) {
  if (p.y < 512) {
    if (p.y < almasaMinY) almasaMinY = p.y;
    if (p.y > almasaMaxY) almasaMaxY = p.y;
  } else {
    if (p.y < arabicMinY) arabicMinY = p.y;
    if (p.y > arabicMaxY) arabicMaxY = p.y;
  }
}

console.log("AL-MASA Y bounds:", { almasaMinY, almasaMaxY });
console.log("Arabic text Y bounds:", { arabicMinY, arabicMaxY });

// Check Diamond bounds (left of divider)
const leftGrid = grid.filter(p => p.x < dividerX - 10);
let diaMinX = width, diaMaxX = 0, diaMinY = height, diaMaxY = 0;
for (const p of leftGrid) {
  if (p.x < diaMinX) diaMinX = p.x;
  if (p.x > diaMaxX) diaMaxX = p.x;
  if (p.y < diaMinY) diaMinY = p.y;
  if (p.y > diaMaxY) diaMaxY = p.y;
}
console.log("Diamond bounds:", { diaMinX, diaMaxX, diaMinY, diaMaxY });
