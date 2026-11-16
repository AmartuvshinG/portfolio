/**
 * Bake the raster favicons from the SVG master.
 *
 *   node scripts/bake-favicons.mjs
 *
 * public/icons/icon-v5.svg is the mark (ᠠ, the Mongol-script a, outlined and
 * turned upright). Browsers that take SVG use it as-is; this writes the rest:
 *
 *   public/icons/favicon-v5.ico        16, 32, 48 px, PNG-in-ICO — the one
 *   public/favicon.ico                 <link>ed, and a root copy for anything
 *                                      that asks /favicon.ico unprompted
 *   public/icons/icon-v5-32.png        the tab icon for Safari, which does
 *   public/icons/icon-v5-192.png       not take SVG favicons
 *   public/icons/icon-v5-512.png       the manifest's install icon
 *   public/icons/apple-touch-icon-v5.png  180 px, full bleed — iOS rounds the
 *   public/apple-touch-icon.png           corners itself and fills
 *   public/apple-touch-icon-precomposed.png  transparency with black, so the
 *                                      void runs to the edge and the letter sits
 *                                      inside with room for the mask. The root
 *                                      copies are for iOS, which asks for
 *                                      those paths without reading any <link>.
 *
 * The names carry a version, and app/layout.tsx `metadata.icons` links them by
 * name: Safari keeps favicons in a database of its own, keyed by URL and blind
 * to query strings, so only a new path makes it fetch a new mark. That goes
 * for /favicon.ico too — it once came from app/ as /favicon.ico?<hash>, the
 * same key to Safari — so no unversioned name is ever linked. Recut the
 * mark → bump the version in the names, here and in layout.tsx/manifest.ts.
 */
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const master = await readFile(new URL("../public/icons/icon-v5.svg", import.meta.url), "utf8");

/* The letter alone (between the master's mark comments), lifted out so the
   touch icon can reframe it on its own, softer ground. */
const inner = master.match(/<!-- mark -->([\s\S]*)<!-- \/mark -->/)[1];

/* Touch icon: void ground with a magenta-to-violet bloom behind the letter
   (the ramp as light, the way the site uses it), then the mark at ~68% so it
   clears iOS's corner radius. */
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <defs>
    <radialGradient id="bloom" cx="0.5" cy="0.56" r="0.62">
      <stop offset="0" stop-color="#e81cc8" stop-opacity="0.42"/>
      <stop offset="0.6" stop-color="#8a3dff" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#8a3dff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="180" height="180" fill="#05040c"/>
  <rect width="180" height="180" fill="url(#bloom)"/>
  <svg x="29" y="29" width="122" height="122" viewBox="0 0 32 32">${inner}</svg>
</svg>`;

/* Rasterise at 2× the target, then downsample: cleaner edges at 16 px. */
const png = (svg, size, viewBox = 32) =>
  sharp(Buffer.from(svg), { density: 72 * (size / viewBox) * 2 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();

/* ICO with embedded PNGs (Vista+): a 6-byte header, a 16-byte entry per
   image, then the PNG bytes. Width/height 0 would mean 256. */
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size % 256, e);
    head.writeUInt8(size % 256, e + 1);
    head.writeUInt8(0, e + 2);
    head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.data)]);
}

const out = (p) => new URL(`../public/${p}`, import.meta.url);
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(async (size) => ({ size, data: await png(master, size) })));
const favicon = ico(images);
await writeFile(out("icons/favicon-v5.ico"), favicon);
await writeFile(out("favicon.ico"), favicon);
for (const size of [32, 192, 512]) await writeFile(out(`icons/icon-v5-${size}.png`), await png(master, size));
const touch = await png(apple, 180, 180);
await writeFile(out("icons/apple-touch-icon-v5.png"), touch);
await writeFile(out("apple-touch-icon.png"), touch);
await writeFile(out("apple-touch-icon-precomposed.png"), touch);

console.log("favicon.ico + icons/favicon-v5.ico, icons/icon-v5-{32,192,512}.png and the 180 px touch icons written.");
