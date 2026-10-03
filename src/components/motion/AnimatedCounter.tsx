"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  unit?: string;
  duration?: number;
  className?: string;
}

/**
 * Counts up from 0 to `value` once it scrolls into view, using an ease-out
 * curve and tabular figures so width never shifts. Reduced-motion users see
 * the final value immediately.
 *
 * Counts at the value's own precision, so a GPA of 3.69 ticks through
 * hundredths and lands on 3.69 rather than rounding to 4.
 */
export function AnimatedCounter({
  value,
  suffix = "",
  unit = "",
  duration = 1600,
  className,
}: AnimatedCounterProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const done = useRef(false);
  const decimals = (String(value).split(".")[1] ?? "").length;

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || done.current) return;
        done.current = true;
        io.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(value * eased);
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration, reduced]);

  return (
    <span ref={ref} className={cn("tabular", className)}>
      {(reduced ? value : display).toFixed(decimals)}
      {suffix}
      {/* Sized in `em`, so the unit stays subordinate at whatever scale the
          number is set — at the ledger's 8vw it would otherwise run "98/100"
          straight off the side of the viewport. */}
      {unit && <span className="text-[0.4em] text-muted">{unit}</span>}
    </span>
  );
}
