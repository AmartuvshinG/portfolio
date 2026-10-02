/**
 * Bake the Path globe's world: land, lakes and borders, as one image.
 *
 *   node scripts/bake-globe-mask.mjs [--dir <folder of .geojson>]
 *
 * Reads three Natural Earth 1:50m layers (public domain; fetched from the
 * project's GitHub unless --dir points at local copies):
 *
 *   ne_50m_land                          → land
 *   ne_50m_lakes                         → cut out of the land, so Lake Erie
 *                                          and Baikal read as water
 *   ne_50m_admin_0_boundary_lines_land   → country borders
 *
 * and writes two equirectangular RGB images, power-of-two so the shader can
 * mipmap and wrap them: public/path/globe-mask.png (4096 × 2048, for the
 * pinned flight, which comes down close) and globe-mask-2k.png (2048 × 1024,
 * for the phone's still view of the whole route). Row 0 is the
 * north pole, column 0 is 180°W. R = land cover 0–255 (anti-aliased), G =
 * border, B unused.
 *
 * **Rasterising.** Polygons are filled by scanline, even–odd across every
 * ring of a layer at once (so holes need no special case), with four
 * sub-scanlines per pixel row and exact horizontal span coverage — a smooth
 * coast without supersampling the whole image. Edges are bucketed by the
 * sub-rows they span, so each sub-row only looks at its own edges. Borders
 * are stepped along every segment at a third of a pixel.
 *
 * The PNG is written by hand (zlib deflate + CRC), so the bake has no
 * dependencies. Replaces the 1° bitstring the old flat globe used
 * (bake-land-dots.mjs). Credited in the footer: "Map data: Natural Earth".
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { deflateSync } from "node:zlib";

const ROOT = new URL("..", import.meta.url);
const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
let W = 4096;
let H = W / 2;
const DIR = arg("--dir", null);
const BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";

async function layer(name) {
  const text = DIR ? await readFile(`${DIR}/${name}.geojson`, "utf8") : await (await fetch(`${BASE}${name}.geojson`)).text();
  return JSON.parse(text);
}

/** Every ring of every polygon in a layer, as [[lon, lat], …]. */
function rings(geo) {
  const out = [];
  for (const f of geo.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === "Polygon") out.push(...g.coordinates);
    else if (g.type === "MultiPolygon") for (const p of g.coordinates) out.push(...p);
  }
  return out;
}

const SUB = 4;
const toX = (lon) => ((lon + 180) / 360) * W;
const toY = (lat) => ((90 - lat) / 180) * H;

/** Cover fraction per pixel, 0–1, for an even–odd fill of `rs`. */
function fill(rs) {
  const rowsSub = H * SUB;
  /* Edges in sub-row space, bucketed by the first sub-row they cross. */
  const buckets = Array.from({ length: rowsSub }, () => []);
  for (const ring of rs) {
    for (let i = 0; i < ring.length - 1; i++) {
      const x0 = toX(ring[i][0]);
      const y0 = toY(ring[i][1]) * SUB;
      const x1 = toX(ring[i + 1][0]);
      const y1 = toY(ring[i + 1][1]) * SUB;
      if (y0 === y1) continue;
      const top = Math.min(y0, y1);
      const bot = Math.max(y0, y1);
      /* Sub-row s samples at y = s + 0.5. */
      const s0 = Math.max(0, Math.ceil(top - 0.5));
      const s1 = Math.min(rowsSub - 1, Math.ceil(bot - 0.5) - 1);
      const edge = [x0, y0, x1, y1];
      for (let s = s0; s <= s1; s++) buckets[s].push(edge);
    }
  }
  const cover = new Float32Array(W * H);
  const xs = [];
  for (let s = 0; s < rowsSub; s++) {
    const y = s + 0.5;
    xs.length = 0;
    for (const [x0, y0, x1, y1] of buckets[s]) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    xs.sort((a, b) => a - b);
    const row = Math.floor(s / SUB) * W;
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(0, xs[k]);
      const b = Math.min(W, xs[k + 1]);
      if (b <= a) continue;
      const ia = Math.floor(a);
      const ib = Math.floor(b);
      const w = 1 / SUB;
      if (ia === ib) cover[row + ia] += (b - a) * w;
      else {
        cover[row + ia] += (ia + 1 - a) * w;
        for (let i = ia + 1; i < ib; i++) cover[row + i] += w;
        if (ib < W) cover[row + ib] += (b - ib) * w;
      }
    }
  }
  return cover;
}

/** Border lines, stepped at a third of a pixel. */
function lines(geo) {
  const out = new Uint8Array(W * H);
  const plot = (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix >= 0 && ix < W && iy >= 0 && iy < H) out[iy * W + ix] = 255;
  };
  for (const f of geo.features) {
    const g = f.geometry;
    if (!g) continue;
    const parts = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
    for (const line of parts) {
      for (let i = 0; i < line.length - 1; i++) {
        const x0 = toX(line[i][0]);
        const y0 = toY(line[i][1]);
        const x1 = toX(line[i + 1][0]);
        const y1 = toY(line[i + 1][1]);
        const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3));
        for (let k = 0; k <= n; k++) plot(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n);
      }
    }
  }
  return out;
}

/* ---- PNG ----------------------------------------------------------------- */
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    const o = y * (W * 3 + 1);
    raw[o] = 1; // Sub filter: long runs of equal pixels become zeros
    for (let x = 0; x < W * 3; x++) {
      const v = rgb[y * W * 3 + x];
      const left = x >= 3 ? rgb[y * W * 3 + x - 3] : 0;
      raw[o + 1 + x] = (v - left) & 0xff;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const t0 = Date.now();
const [land, lakes, borders] = await Promise.all([
  layer("ne_50m_land"),
  layer("ne_50m_lakes"),
  layer("ne_50m_admin_0_boundary_lines_land"),
]);
await mkdir(new URL("public/path/", ROOT), { recursive: true });
for (const [size, name] of [
  [4096, "globe-mask.png"],
  [2048, "globe-mask-2k.png"],
]) {
  W = size;
  H = size / 2;
  const landCover = fill(rings(land));
  const lakeCover = fill(rings(lakes));
  const border = lines(borders);
  const rgb = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const l = Math.min(1, landCover[i]) * (1 - Math.min(1, lakeCover[i]));
    rgb[i * 3] = Math.round(l * 255);
    rgb[i * 3 + 1] = border[i];
  }
  const file = png(rgb);
  await writeFile(new URL(`public/path/${name}`, ROOT), file);
  console.log(`${name} ${W}×${H}, ${(file.length / 1024).toFixed(0)} KB`);
}
console.log(`${Date.now() - t0} ms`);
