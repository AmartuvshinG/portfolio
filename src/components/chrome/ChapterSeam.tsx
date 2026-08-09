"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { GlowHorizon } from "@/components/ui/GlowHorizon";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { pulseBackdrop } from "@/lib/backdrop";
import { cn, srand } from "@/lib/utils";

/**
 * The join between two sections.
 *
 * With one fixed backdrop under the whole document there is no longer a colour
 * step at a section boundary — which solves the seam problem and creates a new
 * one: nothing marks the boundary at all, and the page reads as one
 * undifferentiated scroll. So the boundary gets *authored* instead of merely
 * happening: a spectrum hairline draws itself across the join while a glow
 * horizon crests over it, both scrubbed by scroll so the crossing is something
 * you drive rather than something that plays at you.
 *
 * The same gesture also kicks the backdrop shader (`pulseBackdrop`), so the
 * whole frame ripples rather than just the overlay drawn on top of it.
 *
 * Place as the first child of a section; it positions itself on that section's
 * leading edge and never affects layout.
 *
 * ---------------------------------------------------------------------------
 * Two structural rules here, both learned the hard way, both about the fact
 * that this component is mounted once per section — nine times on the page.
 *
 * 1. **The ref is on a single wrapper that is always rendered**, in every
 *    branch and every state. `useScroll` measures its target in a layout effect
 *    and throws "Target ref is defined but not hydrated" if the ref never
 *    reaches an element. Hooks cannot be skipped, so any early return that
 *    dropped the ref threw — nine times over. Branching now happens *inside*
 *    the wrapper, never around it.
 *
 * 2. **The arcs only exist while the seam is near the viewport.** A glow
 *    horizon is five overlapping ellipses with blur radii up to 51px. Nine of
 *    those permanently in the layer tree is ~45 large blurred surfaces the
 *    compositor carries on every frame, whether or not any of them is on
 *    screen. The observer below is what keeps this to the one or two seams
 *    actually in play.
 * ---------------------------------------------------------------------------
 */
export function ChapterSeam({
  intensity = 0.42,
  wipe = false,
  className,
}: {
  /** 0–1. Seams run well under the hero so they punctuate rather than compete. */
  intensity?: number;
  /**
   * Add the shutter blind — a row of vertical bars that stagger open as you
   * cross. **Only three sections pass this.** Nine shuttering boundaries is a
   * tic; three is punctuation, and the difference between the two is the whole
   * reason the datamosh this replaces had to be deleted rather than tuned.
   */
  wipe?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [near, setNear] = useState(false);

  /* Runs from just below the fold to a quarter up the viewport, so the crossing
     resolves while the boundary is still on screen. Ending at `start 0%` would
     put the payoff behind the navbar. */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 95%", "start 25%"],
  });

  const rule = useTransform(scrollYProgress, [0, 0.8], [0, 1]);
  const ruleOpacity = useTransform(scrollYProgress, [0, 0.15, 0.9, 1], [0, 1, 1, 0.35]);

  /* A generous margin so the arcs are mounted and settled before they can be
     seen — popping them in at the boundary would be worse than the cost they
     save. One viewport either side is enough. */
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: "100% 0px 100% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  /* Latched with a dead band rather than a bare threshold: scroll inertia
     jitters across a single crossing point and would machine-gun the pulse. */
  const fired = useRef(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!fired.current && v > 0.5) {
      fired.current = true;
      pulseBackdrop(0.85);
    } else if (fired.current && v < 0.3) {
      fired.current = false;
    }
  });

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        /* Sits *inside* its section rather than straddling the boundary: most
           sections are `overflow-hidden`, and anything hanging above the top
           edge gets clipped in half. The horizon variant already rests half off
           its own container's top, which puts the crown where the join is
           without needing to escape the box. */
        "pointer-events-none absolute inset-x-0 top-0 z-0",
        reduced ? "h-px" : "h-[42vh]",
        className
      )}
    >
      {reduced ? (
        <div className="spectrum-rule absolute inset-x-0 top-0 h-px opacity-40" />
      ) : (
        <>
          {near && wipe && <Shutter progress={scrollYProgress} />}

          {near && (
            <GlowHorizon
              lite
              variant="top"
              intensity={intensity}
              progress={scrollYProgress}
            />
          )}

          {/* The hairline. Draws from the centre outward so the join reads as
              something opening rather than something sliding in from one side.
              Cheap enough to leave mounted always — it is one 1px element. */}
          <motion.div
            className="spectrum-rule absolute inset-x-0 top-1/3 h-px origin-center"
            style={{ scaleX: rule, opacity: ruleOpacity }}
          />
        </>
      )}
    </div>
  );
}

/* How many slats. Enough that the row reads as a texture rather than as a set
   of countable rectangles, few enough that it is 18 compositor transforms and
   not 60. */
const SLATS = 18;

/**
 * The shutter blind — a row of slats that stagger open across the join.
 *
 * This is the ref1 move, and it exists because of what it replaced. There used
 * to be a "datamosh" firing at every one of these boundaries: six full-width
 * bars in `screen` blend that read, correctly, as the page tearing. The
 * instinct behind it was right — a boundary should have graphic snap — but a
 * *random* stutter is indistinguishable from a fault, whereas a *structured*
 * one cannot be mistaken for anything but deliberate. Same energy, opposite
 * reading.
 *
 * Three things it does not do:
 *
 * - It does not play at you. Every slat is scrubbed by the same scroll progress
 *   that drives the arc and the hairline, so crossing the seam is something you
 *   drive at your own speed and can reverse.
 * - It does not open left to right. A linear sweep reads as a page transition
 *   from a template; the seeded offsets below make it read as a mechanism.
 * - It does not blend. `scaleY` on a flat translucent fill is a compositor
 *   transform on an already-rasterised layer, which is the entire reason this
 *   can afford to be 18 elements while the six datamosh bars could not.
 */
function Shutter({
  progress,
}: {
  progress: import("framer-motion").MotionValue<number>;
}) {
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 top-0 flex h-[16vh] gap-px overflow-hidden"
    >
      {Array.from({ length: SLATS }, (_, i) => (
        <Slat key={i} index={i} progress={progress} />
      ))}
    </div>
  );
}

function Slat({
  index,
  progress,
}: {
  index: number;
  progress: import("framer-motion").MotionValue<number>;
}) {
  /* Seeded rather than random: a `Math.random()` here would give the server and
     the client different offsets and desynchronise on hydration. `srand` is an
     integer hash, so it is bit-exact in Node and in the browser. */
  const offset = srand(index * 17 + 3) * 0.42;
  /* Alternating anchors, so the slats retract to both edges and the row reads
     as a shutter rather than as a bar chart draining downward. */
  const fromTop = srand(index * 29 + 11) > 0.45;

  const scaleY = useTransform(progress, [offset, offset + 0.5], [1, 0]);
  const opacity = useTransform(progress, [offset, offset + 0.5], [0.5, 0]);

  return (
    <motion.span
      className="h-full flex-1"
      style={{
        scaleY,
        opacity,
        transformOrigin: fromTop ? "50% 0%" : "50% 100%",
        background:
          index % 3 === 0
            ? "linear-gradient(180deg, color-mix(in srgb, var(--spectrum-1) 34%, transparent), transparent)"
            : index % 3 === 1
              ? "linear-gradient(180deg, color-mix(in srgb, var(--spectrum-2) 30%, transparent), transparent)"
              : "linear-gradient(180deg, color-mix(in srgb, var(--spectrum-3) 26%, transparent), transparent)",
      }}
    />
  );
}
