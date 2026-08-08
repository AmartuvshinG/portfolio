"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { EASE_EXPO } from "@/lib/motion";
import { GlowHorizon } from "@/components/ui/GlowHorizon";
import { cn } from "@/lib/utils";

/**
 * The arrival, matched to `hero-animation.mp4`.
 *
 * Measured off the reference: a blown-out arc fills the frame at roughly 2.6×,
 * collapses to its resting horizon over ~1.2s while its rim cools from white to
 * violet, and the headline resolves out of ~28px of blur — with the second line
 * running 0.35s behind the first.
 *
 * **The bloom is scale, not blur.** `GlowHorizon` is already a stack of soft
 * radial gradients, so scaling one up *is* the blown-out look, and it costs a
 * compositor transform. Animating a `filter: blur()` across a full-bleed surface
 * to get the same picture is the exact bug the perf pass removed from the About
 * bloom — a viewport-sized gaussian re-run every frame.
 *
 * The headline is the one place a blur is animated, and it is safe for three
 * specific reasons: the element is small, the animation is one-shot, and the
 * filter is written back to `none` the instant it lands so no filtered surface
 * survives into the scroll.
 */

const COLLAPSE = 1.2;

export function EntranceArc({
  delay = 0.35,
  className,
}: {
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div className={cn("absolute inset-0", className)}>
        <GlowHorizon variant="bottom" />
      </div>
    );
  }

  return (
    <div className={cn("absolute inset-0", className)}>
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 2.6 }}
        animate={{ scale: 1 }}
        transition={{ duration: COLLAPSE, ease: EASE_EXPO, delay }}
        style={{ willChange: "transform" }}
      >
        {/* `idle` keeps the slow breathe once the collapse has landed, so the
            horizon never becomes a still image. */}
        <GlowHorizon variant="bottom" idle delay={delay} />
      </motion.div>

      {/* The white-hot pass. A separate layer rather than a colour animation on
          the arcs themselves — the arcs are five stacked gradients and tweening
          all five to white and back is five interpolations for one impression. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0.92 }}
        animate={{ opacity: 0 }}
        transition={{ duration: COLLAPSE * 0.95, ease: EASE_EXPO, delay }}
        style={{
          background:
            "radial-gradient(120% 90% at 50% 118%, #ffffff 0%, rgba(255,255,255,0.72) 26%, rgba(236,238,251,0.18) 52%, transparent 74%)",
        }}
      />
    </div>
  );
}

/**
 * Resolves its children out of blur, once.
 *
 * `filter` is dropped to `none` on completion — an element left carrying
 * `filter: blur(0px)` still owns an offscreen surface for the rest of the
 * session, which on the hero means one that scrolls.
 */
export function Focus({
  children,
  delay = 0,
  amount = 28,
  duration = 0.9,
  className,
}: {
  children: ReactNode;
  delay?: number;
  amount?: number;
  duration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [landed, setLanded] = useState(false);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ filter: `blur(${amount}px)`, opacity: 0.4 }}
      animate={{ filter: "blur(0px)", opacity: 1 }}
      transition={{ duration, ease: EASE_EXPO, delay }}
      onAnimationComplete={() => setLanded(true)}
      style={landed ? { filter: "none" } : undefined}
    >
      {children}
    </motion.div>
  );
}
