"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * The join between two sections: a spectrum hairline that draws itself across
 * the boundary as you scroll over it.
 *
 * This is all a seam is now. It used to crest a blurred glow horizon over the
 * join, ripple the backdrop shader, and on three sections drop a shutter blind.
 * Each of those made a boundary *happen to* the background, and the background
 * is supposed to be one continuous ground from the top of the page to the
 * bottom. A 1px line is enough to mark a chapter without changing what is
 * behind it.
 *
 * Place as the first child of a section. It positions itself on that section's
 * leading edge and never affects layout. The ref sits on a wrapper that is
 * always rendered, because `useScroll` throws if its target never hydrates.
 */
export function ChapterSeam({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  /* Runs from just below the fold to a quarter up the viewport, so the line
     finishes drawing while the boundary is still on screen. */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 95%", "start 25%"],
  });

  const rule = useTransform(scrollYProgress, [0, 0.8], [0, 1]);
  const ruleOpacity = useTransform(scrollYProgress, [0, 0.15, 0.9, 1], [0, 1, 1, 0.35]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-x-0 top-0 z-0 h-px", className)}
    >
      {reduced ? (
        <div className="spectrum-rule absolute inset-x-0 top-0 h-px opacity-40" />
      ) : (
        /* Draws from the centre outward, so the join reads as something
           opening rather than something sliding in from one side. */
        <motion.div
          className="spectrum-rule absolute inset-x-0 top-0 h-px origin-center"
          style={{ scaleX: rule, opacity: ruleOpacity }}
        />
      )}
    </div>
  );
}
