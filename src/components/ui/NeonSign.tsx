"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Tone = "white" | "sodium";

/**
 * Type as a lit neon tube.
 *
 * The glyphs stay real text (the heading's accessible name is untouched); the
 * glow is a generated-content duplicate behind them (`::before` with
 * `attr(data-text)`), so axe never measures a half-lit copy mid-flicker, and
 * the glow can flicker without the text node itself changing.
 *
 * **Ignition.** Unlit, the tube is dim glass. When `lit` turns true it strikes
 * the way a real tube does: a stutter of on/off over ~0.8s, then it holds. It
 * plays once; after that the glow is static, so nothing repaints while the
 * page scrolls. Under reduced motion it is simply lit.
 *
 * `lit="view"` ignites the first time the sign scrolls into view.
 * `idle` adds a rare dip in the glow (one every ~7s): for small signage only,
 * never for a headline someone is reading.
 *
 * Styles live in globals.css under `.neon-tube`.
 */
export function NeonSign({
  text,
  lit,
  tone = "white",
  idle = false,
  className,
  style,
  lang,
}: {
  text: string;
  lit: boolean | "view";
  tone?: Tone;
  idle?: boolean;
  className?: string;
  style?: CSSProperties;
  lang?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (lit !== "view") return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -20% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lit]);

  const on = lit === "view" ? seen : lit;

  return (
    <span
      ref={ref}
      lang={lang}
      data-text={text}
      data-tone={tone}
      data-lit={on ? "" : undefined}
      data-idle={idle ? "" : undefined}
      className={cn("neon-tube", className)}
      style={style}
    >
      {text}
    </span>
  );
}
