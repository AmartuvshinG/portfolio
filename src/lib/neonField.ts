/**
 * Neon field — the dotted data-rain, and a word condensed out of it.
 *
 * Ported from 21st.dev's Neon Katakana Preloader (the reference lives in the
 * repo root as `cyberpunk neon preloaer.txt`), and split so three things can
 * share it: the site's ground (NeonGround: the rain alone, behind every
 * section), the case-file gate (a project's name condensing while its images
 * load) and the 404 (a word that never finishes arriving).
 *
 * Two departures from the reference, both standing rules of this site:
 *
 *   - **No katakana.** The future city here is Ulaanbaatar. The falling code
 *     is Cyrillic and digits, and a word decodes through Cyrillic look-alikes
 *     when it is Cyrillic, Latin ones when it is Latin.
 *   - **No random glitch.** The reference tore the word with a red ghost and
 *     shifted bands every couple of seconds. A random tear is
 *     indistinguishable from a rendering fault, so here it happens once, at
 *     lock, as part of the word arriving — and never again.
 *
 * Everything is pure canvas 2D. No fonts are fetched: a word is drawn in
 * whatever face the page already has loaded.
 */

export const clamp01 = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x);

/** The falling code: Mongolian Cyrillic and digits. JetBrains Mono has every
    one of them, Ө and Ү included. */
export const RAIN_GLYPHS = "АБВГДЕЖЗИЙКЛМНОӨПРСТУҮФХЦЧШЭЮЯ0123456789";
export const MONO_STACK = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

// ---------------------------------------------------------------------------
// Timeline helpers
// ---------------------------------------------------------------------------

/* Three eased surges separated by two stalls, so a simulated load reads like
   a real one instead of a linear tween. [time, progress] knots. */
const KNOTS = [
  [0, 0],
  [0.3, 0.38],
  [0.4, 0.41],
  [0.68, 0.77],
  [0.78, 0.8],
  [1, 1],
];

export function simulated(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  for (let i = 0; i < KNOTS.length - 1; i++) {
    const a = KNOTS[i];
    const b = KNOTS[i + 1];
    if (t <= b[0]) {
      const local = (t - a[0]) / (b[0] - a[0]);
      const eased = 1 - Math.pow(1 - local, 3);
      return a[1] + (b[1] - a[1]) * eased;
    }
  }
  return 1;
}

/** Deterministic noise in [0, 1). Client-only canvas work, never in markup, so
    the sine hash's last-bit differences between engines cannot matter. */
export function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const CYRILLIC_POOL = "АБВГДЕЖЗИЙКЛМНОӨПРСТУҮФХЦЧШЭЮЯ";
const LATIN_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@";
const IS_CYRILLIC = /[Ѐ-ӿ]/;

/**
 * Decodes `target` left to right: the first `p` of its characters are
 * settled, the rest cycle through look-alikes picked by `tick`. Spaces and
 * punctuation never scramble.
 */
export function decode(target: string, p: number, tick: number) {
  const chars = Array.from(target);
  const settled = Math.floor(clamp01(p) * chars.length + 1e-9);
  return chars
    .map((c, i) => {
      if (i < settled || !/[\p{L}\p{N}]/u.test(c)) return c;
      const pool = IS_CYRILLIC.test(c) ? CYRILLIC_POOL : LATIN_POOL;
      const pick = pool.charAt(Math.floor(hash(i * 31 + tick * 7.13) * pool.length));
      return c === c.toLowerCase() && c !== c.toUpperCase() ? pick.toLowerCase() : pick;
    })
    .join("");
}

/** 0–100 as a fixed-width counter: 7 → "007". */
export function counter(pct: number) {
  return String(Math.round(Math.min(100, Math.max(0, pct)))).padStart(3, "0");
}

/** Size a word for the stage: one line, or stacked when the stage is tall
    and narrow and stacking buys a much bigger word. */
export function layout(count: number, unitWidth: number, w: number, h: number) {
  const horiz = Math.min((w * 0.84 * 100) / Math.max(1, unitWidth), h * 0.3);
  const vert = Math.min((h * 0.6) / Math.max(1, count), w * 0.42);
  const vertical = count > 1 && h > w * 1.15 && vert > horiz * 1.25;
  return { size: Math.max(18, Math.round(vertical ? vert : horiz)), vertical };
}

/** Smooth value noise on the hashed lattice. */
function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const h = (a: number, b: number) => hash(a * 57 + b * 113);
  const top = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * u;
  const bot = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * u;
  return top + (bot - top) * v;
}

/** Any CSS colour → [r, g, b], through the canvas parser. */
export function toRgb(color: string): [number, number, number] {
  const c = document.createElement("canvas").getContext("2d");
  if (!c) return [255, 255, 255];
  c.fillStyle = "#000";
  c.fillStyle = color;
  const v = String(c.fillStyle);
  if (v.charAt(0) === "#") {
    const hex = v.slice(1);
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  const m = v.match(/[\d.]+/g);
  return m ? [Number(m[0]), Number(m[1]), Number(m[2])] : [255, 255, 255];
}

// ---------------------------------------------------------------------------
// Rain
// ---------------------------------------------------------------------------

export interface RainCol {
  x: number;
  head: number;
  speed: number;
  len: number;
  weight: number;
  glyph: boolean;
  seed: number;
}

/**
 * Columns across a stage `w` wide. `weight(xn)` (xn 0…1 across the stage)
 * says how strongly each part of the stage rains: the word gate rains hardest
 * over its word, the site's ground hardest in the gutters, away from the text.
 */
export function buildRain(
  w: number,
  h: number,
  { density = 1, gap: baseGap = 11, weight }: { density?: number; gap?: number; weight: (xn: number) => number }
): RainCol[] {
  const cols: RainCol[] = [];
  if (density <= 0) return cols;
  const gap = baseGap / Math.max(0.05, density);
  for (let x = gap * 0.5, k = 0; x < w; x += gap, k++) {
    const jitter = (hash(k + 0.5) - 0.5) * gap * 0.6;
    const wt = clamp01(weight(x / Math.max(1, w)));
    cols.push({
      x: Math.round(x + jitter) + 0.5,
      head: hash(k + 1.7) * h * 1.4 - h * 0.2,
      speed: (50 + 190 * hash(k + 2.9)) * (0.6 + wt),
      len: 30 + h * 0.55 * hash(k + 4.1) * (0.35 + wt),
      weight: wt,
      glyph: hash(k + 6.3) < 0.28,
      seed: hash(k + 8.9),
    });
  }
  return cols;
}

export interface RainFrame {
  /** Frame time, ms. */
  now: number;
  /** Since the last frame, ms (0 for a still frame). */
  dt: number;
  /** Stage height, CSS px. */
  h: number;
  /** Overall strength, 0…1+. */
  level: number;
  /** Fall-speed multiplier (scroll pushes this up). */
  speed?: number;
  /** Extra streak length, CSS px (scroll pulls the dots into streaks). */
  stretch?: number;
  /** How near a column is to something stirring it (the cursor, a heading
      arriving), 0…1: it falls faster and burns brighter. */
  near?: (x: number) => number;
  /** The rain's colour as rgb, and the heads' hot core. */
  glow: [number, number, number];
  core: string;
  /** A soft square of light under each head: the glow, without a canvas
      filter (a drop-shadow on a fullscreen canvas re-runs every frame). */
  halo?: boolean;
}

/** Advance and draw every column: a dotted trail fading up from its head. */
export function drawRain(ctx: CanvasRenderingContext2D, cols: RainCol[], f: RainFrame) {
  const [r, g, b] = f.glow;
  const rgba = (a: number) => `rgba(${r},${g},${b},${a.toFixed(3)})`;
  const speed = f.speed ?? 1;
  const stretch = f.stretch ?? 0;
  ctx.lineWidth = 1.3;
  ctx.setLineDash([1.4, 2.8]);
  ctx.font = "11px " + MONO_STACK;
  ctx.textAlign = "center";
  for (let c = 0; c < cols.length; c++) {
    const col = cols[c];
    const near = f.near ? f.near(col.x) : 0;
    col.head += (col.speed * (1 + near * 2.2) * speed * f.dt) / 1000;
    if (col.head - col.len > f.h) {
      col.head = -hash(f.now * 0.001 + c) * f.h * 0.4;
      col.len = 30 + f.h * 0.55 * hash(f.now * 0.0013 + c * 3.7) * (0.35 + col.weight);
    }
    const len = col.len + stretch * (0.6 + col.seed * 0.8);
    const top = col.head - len;
    const a = Math.min(1, (col.weight * 0.6 + near * 0.4) * f.level);
    if (a < 0.01) continue;
    const grad = ctx.createLinearGradient(0, top, 0, col.head);
    grad.addColorStop(0, rgba(0));
    grad.addColorStop(1, rgba(a));
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(col.x, top);
    ctx.lineTo(col.x, col.head);
    ctx.stroke();
    if (f.halo) {
      ctx.fillStyle = rgba(Math.min(1, a) * 0.16);
      ctx.fillRect(col.x - 5, col.head - 6, 10, 10);
    }
    ctx.fillStyle = f.core;
    ctx.globalAlpha = Math.min(1, a * 1.4);
    if (col.glyph) {
      const glyph = RAIN_GLYPHS.charAt(Math.floor(f.now / 110 + c * 7) % RAIN_GLYPHS.length);
      ctx.fillText(glyph, col.x, col.head + 4);
    } else {
      ctx.fillRect(col.x - 1.1, col.head - 1.1, 2.2, 2.2);
    }
    ctx.globalAlpha = 1;
  }
  ctx.setLineDash([]);
}

// ---------------------------------------------------------------------------
// The word: sampled into grains, eroded into a brushed, drippy texture
// ---------------------------------------------------------------------------

export interface Strand {
  x: number;
  top: number;
  bottom: number;
  seed: number;
}

export interface WordField {
  n: number;
  /** Grains from here on are the hot core; before it, the cool edge. */
  hotFrom: number;
  hx: Float32Array;
  hy: Float32Array;
  size: Float32Array;
  alpha: Float32Array;
  /** Reveal order, 0…1. */
  rank: Float32Array;
  fall: Float32Array;
  seed: Float32Array;
  /** When each grain arrived (ms), −1 not yet. */
  act: Float32Array;
  ox: Float32Array;
  oy: Float32Array;
  /** Where each grain was last drawn (−1e5: not drawn). */
  dx: Float32Array;
  dy: Float32Array;
  box: { x: number; y: number; w: number; h: number };
  /** The cursor's push radius. */
  reach: number;
  strands: Strand[];
}

export function buildWord(
  w: number,
  h: number,
  word: string,
  { font, weight = "900", cy = 0.5 }: { font: string; weight?: string; cy?: number }
): WordField {
  const W = Math.max(1, Math.ceil(w));
  const H = Math.max(1, Math.ceil(h));
  const chars = Array.from(word.trim() || " ");
  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const c = off.getContext("2d", { willReadFrequently: true })!;
  c.font = `${weight} 100px ${font}`;
  const { size, vertical } = layout(chars.length, c.measureText(chars.join("")).width, W, H);

  c.font = `${weight} ${size}px ${font}`;
  c.fillStyle = "#fff";
  c.textAlign = "center";
  c.textBaseline = "middle";
  const mid = H * cy;
  if (vertical) {
    chars.forEach((ch, i) => c.fillText(ch, W / 2, mid + (i - (chars.length - 1) / 2) * size * 1.02));
  } else {
    c.fillText(chars.join(""), W / 2, mid);
  }
  const data = c.getImageData(0, 0, W, H).data;
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < W && y < H && data[(Math.round(y) * W + Math.round(x)) * 4 + 3] > 110;

  const step = Math.max(2, Math.round(size / 68));
  const grit = size * 0.2;
  const cool: number[][] = [];
  const hot: number[][] = [];
  let x0 = W;
  let x1 = 0;
  let y0 = H;
  let y1 = 0;

  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      if (!inside(x, y)) continue;
      const id = x * 7.31 + y * 1.97;
      // brushed erosion: blotches plus long vertical scratches
      const g = 0.6 * vnoise(x / grit, y / grit) + 0.4 * vnoise(x / (step * 2.4), y / (size * 0.9));
      const keep = 0.98 - 0.7 * Math.min(1, Math.max(0, (g - 0.52) / 0.3));
      if (hash(id) > keep) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      const r = hash(id + 11);
      const edge = !(inside(x - step * 2, y) && inside(x + step * 2, y) && inside(x, y - step * 2) && inside(x, y + step * 2));
      // [x, y, size, alpha, —, fall, seed], jittered off the grid so the
      // strokes read as brushed, not tiled
      const gx = x + (hash(id + 13) - 0.5) * step * 0.7;
      const grain = [gx, y, step * (0.55 + 0.6 * r), (edge ? 0.45 : 0.62) + 0.38 * hash(id + 3), 0, 30 + 170 * hash(id + 5), hash(id + 9)];
      if (!edge && hash(id + 21) < 0.55) hot.push(grain);
      else cool.push(grain);

      // drips: dotted runs leaking off the bottoms (and a few tops) of strokes
      const below = !inside(x, y + step);
      const above = !inside(x, y - step);
      if ((below && hash(id + 31) < 0.2) || (above && hash(id + 37) < 0.08)) {
        const dir = below ? 1 : -1;
        const len = 2 + Math.floor(Math.pow(hash(id + 41), 2) * 30);
        for (let j = 1; j <= len; j++) {
          const fade = 1 - j / (len + 1);
          cool.push([x, y + dir * j * step * 1.7, step * 0.55, 0.55 * fade * fade, 0, 30 + 170 * hash(id + j), hash(id + j * 3)]);
        }
      }
    }
  }
  if (x1 < x0) {
    x0 = x1 = W / 2;
    y0 = y1 = H / 2;
  }
  const bw = Math.max(1, x1 - x0);
  const bh = Math.max(1, y1 - y0);
  // reveal order: sweeps along the reading direction, scattered by noise
  const order = (g: number[]) => {
    const along = vertical ? (g[1] - y0) / bh : (g[0] - x0) / bw;
    return Math.min(1, 0.55 * clamp01(along) + 0.45 * g[6]);
  };
  const all = cool.concat(hot);
  const n = all.length;
  const f: WordField = {
    n,
    hotFrom: cool.length,
    hx: new Float32Array(n),
    hy: new Float32Array(n),
    size: new Float32Array(n),
    alpha: new Float32Array(n),
    rank: new Float32Array(n),
    fall: new Float32Array(n),
    seed: new Float32Array(n),
    act: new Float32Array(n).fill(-1),
    ox: new Float32Array(n),
    oy: new Float32Array(n),
    dx: new Float32Array(n),
    dy: new Float32Array(n),
    box: { x: x0, y: y0, w: bw, h: bh },
    reach: Math.max(50, size * 0.42),
    strands: [],
  };
  all.forEach((g, i) => {
    f.hx[i] = g[0];
    f.hy[i] = g[1];
    f.size[i] = g[2];
    f.alpha[i] = g[3];
    f.rank[i] = order(g);
    f.fall[i] = g[5];
    f.seed[i] = g[6];
  });

  // faint dotted threads hanging through the word
  const strandCount = Math.round(10 + bw / 60);
  for (let i = 0; i < strandCount; i++) {
    const s = hash(i + 90.1);
    f.strands.push({
      x: Math.round(x0 + bw * hash(i + 77.7)) + 0.5,
      top: y0 - (0.2 + 0.9 * s) * Math.min(H * 0.35, bh * 1.2),
      bottom: y1 + (0.2 + 0.9 * hash(i + 55.5)) * Math.min(H * 0.35, bh * 1.2),
      seed: s,
    });
  }
  return f;
}

/** The word's rain is densest over the word itself. */
export function wordWeight(field: WordField, w: number) {
  const mid = 0.5;
  const spread = (Math.max(field.box.w, w * 0.3) * 0.62) / Math.max(1, w);
  return (xn: number) => {
    const d = (xn - mid) / spread;
    return 0.12 + 0.88 * Math.exp(-d * d);
  };
}

export type WordPhase = "boot" | "lock" | "open" | "release";

export interface WordFrame {
  now: number;
  phase: WordPhase;
  /** How much of the word has condensed, 0…1 (boot only). */
  reveal: number;
  /** ms since the phase began. */
  since: number;
  /** Stage width, for the spread as the window opens. */
  w: number;
  reduced: boolean;
  /** Cursor in stage px, or null. */
  pointer: { x: number; y: number } | null;
  glow: string;
  core: string;
}

/** Advance and draw the word's grains: falling into place while it boots, a
    breath while it is locked, dropping away as the window opens. */
export function drawWord(ctx: CanvasRenderingContext2D, f: WordField, s: WordFrame) {
  const R = f.reach;
  const pt = s.pointer;
  for (let i = 0; i < f.n; i++) {
    if (s.phase === "boot" && f.act[i] < 0 && f.rank[i] <= s.reveal) f.act[i] = s.now;
    let tx = 0;
    let ty = 0;
    if (pt) {
      const ddx = f.hx[i] - pt.x;
      const ddy = f.hy[i] - pt.y;
      if (ddx > -R && ddx < R && ddy > -R && ddy < R) {
        const d = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        if (d < R) {
          const k = 1 - d / R;
          const push = k * k * R * 0.5;
          tx = (ddx / d) * push;
          ty = (ddy / d) * push;
        }
      }
    }
    f.ox[i] += (tx - f.ox[i]) * 0.16;
    f.oy[i] += (ty - f.oy[i]) * 0.16;
  }

  const releasing = s.phase === "release" || s.phase === "open";
  const grains = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      let a = f.alpha[i];
      const sz = f.size[i];
      let x = f.hx[i] + f.ox[i];
      let y = f.hy[i] + f.oy[i];
      let len = sz;
      if (releasing) {
        if (s.reduced) a *= Math.max(0, 1 - s.since / 700);
        else {
          const t = Math.max(0, s.since - f.rank[i] * 420) / 1000;
          const drop = 0.5 * 1100 * t * t * (0.5 + f.seed[i]);
          y += drop;
          len += Math.min(48, drop * 0.3);
          a *= Math.max(0, 1 - t * 1.5);
          if (s.phase === "open") x += (x - s.w / 2) * t * 0.35;
        }
      } else {
        const at = f.act[i];
        if (at < 0) {
          f.dx[i] = -1e5;
          continue;
        }
        const k = s.reduced ? 1 : Math.min(1, (s.now - at) / 640);
        if (k < 1) {
          const e = 1 - (1 - k) * (1 - k) * (1 - k);
          y -= f.fall[i] * (1 - e);
          len += (1 - e) * f.fall[i] * 0.32;
          a *= 0.3 + 0.7 * k;
        }
        if (s.phase === "lock" && !s.reduced) a *= 0.84 + 0.16 * Math.sin(s.now * 0.006 + f.seed[i] * 60);
      }
      if (a <= 0.01) {
        f.dx[i] = -1e5;
        continue;
      }
      f.dx[i] = x;
      f.dy[i] = y;
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.fillRect(x - sz * 0.4, y - sz * 0.7 - (len - sz), sz * 0.8, len + sz * 0.4);
    }
  };
  ctx.fillStyle = s.glow;
  grains(0, f.hotFrom);
  ctx.fillStyle = s.core;
  grains(f.hotFrom, f.n);
  ctx.globalAlpha = 1;
}

/** The threads through the word, breathing. */
export function drawStrands(
  ctx: CanvasRenderingContext2D,
  strands: Strand[],
  { now, alpha, glow }: { now: number; alpha: number; glow: [number, number, number] }
) {
  if (alpha <= 0.01) return;
  const [r, g, b] = glow;
  ctx.lineWidth = 1;
  ctx.setLineDash([1.2, 3.6]);
  for (const s of strands) {
    ctx.strokeStyle = `rgba(${r},${g},${b},${(alpha * (0.5 + 0.5 * Math.sin(now * 0.002 + s.seed * 40))).toFixed(3)})`;
    ctx.lineDashOffset = -now * 0.02 * (0.5 + s.seed);
    ctx.beginPath();
    ctx.moveTo(s.x, s.top);
    ctx.lineTo(s.x, s.bottom);
    ctx.stroke();
  }
  ctx.lineDashOffset = 0;
  ctx.setLineDash([]);
}

/**
 * The word's one tear, at lock: a red ghost a few pixels off, and two to five
 * scanline bands shifted sideways. It is the signal catching, not a fault —
 * which is why it happens exactly once.
 *
 * `t` is 0…1 through the tear; the bands are chosen from `seed` so the tear
 * holds still for its 280 ms instead of jittering every frame.
 */
export function drawTear(
  ctx: CanvasRenderingContext2D,
  scratch: HTMLCanvasElement,
  f: WordField,
  { t, seed, dpr, accent }: { t: number; seed: number; dpr: number; accent: string }
) {
  if (t <= 0 || t >= 1) return;
  const fade = 1 - t;
  const shift = 3 + hash(seed) * 7;
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.38 * fade;
  for (let i = seed % 3 | 0; i < f.n; i += 3) {
    if (f.dx[i] < -1e4) continue;
    ctx.fillRect(f.dx[i] + shift, f.dy[i] - f.size[i] * 0.5, f.size[i], f.size[i]);
  }
  ctx.globalAlpha = 1;
  const sctx = scratch.getContext("2d");
  if (!sctx) return;
  const canvas = ctx.canvas;
  if (scratch.width !== canvas.width || scratch.height !== canvas.height) {
    scratch.width = canvas.width;
    scratch.height = canvas.height;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  sctx.drawImage(canvas, 0, 0);
  const b = f.box;
  const bands = 2 + Math.floor(hash(seed + 1) * 4);
  for (let k = 0; k < bands; k++) {
    const by = (b.y - b.h * 0.3 + hash(seed + k * 3.1) * b.h * 1.6) * dpr;
    const bh = (2 + hash(seed + k * 5.7) * b.h * 0.12) * dpr;
    const off = (hash(seed + k * 7.3) - 0.5) * 70 * dpr * fade;
    ctx.clearRect(0, by, canvas.width, bh);
    ctx.drawImage(scratch, 0, by, scratch.width, bh, off, by, scratch.width, bh);
  }
  ctx.restore();
}
