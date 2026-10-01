"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { develop, developFront, inView } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  variants?: Variants;
  delay?: number;
  /** When true, animate as part of a parent stagger (no own whileInView). */
  asChild?: boolean;
}

/**
 * Scroll-reveal wrapper: the develop reveal (lib/motion `develop`). The block
 * resolves top to bottom behind a travelling sodium line, once. Under reduced
 * motion, Framer's MotionConfig (set in SmoothScroll) neutralises the
 * transform and CSS hides the line, so content simply appears. Use `asChild`
 * inside a <RevealStagger>.
 *
 * A caller passing its own `variants` gets those and no line.
 */
export function Reveal({
  children,
  className,
  variants = develop,
  delay = 0,
  asChild = false,
}: RevealProps) {
  const front = variants === develop && (
    <motion.span aria-hidden className="develop-front" variants={developFront} transition={{ delay }} />
  );
  if (asChild) {
    return (
      <motion.div variants={variants} className={cn("relative", className)}>
        {children}
        {front}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn("relative", className)}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={inView}
      transition={{ delay }}
    >
      {children}
      {front}
    </motion.div>
  );
}

interface RevealStaggerProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  /** Passthrough for data-* hooks used by CSS (e.g. layout swaps). */
  [dataAttr: `data-${string}`]: unknown;
}

/** Container that staggers `Reveal asChild` items as they enter the viewport. */
export function RevealStagger({
  children,
  className,
  stagger = 0.07,
  delay = 0,
  ...rest
}: RevealStaggerProps) {
  return (
    <motion.div
      {...rest}
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={inView}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}
