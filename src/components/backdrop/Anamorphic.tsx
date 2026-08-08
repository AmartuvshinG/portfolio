"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { srand } from "@/lib/utils";

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
 * The datamosh is here rather than in `ChapterFrame` because it belongs to the
 * lens, and because ChapterFrame is `hidden lg:block` — a glitch that only fires
 * on desktop would be a strange thing to ship.
 */

/** How long a seam crossing stutters for. Long enough to register, short
 *  enough that it never reads as a rendering fault. */
const MOSH_MS = 180;

const BARS = Array.from({ length: 6 }, (_, i) => ({
  top: srand(i * 37 + 3) * 92,
  height: 0.8 + srand(i * 53 + 7) * 5,
  shift: (srand(i * 71 + 11) - 0.5) * 26,
  cyan: srand(i * 91 + 13) > 0.5,
}));

export function Anamorphic() {
  const reduced = useReducedMotion();
  const [moshing, setMoshing] = useState(false);

  useEffect(() => {
    if (reduced) return;
    let timer: ReturnType<typeof setTimeout>;
    const onSeam = () => {
      setMoshing(true);
      clearTimeout(timer);
      timer = setTimeout(() => setMoshing(false), MOSH_MS);
    };
    window.addEventListener("chapter-change", onSeam);
    return () => {
      window.removeEventListener("chapter-change", onSeam);
      clearTimeout(timer);
    };
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
      <div
        className="absolute inset-y-0 left-0 w-[7%]"
        style={{
          background:
            "linear-gradient(90deg, color-mix(in srgb, var(--spectrum-1) 13%, transparent), transparent)",
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-[7%]"
        style={{
          background:
            "linear-gradient(270deg, color-mix(in srgb, var(--spectrum-3) 13%, transparent), transparent)",
        }}
      />

      {/* Rolling shutter. One band, 14s for a full pass — slow enough that it
          is never the thing you are looking at. */}
      {!reduced && (
        <div
          className="absolute inset-x-0 h-[22vh]"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(236,238,251,0.028) 46%, transparent)",
            animation: "hero-rain 14s linear infinite",
            top: "-22vh",
            willChange: "transform",
          }}
        />
      )}

      {/* Datamosh. Fires on a chapter seam and is gone before you can look at
          it directly, which is the only way this kind of thing stays charming
          rather than becoming a tic. */}
      {moshing &&
        BARS.map((b, i) => (
          <div
            key={i}
            className="absolute inset-x-0"
            style={{
              top: `${b.top}%`,
              height: `${b.height}vh`,
              transform: `translate3d(${b.shift}px,0,0)`,
              background: b.cyan
                ? "color-mix(in srgb, var(--spectrum-3) 30%, transparent)"
                : "color-mix(in srgb, var(--spectrum-1) 30%, transparent)",
              mixBlendMode: "screen",
            }}
          />
        ))}
    </div>
  );
}
