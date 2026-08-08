"use client";

import { motion, type Variants } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { EASE_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * A line revealed one word at a time, each word arriving through an RGB split
 * that converges as it lands.
 *
 * The split is the part worth getting right. It is not a glitch effect — it is
 * a *focus* effect: two ramp-coloured copies of the word sit offset either side
 * of the real one and slide together as the word settles, so each word reads as
 * snapping into register. Fringing that stays is noise; fringing that resolves
 * is a lens.
 *
 * Both copies are `aria-hidden` and the container carries the real string as an
 * `aria-label`, so assistive tech gets one clean sentence rather than a stutter
 * of duplicated words.
 *
 * Reduced motion gets the whole line at once with no split — the effect is
 * entirely motion, so there is nothing to preserve by staging it statically.
 */

/** Seconds between word arrivals. The reference measures ~0.7s, which drags
 *  against this site's tempo; 0.55 keeps the cadence without the wait. */
const CADENCE = 0.55;

const container = (cadence: number, delay: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: cadence, delayChildren: delay } },
});

const word: Variants = {
  hidden: { opacity: 0, y: "0.25em" },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_EXPO },
  },
};

/** The two chromatic copies. Same variant, mirrored by the `dir` multiplier. */
const ghost = (dir: number): Variants => ({
  hidden: { x: dir * 5, opacity: 0.85 },
  show: {
    x: 0,
    opacity: 0,
    transition: { duration: 0.4, ease: EASE_EXPO },
  },
});

export function WordReveal({
  text,
  delay = 0,
  cadence = CADENCE,
  className,
  as: Tag = "p",
}: {
  text: string;
  delay?: number;
  cadence?: number;
  className?: string;
  as?: "p" | "h1" | "h2" | "span";
}) {
  const reduced = useReducedMotion();
  const words = text.split(" ");

  const Motion = motion[Tag];

  if (reduced) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Motion
      aria-label={text}
      className={className}
      variants={container(cadence, delay)}
      initial="hidden"
      animate="show"
    >
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          aria-hidden
          variants={word}
          /* `inline-block` is required for the y transform to apply at all, and
             the trailing space has to live inside the block or the words run
             together once they are laid out as boxes. */
          className="relative inline-block whitespace-pre"
        >
          {w}
          {i < words.length - 1 ? " " : ""}

          <motion.span
            aria-hidden
            variants={ghost(-1)}
            className="absolute inset-0 whitespace-pre"
            style={{ color: "var(--spectrum-1)", mixBlendMode: "screen" }}
          >
            {w}
          </motion.span>
          <motion.span
            aria-hidden
            variants={ghost(1)}
            className="absolute inset-0 whitespace-pre"
            style={{ color: "var(--spectrum-3)", mixBlendMode: "screen" }}
          >
            {w}
          </motion.span>
        </motion.span>
      ))}
    </Motion>
  );
}

/** Convenience for the hero's two-line lead, where line 2 lags line 1. */
export function WordRevealLines({
  lines,
  delay = 0,
  lineLag = 0.35,
  cadence = CADENCE,
  className,
}: {
  lines: string[];
  delay?: number;
  /** Measured off the reference: the second line starts 0.35s behind. */
  lineLag?: number;
  cadence?: number;
  className?: string;
}) {
  return (
    <>
      {lines.map((line, i) => (
        <WordReveal
          key={line}
          text={line}
          delay={delay + i * lineLag}
          cadence={cadence}
          className={cn(className)}
        />
      ))}
    </>
  );
}
