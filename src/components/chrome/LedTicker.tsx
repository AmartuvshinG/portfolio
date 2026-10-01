"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  drawCore,
  drawHalo,
  horizontalName,
  makeDiodes,
  paintPanel,
} from "@/lib/ledSign";
import { cn } from "@/lib/utils";

/** Diode pitch in CSS px: a little bolder on a wide screen. */
const PITCH_CSS = { phone: 3, wide: 4 };
/** Unlit rows above and below the name. */
const PAD_ROWS = 2;
/** Dark columns between one name and the separator, and after it. */
const GAP = 16;
/** Separator: a square of diodes, this many on a side. */
const DOT = 3;
/** Ticker speed, diode columns per second. */
const STEPS_PER_S = 24;

/**
 * The end of the film: the intro's LED sign again, as a ticker.
 *
 * The visit opens on his name in Mongol bichig powering up on a dot-matrix
 * panel in the dark; the footer closes on the same hardware — the same
 * diodes, the same sodium, the same baked glyphs (lib/ledName) — set
 * horizontally and running past, the way the band over a shopfront does.
 * It replaced an outlined-wordmark marquee that was the one piece of type on
 * the site doing nothing.
 *
 * **A real ticker steps.** The diodes never move; the *message* moves through
 * them one column at a time, 24 times a second. So it never smears, there is
 * nothing to resample, and it draws 24 frames a second and not the display's
 * 240 — only while it is on screen. Under reduced motion it holds still.
 *
 * Crisp for the same reasons as the intro sign: whole-device-pixel pitch, the
 * canvas backed at exactly its displayed size, and whole-pixel blits.
 * Decoration only (`aria-hidden`); the name is in the footer as text.
 */
export function LedTicker({ className }: { className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const name = horizontalName();
    const rows = name.rows + PAD_ROWS * 2;
    /* One period of the message: the name, a gap, the separator, a gap. */
    const period = name.cols + GAP + DOT + GAP;
    const dotTop = PAD_ROWS + Math.floor((name.rows - DOT) / 2);
    /** Gain of message column `m` (mod period), row `r` of the panel. */
    const at = (m: number, r: number) => {
      const x = ((m % period) + period) % period;
      if (x < name.cols) {
        const nr = r - PAD_ROWS;
        return nr >= 0 && nr < name.rows ? name.gain[nr * name.cols + x] : 0;
      }
      const d = x - name.cols - GAP;
      return d >= 0 && d < DOT && r >= dotTop && r < dotTop + DOT ? 0.85 : 0;
    };

    let cols = 0;
    let pitch = 0;
    let panel: HTMLCanvasElement | null = null;
    let kit: ReturnType<typeof makeDiodes> | null = null;

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const css = window.innerWidth < 768 ? PITCH_CSS.phone : PITCH_CSS.wide;
      pitch = Math.max(3, Math.round(css * dpr));
      cols = Math.ceil((box.clientWidth * dpr) / pitch) + 1;
      canvas.width = cols * pitch;
      canvas.height = rows * pitch;
      canvas.style.width = `${canvas.width / dpr}px`;
      canvas.style.height = `${canvas.height / dpr}px`;
      box.style.height = `${canvas.height / dpr}px`;
      canvas.style.transform = "";
      const r = canvas.getBoundingClientRect();
      const fx = (Math.round(r.left * dpr) - r.left * dpr) / dpr;
      const fy = (Math.round(r.top * dpr) - r.top * dpr) / dpr;
      canvas.style.transform = `translate(${fx}px, ${fy}px)`;
      kit = makeDiodes(pitch);
      panel = paintPanel(cols, rows, pitch);
    };

    /** Draw the message shifted `offset` columns left. */
    const draw = (offset: number) => {
      if (!panel || !kit) return;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(panel, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      for (let c = 0; c < cols; c++)
        for (let r = 0; r < rows; r++) {
          const g = at(c + offset, r);
          if (g > 0) drawHalo(ctx, kit, c, r, g * 0.55);
        }
      ctx.globalCompositeOperation = "source-over";
      for (let c = 0; c < cols; c++)
        for (let r = 0; r < rows; r++) {
          const g = at(c + offset, r);
          if (g > 0) drawCore(ctx, kit, c, r, g);
        }
      ctx.globalAlpha = 1;
    };

    size();
    /* Start mid-message, so the first thing seen is a name, not a gap. */
    let offset = Math.floor(period * 0.25);
    draw(offset);

    let raf = 0;
    let last = 0;
    let running = false;
    const frame = (now: number) => {
      if (!running) return;
      if (now - last >= 1000 / STEPS_PER_S) {
        // Catch up whole steps after a hitch, but never skip the panel ahead.
        const steps = last ? Math.min(3, Math.floor((now - last) / (1000 / STEPS_PER_S))) : 1;
        last = now;
        offset = (offset + steps) % period;
        draw(offset);
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running || reduced) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
    io.observe(box);

    let debounce = 0;
    const onResize = () => {
      clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        size();
        draw(offset);
      }, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      io.disconnect();
      clearTimeout(debounce);
      window.removeEventListener("resize", onResize);
    };
  }, [reduced]);

  return (
    <div ref={boxRef} aria-hidden className={cn("relative overflow-hidden", className)}>
      <canvas ref={canvasRef} className="absolute left-0 top-0 block" />
    </div>
  );
}
