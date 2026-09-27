"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * The glow horizon — the site's entrance vocabulary.
 *
 * A stack of enormous blurred ellipses sliding in from one edge, each a
 * different colour, size and blur, with a near-black one painted last that eats
 * the middle and leaves the others as a rim of light. What arrives is not a
 * shape but a *horizon*: a curved band of spectrum glow rising past the edge of
 * the frame.
 *
 * One component at three scales — the preloader hand-off, every section seam,
 * and the route wipe — so arriving anywhere on this site feels like the same
 * gesture. The hero no longer carries one. See ChapterSeam for the
 * scroll-scrubbed case.
 *
 * Two modes:
 *
 *   default   one-shot entrance on mount (boot, route change)
 *   progress  driven by a MotionValue 0→1 (section seams, scrubbed by scroll)
 */

const EASE = [0.16, 1, 0.3, 1] as const;
const DURATION = 2;

export type GlowHorizonVariant = "top" | "bottom" | "left" | "right";

interface Axis {
  axis: "x" | "y";
  scaleAxis: "scaleX" | "scaleY";
  /** Off-screen start. */
  enterPct: string;
  /** Resting position — half off the edge, so only the arc's crown shows. */
  restPct: string;
}

const VARIANTS: Record<GlowHorizonVariant, Axis> = {
  top: { axis: "y", scaleAxis: "scaleY", enterPct: "-100%", restPct: "-50%" },
  bottom: { axis: "y", scaleAxis: "scaleY", enterPct: "100%", restPct: "50%" },
  left: { axis: "x", scaleAxis: "scaleX", enterPct: "100%", restPct: "50%" },
  right: { axis: "x", scaleAxis: "scaleX", enterPct: "-100%", restPct: "-50%" },
};

interface ArcSpec {
  color: string;
  /** Diameter as a percentage of the container. */
  size: string;
  blur?: number;
  boxShadow?: string;
  /** Stagger within the stack. */
  delay: number;
  /** Arcs with an offset slide a little further on their own timing. */
  offset?: boolean;
}

/**
 * Painted back to front. The void arc is **last on purpose** — it covers the
 * centre of the stack and leaves everything under it showing only as a rim.
 * Reorder this and the effect stops being a horizon and becomes a blob.
 */
const ARCS: ArcSpec[] = [
  {
    color: "#ffffff",
    size: "132%",
    boxShadow: "0px -4px 23px 0px rgba(255,255,255,0.71)",
    delay: 1.2,
  },
  { color: "#22e0ff", size: "120%", blur: 31, delay: 0.6, offset: true },
  { color: "#7b5cff", size: "124%", blur: 21, delay: 0.3, offset: true },
  { color: "#ff2d8f", size: "128%", blur: 44, delay: 0, offset: true },
  { color: "#05060d", size: "120%", blur: 51, delay: 0, offset: true },
];

/**
 * The seam stack: three arcs instead of five.
 *
 * Every blurred ellipse here is a viewport-sized offscreen surface the
 * compositor has to rasterise, and the seams mount and unmount as you scroll —
 * so the full stack showed up as a long frame at each boundary. At seam
 * `intensity` (~0.4) the violet and the specular white are both under the
 * threshold of visibility anyway; what carries the effect is the magenta rim
 * against the void core.
 */
const SEAM_ARCS: ArcSpec[] = [
  { color: "#22e0ff", size: "122%", blur: 26, delay: 0.3, offset: true },
  { color: "#ff2d8f", size: "128%", blur: 36, delay: 0, offset: true },
  { color: "#05060d", size: "120%", blur: 42, delay: 0, offset: true },
];

export interface GlowHorizonProps {
  className?: string;
  variant?: GlowHorizonVariant;
  /** 0–1 strength. Seams run low; the hero runs at 1. */
  intensity?: number;
  /** Scrub the entrance off this instead of playing it once on mount. */
  progress?: MotionValue<number>;
  /** Delay the whole stack, e.g. to sit behind a curtain lift. */
  delay?: number;
  /** Use the cheaper three-arc stack. Every scroll-mounted instance should. */
  lite?: boolean;
}

export function GlowHorizon({
  className,
  variant = "top",
  intensity = 1,
  progress,
  delay = 0,
  lite = false,
}: GlowHorizonProps) {
  const reduced = useReducedMotion();
  const arcs = lite ? SEAM_ARCS : ARCS;
  const { axis, scaleAxis, enterPct, restPct } = VARIANTS[variant];

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ isolation: "isolate", opacity: intensity }}
    >
      {progress ? (
        <ScrubbedStack
          progress={progress}
          axis={axis}
          scaleAxis={scaleAxis}
          enterPct={enterPct}
          restPct={restPct}
          variant={variant}
          arcs={arcs}
        />
      ) : (
        <motion.div
          className="absolute inset-0 h-full w-full"
          initial={
            reduced
              ? false
              : {
                  [axis]: enterPct,
                  [scaleAxis]: 1.5,
                  opacity: 0,
                  filter: "blur(15px)",
                }
          }
          animate={{
            [axis]: restPct,
            [scaleAxis]: 1,
            opacity: 1,
            filter: "blur(0px)",
          }}
          transition={{ duration: reduced ? 0 : DURATION, ease: EASE, delay }}
        >
          {arcs.map((arc) => (
            <Arc key={arc.color} arc={arc} variant={variant} reduced={reduced} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

/**
 * Scroll-driven variant. Kept separate rather than branching inside one
 * `motion.div` because `useTransform` cannot be called conditionally, and the
 * seam case wants no per-arc stagger at all — a staggered entrance scrubbed by
 * scroll reads as five things lagging each other rather than as one move.
 */
function ScrubbedStack({
  progress,
  axis,
  scaleAxis,
  enterPct,
  restPct,
  variant,
  arcs,
}: {
  progress: MotionValue<number>;
  variant: GlowHorizonVariant;
  arcs: ArcSpec[];
} & Axis) {
  const offset = useTransform(progress, [0, 1], [enterPct, restPct]);
  const scale = useTransform(progress, [0, 1], [1.5, 1]);
  const opacity = useTransform(progress, [0, 0.25, 1], [0, 1, 1]);

  return (
    <motion.div
      className="absolute inset-0 h-full w-full"
      style={{ [axis]: offset, [scaleAxis]: scale, opacity }}
    >
      {arcs.map((arc) => (
        <Arc key={arc.color} arc={arc} variant={variant} reduced static />
      ))}
    </motion.div>
  );
}

function Arc({
  arc,
  variant,
  reduced,
  static: isStatic = false,
}: {
  arc: ArcSpec;
  variant: GlowHorizonVariant;
  reduced: boolean;
  static?: boolean;
}) {
  const { axis, enterPct } = VARIANTS[variant];
  const sign = enterPct.startsWith("-") ? -1 : 1;
  /* Offset arcs start 40% of their own height further out and slide home on
     their own delay, which is what gives the stack its depth — without it all
     five arrive as one flat band. */
  const from = arc.offset ? `${sign * 40}%` : "0%";
  const animate = isStatic || reduced;

  return (
    <motion.div
      className="absolute inset-0 rounded-[100%]"
      style={{
        scale: parseFloat(arc.size) / 100,
        background: arc.color,
        ...(arc.blur !== undefined && { filter: `blur(${arc.blur}px)` }),
        ...(arc.boxShadow && { boxShadow: arc.boxShadow }),
      }}
      /* Both halves are always defined. The reference pairs a defined `initial`
         with an `undefined` animate when there is no offset, which leaves the
         element parked at its initial value forever. */
      initial={animate ? { [axis]: "0%" } : { [axis]: from }}
      animate={{ [axis]: "0%" }}
      transition={{
        duration: animate ? 0 : DURATION,
        ease: EASE,
        delay: animate ? 0 : arc.delay,
      }}
    />
  );
}
