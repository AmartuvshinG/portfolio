"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Eases an element a few pixels against the cursor.
 *
 * The whole site drifts at one weight — the hero's glow horizon, the backdrop's
 * pointer bloom, the work world's camera — and that consistency is only
 * achievable if they share a curve. Lifted out of the retired ApertureSlab,
 * which is where this easing was first tuned.
 *
 * Frame-rate-independent: `1 - pow(k, delta)` rather than a flat per-frame lerp,
 * so the element tracks at the same speed on a 60Hz panel and a 144Hz one. A
 * bare `pos += (target - pos) * 0.1` is more than twice as fast at 144Hz, which
 * is exactly how "subtle drift" turns into "snaps to the cursor" on a gaming
 * monitor.
 *
 * Writes `transform` directly rather than going through state: this runs every
 * frame and re-rendering to move a decorative layer is pure waste.
 */
export function usePointerDrift(
  /** Travel in px at full deflection. Y is damped to half of this. */
  distance = 26
) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    // Touch devices have no hover position to track; the listener would only
    // ever fire on tap and jump the layer.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    let raf = 0;
    let last = performance.now();

    const onMove = (e: MouseEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const render = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      const k = 1 - Math.pow(0.0015, delta);
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;
      el.style.transform = `translate3d(${(-pos.x * distance).toFixed(2)}px, ${(
        -pos.y *
        distance *
        0.5
      ).toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(render);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced, distance]);

  return ref;
}
