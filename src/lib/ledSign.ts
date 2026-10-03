/**
 * The LED dot-matrix: the Mongol-script name baked into a panel (lib/ledName).
 * It was the intro's sign until the ink scroll replaced it (2026-10-01); the
 * footer's LedTicker still runs on these diodes, as street signage.
 *
 * Pure drawing and timing — no React.
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
 * at that ÷ dpr, on a whole device pixel.
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
    [0.7, [255, 106, 61]],
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

/* ---- the name, set horizontally ----------------------------------------- */

export interface LedGrid {
  cols: number;
  rows: number;
  /** Gain per cell (0 = no diode), row-major. */
  gain: Float32Array;
}

/**
 * The baked name turned for horizontal reading. LED_NAME is the vertical-lr
 * form, which is the font's horizontal drawing turned 90° clockwise; set
 * horizontally, Mongolian reads as the font draws it, so this turns it back
 * 90° counter-clockwise: vertical row r becomes column r, and vertical column
 * c becomes row (cols − 1 − c).
 */
export function horizontalName(): LedGrid {
  const { cells } = LED_NAME;
  const vRows = cells.length;
  const vCols = cells[0].length;
  const gain = new Float32Array(vRows * vCols);
  for (let r = 0; r < vRows; r++)
    for (let c = 0; c < vCols; c++) {
      const ch = cells[r][c];
      if (ch === ".") continue;
      const lvl = Number(ch);
      gain[(vCols - 1 - c) * vRows + r] = lvl === 3 ? 1 : lvl === 2 ? 0.72 : 0.42;
    }
  return { cols: vRows, rows: vCols, gain };
}
