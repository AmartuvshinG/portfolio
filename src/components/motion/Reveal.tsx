"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp, inView } from "@/lib/motion";
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
 * Scroll-reveal wrapper. Fades + rises into view once. Under reduced motion,
 * Framer's MotionConfig (set in SmoothScroll) neutralises the transform, so
 * content simply appears. Use `asChild` inside a <RevealStagger>.
 */
export function Reveal({
  children,
  className,
  variants = fadeUp,
  delay = 0,
  asChild = false,
}: RevealProps) {
  if (asChild) {
    return (
      <motion.div variants={variants} className={className}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(className)}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={inView}
      transition={{ delay }}
    >
      {children}
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
