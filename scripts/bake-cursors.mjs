/**
 * Bake the desktop cursor set.
 *
 *   node scripts/bake-cursors.mjs
 *
 * The cursors are native CSS cursors (globals.css, "Cursors"), so they never
 * trail the pointer and need no JS. Each is drawn here as an SVG on a 32px
 * grid and written as PNGs at 1× and 2×, which `image-set()` picks between:
 *
 *   public/cursors/arrow-v2.png     arrow-v2@2x.png     everywhere
 *   public/cursors/hand-v2.png      hand-v2@2x.png      links and buttons
 *   public/cursors/text-v2.png      text-v2@2x.png      inputs
 *   public/cursors/grab-v2.png      grab-v2@2x.png      the spine, the globe
 *   public/cursors/grabbing-v2.png  grabbing-v2@2x.png  …while held
 *
 * The set is the "Ramp arrowhead" Amartuvshin picked (2026-11-15) from the
 * Chrome Picker: a swept arrowhead filled with the ramp and keylined in pearl;
 * the link hand is the same head turned pearl with a ramp bead; the I-beam and
 * the grab ring are in the ramp. Each sits on a soft dark shadow.
 *
 * Why PNG rather than SVG: browsers rasterise an SVG cursor at 1× and scale
 * it, so it is soft on every HiDPI screen. Recut a cursor → bump `v2` in the
 * names here and in globals.css, so caches fetch the new image.
 */
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const VOID = "#05040c";
const PEARL = "#f3f1ff";

/* The site ramp, along the arrow's length. In user space, so a thin stroke
   still gets the whole gradient. */
const ramp = (id) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="5" y1="27" x2="27" y2="3">
    <stop offset="0" stop-color="#ff1f3d"/>
    <stop offset="0.45" stop-color="#e81cc8"/>
    <stop offset="1" stop-color="#8a3dff"/>
  </linearGradient>`;

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <defs>
    ${ramp("ramp")}
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="0.9"/>
    </filter>
  </defs>
  ${body}
</svg>`;
/* Every cursor sits on a soft dark shadow of itself, so it reads on the
   brightest footage frame and on a white screenshot alike. */
const shadowed = (shape) => `<g transform="translate(0.8 1.3)" filter="url(#shadow)" opacity="0.6">${shape}</g>`;

/* --- Arrow (Ramp arrowhead, picked 2026-11-15): the swept arrowhead filled
   with the ramp, keylined in pearl. Tip at (5,3). */
const head = "M5 3 L25 14.5 L16.4 16.7 L12.2 25.3 Z";
const arrow = svg(`
  ${shadowed(`<path d="${head}" fill="#000" stroke="#000" stroke-width="2.4" stroke-linejoin="round"/>`)}
  <path d="${head}" fill="url(#ramp)" stroke="${PEARL}" stroke-width="1.6" stroke-linejoin="round"/>`);

/* --- Hand: the same head turned pearl with a ramp keyline, and a ramp bead
   at its heel: the arrow, "lit". Same tip, so nothing jumps over a link. */
const hand = svg(`
  ${shadowed(`<path d="${head}" fill="#000" stroke="#000" stroke-width="2.8" stroke-linejoin="round"/><circle cx="24" cy="24" r="4.6" fill="#000"/>`)}
  <path d="${head}" fill="${PEARL}" stroke="url(#ramp)" stroke-width="2.4" stroke-linejoin="round"/>
  <circle cx="24" cy="24" r="4" fill="url(#ramp)" stroke="${PEARL}" stroke-width="1"/>`);

/* --- I-beam: serifs and stem in the ramp over a dark keyline. */
const beam = "M12 5h8M12 27h8M16 5v22";
const text = svg(`
  <path d="${beam}" stroke="${VOID}" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="${beam}" stroke="url(#ramp)" stroke-width="2" stroke-linecap="round" fill="none"/>`);

/* --- Grab / grabbing (the spine, the globe): an open ramp ring with four
   ticks, then the ring closed and filled while held. Hotspot at centre. */
const ticks = "M16 3.5v3M16 25.5v3M3.5 16h3M25.5 16h3";
const grab = svg(`
  ${shadowed(`<circle cx="16" cy="16" r="8" fill="none" stroke="#000" stroke-width="4"/>`)}
  <circle cx="16" cy="16" r="8" fill="none" stroke="${VOID}" stroke-width="4"/>
  <circle cx="16" cy="16" r="8" fill="none" stroke="url(#ramp)" stroke-width="2"/>
  <path d="${ticks}" stroke="${PEARL}" stroke-width="1.6" stroke-linecap="round"/>`);
const grabbing = svg(`
  ${shadowed(`<circle cx="16" cy="16" r="6.5" fill="#000"/>`)}
  <circle cx="16" cy="16" r="6.5" fill="url(#ramp)" stroke="${PEARL}" stroke-width="1.4"/>
  <circle cx="16" cy="16" r="1.6" fill="${PEARL}"/>`);

const set = { arrow, hand, text, grab, grabbing };

const out = new URL("../public/cursors/", import.meta.url);
await mkdir(out, { recursive: true });
for (const [name, src] of Object.entries(set)) {
  for (const [scale, suffix] of [[1, ""], [2, "@2x"]]) {
    await sharp(Buffer.from(src), { density: 72 * scale })
      .resize(32 * scale, 32 * scale)
      .png()
      .toFile(fileURLToPath(new URL(`${name}-v2${suffix}.png`, out)));
  }
}
console.log("baked", Object.keys(set).length * 2, "cursors →", out.pathname);
