"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { MARK_D } from "@/components/chrome/NavGlyphs";

/**
 * His mark as a seal: the navbar's ᠠ (the Mongol-script a), cut into a
 * vermilion stone and printed. In calligraphy the seal is the signature; this one says
 * nothing the site does not already say, so it invents no text.
 *
 * Carved in relief the traditional way round — the stone is the colour, the
 * mark is cut away to the paper. The stone's chips and the uneven ink of a
 * real impression come from one static turbulence mask, rendered once and
 * never animated (the perf budget forbids animated filters).
 *
 * Blend it `multiply` over paper so the fibres show through the ink.
 */
export function Seal({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden viewBox="0 0 64 64" className={cn("block", className)} style={style}>
      <defs>
        <filter id={`seal-wear-${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            /* Black (cut away), opaque only where the noise peaks: chips. */
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 7 -4.3"
          />
        </filter>
        <mask id={`seal-mask-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#000" />
          {/* The stone. */}
          <rect x="4" y="4" width="56" height="56" rx="3" fill="#fff" />
          {/* Cut away: an inner border, then the letter, upright and centred. */}
          <rect x="8.5" y="8.5" width="47" height="47" rx="1.5" fill="none" stroke="#000" strokeWidth="1.6" />
          <path
            d={MARK_D}
            transform="translate(32 32.6) rotate(90) scale(0.025 -0.025) translate(-639.5 -1018.5)"
            fill="#000"
          />
          {/* Wear: where the stone did not take ink. */}
          <rect width="64" height="64" fill="#000" filter={`url(#seal-wear-${id})`} />
        </mask>
      </defs>
      <rect width="64" height="64" fill="var(--color-seal)" mask={`url(#seal-mask-${id})`} />
    </svg>
  );
}
