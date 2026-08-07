"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The hero's central subject: a vertical shaft of light the wordmark passes
 * behind.
 *
 * It exists to hold one specific relationship. The composition only worked
 * because something occluded the letterforms — that depth order is what turns
 * "big type on a background" into a composition. The photograph that used to do
 * it was a stock placeholder pulled off picsum, so the job here is to keep the
 * occlusion and drop the photo.
 *
 * Built from stacked gradients rather than geometry: an aperture is light, and
 * light has no edges. Every layer is blurred well past its own bounds so
 * nothing ever resolves into a rectangle.
 *
 * Pointer drift uses the same frame-rate-independent lerp as the 3D scenes, so
 * the slab tracks the cursor at the same weight as the rest of the site.
 */

const DRIFT = 26; /* px of travel at full deflection — subtle on purpose */

export function ApertureSlab() {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    let raf = 0;
    let last = performance.now();

    const onMove = (e: MouseEvent) => {
      // -1..1 from viewport centre.
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const render = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      // Frame-rate-independent easing: same curve at 60Hz and 144Hz.
      const k = 1 - Math.pow(0.0015, delta);
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;
      wrap.style.transform = `translate3d(${(-pos.x * DRIFT).toFixed(2)}px, ${(-pos.y * DRIFT * 0.5).toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(render);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-end justify-center overflow-hidden"
    >
      <div ref={wrapRef} className="relative h-full w-[min(80vw,540px)] will-change-transform">
        {/* --- The bloom. Widest layer, sets the coloured halo that spills onto
                the letterforms either side of the slab. */}
        <div
          className="spectrum-bloom absolute -inset-x-[60%] bottom-0 top-[6%] animate-drift blur-[64px]"
          style={{ opacity: 0.55 }}
        />

        {/* --- The shaft. A soft-edged column of near-white: the actual light
                source. `blur` on the element rather than a gradient stop is what
                keeps the vertical edges from ever reading as a hard rectangle.

                The gradient is front-loaded so the shaft is already near full
                strength by ~22% of its own height. That band is exactly where
                the wordmark sits, and it has to be bright *there* — a shaft
                that only blooms below the type washes the bottom of the frame
                and never occludes anything, which is the whole job. */}
        <div
          className="absolute inset-x-[18%] bottom-0 top-0 animate-breathe blur-[26px]"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(236,238,251,0.30) 12%, rgba(236,238,251,0.50) 26%, rgba(236,238,251,0.44) 52%, rgba(236,238,251,0.34) 74%, rgba(236,238,251,0.52) 100%)",
          }}
        />

        {/* --- The core. Narrow, brightest, unblurred enough to give the eye
                something to actually land on — and opaque enough through the
                letter band to genuinely cut the word in two. */}
        <div
          className="absolute inset-x-[36%] bottom-0 top-[4%] blur-[14px]"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.52) 16%, rgba(255,255,255,0.72) 34%, rgba(255,255,255,0.58) 62%, rgba(255,255,255,0.78) 100%)",
          }}
        />

        {/* --- Chromatic rim. Magenta down one edge, cyan down the other: the
                ramp read as refraction through the shaft, which is where ref3
                gets its iridescence from. */}
        <div
          className="absolute inset-x-[10%] bottom-0 top-[12%] mix-blend-screen blur-[30px]"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,45,143,0.50) 0%, transparent 34%, transparent 66%, rgba(34,224,255,0.50) 100%)",
          }}
        />

        {/* --- Floor bounce. Grounds the shaft so it reads as standing on the
                page rather than floating over it. */}
        <div
          className="absolute inset-x-[-30%] bottom-0 h-[22%] blur-[40px]"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 100%, rgba(123,92,255,0.55), transparent 72%)",
          }}
        />
      </div>
    </div>
  );
}
