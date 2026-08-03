"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>[]#*+";

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** Start immediately instead of waiting for viewport entry. */
  immediate?: boolean;
  /** ms between frames */
  speed?: number;
  /** frames each character stays scrambled before locking */
  revealDelay?: number;
}

/**
 * Decrypts text with a left-to-right scramble ("decode") effect the first time
 * it enters the viewport. Reduced-motion users see the final text instantly
 * (rendered directly, so no animation state is touched).
 */
export function ScrambleText({
  text,
  className,
  immediate = false,
  speed = 28,
  revealDelay = 2,
}: ScrambleTextProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (reduced) return;

    const run = () => {
      if (started.current) return;
      started.current = true;
      let frame = 0;
      const total = text.length * revealDelay + text.length;
      const id = setInterval(() => {
        frame++;
        const revealed = Math.floor(frame / revealDelay);
        const out = text
          .split("")
          .map((ch, i) => {
            if (ch === " ") return " ";
            if (i < revealed) return ch;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("");
        setDisplay(out);
        if (frame >= total) {
          clearInterval(id);
          setDisplay(text);
        }
      }, speed);
    };

    if (immediate) {
      run();
      return;
    }

    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [text, reduced, immediate, speed, revealDelay]);

  return (
    <span ref={ref} className={cn("font-mono", className)} aria-label={text}>
      <span aria-hidden>{reduced ? text : display || " "}</span>
    </span>
  );
}
