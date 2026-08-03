"use client";

import { createElement, useState, type ElementType } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: ElementType;
  /** Keep the RGB-split animation running constantly. */
  always?: boolean;
}

/**
 * Renders text with cyan/red RGB-split glitch layers (see .glitch in
 * globals.css). Activates on hover by default, or continuously with `always`.
 * Reduced-motion users get plain, static text.
 */
export function GlitchText({
  text,
  className,
  as: Tag = "span",
  always = false,
}: GlitchTextProps) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);
  const active = !reduced && (always || hover);

  return createElement(
    Tag,
    {
      className: cn("glitch", className),
      "data-text": text,
      "data-active": active,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
    },
    text
  );
}
