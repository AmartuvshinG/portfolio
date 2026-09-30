"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Empty screen for the film's two biggest moments (see FilmBackdrop):
 *
 *   doors    after the hero — the subway doors part and the camera pushes
 *            through the car
 *   airlock  between Work and Craft — the city climbs into its sky and a
 *            porthole opens onto the station hatch, under the status line
 *
 * Transparent, like every section: the picture is the backdrop's. The ids are
 * the film's anchors. There is deliberately no `data-chapter` — ChapterFrame
 * numbers every chapter in DOM order, and an interlude is a breath between
 * chapters, not one of them; the frame keeps the last chapter lit across it.
 *
 * Under reduced motion there is no film, so the doors interlude collapses to
 * nothing and the airlock keeps only its line of copy.
 */
export function FilmInterlude({ variant }: { variant: "doors" | "airlock" }) {
  const { c } = useI18n();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  /* The status line arrives once the porthole has opened (the film's iris
     lands at the section's midpoint crossing mid-screen), holds, and leaves
     before Craft. */
  const opacity = useTransform(scrollYProgress, [0.5, 0.6, 0.78, 0.88], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0.5, 0.6, 0.78, 0.88], [24, 0, 0, -24]);

  if (variant === "doors") {
    return (
      <section
        ref={ref}
        id="interlude-doors"
        data-act="void"
        aria-hidden="true"
        className={reduced ? "hidden" : "relative h-[100vh]"}
      />
    );
  }

  return (
    <section
      ref={ref}
      id="interlude-airlock"
      data-act="void"
      /* `overflow-x-clip`: the scrim below bleeds 12% past the line on both
         sides, and at phone width that is past the screen. Mobile browsers
         widen the layout viewport to fit it (body's overflow-x doesn't stop
         them), zooming the whole page out by 8px. `clip`, not `hidden`, so the
         sticky child keeps its scroll container. */
      className={reduced ? "relative overflow-x-clip py-24" : "relative h-[150vh] overflow-x-clip"}
    >
      <div className={reduced ? "flex justify-center px-[8%]" : "sticky top-0 flex h-dvh items-center justify-center px-[8%]"}>
        <motion.p
          style={reduced ? undefined : { opacity, y }}
          className="relative max-w-4xl text-center font-tech text-2xl font-semibold uppercase leading-[1.15] tracking-wide text-fg [text-shadow:0_4px_24px_rgba(0,0,0,0.7)] md:text-5xl"
        >
          {/* The station interior is near-white; the scrim travels with the
              line so it is only there while there is type to protect. */}
          <span
            aria-hidden="true"
            className="absolute -inset-x-[12%] -inset-y-[70%] -z-10"
            style={{
              background:
                "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(5,6,13,0.72), rgba(5,6,13,0) 72%)",
            }}
          />
          {c.profile.status}
        </motion.p>
      </div>
    </section>
  );
}
