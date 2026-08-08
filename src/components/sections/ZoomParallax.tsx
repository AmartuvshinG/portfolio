"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { projects } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { setBackdropIntensity } from "@/lib/backdrop";
import { ProjectVisual } from "@/components/work/ProjectVisual";
import { useEffect } from "react";

/**
 * The flight between Work and Archive.
 *
 * Seven panels sit stacked at the centre of a pinned viewport and scale apart as
 * you scroll, so the camera flies *through* the composition rather than watching
 * it slide past. It lands where the brief said the page was emptiest — the long
 * dead stretch between the work world and the archive — and it is not filler
 * there: it is the transition, and it carries the work a second time on the way.
 *
 * Placement is a data table rather than the reference's single unreadable string
 * of `!`-flagged Tailwind arbitrary values keyed on `index === 1…6`, which
 * capped the effect at seven items and could not be tuned without rewriting the
 * whole class attribute.
 *
 * Reduced motion gets a static grid: the entire premise is differential scale,
 * so there is nothing to preserve by faking the positions without it.
 */

interface Panel {
  /** Offset from centre, in viewport units. 0,0 is the panel you fly into. */
  top: number;
  left: number;
  /** Size, in viewport units. */
  w: number;
  h: number;
  /** Terminal scale. The spread across these is what creates the depth. */
  scale: number;
}

/**
 * The centre panel is first and never moves — it is Archive's opening frame, and
 * the whole sequence resolves *into* it. Everything else flies outward past the
 * camera at a different rate.
 */
const PANELS: Panel[] = [
  { top: 0, left: 0, w: 25, h: 25, scale: 4 },
  { top: -30, left: 5, w: 35, h: 30, scale: 5 },
  { top: -10, left: -25, w: 20, h: 45, scale: 6 },
  { top: 0, left: 27.5, w: 25, h: 25, scale: 5 },
  { top: 27.5, left: 5, w: 20, h: 25, scale: 6 },
  { top: 27.5, left: -22.5, w: 30, h: 25, scale: 8 },
  { top: 22.5, left: 25, w: 15, h: 15, scale: 9 },
];

export function ZoomParallax() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  /* The zoom owns the frame while it runs. Two full-screen visuals competing —
     a flight through seven scaling panels over a live shader field — is noise,
     and the field is invisible behind the panels at the end of the run anyway. */
  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setBackdropIntensity(entry.intersectionRatio > 0.6 ? 0.3 : 1),
      { threshold: [0, 0.6, 1] }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      setBackdropIntensity(1);
    };
  }, [reduced]);

  if (reduced) {
    return (
      <section
        ref={ref}
        data-act="void"
        data-chapter="FLIGHT"
        className="relative py-24"
        aria-label="Work in passing"
      >
        <div className="mx-auto grid max-w-[1800px] grid-cols-2 gap-4 px-5 md:grid-cols-4 md:px-8">
          {PANELS.map((_, i) => (
            <div key={i} className="notch-card-sm relative aspect-[4/3] overflow-hidden">
              <Plate index={i} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      data-act="void"
      data-chapter="FLIGHT"
      className="relative h-[300vh]"
      aria-label="Work in passing"
    >
      <div className="sticky top-0 h-dvh overflow-hidden">
        {PANELS.map((panel, i) => (
          <Flying key={i} panel={panel} index={i} progress={scrollYProgress} />
        ))}

        {/* The one piece of chrome. Sits above the flight and holds still, so
            there is a fixed reference against all that scale — without it the
            zoom has no sense of speed because nothing is stationary. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-5 md:p-8 lg:px-16">
          {/* Unnumbered on purpose. This is a transition between two chapters,
              not a chapter of its own — giving it an index would put a number
              in the sequence that the navbar has no entry for. */}
          <span className="micro">In passing</span>
          <span className="micro tabular">{projects.length} case files</span>
        </div>
      </div>
    </section>
  );
}

function Flying({
  panel,
  index,
  progress,
}: {
  panel: Panel;
  index: number;
  progress: import("framer-motion").MotionValue<number>;
}) {
  const scale = useTransform(progress, [0, 1], [1, panel.scale]);

  return (
    <motion.div
      /* `willChange` matters more here than anywhere else on the page: without
         the promotion Chrome re-rasterises these panels at every intermediate
         scale on the way to 9×, which is the single most expensive thing a
         scroll can ask for. Promoted, the layer is rasterised once and the
         scale is a compositor transform. */
      style={{ scale, willChange: "transform" }}
      className="absolute top-0 flex h-full w-full items-center justify-center"
    >
      <div
        className="notch-card-sm relative overflow-hidden ring-1 ring-inset ring-line"
        style={{
          top: `${panel.top}vh`,
          left: `${panel.left}vw`,
          width: `${panel.w}vw`,
          height: `${panel.h}vh`,
          position: "relative",
        }}
      >
        <Plate index={index} />
      </div>
    </motion.div>
  );
}

/**
 * Panel art. Cycles the real project visuals so the flight is a second pass over
 * the work rather than decoration — the first four panels are the case files in
 * order, and the rest repeat them at different crops.
 */
function Plate({ index }: { index: number }) {
  const project = projects[index % projects.length];
  return (
    <>
      <ProjectVisual
        index={project.index}
        title={project.title}
        category={project.category}
        accent={project.accent}
      />
      {/* Scanlines — the same treatment the city band and the depth scan use,
          so every generated surface on the site reads as one material. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(236,238,251,0.5) 0 1px, transparent 1px 4px)",
        }}
      />
      {/* Rim light along the leading edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--spectrum-1) 45%, transparent) 0%, transparent 32%, transparent 68%, color-mix(in srgb, var(--spectrum-3) 45%, transparent) 100%)",
          mixBlendMode: "screen",
        }}
      />
    </>
  );
}
