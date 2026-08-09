"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { backdrop } from "@/lib/backdrop";

/**
 * The lens the whole site is seen through.
 *
 * Three things a real anamorphic taking lens does that a web page never does,
 * and which together are most of why film looks like film: it falls off at the
 * corners, it splits colour toward the edges of the frame, and it is being
 * photographed by something with a rolling shutter. None of them are visible
 * when you look for them; all of them are visible when they are removed.
 *
 * Sits above the content and the nav, below the preloader and the cursor — a
 * lens is in front of the whole image or it is not a lens. It is
 * `pointer-events-none` and `aria-hidden`, so nothing about interaction or
 * assistive tech changes.
 *
 * **Cost.** One static raster plus one transform loop. Specifically *not* a
 * `backdrop-filter`: a real chromatic aberration would have to re-read the
 * composited page every frame, and a full-viewport fixed backdrop-filter is the
 * exact tax the navbar's `glass` was removed for. The fringes here are painted
 * gradients that sell the same idea at the edges, where aberration actually
 * lives, for the price of one paint.
 *
 * ---------------------------------------------------------------------------
 * **There was a datamosh here, and it was the bug.** Six full-width bars in
 * `mix-blend-mode: screen`, fired by a `chapter-change` event, meant to stutter
 * for 180ms as you crossed a seam. The intent was a charming glitch. The effect,
 * with nine sections on the page, was a band of cyan and magenta tearing across
 * the viewport on more or less every scroll — reported as "a glitchy stripe type
 * of effect", and read, correctly, as the page being broken rather than as an
 * effect.
 *
 * The lesson is not "no glitches". It is that an effect indistinguishable from a
 * rendering fault has to be *rare* to survive being mistaken for one, and a
 * per-section trigger is the opposite of rare. Boundaries are marked by the
 * shutter wipe in `ChapterSeam` instead: structured, so it can only read as
 * deliberate.
 * ---------------------------------------------------------------------------
 */
export function Anamorphic() {
  const reduced = useReducedMotion();
  const fringes = useRef<HTMLDivElement>(null);

  /* Scroll speed widens the colour split, which is what a real taking lens does
     when the image is moving across it.
     Written straight to the two gradient layers from one rAF rather than
     through React state or a custom property on `<html>`: this updates at
     scroll frequency, and both of those routes would invalidate far more than
     the two elements that actually change. The loop idles at zero cost once the
     page is still, because the value it reads is already zero and the early
     return skips the writes. */
  useEffect(() => {
    if (reduced) return;
    const el = fringes.current;
    if (!el) return;

    let raf = 0;
    let painted = -1;

    const tick = () => {
      const v = backdrop.velocity;
      /* Snap to 2 decimals and skip identical frames — at rest this loop then
         costs one comparison. */
      const next = Math.round(v * 100) / 100;
      if (next !== painted) {
        painted = next;
        el.style.setProperty("--fringe", String(0.55 + next * 0.9));
        el.style.setProperty("--fringe-w", `${7 + next * 5}%`);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[95] overflow-hidden"
    >
      {/* Barrel vignette. Corners only — a vignette that reaches the middle is
          just a dark page. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 108% at 50% 50%, transparent 58%, rgba(2,3,8,0.42) 84%, rgba(2,3,8,0.72) 100%)",
        }}
      />

      {/* Edge fringing. Magenta leading, cyan trailing, both confined to the
          outer few percent where a real lens actually splits. */}
      {/* No `mix-blend-mode` on these two, despite screen being the physically
          right operator for added light. A blend mode on a *fixed* full-height
          layer makes the compositor read the page behind it every frame it
          scrolls — the same class of cost as a backdrop-filter, and the reason
          the navbar's glass was removed. Plain translucent gradients over a
          ground this dark land within a shade or two of the blended version. */}
      <div ref={fringes} className="absolute inset-0" style={{ "--fringe": 0.55, "--fringe-w": "7%" } as React.CSSProperties}>
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: "var(--fringe-w)",
            opacity: "var(--fringe)",
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--spectrum-1) 13%, transparent), transparent)",
          }}
        />
        <div
          className="absolute inset-y-0 right-0"
          style={{
            width: "var(--fringe-w)",
            opacity: "var(--fringe)",
            background:
              "linear-gradient(270deg, color-mix(in srgb, var(--spectrum-3) 13%, transparent), transparent)",
          }}
        />
      </div>

      {/* Rolling shutter. One band, 14s for a full pass — slow enough that it
          is never the thing you are looking at.

          At 2.8% of a bone white over a near-black ground this is about one
          value step, which is the entire budget a rolling shutter gets. The
          datamosh above it failed by being twenty times louder than this. */}
      {!reduced && (
        <div
          className="absolute inset-x-0 h-[22vh]"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(236,238,251,0.028) 46%, transparent)",
            animation: "lens-roll 14s linear infinite",
            top: "-22vh",
            willChange: "transform",
          }}
        />
      )}
    </div>
  );
}
