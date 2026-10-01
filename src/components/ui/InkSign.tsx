"use client";

import { useEffect, useRef, useState } from "react";
import { INK_NAME } from "@/lib/inkName";
import { cn } from "@/lib/utils";

/**
 * The intro's calligraphy, as a static sign: the brushed name from the bake
 * (`ink-name-mask.png`, dry-brush streaks and all) used as a mask, so it can
 * be filled with anything — sodium neon in the hero, ink on a plate, a ghost
 * in the margin.
 *
 * It replaces the name set in Noto Sans Mongolian wherever it hangs as art.
 * The font is monoline; the intro had just shown the visitor a hand writing
 * it, and then every later sign was type. Now the hero's sign *is* that
 * writing, turned into the city's neon.
 *
 * Tones:
 *   neon   sodium tube: a hot core and a static glow (a drop-shadow on the
 *          wrapper — filters apply before masks, so the glow cannot sit on
 *          the masked element itself). Strikes on with a stutter when lit;
 *          `idle` adds a rare dip, opacity only.
 *   ink    sumi, for a paper-coloured ground.
 *   ghost  the name barely there, for margins.
 *
 * Decorative: always aria-hidden. Height comes from `className`; the width
 * follows the bake's aspect ratio.
 */
export function InkSign({
  tone = "neon",
  lit = true,
  idle = false,
  className,
  style,
}: {
  tone?: "neon" | "ink" | "ghost";
  /** true, false, or "view" to strike the first time it scrolls into view. */
  lit?: boolean | "view";
  idle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (lit !== "view") return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lit]);
  const on = lit === "view" ? seen : lit;

  return (
    <span
      ref={ref}
      aria-hidden
      data-tone={tone}
      data-lit={on ? "" : undefined}
      data-idle={idle ? "" : undefined}
      className={cn("ink-sign block", className)}
      style={{ aspectRatio: `${INK_NAME.width} / ${INK_NAME.height}`, ...style }}
    >
      <span
        className="ink-sign-fill block h-full w-full"
        style={{
          WebkitMaskImage: `url(${INK_NAME.mask})`,
          maskImage: `url(${INK_NAME.mask})`,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
        }}
      />
    </span>
  );
}
