"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";
import { pointerEnabled, pointerSettled, retainPointer, stepPointer } from "@/lib/pointer";

/**
 * Eases an element a few pixels against the cursor.
 *
 * The whole site drifts at one weight — the hero name, the preloader's sign,
 * the film's camera — because they all read the same eased value
 * (lib/pointer). Layers differ only in `distance`, and that difference is the
 * parallax: the name travels 30px over a film that travels ~1%, so the frame
 * has two planes before you have scrolled at all.
 *
 * Writes `transform` directly rather than going through state: this runs every
 * frame while the pointer moves, and re-rendering to move a decorative layer is
 * pure waste. The loop stops once the layer has caught the cursor and restarts
 * on the next move, so a still mouse costs nothing.
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
    if (!el || !pointerEnabled()) return;

    let raf = 0;
    let running = false;
    const render = (now: number) => {
      const look = stepPointer(now);
      el.style.transform = `translate3d(${(-look.x * distance).toFixed(2)}px, ${(
        -look.y *
        distance *
        0.5
      ).toFixed(2)}px, 0)`;
      if (pointerSettled()) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(render);
    };
    const wake = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(render);
    };
    const release = retainPointer(wake);

    return () => {
      release();
      cancelAnimationFrame(raf);
    };
  }, [reduced, distance]);

  return ref;
}
