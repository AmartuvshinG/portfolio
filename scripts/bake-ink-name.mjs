/**
 * Bake the intro's calligraphy: the Mongol-script name as a brush stroke.
 *
 *   node scripts/bake-ink-name.mjs [--preview out.png [--frames 0.1,0.2,…]]
 *
 * Renders `profile.nameScript` in Noto Sans Mongolian (the same Google
 * `text=` subset the layout loads), turns it the way `writing-mode:
 * vertical-lr` turns Mongol script — 90° clockwise — and works out, for every
 * pixel, two things the shader cannot afford to at runtime:
 *
 *   R    signed distance to the glyph edge (128 = on the edge, inside > 128),
 *        so the ink can be drawn crisp at any size and its edge can bleed.
 *   G    when the brush reaches the pixel, 0…1 of the writing (255 = never).
 *        8 bits is plenty: 256 steps over ~7 s is one step every frame
 *        or two, and only one stroke is wet at a time, so the front is a
 *        short run of texels. A 16-bit split made the file 600 KB of
 *        incompressible low bytes.
 *   B    pooling: 1 where a stroke has just landed, fading over 30 px.
 *        Zero almost everywhere, so it compresses to nothing.
 *
 * **How the brush travels.** Mongol script hangs every letter off one
 * continuous vertical stem, and it is written as one: top to bottom, the
 * teeth, loops and tails flicked out of the stem as the brush passes them.
 * So a shortest-path tree over the glyph's skeleton from the top of the stem
 * gives the route, and the time is walked along it *serially*, by one brush:
 * each part as the brush reaches it, a lift and a beat in the air back to
 * the stem, and a pace of its own for every stroke (see step 6). Each ink
 * pixel then takes the time of the skeleton nearest it plus a little for the
 * distance, so ink spreads outward from the brush's centre line instead of
 * wiping across.
 *
 * The route itself is exported too (`INK_PATH` in src/lib/inkName.ts): where
 * the brush is at every moment and whether it is on the paper, so the scene
 * can draw its shadow and the neon signs their spark without reading the
 * texture back.
 *
 * It also writes `ink-name-mask.png` — the finished ink as alpha, with the
 * dry-brush streaks of the slow, late strokes baked in — for the static signs
 * (hero, dossier, contact), and `src/lib/inkName.ts` with the dimensions.
 *
 * Rerun whenever `profile.nameScript` changes.
 *
 * The PNGs are encoded here in Node, not through a canvas: a canvas
 * premultiplies alpha and would quietly corrupt the packed channels.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { chromium } from "playwright-core";

const ROOT = new URL("..", import.meta.url);
const args = process.argv.slice(2);
const previewAt = args.includes("--preview") ? args[args.indexOf("--preview") + 1] : null;
/** `--frames 0.05,0.1,…`: the preview's moments of the writing (default quarters). */
const frames = args.includes("--frames")
  ? args[args.indexOf("--frames") + 1].split(",").map(Number)
  : [0.25, 0.5, 0.75, 1];

/** The vertical name's length in texture pixels. */
const TARGET_LEN = 1400;
/** SDF range each side of the edge, px. Also the ring the bleed may use. */
const SPREAD = 20;
/** Unused margin round the glyph so the ring and the bleed are never cut. */
const PAD = SPREAD + 10;

const content = await readFile(new URL("src/lib/content.ts", ROOT), "utf8");
const m = /nameScript:\s*"([^"]+)"/.exec(content);
if (!m) throw new Error("nameScript not found in src/lib/content.ts");
const name = JSON.parse(`"${m[1]}"`);

/* ---- 1. render (horizontal), in the real face --------------------------- */

const fontUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+Mongolian&display=block&text=${encodeURIComponent(name)}`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
let raster;
try {
  const page = await browser.newPage();
  await page.setContent(
    `<!doctype html><html><head><link rel="stylesheet" href="${fontUrl}"></head>
     <body style="margin:0;background:#000">
       <span id="probe" lang="mn-Mong" style="font:200px 'Noto Sans Mongolian';writing-mode:vertical-lr;color:#fff">${name}</span>
     </body></html>`,
    { waitUntil: "networkidle" }
  );
  await page.evaluate(() => document.fonts.ready);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument");
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#probe" });
  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
  console.log("faces:", fonts.map((f) => `${f.familyName} ×${f.glyphCount}`).join(", "));
  if (fonts.length !== 1 || !/Mongolian/i.test(fonts[0].familyName)) {
    throw new Error("a fallback face drew part of the name — the bake would be wrong");
  }

  raster = await page.evaluate(
    ({ name, TARGET_LEN }) => {
      const probe = document.createElement("canvas").getContext("2d");
      probe.font = "100px 'Noto Sans Mongolian'";
      const size = (100 * TARGET_LEN) / probe.measureText(name).width;
      const font = `${size}px 'Noto Sans Mongolian'`;
      const tw = Math.ceil(TARGET_LEN) + 80;
      const th = Math.ceil(size * 1.7);
      const c = document.createElement("canvas");
      c.width = tw;
      c.height = th;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, tw, th);
      ctx.fillStyle = "#fff";
      ctx.font = font;
      ctx.textBaseline = "middle";
      ctx.fillText(name, 40, th / 2);
      const px = ctx.getImageData(0, 0, tw, th).data;
      const cov = new Array(tw * th);
      for (let i = 0; i < tw * th; i++) cov[i] = px[i * 4];
      return { tw, th, cov, size };
    },
    { name, TARGET_LEN }
  );
} finally {
  await browser.close();
}

/* ---- 2. turn it for vertical-lr and trim -------------------------------- */

const { tw, th } = raster;
// Vertical V(x, y) = H(y, th - 1 - x): rows run along the text.
const vw0 = th;
const vh0 = tw;
const v0 = new Float32Array(vw0 * vh0);
for (let y = 0; y < vh0; y++)
  for (let x = 0; x < vw0; x++) v0[y * vw0 + x] = raster.cov[(th - 1 - x) * tw + y] / 255;

let x0 = vw0, x1 = -1, y0 = vh0, y1 = -1;
for (let y = 0; y < vh0; y++)
  for (let x = 0; x < vw0; x++)
    if (v0[y * vw0 + x] > 0.02) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
const W = x1 - x0 + 1 + PAD * 2;
const H = y1 - y0 + 1 + PAD * 2;
const cov = new Float32Array(W * H);
for (let y = y0; y <= y1; y++)
  for (let x = x0; x <= x1; x++) cov[(y - y0 + PAD) * W + (x - x0 + PAD)] = v0[y * vw0 + x];
const N = W * H;
const inside = new Uint8Array(N);
for (let i = 0; i < N; i++) inside[i] = cov[i] >= 0.5 ? 1 : 0;
console.log(`texture ${W}×${H} (font ${raster.size.toFixed(1)}px)`);

/* ---- 3. signed distance (Felzenszwalb & Huttenlocher) ------------------- */

const INF = 1e20;
function edt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}
/** Euclidean distance from every pixel to the nearest pixel where `seed`. */
function edt(seed) {
  const g = new Float64Array(N);
  for (let i = 0; i < N; i++) g[i] = seed(i) ? 0 : INF;
  const n = Math.max(W, H);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = g[y * W + x];
    edt1d(f, H, d, v, z);
    for (let y = 0; y < H; y++) g[y * W + x] = d[y];
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) f[x] = g[y * W + x];
    edt1d(f, W, d, v, z);
    for (let x = 0; x < W; x++) g[y * W + x] = Math.sqrt(d[x]);
  }
  return g;
}
let dOut = edt((i) => inside[i]); // distance to ink, for pixels outside
let dIn = edt((i) => !inside[i]); // distance to paper, for pixels inside
/* Signed, inside positive; the coverage nudges it sub-pixel at the edge. */
const sdf = new Float32Array(N);
function signDistance() {
  for (let i = 0; i < N; i++) {
    const base = inside[i] ? dIn[i] - 0.5 : -(dOut[i] - 0.5);
    sdf[i] = Math.abs(base) < 1.5 ? cov[i] - 0.5 + Math.sign(base) * Math.max(0, Math.abs(base) - 1) : base;
  }
}
signDistance();

/* ---- 4. skeleton (Zhang–Suen) ------------------------------------------- */

const sk = Uint8Array.from(inside);
{
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : sk[y * W + x]);
  let changed = true;
  const del = [];
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          if (!sk[y * W + x]) continue;
          const p2 = at(x, y - 1), p3 = at(x + 1, y - 1), p4 = at(x + 1, y), p5 = at(x + 1, y + 1);
          const p6 = at(x, y + 1), p7 = at(x - 1, y + 1), p8 = at(x - 1, y), p9 = at(x - 1, y - 1);
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let A = 0;
          for (let k = 0; k < 8; k++) if (!seq[k] && seq[k + 1]) A++;
          if (A !== 1) continue;
          if (pass === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
          del.push(y * W + x);
        }
      for (const i of del) sk[i] = 0;
      if (del.length) changed = true;
    }
  }
}
const NB = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const skNeighbours = (i) => {
  const x = i % W, y = (i / W) | 0;
  const out = [];
  for (const [dx, dy] of NB) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < W && ny < H && sk[ny * W + nx]) out.push(ny * W + nx);
  }
  return out;
};

/* Spurs: thinning leaves short twigs at every square corner of the font's
   terminals. A brush has none — prune any free branch under SPUR px. */
const SPUR = 12;
for (let pass = 0; pass < 2; pass++) {
  for (let i = 0; i < N; i++) {
    if (!sk[i] || skNeighbours(i).length !== 1) continue;
    const path = [i];
    let prev = -1, cur = i;
    for (;;) {
      const nb = skNeighbours(cur).filter((n) => n !== prev && !path.includes(n));
      if (nb.length !== 1 || path.length > SPUR) break;
      prev = cur;
      cur = nb[0];
      if (skNeighbours(cur).length > 2) break; // reached a junction
      path.push(cur);
    }
    if (path.length <= SPUR && skNeighbours(cur).length > 2) for (const p of path) sk[p] = 0;
  }
}

const skIdx = [];
for (let i = 0; i < N; i++) if (sk[i]) skIdx.push(i);
console.log(`skeleton ${skIdx.length} px`);

/* ---- 4b. rebuild the strokes with a brush -------------------------------- */
/*
 * Noto Sans Mongolian is a monoline sans: inked as drawn it reads as type,
 * not as a hand. So the font gives only the *path* (its skeleton — which
 * keeps the confirmed spelling, ü-with-stroke included) and the stroke is
 * swept again with a brush:
 *
 *  - width follows the direction of travel, as with a brush held at a slant:
 *    the stem and the down-strokes run heavy, the cross-strokes lighter;
 *  - every free end tapers to a point — teeth and tails are flicked off —
 *    except the entry at the top of the stem, which stays a blunt crown where
 *    the brush first lands;
 *  - the pressure breathes a little along the way, so no two places are
 *    quite the same width.
 */
const isSk = (i) => sk[i] === 1;
/* Direction of travel at each skeleton pixel: the principal axis of the
   skeleton within a few px. */
const TAN_R = 6;
const tangent = new Float32Array(N);
for (const i of skIdx) {
  const cx = i % W, cy = (i / W) | 0;
  let sxx = 0, syy = 0, sxy = 0;
  for (let dy = -TAN_R; dy <= TAN_R; dy++)
    for (let dx = -TAN_R; dx <= TAN_R; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= W || y >= H || !isSk(y * W + x)) continue;
      sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
    }
  tangent[i] = 0.5 * Math.atan2(2 * sxy, sxx - syy);
}
/* Geodesic distance from every free end along the skeleton (the start of the
   stem excluded: that end is the crown). */
let crown = -1;
{
  const colInk0 = new Float64Array(W);
  for (let i = 0; i < N; i++) colInk0[i % W] += inside[i];
  let sx = 0;
  for (let x = 1; x < W; x++) if (colInk0[x] > colInk0[sx]) sx = x;
  for (const i of skIdx) if (Math.abs((i % W) - sx) < 16 && (crown < 0 || i < crown)) crown = i;
}
/* A free end: one neighbour, or two that touch each other (a diagonal
   step at the very tip, which a plain count calls a continuation). */
const isEnd = (i) => {
  const nb = skNeighbours(i);
  if (nb.length === 1) return true;
  if (nb.length !== 2) return false;
  const [a, b] = nb;
  return Math.abs((a % W) - (b % W)) <= 1 && Math.abs(((a / W) | 0) - ((b / W) | 0)) <= 1;
};
const toEnd = new Float64Array(N).fill(Infinity);
{
  const queue = [];
  for (const i of skIdx) {
    if (i === crown) continue;
    if (isEnd(i)) {
      toEnd[i] = 0;
      queue.push(i);
    }
  }
  // Dijkstra-lite: unit / diagonal steps on a thin graph; a sorted sweep is
  // enough at this size.
  for (let q = 0; q < queue.length; q++) {
    const u = queue[q];
    for (const v of skNeighbours(u)) {
      const d = toEnd[u] + (Math.abs((v % W) - (u % W)) + Math.abs(((v / W) | 0) - ((u / W) | 0)) === 2 ? Math.SQRT2 : 1);
      if (d < toEnd[v]) {
        toEnd[v] = d;
        queue.push(v);
      }
    }
  }
}
/* Distance from the crown along the skeleton, for the pressure's breathing. */
const fromCrown = new Float64Array(N).fill(0);
{
  const seen = new Uint8Array(N);
  const queue = [crown];
  seen[crown] = 1;
  for (let q = 0; q < queue.length; q++) {
    const u = queue[q];
    for (const v of skNeighbours(u)) if (!seen[v]) {
      seen[v] = 1;
      fromCrown[v] = fromCrown[u] + 1;
      queue.push(v);
    }
  }
}
const baseR = (() => {
  const r = skIdx.map((i) => dIn[i]).sort((a, b) => a - b);
  return r[(r.length / 2) | 0];
})();
/** The brush's slant: strokes along it are thinnest. */
const NIB = (-38 * Math.PI) / 180;
/** How far from a free end the flick tapers, px. */
const TAPER = 70;
function hash1(n) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function smooth1(t) {
  const i = Math.floor(t), f = t - i;
  const a = hash1(i), b = hash1(i + 1);
  return a + (b - a) * f * f * (3 - 2 * f);
}
const radius = new Float32Array(N);
const colInkF = new Float64Array(W);
for (let i = 0; i < N; i++) colInkF[i % W] += inside[i];
let stemCol = 0;
for (let x = 1; x < W; x++) if (colInkF[x] > colInkF[stemCol]) stemCol = x;
for (const i of skIdx) {
  const th = tangent[i];
  const across = Math.abs(Math.sin(th - NIB)); // 1 = broadside to the slant
  let r = baseR * (0.5 + 0.85 * across);
  if (Math.abs((i % W) - stemCol) < 14) r *= 1.12; // the spine carries the weight
  const e = toEnd[i];
  if (e < TAPER) {
    const k = e / TAPER;
    r *= 0.12 + 0.88 * Math.sqrt(k * (2 - k)); // a quarter-circle taper: full, then quickly to a point
  }
  r *= 0.92 + 0.16 * smooth1(fromCrown[i] / 55); // breathing
  // A landing at the crown: the brush first touches and presses.
  const dc = Math.hypot((i % W) - (crown % W), ((i / W) | 0) - ((crown / W) | 0));
  if (dc < 30) r *= 1 + 0.25 * (1 - dc / 30);
  radius[i] = r;
}
/* Sweep: the ink field is how far inside the nearest brush disc a pixel is.
   Run again after the timing pass, once the landings are known. */
function sweep() {
  const field = new Float32Array(N).fill(-1e9);
  for (const i of skIdx) {
    const cx = i % W, cy = (i / W) | 0, r = radius[i];
    const R = Math.ceil(r + 2);
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const v = r - Math.hypot(dx, dy);
        const j = y * W + x;
        if (v > field[j]) field[j] = v;
      }
  }
  for (let i = 0; i < N; i++) {
    cov[i] = Math.max(0, Math.min(1, field[i] + 0.5));
    inside[i] = cov[i] >= 0.5 ? 1 : 0;
  }
  dOut = edt((i) => inside[i]);
  dIn = edt((i) => !inside[i]);
  signDistance();
}
sweep();
console.log(`brush: base r ${baseR.toFixed(1)}px, nib ${((NIB * 180) / Math.PI).toFixed(0)}°`);

/* ---- 5. the stem -------------------------------------------------------- */

/* The column band with the most ink: Mongol script's spine. */
const colInk = new Float64Array(W);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) colInk[x] += inside[y * W + x];
let stemX = 0;
for (let x = 1; x < W; x++) if (colInk[x] > colInk[stemX]) stemX = x;
let sL = stemX, sR = stemX;
while (sL > 0 && colInk[sL - 1] > colInk[stemX] * 0.6) sL--;
while (sR < W - 1 && colInk[sR + 1] > colInk[stemX] * 0.6) sR++;
const stemHalf = Math.max(4, (sR - sL) / 2);
const stemC = (sL + sR) / 2;
const onStem = (i) => Math.abs((i % W) - stemC) <= stemHalf * 1.15;
console.log(`stem x ${stemC.toFixed(1)} ±${stemHalf.toFixed(1)}`);

/* ---- 6. Dijkstra -------------------------------------------------------- */

class Heap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const k = this.k, v = this.v;
    let i = k.length;
    k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v;
    const topV = v[0], topK = k[0];
    const lk = k.pop(), lv = v.pop();
    if (k.length) {
      let i = 0;
      const n = k.length;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = lk; v[i] = lv;
    }
    return [topK, topV];
  }
}
/* Pressure: half-width at the skeleton. Thick = pressed = slow. */
let rMax = 1;
for (const i of skIdx) rMax = Math.max(rMax, dIn[i]);

/*
 * **One hand, one brush.** The flood below only builds the *route*: a
 * shortest-path tree over the skeleton from the top of the stem. The time
 * is then walked along that tree serially, the way a hand writes it — down
 * the stem, out along each tooth or tail as the brush reaches it, lift,
 * back to the stem, on. Only one place is ever wet at the front, the brush
 * pauses in the air between strokes, and each stroke has its own pace: a
 * slow press where it lands, a steady body, a quick flick into the taper.
 * (A plain flood fills every branch at once, which reads as ink spreading
 * through the paper rather than as a hand.)
 */
const parent = new Int32Array(N).fill(-1);
const roots = [];
{
  const dist = new Float64Array(N).fill(Infinity);
  let start = -1;
  for (const i of skIdx) if (onStem(i) && (start < 0 || i < start)) start = i; // topmost (row-major)
  if (start < 0) start = skIdx[0];
  const heap = new Heap();
  const done = new Uint8Array(N);
  const flood = (root) => {
    roots.push(root);
    dist[root] = 0;
    heap.push(0, root);
    while (heap.size) {
      const [d, u] = heap.pop();
      if (done[u]) continue;
      done[u] = 1;
      const ux = u % W, uy = (u / W) | 0;
      for (const [dx, dy] of NB) {
        const x = ux + dx, y = uy + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const w = y * W + x;
        if (!sk[w] || done[w]) continue;
        // The stem is the cheap road, so the tree follows the spine and
        // hangs the letters' parts off it.
        const nd = d + Math.hypot(dx, dy) * (onStem(u) && onStem(w) ? 1 : 2.4);
        if (nd < dist[w]) {
          dist[w] = nd;
          parent[w] = u;
          heap.push(nd, w);
        }
      }
    }
  };
  flood(start);
  /* Islands the skeleton never reaches (a detached dot or stroke): each is
     its own stroke, after a lift, top to bottom (row-major = topmost first). */
  for (const i of skIdx) if (!done[i]) flood(i);
}

const kids = new Map();
for (const i of skIdx) {
  const p = parent[i];
  if (p < 0) continue;
  if (!kids.has(p)) kids.set(p, []);
  kids.get(p).push(i);
}
/* Length of each subtree, for ordering and for skipping lifts on stubs. */
const subLen = new Float64Array(N);
{
  const order = [];
  const stack = [...roots];
  while (stack.length) {
    const u = stack.pop();
    order.push(u);
    for (const c of kids.get(u) ?? []) stack.push(c);
  }
  for (let k = order.length - 1; k >= 0; k--) {
    const u = order[k];
    const p = parent[u];
    if (p >= 0) subLen[p] += subLen[u] + Math.hypot((u % W) - (p % W), ((u / W) | 0) - ((p / W) | 0));
  }
}
/* The trunk at a junction is the child carrying the most of what is left —
   not "the child on the stem's column": at the bowls the skeleton swings off
   the column, and that test sent the brush down the whole stem first and
   back up for the parts it had passed. */
const trunkOf = (u) => {
  let best = -1;
  for (const c of kids.get(u) ?? []) if (best < 0 || subLen[c] > subLen[best]) best = c;
  return best;
};
/* At a junction: the letter's parts first, top to bottom, then on down the
   trunk. */
const orderKids = (u) => {
  const trunk = trunkOf(u);
  return (kids.get(u) ?? [])
    .filter((c) => c !== trunk)
    .sort((a, b) => ((a / W) | 0) - ((b / W) | 0) || (a % W) - (b % W))
    .concat(trunk >= 0 ? [trunk] : []);
};

/** Pen-lift: a beat in the air, plus the travel back, in px-of-stroke time. */
const LIFT_BEAT = 46;
const LIFT_TRAVEL = 0.55;
/** A subtree shorter than this is a bump in the stroke, not a stroke. */
const MIN_STROKE = 24;
/** The slow press where the brush lands, px. */
const ATTACK = 26;

const skT = new Float64Array(N).fill(Infinity);
/** Distance along its own stroke, for the pooling where it landed. */
const strokeAt = new Float64Array(N);
const landing = new Float32Array(N); // 0 none, else how hard it pressed
/** How hard the stroke each skeleton pixel belongs to landed (for pooling). */
const strokeLand = new Float32Array(N);
/** The brush's route in time: [t, x, y, down, r] per visited node. */
const route = [];
let clock = 0;
let lifted = 0;
let strokes = 0;
{
  const clampS = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const smoothS = (e0, e1, x) => {
    const t = clampS((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  };
  let tip = -1;
  const lift = (to) => {
    const tx = tip % W, ty = (tip / W) | 0;
    route.push([clock, tx, ty, 0, radius[tip]]);
    const travel = Math.hypot((to % W) - tx, ((to / W) | 0) - ty);
    const dt = LIFT_BEAT + travel * LIFT_TRAVEL;
    clock += dt;
    lifted += dt;
  };
  const visit = (u, sLen, land, sLand) => {
    skT[u] = clock;
    strokeAt[u] = sLen;
    strokeLand[u] = sLand;
    if (land) landing[u] = land;
    route.push([clock, u % W, (u / W) | 0, 1, radius[u]]);
    tip = u;
  };
  for (let r = 0; r < roots.length; r++) {
    const root = roots[r];
    if (r > 0) lift(root);
    strokes++;
    // The crown has its own landing already (step 4b), but it pools too.
    visit(root, 0, r > 0 ? 1.18 : 0, 1.18);
    // Explicit stack: the stem is thousands of px deep.
    const stack = [{ u: root, list: orderKids(root), k: 0, sLen: 0, sLand: 1.18 }];
    while (stack.length) {
      const f = stack[stack.length - 1];
      if (f.k >= f.list.length) {
        stack.pop();
        continue;
      }
      const c = f.list[f.k];
      let sLen = f.sLen;
      let sLand = f.sLand;
      let land = 0;
      if (f.k > 0) {
        // Back to this junction for the next part. A real stroke lifts;
        // a stub is just the brush's wobble.
        const prev = f.list[f.k - 1];
        if (subLen[prev] >= MIN_STROKE) {
          lift(f.u);
          strokes++;
          sLen = 0;
          land = c === f.list[f.list.length - 1] ? 1.06 : 1.18;
          sLand = land;
        } else {
          clock += Math.hypot((tip % W) - (f.u % W), ((tip / W) | 0) - ((f.u / W) | 0));
        }
      }
      f.k++;
      const ux = f.u % W, uy = (f.u / W) | 0, cx = c % W, cy = (c / W) | 0;
      const len = Math.hypot(cx - ux, cy - uy);
      const press = 0.75 + 0.6 * (dIn[c] / rMax);
      const climb = cy < uy && !onStem(c) ? 1.35 : 1; // up-strokes are pushed, not pulled
      const attack = 1 + 1.3 * (1 - smoothS(0, ATTACK, sLen)); // the landing
      const flick = 0.55 + 0.45 * smoothS(0, TAPER, toEnd[c]); // out into the taper
      const body = onStem(c) ? 1 : 0.9;
      clock += len * press * climb * attack * flick * body;
      sLen += len;
      visit(c, sLen, land, sLand);
      stack.push({ u: c, list: orderKids(c), k: 0, sLen, sLand });
    }
  }
  console.log(`strokes ${strokes}, ${((100 * lifted) / clock).toFixed(0)}% of the writing in the air`);
}

/* Landings: where a stroke begins after a lift, the brush presses and the
   ink pools. Widen the brush there and sweep again. */
{
  const starts = skIdx.filter((i) => landing[i] > 0);
  if (starts.length) {
    for (const i of skIdx) {
      const ix = i % W, iy = (i / W) | 0;
      let k = 1;
      for (const s of starts) {
        const dc = Math.hypot(ix - (s % W), iy - ((s / W) | 0));
        if (dc < 22) k = Math.max(k, 1 + (landing[s] - 1) * (1 - dc / 22));
      }
      radius[i] *= k;
    }
    sweep();
  }
}

/* Spread from the skeleton to every pixel in reach (ink + the bleed ring):
   each pixel takes the earliest skeleton point whose brush covers it, plus a
   little for the distance, so the ink spreads out from the brush's centre
   line. Only from a point whose disc reaches it — a flood through the ink
   would run down the stem faster than the brush and outrun the writing. */
const SPREAD_COST = 0.35;
const T = new Float64Array(N).fill(Infinity);
/** The skeleton pixel each ink pixel was reached from: its stroke direction. */
const src = new Int32Array(N).fill(-1);
for (const i of skIdx) {
  const cx = i % W, cy = (i / W) | 0;
  const R = Math.ceil(radius[i] + SPREAD);
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const d = Math.hypot(dx, dy);
      if (d > R) continue;
      const w = y * W + x;
      if (sdf[w] < -SPREAD) continue;
      const t = skT[i] + d * SPREAD_COST;
      if (t < T[w]) {
        T[w] = t;
        src[w] = i;
      }
    }
}
let tMax = 0;
for (let i = 0; i < N; i++) if (inside[i] && T[i] < Infinity) tMax = Math.max(tMax, T[i]);

/* The route, thinned: a point every few px, every lift kept exactly. Times
   share G's scale (÷ tMax), positions are 0…1 of the texture. */
const pathOut = [];
{
  let last = null;
  for (let k = 0; k < route.length; k++) {
    const p = route[k];
    const edge = k === 0 || k === route.length - 1 || p[3] === 0 || route[k - 1][3] === 0 || route[k + 1]?.[3] === 0;
    if (!edge && last && Math.hypot(p[1] - last[1], p[2] - last[2]) < 5) continue;
    pathOut.push(
      +(p[0] / tMax).toFixed(4),
      +(p[1] / W).toFixed(4),
      +(p[2] / H).toFixed(4),
      p[3],
      +p[4].toFixed(1)
    );
    last = p;
  }
  console.log(`path ${pathOut.length / 5} points`);
}

/* ---- 7. pack ------------------------------------------------------------ */

const rgb = Buffer.alloc(N * 3);
for (let i = 0; i < N; i++) {
  const s = Math.max(-1, Math.min(1, sdf[i] / SPREAD));
  rgb[i * 3] = Math.round(127.5 + s * 127.5);
  const a = T[i] === Infinity ? 1 : Math.min(1, T[i] / tMax);
  rgb[i * 3 + 1] = Math.round(a * 255);
  /* B: how freshly the stroke landed — the ink pools there and stays wet
     longer. Zero almost everywhere, so it costs nothing to store. */
  const k = src[i];
  // A fresh stroke pools; picking the stem back up after a tooth barely does.
  const pool = k >= 0 && T[i] !== Infinity
    ? (strokeLand[k] >= 1.15 ? 1 : 0.25) * Math.max(0, 1 - strokeAt[k] / 30)
    : 0;
  rgb[i * 3 + 2] = Math.round(pool * 255);
}

/* The finished ink as alpha: the dry streaks of the late strokes baked in. */
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const rgba = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const x = i % W, y = (i / W) | 0;
  const edge = vnoise(x * 0.35, y * 0.35) * 0.9 - 0.45; // ragged fibre edge, ±0.45px
  let a = Math.max(0, Math.min(1, sdf[i] + 0.5 + edge));
  if (a > 0) {
    const late = T[i] === Infinity ? 1 : T[i] / tMax;
    // Streaks run along the stroke: rotate into the brush's frame.
    const th = src[i] >= 0 ? tangent[src[i]] : Math.PI / 2;
    const c = Math.cos(th), s2 = Math.sin(th);
    const along = x * c + y * s2, across = -x * s2 + y * c;
    const streak = vnoise(along * 0.05, across * 0.8) * 0.7 + vnoise(along * 0.1, across * 1.9) * 0.3;
    const dry = Math.max(0, late - 0.5) / 0.5; // the brush runs dry toward the foot
    const edge01 = 1 - Math.min(1, Math.max(0, sdf[i]) / 5); // the edges go first
    const thr = 0.12 + 0.3 * dry * dry * (0.35 + 0.65 * edge01);
    if (streak < thr) a *= 0.15 + 0.55 * (streak / thr);
  }
  rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 255;
  rgba[i * 4 + 3] = Math.round(a * 255);
}

/* ---- 8. PNG ------------------------------------------------------------- */

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, channels, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : channels === 3 ? 2 : 0;
  const stride = w * channels;
  const raw = Buffer.alloc((stride + 1) * h);
  /* Per-row filter (none/sub/up/paeth), whichever leaves the smallest
     residuals: the fields are smooth, and unfiltered they barely compress. */
  const cand = [0, 1, 2, 4].map(() => Buffer.alloc(stride));
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < h; y++) {
    const row = y * stride, up = (y - 1) * stride;
    for (let i = 0; i < stride; i++) {
      const v = pixels[row + i];
      const a = i >= channels ? pixels[row + i - channels] : 0;
      const b = y ? pixels[up + i] : 0;
      const c = y && i >= channels ? pixels[up + i - channels] : 0;
      cand[0][i] = v;
      cand[1][i] = (v - a) & 255;
      cand[2][i] = (v - b) & 255;
      cand[3][i] = (v - paeth(a, b, c)) & 255;
    }
    let best = 0, bestSum = Infinity;
    cand.forEach((buf, k) => {
      let sum = 0;
      for (let i = 0; i < stride; i++) sum += buf[i] < 128 ? buf[i] : 256 - buf[i];
      if (sum < bestSum) { bestSum = sum; best = k; }
    });
    raw[y * (stride + 1)] = [0, 1, 2, 4][best];
    cand[best].copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

await mkdir(new URL("public/intro/", ROOT), { recursive: true });
await writeFile(new URL("public/intro/ink-name.png", ROOT), png(W, H, 3, rgb));
await writeFile(new URL("public/intro/ink-name-mask.png", ROOT), png(W, H, 4, rgba));

const ts = `/**
 * GENERATED by scripts/bake-ink-name.mjs — do not edit by hand.
 * Rerun it whenever \`profile.nameScript\` changes.
 *
 * The Mongol-script name as a brush stroke, already turned for vertical-lr.
 * \`/intro/ink-name.png\`: R signed distance (±spread px, 128 = edge, ink
 * > 128), G when the brush reaches the pixel (0…255 of the writing).
 * \`/intro/ink-name-mask.png\`: the finished ink as alpha, for static signs.
 */
export const INK_NAME = {
  src: "/intro/ink-name.png",
  mask: "/intro/ink-name-mask.png",
  width: ${W},
  height: ${H},
  /** SDF range each side of the edge, texture px. */
  spread: ${SPREAD},
  /** Empty margin round the ink, texture px. */
  pad: ${PAD},
  /** The stem's centre, 0…1 across the texture. */
  stemX: ${(stemC / W).toFixed(4)},
} as const;

/**
 * The brush's route, flattened 5 to a point: [t, x, y, down, r].
 * t on G's scale (0…1), x/y 0…1 of the texture, down 1 on the paper and 0
 * in the air (between a 0 and the next 1 the brush is travelling), r the
 * brush's half-width there in texture px.
 */
export const INK_PATH: readonly number[] = [${pathOut.join(",")}];
`;
await writeFile(new URL("src/lib/inkName.ts", ROOT), ts);
console.log("wrote public/intro/ink-name.png, ink-name-mask.png, src/lib/inkName.ts");

/* ---- preview: the arrival field and four moments of the writing --------- */

if (previewAt) {
  const panels = 2 + frames.length;
  const PW = W * panels + 10 * (panels - 1);
  const out = Buffer.alloc(PW * H * 3, 20);
  const put = (p, x, y, r, g, b) => {
    const o = (y * PW + p * (W + 10) + x) * 3;
    out[o] = r; out[o + 1] = g; out[o + 2] = b;
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const a = T[i] === Infinity ? 1 : T[i] / tMax;
      if (inside[i]) put(0, x, y, Math.round(255 * a), Math.round(80 + 100 * (1 - a)), Math.round(255 * (1 - a)));
      if (sk[i]) put(1, x, y, 255, 255, 255);
      else if (inside[i]) put(1, x, y, 60, 60, 70);
      frames.forEach((t, k) => {
        const ink = rgba[i * 4 + 3] / 255;
        const on = a <= t ? ink : 0;
        const v = Math.round(232 - on * 220);
        put(2 + k, x, y, v, Math.round(v * 0.96), Math.round(v * 0.86));
      });
    }
  await writeFile(previewAt, png(PW, H, 3, out));
  console.log(`preview → ${previewAt}`);
}
