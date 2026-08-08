"use client";

import { createElement, useState, type ElementType } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: ElementType;
  /** Keep the split running instead of waiting for hover. */
  always?: boolean;
}

/**
 * RGB-split glitch, restored from NEXUS and recoloured to the spectrum ramp.
 *
 * Two copies of the text sit behind the real glyphs — one magenta, one cyan —
 * offset a couple of pixels apart and clipped to shifting horizontal bands. The
 * effect is entirely CSS (`.glitch` in globals.css); this component only owns
 * the hover state and the `data-text` the pseudo-elements read.
 *
 * `data-text` is why the text has to arrive as a string prop rather than as
 * children: `content: attr(data-text)` cannot read a React tree.
 *
 * The layers are `aria-hidden` by construction — pseudo-elements are not in the
 * accessibility tree — so the visible glyphs are the only thing announced.
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
