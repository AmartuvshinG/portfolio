"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { EASE_EXPO } from "@/lib/motion";

/**
 * The hero's arrival primitive.
 *
 * The headline is the one place on the site where a blur is animated. That is
 * safe for three specific reasons: the element is small, the animation runs
 * once, and the filter is written back to `none` the moment it lands, so no
 * filtered surface survives into the scroll.
 */

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
  play = true,
  className,
}: {
  children: ReactNode;
  delay?: number;
  amount?: number;
  duration?: number;
  /** Hold out of focus until true. See `useBootReady`. */
  play?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [landed, setLanded] = useState(false);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ filter: `blur(${amount}px)`, opacity: 0.4 }}
      animate={
        play
          ? { filter: "blur(0px)", opacity: 1 }
          : { filter: `blur(${amount}px)`, opacity: 0.4 }
      }
      transition={{ duration, ease: EASE_EXPO, delay }}
      onAnimationComplete={() => setLanded(true)}
      style={landed ? { filter: "none" } : undefined}
    >
      {children}
    </motion.div>
  );
}
