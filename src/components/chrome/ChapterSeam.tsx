"use client";

import { cn } from "@/lib/utils";

interface ChapterSeamProps {
  /** A taller band, for the joins where the ground itself changes. */
  wipe?: boolean;
  className?: string;
}

/**
 * The join between two chapters, in the halftone language: a band of
 * dot-screen that prints itself across the boundary as it scrolls into view,
 * a ramp hairline at its centre, and a small chapter tick.
 *
 * Pure CSS. The band's mask and the line are scrubbed by a view timeline
 * (`animation-timeline: view()`). Where that is unsupported, or under reduced
 * motion, the seam simply sits at rest, fully drawn. Transform and opacity
 * only; nothing here runs off screen.
 *
 * Place as the first child of a section; it positions itself on the section's
 * leading edge and never affects layout.
 */
export function ChapterSeam({ wipe, className }: ChapterSeamProps) {
  return (
    <div aria-hidden className={cn("ht-seam", wipe && "ht-seam--wipe", className)}>
      <div className="ht-seam-dots" />
      <div className="ht-seam-line" />
    </div>
  );
}
