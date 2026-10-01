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
 * **Cost.** The unlit panel (every diode, ~2,900) is rasterised once into an
 * offscreen canvas. Per frame: one copy of that, then two sprite blits per
 * lit diode from a pre-tinted atlas — no per-diode gradients, no filters.
 *
 * The diode helpers (makeDiodes, paintPanel, drawHalo, drawCore) are shared
 * with the footer's LedTicker, so both signs are the same hardware.
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

/* ---- diodes ------------------------------------------------------------- */
/*
 * Crisp by construction. Everything here is in whole device pixels:
 *
 *  - the pitch is an integer (the caller floors it), so diode centres never
 *    land between pixels;
 *  - a core sprite is exactly one pitch square and is drawn at
 *    (col·pitch, row·pitch); the halo is exactly three pitches and drawn one
 *    pitch up-left — so no blit is ever resampled;
 *  - the core is a hard disc (canvas anti-aliases its 1px edge and nothing
 *    more), not a radial fade;
 *  - the halo is small and faint enough that two lit neighbours still have a
 *    dark gap between them. The bloom sits *around* the diodes, never over.
 *
 * The caller's canvas must be backed at exactly cols·pitch × rows·pitch, shown
 * at that ÷ dpr, on a whole device pixel (LedSign snaps it).
 */

/** Core tints along the temperature ramp, coolest first. */
const CORE_STEPS = 10;
/** Disc radius as a fraction of the pitch: the rest is the dark gap. */
const CORE_R = 0.39;
/** Halo size in pitches. Odd, so it centres on a diode in whole pixels. */
const HALO_CELLS = 3;

/** ember → deep amber → sodium (--color-hazard) → white-hot. */
function temperature(k: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0, [120, 22, 6]],
    [0.35, [240, 84, 18]],
    [0.7, [255, 160, 43]],
    [1, [255, 236, 206]],
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

function sprite(size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  paint(c.getContext("2d")!, size);
  return c;
}

export interface DiodeKit {
  pitch: number;
  /** Lit cores, one per temperature step; each exactly `pitch` square. */
  cores: HTMLCanvasElement[];
  /** The bloom, exactly HALO_CELLS·pitch square. */
  halo: HTMLCanvasElement;
}

/** Build the sprites for an integer device-pixel pitch. */
export function makeDiodes(pitch: number): DiodeKit {
  const c = pitch / 2;
  const r = Math.max(1, pitch * CORE_R);
  const cores = Array.from({ length: CORE_STEPS }, (_, i) =>
    sprite(pitch, (s) => {
      const k = i / (CORE_STEPS - 1);
      const [cr, cg, cb] = temperature(k);
      // The lens: a hard disc in the diode's colour…
      s.beginPath();
      s.arc(c, c, r, 0, Math.PI * 2);
      s.fillStyle = `rgb(${cr | 0},${cg | 0},${cb | 0})`;
      s.fill();
      // …with a hot centre, whiter the harder it is driven.
      const hot = s.createRadialGradient(c, c, 0, c, c, r * 0.72);
      hot.addColorStop(0, `rgba(255,250,240,${(0.35 + k * 0.6).toFixed(3)})`);
      hot.addColorStop(1, "rgba(255,250,240,0)");
      s.fillStyle = hot;
      s.beginPath();
      s.arc(c, c, r, 0, Math.PI * 2);
      s.fill();
    })
  );
  const H = pitch * HALO_CELLS;
  const halo = sprite(H, (s) => {
    const g = s.createRadialGradient(H / 2, H / 2, r, H / 2, H / 2, H / 2);
    g.addColorStop(0, "rgba(255,140,40,0.34)");
    g.addColorStop(0.45, "rgba(255,110,30,0.1)");
    g.addColorStop(1, "rgba(255,90,20,0)");
    s.fillStyle = g;
    s.fillRect(0, 0, H, H);
  });
  return { pitch, cores, halo };
}

/**
 * Rasterise the unlit panel once: every diode a dark lens with a glint.
 * `named` cells are a shade warmer, so in the dark the lettering is there if
 * you look for it — the way a dead sign still shows its lettering.
 */
export function paintPanel(
  cols: number,
  rows: number,
  pitch: number,
  named?: Set<number>
): HTMLCanvasElement {
  const panel = document.createElement("canvas");
  panel.width = cols * pitch;
  panel.height = rows * pitch;
  const p = panel.getContext("2d")!;
  const r = Math.max(1, pitch * CORE_R);
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const x = col * pitch + pitch / 2;
      const y = row * pitch + pitch / 2;
      p.beginPath();
      p.arc(x, y, r, 0, Math.PI * 2);
      p.fillStyle = named?.has(row * cols + col) ? "rgb(46,28,20)" : "rgb(24,26,33)";
      p.fill();
      if (pitch >= 6) {
        p.beginPath();
        p.arc(x - r * 0.3, y - r * 0.3, r * 0.28, 0, Math.PI * 2);
        p.fillStyle = "rgba(255,255,255,0.07)";
        p.fill();
      }
    }
  return panel;
}

/** Halo pass for one diode (call for every lit diode before any core). */
export function drawHalo(
  ctx: CanvasRenderingContext2D,
  kit: DiodeKit,
  col: number,
  row: number,
  alpha: number
) {
  if (alpha <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(kit.halo, (col - 1) * kit.pitch, (row - 1) * kit.pitch);
}

/** Core pass for one diode. `b` is drive, 0 … ~1.25. */
export function drawCore(
  ctx: CanvasRenderingContext2D,
  kit: DiodeKit,
  col: number,
  row: number,
  b: number
) {
  if (b <= 0) return;
  const step = Math.min(CORE_STEPS - 1, Math.max(0, Math.round((b / 1.25) * (CORE_STEPS - 1))));
  ctx.globalAlpha = Math.min(1, 0.3 + b * 0.7);
  ctx.drawImage(kit.cores[step], col * kit.pitch, row * kit.pitch);
}

export interface LedPainter {
  /** Canvas size in device px. */
  width: number;
  height: number;
  /** Draw ignition time `t` (ms) with bloom `glow` 0…1. Returns the lit fraction. */
  draw(t: number, glow: number): number;
}

/**
 * A painter for the intro sign at an integer device pitch. The caller backs
 * its canvas at `width × height` and shows it at that ÷ dpr.
 */
export function createPainter(
  ctx: CanvasRenderingContext2D,
  layout: LedLayout,
  pitch: number
): LedPainter {
  const width = pitch * layout.cols;
  const height = pitch * layout.rows;
  const kit = makeDiodes(pitch);
  const panel = paintPanel(
    layout.cols,
    layout.rows,
    pitch,
    new Set(layout.leds.map((l) => l.row * layout.cols + l.col))
  );
  const total = layout.leds.length;
  const drive = new Float32Array(total);

  return {
    width,
    height,
    draw(t, glow) {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(panel, 0, 0);

      let on = 0;
      for (let i = 0; i < total; i++) {
        const b = brightness(layout.leds[i], t) * layout.leds[i].gain;
        drive[i] = b;
        if (b > 0) on++;
      }
      // Bloom under, then the lenses on top: a halo can never wash a
      // neighbour's disc.
      ctx.globalCompositeOperation = "lighter";
      const haloK = 0.5 + glow * 0.5;
      for (let i = 0; i < total; i++) {
        const l = layout.leds[i];
        if (drive[i] > 0) drawHalo(ctx, kit, l.col, l.row, drive[i] * haloK);
      }
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < total; i++) {
        const l = layout.leds[i];
        if (drive[i] > 0) drawCore(ctx, kit, l.col, l.row, drive[i]);
      }
      ctx.globalAlpha = 1;
      return on / total;
    },
  };
}
