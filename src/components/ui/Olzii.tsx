"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/*
 * The ölzii (өлзий), the endless knot: one band, no ends, woven over and
 * under itself. The mark that closes a case file and the page.
 *
 * Generated, not hand-drawn: it is a mirror curve — a line bouncing at 45°
 * through a 3×3 grid of cells, turning back at the edges and at four inner
 * mirrors (placed so the whole knot is one closed strand, symmetric both
 * ways) — set on its point, with each turn at the edge swelled into a round
 * bight. The crossings alternate over and under along the strand; the
 * over-passes are drawn again on top. Units: the grid's half-cells.
 *
 * Drawn as a neon tube (a sodium outline round a dark core), and drawn *on*:
 * the first time it is seen the strand runs its whole length like the brush,
 * then the over-passes settle. Once, never on a loop. Reduced motion: drawn.
 */
const STRAND =
  "M-1.061 -3.182 Q-0.707 -2.121 0 -2.121 Q0.707 -2.121 1.768 -2.475 Q2.828 -2.828 2.475 -1.768 Q2.121 -0.707 2.121 0 Q2.121 0.707 3.182 1.061 Q4.243 1.414 4.243 0 Q4.243 -1.414 3.182 -1.061 Q2.121 -0.707 1.414 -0.707 Q0.707 -0.707 0 -0.707 Q-0.707 -0.707 -1.414 -0.707 Q-2.121 -0.707 -2.475 -1.768 Q-2.828 -2.828 -1.768 -2.475 Q-0.707 -2.121 -0.707 -1.414 Q-0.707 -0.707 -0.707 0 Q-0.707 0.707 -0.707 1.414 Q-0.707 2.121 -1.061 3.182 Q-1.414 4.243 0 4.243 Q1.414 4.243 1.061 3.182 Q0.707 2.121 0 2.121 Q-0.707 2.121 -1.768 2.475 Q-2.828 2.828 -2.475 1.768 Q-2.121 0.707 -2.121 0 Q-2.121 -0.707 -3.182 -1.061 Q-4.243 -1.414 -4.243 0 Q-4.243 1.414 -3.182 1.061 Q-2.121 0.707 -1.414 0.707 Q-0.707 0.707 0 0.707 Q0.707 0.707 1.414 0.707 Q2.121 0.707 2.475 1.768 Q2.828 2.828 1.768 2.475 Q0.707 2.121 0.707 1.414 Q0.707 0.707 0.707 0 Q0.707 -0.707 0.707 -1.414 Q0.707 -2.121 1.061 -3.182 Q1.414 -4.243 0 -4.243 Q-1.414 -4.243 -1.061 -3.182Z";
const OVER = "M0.113 -2.121L1.301 -2.121M2.715 -0.707L1.527 -0.707M-0.113 -0.707L-1.301 -0.707M-0.707 0.113L-0.707 1.301M-0.113 2.121L-1.301 2.121M-2.715 0.707L-1.527 0.707M0.113 0.707L1.301 0.707M0.707 -0.113L0.707 -1.301";

export function Olzii({ className, title }: { className?: string; title?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const drawn = reduced || seen;
  const run = reduced ? { duration: 0 } : { duration: 2.4, ease: [0.45, 0, 0.25, 1] as const };
  const settle = reduced ? { duration: 0 } : { duration: 0.35, delay: 2.15 };

  return (
    <svg
      ref={ref}
      viewBox="-5 -5 10 10"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("block overflow-visible", className)}
      fill="none"
      strokeLinejoin="round"
    >
      <motion.path
        d={STRAND}
        stroke="var(--color-hazard)"
        strokeWidth={0.62}
        initial={false}
        animate={{ pathLength: drawn ? 1 : 0, opacity: drawn ? 1 : 0 }}
        transition={{ pathLength: run, opacity: { duration: 0.01 } }}
        style={{ filter: "drop-shadow(0 0 0.35px var(--color-hazard))" }}
      />
      <motion.path
        d={STRAND}
        stroke="#07080d"
        strokeWidth={0.3}
        initial={false}
        animate={{ pathLength: drawn ? 1 : 0, opacity: drawn ? 1 : 0 }}
        transition={{ pathLength: run, opacity: { duration: 0.01 } }}
      />
      <motion.g initial={false} animate={{ opacity: drawn ? 1 : 0 }} transition={settle}>
        <path d={OVER} stroke="var(--color-hazard)" strokeWidth={0.62} />
        <path d={OVER} stroke="#07080d" strokeWidth={0.3} />
      </motion.g>
    </svg>
  );
}
