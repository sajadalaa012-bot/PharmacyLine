import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(here, "..", "public", "icons", "almasa-logo-source.png");

const meta = await sharp(SOURCE).metadata();
console.log("Source metadata:", meta);
