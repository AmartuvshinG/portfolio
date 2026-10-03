/**
 * Bake the Path's landing photos: one per place, from the drops in the repo
 * root, into public/path/photos/<key>-<w>.webp.
 *
 *   node scripts/bake-path-photos.mjs
 *
 * Two widths each, 640 and 1280, never wider than the source: a plate is
 * drawn at most half its source width (lib/pathPhotos `maxCss`), so it stays
 * sharp at DPR 2 and nothing is upscaled. The originals are not committed;
 * the photographs belong to their owners (credited in the footer).
 */
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = new URL("..", import.meta.url);
const OUT = new URL("public/path/photos/", ROOT);

const SOURCES = {
  must: "shutis.webp",
  gannon: "gannon.webp",
  chickfila: "gannon chick fil a.jpg",
  zurn: "gannon IT building.jpg",
  victor: "gannon mascot victor.jpg",
  monnis: "monnis tower.jpg",
};
const WIDTHS = [640, 1280];

await mkdir(OUT, { recursive: true });
for (const [key, file] of Object.entries(SOURCES)) {
  const src = sharp(fileURLToPath(new URL(file, ROOT)));
  const { width, height } = await src.metadata();
  const widths = [...new Set(WIDTHS.map((w) => Math.min(w, width)))];
  for (const w of widths) {
    const to = fileURLToPath(new URL(`${key}-${w}.webp`, OUT));
    const info = await src.clone().resize({ width: w }).webp({ quality: 80, effort: 6 }).toFile(to);
    console.log(`${key}-${w}.webp  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
  }
  console.log(`  ${key}: source ${width}×${height}, aspect ${(width / height).toFixed(4)}`);
}
