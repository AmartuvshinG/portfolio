"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * A word that swaps itself in place, the plate resizing around each new word.
 *
 * The plate is a `layout`-animated element so the resize is continuous rather
 * than a jump, and words cross under `popLayout` so the outgoing one leaves the
 * flow immediately instead of pushing the incoming one around.
 *
 * Under reduced motion it renders the first word and stops — a headline that
 * rewrites itself on a timer is exactly the kind of unrequested motion the
 * preference exists to suppress.
 */
export function HeadlineFlip({
  words,
  interval = 2600,
  className,
}: {
  words: string[];
  interval?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused || words.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % words.length),
      interval
    );
    return () => clearInterval(id);
  }, [reduced, paused, interval, words.length]);

  if (reduced) {
    return <span className={className}>{words[0]}</span>;
  }

  return (
    <motion.span
      layout
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      transition={{ type: "spring", stiffness: 220, damping: 30 }}
      className={cn(
        "chamfer-sm relative inline-flex overflow-hidden border border-cyan/30 bg-cyan/[0.06] px-[0.22em] align-baseline",
        className
      )}
    >
      {/* Keeps the plate honest during the layout animation: the widest word
          reserves no space, but a zero-height ghost preserves the line box. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={words[index]}
          initial={{ y: "-70%", filter: "blur(10px)", opacity: 0 }}
          animate={{ y: "0%", filter: "blur(0px)", opacity: 1 }}
          exit={{ y: "70%", filter: "blur(10px)", opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="text-glow-cyan inline-block whitespace-nowrap"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>

      {/* Scanning underline that re-runs on each swap */}
      <motion.span
        key={`scan-${index}`}
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-cyan"
        initial={{ scaleX: 0, transformOrigin: "left" }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.span>
  );
}
