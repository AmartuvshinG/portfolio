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
 */
export function ScrubWords({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 88%", "end 50%"] });
  const words = text.split(" ");
  /* The ref is on the same span in both branches: useScroll throws if its
     target ref never reaches an element. */
  return (
    <span ref={ref} className={className}>
      {reduced ? text : words.map((w, i) => (
        <Word key={i} progress={scrollYProgress} from={i / words.length} to={(i + 1) / words.length}>
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
}: {
  progress: MotionValue<number>;
  from: number;
  to: number;
  children: React.ReactNode;
}) {
  const opacity = useTransform(progress, [from, to], [0.16, 1]);
  return <motion.span style={{ opacity }}>{children}</motion.span>;
}
