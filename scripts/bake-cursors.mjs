/**
 * Bake the desktop cursor set.
 *
 *   node scripts/bake-cursors.mjs
 *
 * The cursors are native CSS cursors (globals.css, "Cursors"), so they never
 * trail the pointer and need no JS. Each is drawn here as an SVG on a 32px
 * grid and written as PNGs at 1× and 2×, which `image-set()` picks between:
 *
 *   public/cursors/arrow-v1.png     arrow-v1@2x.png     everywhere
 *   public/cursors/hand-v1.png      hand-v1@2x.png      links and buttons
 *   public/cursors/text-v1.png      text-v1@2x.png      inputs
 *   public/cursors/grab-v1.png      grab-v1@2x.png      the spine, the globe
 *   public/cursors/grabbing-v1.png  grabbing-v1@2x.png  …while held
 *
 * The look is the Windows set's silhouettes — the 45° arrow with its tail,
 * the pointing hand, the serifed I-beam — in the site's ink: a void body, a
 * white keyline so it reads on any ground, a soft drop shadow, and the
 * spectrum ramp as a thin inner edge on the leading side. The ramp is the one
 * thing that makes them ours; never a flat fill.
 *
 * Why PNG rather than SVG: browsers rasterise an SVG cursor at 1× and scale
 * it, so it is soft on every HiDPI screen. Recut a cursor → bump `v1` in the
 * names here and in globals.css, so caches fetch the new image.
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const VOID = "#061317";
const KEY = "#f4f7f8";

/* The spectrum ramp, top to bottom of the 32px grid. In user space, not
   the stroke's bounding box: a vertical line has a zero-width box, and a
   gradient over one paints nothing at all. */
const ramp = (id) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="3" x2="0" y2="26">
    <stop offset="0" stop-color="#ff3b30"/>
    <stop offset="0.55" stop-color="#ff8a6b"/>
    <stop offset="1" stop-color="#9fe3ec"/>
  </linearGradient>`;

/* A shape drawn three times: a blurred shadow, a white keyline (the shape
   stroked wide, so a union of parts gets one outline), then the void body. */
const inked = (shape, { keyline = 2.4 } = {}) => `
  <g transform="translate(0.9 1.4)" filter="url(#shadow)" opacity="0.5">
    <g fill="#000" stroke="#000" stroke-width="${keyline}" stroke-linejoin="round">${shape}</g>
  </g>
  <g fill="${KEY}" stroke="${KEY}" stroke-width="${keyline}" stroke-linejoin="round" stroke-linecap="round">${shape}</g>
  <g fill="${VOID}">${shape}</g>`;

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <defs>
    ${ramp("ramp")}
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="0.9"/>
    </filter>
  </defs>
  ${body}
</svg>`;

/* --- Arrow: the Windows pointer — tip at (2,2), the notch, the tail. */
const arrowShape = `<path d="M2.2 2.2 L2.2 22.6 L7 18 L10.6 25.8 L13.8 24.4 L10.3 16.8 L16.8 16.8 Z"/>`;
const arrow = svg(`
  ${inked(arrowShape)}
  <path d="M3.9 6 L3.9 18.6" stroke="url(#ramp)" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M4.6 5.9 L12.2 13.4" stroke="url(#ramp)" stroke-width="0.9" stroke-linecap="round" opacity="0.55"/>`);

/* --- Hand: index finger up, three fingers curled, thumb out to the left.
   The hotspot is the fingertip. */
const palm = `<path d="M9 13.5 L25 15 L25 21.2 Q25 28.4 18.2 28.4 L14.2 28.4 Q10.3 28.4 8.2 25.3 L4.1 19.6 Q3.1 17.7 4.8 16.8 Q6.4 16 8 17.6 L9 18.6 Z"/>`;
const handShape = `
  <rect x="9" y="1.6" width="4.6" height="16" rx="2.3"/>
  <rect x="13.6" y="9.4" width="4" height="9" rx="2"/>
  <rect x="17.6" y="10.4" width="4" height="9" rx="2"/>
  <rect x="21.4" y="12" width="3.6" height="8.4" rx="1.8"/>
  ${palm}`;
const seams = (xs, y1, y2) =>
  xs.map((x) => `<path d="M${x} ${y1} L${x} ${y2}" stroke="${KEY}" stroke-width="0.9" stroke-linecap="round" opacity="0.8"/>`).join("");
const hand = svg(`
  ${inked(handShape)}
  ${seams([13.6, 17.6, 21.4], 11.4, 16.6)}
  <path d="M10.6 4.4 L10.6 15" stroke="url(#ramp)" stroke-width="1.3" stroke-linecap="round"/>
  <rect x="17.3" y="2.3" width="3.2" height="3.2" transform="rotate(45 18.9 3.9)" fill="#ff6a3d"/>`);

/* --- I-beam: serifed top and bottom, the stem in the ramp. */
const beamShape = `<path d="M11.5 3.5 L14 3.5 Q16 3.5 16 5.6 Q16 3.5 18 3.5 L20.5 3.5 M16 5.6 L16 26.4 M11.5 28.5 L14 28.5 Q16 28.5 16 26.4 Q16 28.5 18 28.5 L20.5 28.5" fill="none"/>`;
const text = svg(`
  <g transform="translate(0.7 1.1)" filter="url(#shadow)" opacity="0.5">
    <g stroke="#000" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">${beamShape}</g>
  </g>
  <g stroke="${KEY}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">${beamShape}</g>
  <g stroke="${VOID}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${beamShape}</g>
  <path d="M16 6.6 L16 25.4" stroke="url(#ramp)" stroke-width="1.1" stroke-linecap="round"/>`);

/* --- Grab / grabbing: the same hand, all four fingers up, then curled. */
const grabPalm = `<path d="M7.4 14 L23.6 14 L23.6 21.2 Q23.6 28.6 16.4 28.6 L13.2 28.6 Q9.2 28.6 7 25.2 L3.4 19.6 Q2.5 17.6 4.3 16.9 Q5.9 16.3 7.4 18 Z"/>`;
const fingers = (ys, h) =>
  [7.4, 11.5, 15.6, 19.7].map((x, i) => `<rect x="${x}" y="${ys[i]}" width="3.9" height="${h}" rx="1.95"/>`).join("");
const grab = svg(`
  ${inked(fingers([5.2, 3.2, 4, 6.2], 13) + grabPalm)}
  ${seams([11.5, 15.6, 19.7], 7, 16.4)}
  <path d="M13.45 5.6 L13.45 14" stroke="url(#ramp)" stroke-width="1.2" stroke-linecap="round"/>`);
const grabbing = svg(`
  ${inked(fingers([10.6, 9.6, 10, 11.2], 8) + grabPalm)}
  ${seams([11.5, 15.6, 19.7], 11.6, 16.4)}
  <path d="M8.2 18.6 Q11 21.2 13.4 20" stroke="url(#ramp)" stroke-width="1.2" stroke-linecap="round" fill="none"/>`);

const set = { arrow, hand, text, grab, grabbing };

const out = new URL("../public/cursors/", import.meta.url);
await mkdir(out, { recursive: true });
for (const [name, src] of Object.entries(set)) {
  for (const [scale, suffix] of [[1, ""], [2, "@2x"]]) {
    await sharp(Buffer.from(src), { density: 72 * scale })
      .resize(32 * scale, 32 * scale)
      .png()
      .toFile(new URL(`${name}-v1${suffix}.png`, out).pathname.replace(/^\/([A-Z]:)/, "$1"));
  }
}
console.log("baked", Object.keys(set).length * 2, "cursors →", out.pathname);
