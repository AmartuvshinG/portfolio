/**
 * The preloader's LED sign: a dot-matrix panel with the Mongol-script name
 * baked into it (lib/ledName), powering up in the dark.
 *
 * Pure drawing and timing — no React. LedSign owns the canvas and the clock.
 *
 * **How it lights.** Mongol script hangs every letter off one continuous
 * vertical stem, so the sign is wired like one: current enters at the top of
 * the stem and runs down it, and every tooth, loop and hook catches as the
 * current reaches it *through the strokes* — a shortest-path flood over the
 * lit cells, where the stem conducts faster than the branches. The name grows
 * out of its own spine like a circuit tree rather than wiping on.
 *
 * **Each diode has a little physics.** It ramps through a colour temperature
 * (ember → sodium → white-hot) while its current rises, overshoots to ~1.25
 * and settles back at 1, the way a cold LED driver does. A seeded eighth of
 * them stutter once before catching, and one, near the end of the stem, holds
 * out a beat longer than the rest. All of it is over inside the ignition: a
 * structured imperfection that finishes is a sign warming up; one that keeps
 * going reads as a broken screen.
 *
 * **Cost.** The unlit panel (every diode, ~2,100) is rasterised once into an
 * offscreen canvas. Per frame: one copy of that, then two sprite blits per
 * lit diode from a pre-tinted atlas — no per-diode gradients, no filters.
 */

import { LED_NAME } from "@/lib/ledName";
import { srand } from "@/lib/utils";

/** Unlit cells added round the name, so it sits in a panel, not a cut-out. */
const PAD_X = 3;
const PAD_Y = 3;

export interface Led {
  /** Panel cell. */
  col: number;
  row: number;
  /** 0.42 / 0.72 / 1 from the bake's coverage level: edge cells burn dimmer. */
  gain: number;
  /** When the current reaches it, ms from the start of ignition. */
  at: number;
  /** Stutter: off-gaps before it holds, as [on, off] pairs in ms. */
  stutter: number[] | null;
}

export interface LedLayout {
  cols: number;
  rows: number;
  leds: Led[];
  /** When the last diode has settled, ms. */
  end: number;
}

/** The ignition window (current reaching the last diode), ms. */
export const IGNITE_MS = 1150;
/** Rise + settle of a single diode, ms. */
const RISE_MS = 90;
const SETTLE_MS = 320;

/**
 * Build the panel and its ignition schedule. Deterministic: the same layout
 * every load, on the server and the client.
 */
export function layoutLeds(): LedLayout {
  const { cells } = LED_NAME;
  const rows = cells.length + PAD_Y * 2;
  const cols = cells[0].length + PAD_X * 2;

  type Cell = { col: number; row: number; gain: number };
  const lit: Cell[] = [];
  const index = new Map<number, number>();
  cells.forEach((line, r) => {
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === ".") continue;
      const lvl = Number(ch);
      index.set((r + PAD_Y) * cols + c + PAD_X, lit.length);
      lit.push({ col: c + PAD_X, row: r + PAD_Y, gain: lvl === 3 ? 1 : lvl === 2 ? 0.72 : 0.42 });
    }
  });

  /* The stem: the adjacent pair of columns with the most solid cells. */
  const solid = new Array(cols).fill(0);
  for (const l of lit) if (l.gain >= 0.72) solid[l.col]++;
  let stem = 0;
  for (let c = 1; c < cols - 1; c++) {
    if (solid[c] + solid[c + 1] > solid[stem] + solid[stem + 1]) stem = c;
  }
  const onStem = (l: Cell) => l.col >= stem - 1 && l.col <= stem + 2;

  /* Dijkstra from the top of the stem. Moving down the stem is cheap;
     everything else costs more, so branches visibly lag the spine. */
  const dist = new Array(lit.length).fill(Infinity);
  let start = -1;
  for (let i = 0; i < lit.length; i++) {
    if (onStem(lit[i]) && (start < 0 || lit[i].row < lit[start].row)) start = i;
  }
  dist[start] = 0;
  const done = new Array(lit.length).fill(false);
  for (;;) {
    let u = -1;
    for (let i = 0; i < lit.length; i++) {
      if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    }
    if (u < 0) break;
    done[u] = true;
    const a = lit[u];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const v = index.get((a.row + dy) * cols + a.col + dx);
        if (v === undefined || done[v]) continue;
        const b = lit[v];
        const step = Math.hypot(dx, dy) * (onStem(a) && onStem(b) ? 1 : 2.6);
        if (dist[u] + step < dist[v]) dist[v] = dist[u] + step;
      }
  }
  /* Islands the strokes do not reach (a detached dot, a hook the bake cut
     off) jump from their nearest lit neighbour, a little late. */
  for (let i = 0; i < lit.length; i++) {
    if (dist[i] < Infinity) continue;
    let best = Infinity;
    for (let j = 0; j < lit.length; j++) {
      if (dist[j] === Infinity) continue;
      const d = dist[j] + Math.hypot(lit[i].col - lit[j].col, lit[i].row - lit[j].row) * 3;
      if (d < best) best = d;
    }
    dist[i] = best;
  }

  const max = Math.max(...dist.filter((d) => d < Infinity), 1);
  /* The holdout: the last solid stem diode in the bottom fifth. */
  let holdout = -1;
  for (let i = 0; i < lit.length; i++) {
    const l = lit[i];
    if (onStem(l) && l.gain === 1 && l.row > rows * 0.8 && (holdout < 0 || l.row > lit[holdout].row)) holdout = i;
  }

  const leds: Led[] = lit.map((l, i) => {
    const jitter = (srand(i * 31 + 7) - 0.5) * 70;
    let at = (dist[i] / max) * (IGNITE_MS - 120) + jitter;
    let stutter: number[] | null = null;
    if (i === holdout) {
      at = IGNITE_MS - 40;
      stutter = [30, 70, 25, 150, 40, 90];
    } else if (srand(i * 13 + 101) < 0.125) {
      stutter = srand(i * 7 + 3) < 0.5 ? [35, 60] : [25, 45, 30, 80];
    }
    return { ...l, at: Math.max(0, at), stutter };
  });

  const end = Math.max(...leds.map((l) => l.at + (l.stutter?.reduce((a, b) => a + b, 0) ?? 0))) + RISE_MS + SETTLE_MS;
  return { cols, rows, leds, end };
}

/**
 * One diode's brightness at `t` ms of ignition, 0 … ~1.25 (before its gain).
 */
export function brightness(led: Led, t: number): number {
  let u = t - led.at;
  if (u < 0) return 0;
  if (led.stutter) {
    const s = led.stutter;
    for (let k = 0; k < s.length; k++) {
      if (u < s[k]) return k % 2 === 0 ? 0.55 + 0.25 * srand(led.col * 97 + led.row * 13 + k) : 0;
      u -= s[k];
    }
  }
  if (u < RISE_MS) {
    const x = u / RISE_MS;
    return 1.25 * (1 - (1 - x) * (1 - x));
  }
  u -= RISE_MS;
  if (u < SETTLE_MS) {
    const x = u / SETTLE_MS;
    return 1.25 - 0.25 * (x * x * (3 - 2 * x));
  }
  return 1;
}

/* ---- sprites ------------------------------------------------------------ */

/** Core tints along the temperature ramp, coolest first. */
const CORE_STEPS = 10;

/** ember → deep amber → sodium (--color-hazard) → white-hot. */
function temperature(k: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0, [110, 18, 4]],
    [0.35, [240, 84, 18]],
    [0.7, [255, 160, 43]],
    [1, [255, 240, 214]],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (k <= stops[i][0]) {
      const [k0, a] = stops[i - 1];
      const [k1, b] = stops[i];
      const x = (k - k0) / (k1 - k0);
      return [a[0] + (b[0] - a[0]) * x, a[1] + (b[1] - a[1]) * x, a[2] + (b[2] - a[2]) * x];
    }
  }
  return stops[stops.length - 1][1];
}

function sprite(size: number, paint: (ctx: CanvasRenderingContext2D, r: number) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = Math.max(2, Math.ceil(size));
  const ctx = c.getContext("2d")!;
  paint(ctx, c.width / 2);
  return c;
}

export interface LedPainter {
  /** Canvas size in device px. */
  width: number;
  height: number;
  /** Draw ignition time `t` (ms) with bloom `glow` 0…1. Returns the lit fraction. */
  draw(t: number, glow: number): number;
}

/**
 * Size a painter for a canvas whose CSS height is `cssH`. The pitch follows
 * from the panel's row count, so the sign is the same shape at every size.
 */
export function createPainter(
  ctx: CanvasRenderingContext2D,
  layout: LedLayout,
  cssH: number,
  dpr: number
): LedPainter {
  const pitch = (cssH * dpr) / layout.rows;
  const width = Math.round(pitch * layout.cols);
  const height = Math.round(pitch * layout.rows);
  const coreD = pitch * 0.78;
  const haloD = pitch * 6;

  /* The panel at rest: every diode a dark lens with a faint rim, and the
     name's diodes very slightly warmer, so in the dark the name is there if
     you look for it — the way a dead sign still shows its lettering. */
  const panel = document.createElement("canvas");
  panel.width = width;
  panel.height = height;
  {
    const p = panel.getContext("2d")!;
    const named = new Set(layout.leds.map((l) => l.row * layout.cols + l.col));
    for (let r = 0; r < layout.rows; r++)
      for (let c = 0; c < layout.cols; c++) {
        const x = (c + 0.5) * pitch;
        const y = (r + 0.5) * pitch;
        p.beginPath();
        p.arc(x, y, coreD * 0.5, 0, Math.PI * 2);
        p.fillStyle = named.has(r * layout.cols + c) ? "rgba(70,40,22,0.55)" : "rgba(38,40,48,0.5)";
        p.fill();
        p.beginPath();
        p.arc(x - coreD * 0.12, y - coreD * 0.12, coreD * 0.16, 0, Math.PI * 2);
        p.fillStyle = "rgba(255,255,255,0.05)";
        p.fill();
      }
  }

  const cores = Array.from({ length: CORE_STEPS }, (_, i) =>
    sprite(coreD * 1.6, (s, r) => {
      const [cr, cg, cb] = temperature(i / (CORE_STEPS - 1));
      const g = s.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, `rgba(255,248,236,1)`);
      g.addColorStop(0.28, `rgba(${cr | 0},${cg | 0},${cb | 0},1)`);
      g.addColorStop(0.62, `rgba(${cr | 0},${cg | 0},${cb | 0},0.55)`);
      g.addColorStop(1, `rgba(${cr | 0},${cg | 0},${cb | 0},0)`);
      s.fillStyle = g;
      s.fillRect(0, 0, r * 2, r * 2);
    })
  );
  const halo = sprite(haloD, (s, r) => {
    const g = s.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, "rgba(255,150,48,0.5)");
    g.addColorStop(0.25, "rgba(255,110,30,0.16)");
    g.addColorStop(1, "rgba(255,90,20,0)");
    s.fillStyle = g;
    s.fillRect(0, 0, r * 2, r * 2);
  });

  const total = layout.leds.length;
  const coreS = cores[0].width;
  const haloS = halo.width;

  return {
    width,
    height,
    draw(t, glow) {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(panel, 0, 0);
      ctx.globalCompositeOperation = "lighter";

      let on = 0;
      const haloK = 0.22 + glow * 0.3;
      for (const led of layout.leds) {
        const b = brightness(led, t) * led.gain;
        if (b <= 0) continue;
        on++;
        const x = (led.col + 0.5) * pitch;
        const y = (led.row + 0.5) * pitch;
        ctx.globalAlpha = Math.min(1, b * haloK);
        ctx.drawImage(halo, x - haloS / 2, y - haloS / 2);
        const step = Math.min(CORE_STEPS - 1, Math.max(0, Math.round((b / 1.25) * (CORE_STEPS - 1))));
        ctx.globalAlpha = Math.min(1, 0.35 + b * 0.65);
        ctx.drawImage(cores[step], x - coreS / 2, y - coreS / 2);
      }
      return on / total;
    },
  };
}
