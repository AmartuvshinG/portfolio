"use client";

import { Aurora } from "./Aurora";
import { Grain } from "./Grain";
import { useReducedMotion } from "@/hooks/useReducedMotion";

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
 *   1  base gradient  — the floor; the whole backdrop under reduced motion
 *   2  aurora         — drifting blobs + stars, frozen while scrolling
 *   3  grain + vignette
 *
 * Everything here is `pointer-events-none` and sits at z-0; content is z-10.
 */
export function SiteBackdrop() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* 1 — base. Petrol-black with the ramp bled into the corners, so even
             with the aurora off the ground is never flat #000. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 70% at 15% 8%, rgba(255,45,143,0.12), transparent 62%)," +
            "radial-gradient(80% 65% at 88% 22%, rgba(34,224,255,0.10), transparent 60%)," +
            "radial-gradient(100% 80% at 50% 108%, rgba(123,92,255,0.16), transparent 70%)," +
            "linear-gradient(180deg, #05060d 0%, #070814 45%, #05060d 100%)",
        }}
      />

      {!reduced && <Aurora />}

      <Grain />
    </div>
  );
}
