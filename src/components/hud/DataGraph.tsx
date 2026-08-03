"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface DataGraphProps {
  bars?: number;
  className?: string;
  color?: string;
}

/**
 * Faux live telemetry graph: a row of bars whose heights drift over time to
 * make the interface feel "alive". Freezes at a static readout for
 * reduced-motion users.
 */
export function DataGraph({
  bars = 28,
  className,
  color = "var(--color-cyan)",
}: DataGraphProps) {
  const reduced = useReducedMotion();
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: bars }, (_, i) => 25 + ((i * 37) % 55))
  );
  const raf = useRef(0);

  useEffect(() => {
    if (reduced) return;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 120) {
        last = t;
        setHeights((prev) => {
          const next = [...prev.slice(1), 20 + Math.random() * 75];
          return next;
        });
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [reduced]);

  return (
    <div
      className={cn("flex h-10 items-end gap-[3px]", className)}
      aria-hidden
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-full flex-1 transition-[height] duration-150 ease-out"
          style={{
            height: `${h}%`,
            background: color,
            opacity: 0.25 + (h / 100) * 0.6,
          }}
        />
      ))}
    </div>
  );
}
