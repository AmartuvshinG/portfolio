/**
 * Bake the responsive widths next/image would otherwise make on a server.
 *
 *   node scripts/bake-images.mjs   (runs as `prebuild`)
 *
 * The site ships as a static export on Cloudflare Workers, so there is no image
 * optimiser at request time. Every raster under public/work/ (the only folder
 * that goes through next/image) is written at each width in WIDTHS into
 * public/opt/work/<name>.w<width>.webp, never wider than its source. The
 * loader in src/lib/imageLoader.ts asks for exactly these files, and WIDTHS has
 * to stay equal to `images.deviceSizes` in next.config.ts.
 *
 * Output is gitignored and skipped when it is already newer than its source,
 * so a rebuild costs nothing.
 */
import { mkdir, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const WIDTHS = [640, 960, 1280, 1920];

const ROOT = new URL("..", import.meta.url);
const DIRS = ["work"];

let made = 0;
for (const dir of DIRS) {
  const src = new URL(`public/${dir}/`, ROOT);
  const out = new URL(`public/opt/${dir}/`, ROOT);
  await mkdir(out, { recursive: true });

  for (const file of await readdir(src)) {
    if (!/\.(webp|png|jpe?g)$/i.test(file)) continue;
    const input = fileURLToPath(new URL(file, src));
    const { width: srcW } = await sharp(input).metadata();
    const srcTime = (await stat(input)).mtimeMs;
    const base = file.replace(/\.[^.]+$/, "");

    for (const w of WIDTHS) {
      const target = fileURLToPath(new URL(`${base}.w${w}.webp`, out));
      const fresh = await stat(target).then((s) => s.mtimeMs >= srcTime, () => false);
      if (fresh) continue;
      await sharp(input)
        .resize({ width: Math.min(w, srcW), withoutEnlargement: true })
        .webp({ quality: 78, effort: 5 })
        .toFile(target);
      made++;
    }
  }
}
console.log(`bake-images: ${made} file(s) written`);
