"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { EASE_EXPO } from "@/lib/motion";

const BANDS = 3;

/**
 * A chapter title that assembles from three horizontal bands, sliding in from
 * alternating sides, the first time it is seen — the one entrance every tab's
 * title shares. Once the last band lands the three copies give way to the
 * plain text, so at rest there is one text node and no seams between bands.
 *
 * The real string is a visually hidden text node, read once; the bands are
 * decoration. A hidden copy holds the layout, so nothing reflows. Reduced
 * motion: the plain title.
 */
export function SliceTitle({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);

  /* The wrapper (and its ref) is always mounted: `reduced` is true on the
     first paint, and useInView observes only the element it first found. */
  if (reduced || done)
    return (
      <span ref={ref} className="relative inline-block">
        {text}
      </span>
    );

  return (
    <span ref={ref} className="relative inline-block">
      <span className="sr-only">{text}</span>
      <span aria-hidden className="invisible">
        {text}
      </span>
      {Array.from({ length: BANDS }, (_, k) => {
        const top = (k * 100) / BANDS;
        const bottom = 100 - ((k + 1) * 100) / BANDS;
        return (
          <motion.span
            key={k}
            aria-hidden
            className="absolute inset-0 block"
            /* Bands overlap by a hair, so no gap shows mid-flight. */
            style={{ clipPath: `inset(${Math.max(0, top - 0.5)}% -2% ${Math.max(0, bottom - 0.5)}% -2%)` }}
            initial={{ x: k % 2 ? "8%" : "-8%", opacity: 0 }}
            animate={seen ? { x: "0%", opacity: 1 } : undefined}
            transition={{ duration: 0.9, delay: 0.08 + k * 0.09, ease: EASE_EXPO }}
            onAnimationComplete={k === BANDS - 1 && seen ? () => setDone(true) : undefined}
          >
            {text}
          </motion.span>
        );
      })}
    </span>
  );
}
