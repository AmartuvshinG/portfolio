"use client";

import { NeuralNoise } from "./NeuralNoise";
import { AuroraVeil } from "./AuroraVeil";
import { Nebula } from "./Nebula";
import { Grain } from "./Grain";
import { useHasWebGL } from "@/lib/gpu";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * One background for the entire document.
 *
 * The site used to paint a ground per section and swap `--color-bg` between
 * three literal colours as you scrolled. That is what made the page read as
 * several websites bolted together: every boundary was a step change in the
 * ground itself, and no amount of transition on top can hide a repaint
 * underneath it.
 *
 * So there is now exactly one background, fixed to the viewport, and every
 * section is transparent over it. Nothing about the ground changes at a
 * boundary — what changes is a shader parameter, eased. Depth (the act system)
 * survives as gain and speed inside the field plus a thin veil, never as a
 * different colour of paint.
 *
 * Layer order, back to front:
 *
 *   1  base gradient   — the floor, and the whole backdrop when WebGL is out
 *   2  neural field    — the subject (NeuralNoise)
 *   3  aurora veil     — large-scale structure the per-pixel noise can't make
 *   4  nebula          — particulate, carried over from SPECTRUM
 *   5  act veil        — depth, as a low-alpha wash
 *   6  grain + vignette
 *
 * Everything here is `pointer-events-none` and sits at z-0; content is z-10.
 */
export function SiteBackdrop() {
  const reduced = useReducedMotion();
  const gpu = useHasWebGL();

  /* Both the shader and the aurora are pure motion. Without them the base
     gradient plus the nebula is a designed static ground rather than a blank
     one — the reduced-motion path is a different composition, not a stripped
     version of this one. */
  const animated = gpu && !reduced;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* 1 — base. Petrol-black with the ramp bled into the corners, so even
             with every layer above disabled the ground is never flat #000. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 70% at 15% 8%, rgba(255,45,143,0.16), transparent 62%)," +
            "radial-gradient(80% 65% at 88% 22%, rgba(34,224,255,0.13), transparent 60%)," +
            "radial-gradient(100% 80% at 50% 108%, rgba(123,92,255,0.20), transparent 70%)," +
            "linear-gradient(180deg, #05060d 0%, #070814 45%, #05060d 100%)",
        }}
      />

      {animated && (
        <NeuralNoise className="absolute inset-0 h-full w-full" opacity={0.85} />
      )}

      {animated && <AuroraVeil />}

      <Nebula
        className="absolute inset-0 h-full w-full"
        opacity={animated ? 0.22 : 0.5}
      />

      {/* 5 — the act veil. `--veil` is resolved by the [data-act] blocks in
             globals.css and transitions on --act-fade, so crossing into a
             deeper act washes the field rather than repainting behind it. */}
      <div
        className="absolute inset-0 transition-[background-color] duration-[620ms] ease-[cubic-bezier(0.7,0,0.3,1)]"
        style={{ backgroundColor: "var(--veil)" }}
      />

      <Grain />
    </div>
  );
}
