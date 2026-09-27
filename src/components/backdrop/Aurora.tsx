"use client";

import { useEffect, useRef } from "react";
import { registerScrollPause } from "@/lib/scrollPause";
import { srand } from "@/lib/utils";

/**
 * The aurora: the one moving thing behind the whole site.
 *
 * It replaced a full-screen WebGL noise field. That field was sped up by scroll
 * velocity and rippled at every section seam, and while scrolling it read as a
 * fault rather than as atmosphere. This version is CSS only and follows three rules:
 *
 * - **No blur filter anywhere.** Each blob is a soft `radial-gradient`, which
 *   gives the same look for free. Scaling a filtered element re-runs the
 *   gaussian every frame, and that was the single largest stall this site ever had.
 * - **Transform and opacity only.** Every keyframe is compositor work, so the layers
 *   are rasterised once and then moved.
 * - **Frozen while scrolling.** `data-scrolling` (see `lib/scrollPause.ts`)
 *   pauses every animation in place. Pausing holds the current frame, so
 *   nothing jumps when a scroll starts or ends.
 *
 * Stars are three elements, each carrying a field of dots as `box-shadow`s, so
 * twinkling costs three composited layers rather than one node per star.
 */

const STAR_LAYERS = [
  { count: 34, size: 1.5, seed: 11 },
  { count: 26, size: 2, seed: 47 },
  { count: 14, size: 2.5, seed: 83 },
] as const;

function starField(count: number, seed: number) {
  const dots: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (srand(seed * 1000 + i * 2) * 100).toFixed(2);
    const y = (srand(seed * 1000 + i * 2 + 1) * 100).toFixed(2);
    const a = (0.35 + srand(seed * 7 + i) * 0.55).toFixed(2);
    dots.push(`${x}vw ${y}vh 0 0 rgba(236,238,251,${a})`);
  }
  return dots.join(",");
}

const FIELDS = STAR_LAYERS.map((l) => starField(l.count, l.seed));

export function Aurora() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return registerScrollPause(el);
  }, []);

  return (
    <div ref={ref} className="aurora absolute inset-0 overflow-hidden">
      <div className="aurora-pulse absolute inset-0" />

      <div className="aurora-blob aurora-blob--a" />
      <div className="aurora-blob aurora-blob--b" />
      <div className="aurora-blob aurora-blob--c" />
      <div className="aurora-blob aurora-blob--d" />

      {STAR_LAYERS.map((l, i) => (
        <div
          key={l.seed}
          className={`aurora-stars aurora-stars--${i}`}
          style={{ width: l.size, height: l.size, boxShadow: FIELDS[i] }}
        />
      ))}
    </div>
  );
}
