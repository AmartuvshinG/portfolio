"use client";

import {
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  /** 0–1: how strongly the element is pulled toward the cursor. */
  strength?: number;
  style?: CSSProperties;
}

/**
 * Wraps content and eases it toward the pointer while hovered, snapping back
 * on leave — the classic "magnetic" microinteraction. No-op under reduced
 * motion. Purely transform-based (GPU friendly).
 */
export function MagneticButton({
  children,
  className,
  strength = 0.35,
  style,
}: MagneticButtonProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };

  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "translate(0, 0)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={cn("inline-block transition-transform duration-500 ease-out", className)}
      style={{ willChange: "transform", ...style }}
    >
      {children}
    </div>
  );
}
