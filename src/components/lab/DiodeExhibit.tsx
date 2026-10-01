"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { drawCore, drawHalo, makeDiodes, paintPanel } from "@/lib/ledSign";
import { ExhibitFrame } from "@/components/lab/ExhibitFrame";

/** Diode pitch, CSS px: bigger than the footer's, so the hardware shows. */
const PITCH_CSS = 7;
/** Rows the message is rasterised into, and unlit rows round it. */
const GLYPH_ROWS = 11;
const PAD_ROWS = 2;
const GAP = 14;
const STEPS_PER_S = 24;
const MAX_LEN = 32;

/**
 * Rasterise a message into diode gains: drawn once in a small offscreen
 * canvas at the panel's own resolution (one pixel per diode), thresholded.
 * Any script the system font has works — Latin and Cyrillic both.
 */
function rasterise(text: string): { cols: number; gain: Float32Array } {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const font = `700 ${GLYPH_ROWS + 1}px ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace`;
  ctx.font = font;
  const cols = Math.max(1, Math.ceil(ctx.measureText(text).width) + 1);
  c.width = cols;
  c.height = GLYPH_ROWS;
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, 0, GLYPH_ROWS / 2 + 0.5);
  const px = ctx.getImageData(0, 0, cols, GLYPH_ROWS).data;
  const gain = new Float32Array(cols * GLYPH_ROWS);
  for (let i = 0; i < cols * GLYPH_ROWS; i++) {
    const a = px[i * 4 + 3] / 255;
    gain[i] = a > 0.55 ? 1 : a > 0.3 ? 0.5 : 0;
  }
  return { cols, gain };
}

/**
 * Exhibit 03: the footer's dot-matrix hardware, with your message on it.
 *
 * The same diode kit as LedTicker (lib/ledSign): the unlit panel painted
 * once, two pre-tinted sprite blits per lit diode, the message stepping
 * through the diodes 24 times a second. Only runs while on screen; under
 * reduced motion it holds still.
 */
export default function DiodeExhibit({ live }: { live: boolean }) {
  const { c, t } = useI18n();
  const L = t.lab.diodes;
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState(`${c.profile.wordmark} · UB`);
  const msgRef = useRef<{ cols: number; gain: Float32Array }>({ cols: 1, gain: new Float32Array(GLYPH_ROWS) });

  useEffect(() => {
    msgRef.current = rasterise(text.trim() || " ");
  }, [text]);

  useEffect(() => {
    if (!live) return;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rows = GLYPH_ROWS + PAD_ROWS * 2;
    let cols = 0;
    let pitch = 0;
    let panel: HTMLCanvasElement | null = null;
    let kit: ReturnType<typeof makeDiodes> | null = null;

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      pitch = Math.max(4, Math.round(PITCH_CSS * dpr));
      cols = Math.floor((stage.clientWidth * dpr) / pitch);
      canvas.width = cols * pitch;
      canvas.height = rows * pitch;
      canvas.style.width = `${canvas.width / dpr}px`;
      canvas.style.height = `${canvas.height / dpr}px`;
      kit = makeDiodes(pitch);
      panel = paintPanel(cols, rows, pitch);
    };

    const at = (m: number, r: number) => {
      const msg = msgRef.current;
      const period = msg.cols + GAP;
      const x = ((m % period) + period) % period;
      const gr = r - PAD_ROWS;
      if (x >= msg.cols || gr < 0 || gr >= GLYPH_ROWS) return 0;
      return msg.gain[gr * msg.cols + x];
    };

    const draw = (offset: number) => {
      if (!panel || !kit) return;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(panel, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      for (let col = 0; col < cols; col++)
        for (let r = 0; r < rows; r++) {
          const g = at(col + offset, r);
          if (g > 0) drawHalo(ctx, kit, col, r, g * 0.55);
        }
      ctx.globalCompositeOperation = "source-over";
      for (let col = 0; col < cols; col++)
        for (let r = 0; r < rows; r++) {
          const g = at(col + offset, r);
          if (g > 0) drawCore(ctx, kit, col, r, g);
        }
      ctx.globalAlpha = 1;
    };

    size();
    const ro = new ResizeObserver(() => {
      size();
      draw(offset);
    });
    ro.observe(stage);
    let offset = 0;
    draw(offset);

    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / STEPS_PER_S) return;
      const steps = last ? Math.min(3, Math.floor((now - last) / (1000 / STEPS_PER_S))) : 1;
      last = now;
      offset += steps;
      draw(offset);
    };
    if (!reduced) raf = requestAnimationFrame(frame);
    else {
      // Still: redraw when the message changes.
      const id = window.setInterval(() => draw(0), 300);
      return () => {
        window.clearInterval(id);
        ro.disconnect();
      };
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [live, reduced]);

  return (
    <ExhibitFrame
      index="03"
      title={L.title}
      body={L.body}
      stageRef={stageRef}
      stageClassName="!h-auto min-h-[14rem] grid place-items-center"
      stageLabel={`${STEPS_PER_S} STEPS/S`}
      controls={
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted">{L.label}</span>
          <input
            type="text"
            value={text}
            maxLength={MAX_LEN}
            onChange={(e) => setText(e.target.value)}
            placeholder={L.placeholder}
            aria-describedby="lab-diode-hint"
            className="min-h-11 border border-line bg-[#05060d]/70 px-3 font-mono text-sm tracking-[0.12em] text-fg caret-[var(--color-holo)] placeholder:text-faint"
          />
          <span id="lab-diode-hint" className="font-mono text-[0.6875rem] tracking-[0.12em] text-faint">
            {L.hint}
          </span>
        </label>
      }
    >
      {/* Decorative: the message is the input's own value. */}
      <canvas ref={canvasRef} aria-hidden className="block" />
    </ExhibitFrame>
  );
}
