"use client";

import { VideoGround } from "./VideoGround";
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
 *   1  base          — the void colour, for the frame before the footage paints.
 *   2  video ground  — a violet city under a moon, a dive into a black hole
 *                      at Work, then a purple galaxy from Journey on
 *                      (VideoGround). Reduced motion gets the posters.
 *   3  grain + vignette
 *
 * Everything here is `pointer-events-none` and sits at z-0; content is z-10.
 */
export function SiteBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: "var(--color-void)" }} />
      <VideoGround />
      <Grain />
    </div>
  );
}
