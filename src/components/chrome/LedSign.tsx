"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MotionValue } from "framer-motion";
import { createPainter, layoutLeds, type LedPainter } from "@/lib/ledSign";
import { NeonSign } from "@/components/ui/NeonSign";
import { cn } from "@/lib/utils";

/** The panel's dark beat before current arrives, ms (at speed 1). */
export const DARK_MS = 200;
/** Remaining ignition when skipped: everything still dark catches in this. */
const SKIP_MS = 140;

/**
 * The preloader's dot-matrix sign (see lib/ledSign for how it lights).
 *
 * Owns the canvas and the clock; the preloader owns the story. It reads
 * `glow` (the room-brightening beat, animated by the preloader) and writes
 * `lit` (the fraction of diodes on), both as MotionValues, so the room light,
 * the rain and the hairline follow the sign without a React render per frame.
 *
 * The frame loop **stops once the sign has settled** and the glow has
 * stopped changing; a glow change restarts it. Nothing here runs at idle.
 *
 * Height comes from the parent; the width follows from the panel's shape.
 *
 * **Pin-sharp.** The pitch is a whole number of device pixels, the canvas is
 * backed at exactly cols·pitch × rows·pitch and shown at that ÷ dpr, and its
 * origin is nudged onto a whole device pixel after layout. Nothing moves it
 * afterwards — the pointer drift that used to sit on it wrote sub-pixel
 * transforms every frame, which resampled the whole sign into a blur. The
 * room and the rain carry the parallax instead.
 */
export function LedSign({
  text,
  lit,
  glow,
  timeScale = 1,
  skip = false,
  className,
}: {
  /** The name, for the fallback and for nothing else — the glyphs are baked. */
  text: string;
  lit: MotionValue<number>;
  glow: MotionValue<number>;
  /** >1 runs the ignition slower, <1 faster (repeat visits). */
  timeScale?: number;
  /** Light everything still dark, now. */
  skip?: boolean;
  className?: string;
}) {
  const layout = useMemo(() => layoutLeds(), []);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  const skipRef = useRef(skip);
  /* Restart hook for the loop, set by the effect below. */
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    skipRef.current = skip;
    wake.current();
  }, [skip]);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      // One read of a capability; there is nothing to derive it from.
      setFallback(true);
      return;
    }

    /* Null while the box has no size — e.g. the curtain hidden by CSS under
       reduced motion, where it still hydrates before React drops it. A 0px
       painter would hand drawImage an empty sprite, which throws. */
    let painter: LedPainter | null = null;
    const size = () => {
      // Up to 3x: the canvas is small, and a phone's 3x panel deserves it.
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const cssH = box.clientHeight;
      if (cssH < 8) {
        painter = null;
        return;
      }
      const pitch = Math.max(3, Math.floor((cssH * dpr) / layout.rows));
      painter = createPainter(ctx, layout, pitch);
      canvas.width = painter.width;
      canvas.height = painter.height;
      canvas.style.width = `${painter.width / dpr}px`;
      canvas.style.height = `${painter.height / dpr}px`;
      // Onto the device grid: whatever fraction of a device pixel the
      // centring left us at, take it back.
      canvas.style.transform = "";
      const r = canvas.getBoundingClientRect();
      const fx = (Math.round(r.left * dpr) - r.left * dpr) / dpr;
      const fy = (Math.round(r.top * dpr) - r.top * dpr) / dpr;
      canvas.style.transform = `translate(${fx}px, ${fy}px)`;
    };
    size();

    const start = performance.now();
    /* The clock: ignition ms as a function of wall time, bent once if the
       visitor skips. */
    let skippedAt = -1;
    let tAtSkip = 0;
    let rate = 1;
    const clock = (now: number) => {
      const base = (now - start - DARK_MS * timeScale) / timeScale;
      if (skipRef.current && skippedAt < 0) {
        skippedAt = now;
        tAtSkip = Math.max(0, base);
        rate = Math.max(1 / timeScale, (layout.end - tAtSkip) / SKIP_MS);
      }
      return skippedAt < 0 ? base : tAtSkip + (now - skippedAt) * rate;
    };

    let raf = 0;
    let running = false;
    let lastGlow = -1;
    const frame = (now: number) => {
      if (!painter) {
        running = false;
        return;
      }
      const t = clock(now);
      const g = glow.get();
      lit.set(painter.draw(t, g));
      const settled = t > layout.end && g === lastGlow;
      lastGlow = g;
      if (settled) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    const run = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    wake.current = run;
    const offGlow = glow.on("change", run);
    const onResize = () => {
      size();
      lastGlow = -1;
      run();
    };
    window.addEventListener("resize", onResize);
    run();

    return () => {
      cancelAnimationFrame(raf);
      running = false;
      wake.current = () => {};
      offGlow();
      window.removeEventListener("resize", onResize);
    };
  }, [layout, glow, lit, timeScale]);

  return (
    <div ref={boxRef} className={cn("relative flex justify-center", className)}>
      <div>
        {fallback ? (
          <NeonSign
            text={text}
            lit
            tone="sodium"
            lang="mn-Mong"
            className="font-script text-[clamp(2rem,5vh,3.4rem)] leading-none"
            style={{ writingMode: "vertical-lr" }}
          />
        ) : (
          <canvas ref={canvasRef} aria-hidden className="block" />
        )}
      </div>
    </div>
  );
}
