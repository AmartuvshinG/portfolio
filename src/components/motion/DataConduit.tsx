"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * A conduit running down the left gutter of its content, with a charge that
 * travels along it as you read. The path kinks outward at a third of the way
 * down and back in near the end, so it reads as routed cable rather than a
 * plain progress bar.
 *
 * Under reduced motion the conduit is omitted entirely — it's pure decoration,
 * and a static leftover line would just be visual noise.
 */
export function DataConduit({
  children,
  className,
  /** Label rendered at the conduit's origin node. */
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ["start 80%", "end 40%"],
  });

  /* The source this is adapted from measures height once on mount and never
     again, which breaks on font swap and any responsive reflow. Observe it. */
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const update = () => setHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const springs = { stiffness: 420, damping: 80 };
  const y1 = useSpring(
    useTransform(scrollYProgress, [0, 0.85], [40, height]),
    springs
  );
  const y2 = useSpring(
    useTransform(scrollYProgress, [0, 1], [40, Math.max(height - 180, 60)]),
    springs
  );

  const path = `M 1 0 V ${height * 0.3} l 16 22 V ${height * 0.78} l -16 22 V ${height}`;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {!reduced && height > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute -left-6 top-0 hidden lg:block"
        >
          {/* Origin node */}
          <span className="relative mb-1 flex h-3 w-3 items-center justify-center border border-cyan/50">
            <span className="animate-conduit h-1 w-1 bg-cyan" />
          </span>
          {label && (
            <span className="absolute left-6 top-0 whitespace-nowrap font-mono text-[0.55rem] uppercase tracking-[0.3em] text-faint">
              {label}
            </span>
          )}

          <svg
            width="20"
            height={height}
            viewBox={`0 0 20 ${height}`}
            className="block"
          >
            {/* Cold trace */}
            <path
              d={path}
              fill="none"
              stroke="var(--color-faint)"
              strokeOpacity="0.35"
              strokeWidth="1"
            />
            {/* Charge */}
            <path
              d={path}
              fill="none"
              stroke="url(#conduit-charge)"
              strokeWidth="1.5"
            />
            <defs>
              <motion.linearGradient
                id="conduit-charge"
                gradientUnits="userSpaceOnUse"
                x1="0"
                x2="0"
                y1={y1}
                y2={y2}
              >
                <stop stopColor="#00e5ff" stopOpacity="0" />
                <stop stopColor="#00e5ff" />
                <stop offset="0.35" stopColor="#8b5cf6" />
                <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
              </motion.linearGradient>
            </defs>
          </svg>
        </div>
      )}

      <div ref={contentRef}>{children}</div>
    </div>
  );
}
