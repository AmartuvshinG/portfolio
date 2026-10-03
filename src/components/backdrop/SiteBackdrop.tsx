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
 *   2  video ground  — the sakura cliff under a blue moon, a dive into the
 *                      moon at Work, then the red tunnel; the neon rain
 *                      (NeonGround) is the tunnel's weather (VideoGround).
 *                      Before it: the neon room, the film (city → station),
 *                      the aurora — Aurora.tsx is kept, unmounted. Reduced
 *                      motion gets the two posters and a dissolve.
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
