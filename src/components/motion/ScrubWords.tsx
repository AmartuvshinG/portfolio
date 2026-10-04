"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * A line that lights a word at a time as you scroll past it — read at the
 * speed you scroll, the way a teleprompter keeps pace with a voice.
 *
 * One `useScroll` for the whole line; each word maps its own slice of that
 * progress to opacity (0.16 → 1), so nothing but opacity changes per frame.
 * The words are real text in inline spans, so the line reads and selects as
 * a sentence. Under reduced motion it is simply lit.
 *
 * `progress` hands it someone else's clock — a pinned stage, where the line
 * itself never moves and its own scroll position would never advance.
 * `ramp` sets the words in the spectrum ramp: each word shows its slice of
 * one sentence-wide gradient, so the colour runs through the line as it
 * lights rather than restarting on every word.
 */
export function ScrubWords({
  text,
  className,
  progress,
  ramp = false,
}: {
  text: string;
  className?: string;
  progress?: MotionValue<number>;
  ramp?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 88%", "end 50%"] });
  const p = progress ?? scrollYProgress;
  const words = text.split(" ");
  const n = words.length;
  const slice = (i: number) =>
    ramp
      ? {
          backgroundSize: `${n * 100}% 100%`,
          backgroundPosition: `${n > 1 ? (i / (n - 1)) * 100 : 0}% 0`,
        }
      : undefined;
  /* The ref is on the same span in both branches: useScroll throws if its
     target ref never reaches an element. */
  return (
    <span ref={ref} className={className}>
      {reduced ? (
        ramp ? <span className="spectrum-text">{text}</span> : text
      ) : words.map((w, i) => (
        <Word key={i} progress={p} from={i / n} to={(i + 1) / n} className={ramp ? "spectrum-text" : undefined} style={slice(i)}>
          {w}
          {i < words.length - 1 ? " " : ""}
        </Word>
      ))}
    </span>
  );
}

function Word({
  progress,
  from,
  to,
  children,
  className,
  style,
}: {
  progress: MotionValue<number>;
  from: number;
  to: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const opacity = useTransform(progress, [from, to], [0.16, 1]);
  return (
    <motion.span className={className} style={{ ...style, opacity }}>
      {children}
    </motion.span>
  );
}
