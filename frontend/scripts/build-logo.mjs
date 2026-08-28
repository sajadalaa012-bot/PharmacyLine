import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(here, "..", "public", "icons");

function generateLogoSVG({ color = "#141414" }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 240" width="1800" height="480">
    <style>
      .wordmark {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Montserrat, "Helvetica Neue", Arial, sans-serif;
        font-weight: 900;
        font-size: 104px;
        letter-spacing: 0.035em;
        fill: ${color};
      }
      .mark-line {
        stroke: ${color};
        stroke-width: 10;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
      }
      .bar {
        stroke: ${color};
        stroke-width: 11;
        stroke-linecap: round;
      }
    </style>

    <g transform="translate(10, 5)">
      <!-- Diamond Mark (Isometric / Faceted Wireframe matching sign photo) -->
      <!-- Outer perimeter points:
           Left Apex: (40, 115)
           Top Peak: (136, 28)
           Top Right: (234, 62)
           Bottom Tip: (228, 208)
           Bottom Mid: (118, 170)
      -->
      <polygon points="40,115 136,28 234,62 228,208 118,170" class="mark-line" />

      <!-- Center Junction: (146, 110) -->
      <!-- Right Edge Junction: (231, 132) -->

      <!-- Facet lines connecting center junction radially -->
      <line x1="40" y1="115" x2="146" y2="110" class="mark-line" />
      <line x1="136" y1="28" x2="146" y2="110" class="mark-line" />
      <line x1="234" y1="62" x2="146" y2="110" class="mark-line" />
      <line x1="146" y1="110" x2="231" y2="132" class="mark-line" />
      <line x1="118" y1="170" x2="146" y2="110" class="mark-line" />
      <line x1="228" y1="208" x2="146" y2="110" class="mark-line" />

      <!-- Vertical Divider Bar -->
      <line x1="262" y1="20" x2="262" y2="216" class="bar" />
    </g>

    <!-- Wordmark AL-MASA (Arabic words removed) -->
    <text x="312" y="152" class="wordmark">AL-MASA</text>
  </svg>`;
}

async function build() {
  const lightSvg = generateLogoSVG({ color: "#141414" });
  const darkSvg = generateLogoSVG({ color: "#F2EDE3" });

  // Save SVGs
  fs.writeFileSync(path.join(iconsDir, "almasa-logo.svg"), lightSvg);
  fs.writeFileSync(path.join(iconsDir, "almasa-logo-dark.svg"), darkSvg);

  // Render Light Logo with sharp (trimmed with clean padding)
  const lightBuf = await sharp(Buffer.from(lightSvg))
    .trim({ threshold: 10 })
    .extend({
      top: 12,
      bottom: 12,
      left: 14,
      right: 14,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(iconsDir, "almasa-logo.png"), lightBuf);
  // Also save a master source copy
  fs.writeFileSync(path.join(iconsDir, "almasa-logo-source.png"), lightBuf);

  // Render Dark Logo with sharp (trimmed with clean padding)
  const darkBuf = await sharp(Buffer.from(darkSvg))
    .trim({ threshold: 10 })
    .extend({
      top: 12,
      bottom: 12,
      left: 14,
      right: 14,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(iconsDir, "almasa-logo-dark.png"), darkBuf);

  // Clean up temporary test files
  const testFiles = [
    "almasa-logo-test.svg",
    "almasa-logo-test.png",
    "test-var1.png",
    "test-var2.png",
    "test-var3.png",
    "test-diamond-exact.png",
    "test-diamond-clean.png"
  ];
  for (const f of testFiles) {
    const p = path.join(iconsDir, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  console.log("Successfully built AL-MASA logos (light & dark)!");
}

build();
