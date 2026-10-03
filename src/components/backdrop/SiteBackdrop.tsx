"use client";

import { NeonGround } from "./NeonGround";
import { Grain } from "./Grain";

/**
 * One background for the entire document.
 *
 * The site used to paint a ground per section, and later changed a shader and
 * a colour veil at every act boundary. Either way, crossing a section changed
 * what was behind the content. Now nothing does: there is one fixed field, the
 * same from the hero to the footer, and every section is transparent over it.
 * The act system (`data-act`) still retints the chrome and card surfaces, but
 * it never touches the ground.
 *
 * Layer order, back to front:
 *
 *   1  base          — near-black, a hair warm: the room the haze lights.
 *   2  neon ground   — the red floor haze, the dotted data-rain, scanlines
 *                      (NeonGround). It replaced the film (city → station),
 *                      which replaced the aurora; Aurora.tsx is kept,
 *                      unmounted. Under reduced motion the rain is one still
 *                      frame, so the ground looks the same and never moves.
 *   3  grain + vignette
 *
 * Everything here is `pointer-events-none` and sits at z-0; content is z-10.
 */
export function SiteBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: "#040306" }} />
      <NeonGround />
      <Grain />
    </div>
  );
}
