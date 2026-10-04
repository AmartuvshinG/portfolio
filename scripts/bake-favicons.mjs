/**
 * Bake the raster favicons from the SVG master.
 *
 *   node scripts/bake-favicons.mjs
 *
 * src/app/icon.svg is the mark (the navbar's hex-and-A monogram, recut for a
 * tab). Modern browsers take it as-is; this writes the two files that cannot
 * be SVG:
 *
 *   src/app/favicon.ico     16, 32 and 48 px, PNG-in-ICO — older browsers,
 *                           Windows shortcuts, anything that asks /favicon.ico
 *   src/app/apple-icon.png  180 px, full bleed — iOS rounds the corners
 *                           itself and fills transparency with black, so the
 *                           void runs to the edge and the hex sits inside with
 *                           room for the mask
 *
 * Next picks all three up by filename and writes the <link> tags.
 */
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const master = await readFile(new URL("../src/app/icon.svg", import.meta.url), "utf8");

/* The master's two paths, lifted out so the touch icon can reframe them. */
const inner = master.match(/<defs>[\s\S]*<\/svg>/)[0].replace("</svg>", "");

/* Touch icon: void ground with a coral bloom low-left and an ice one
   high-right — the ramp as light, the way the site uses it — then the mark at
   ~68% so it clears iOS's corner radius. */
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <defs>
    <radialGradient id="b1" cx="0.18" cy="0.85" r="0.75">
      <stop offset="0" stop-color="#ff3b30" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ff3b30" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="b2" cx="0.88" cy="0.12" r="0.7">
      <stop offset="0" stop-color="#9fe3ec" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#9fe3ec" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="180" height="180" fill="#061317"/>
  <rect width="180" height="180" fill="url(#b1)"/>
  <rect width="180" height="180" fill="url(#b2)"/>
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

const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(async (size) => ({ size, data: await png(master, size) })));
await writeFile(new URL("../src/app/favicon.ico", import.meta.url), ico(images));
await writeFile(new URL("../src/app/apple-icon.png", import.meta.url), await png(apple, 180, 180));

console.log(`favicon.ico (${sizes.join(", ")} px) and apple-icon.png (180 px) written.`);
