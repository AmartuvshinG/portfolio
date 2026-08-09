"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>[]#*+";

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** Start on mount rather than on viewport entry. */
  immediate?: boolean;
  /** ms between frames */
  speed?: number;
  /** frames each character stays scrambled before locking */
  revealDelay?: number;
}

/**
 * Decodes text left to right with a glyph scramble, once, the first time it is
 * seen. Restored from NEXUS for the micro-labels.
 *
 * Runs on labels only — never on body copy. A wall of text decoding itself is
 * unreadable for the duration and reads as a gimmick; a six-character mono
 * label doing it reads as instrumentation coming online, which is the whole
 * point of the vocabulary.
 *
 * The animating span is `aria-hidden` and the final string is carried by an
 * `.sr-only` sibling, so assistive tech gets the settled label immediately and
 * never the intermediate glyph noise. The wrapper cannot do that job with an
 * `aria-label` — a bare `span` has no role, naming is not supported on it, so
 * the label is dropped and the only child is hidden: the label announces as
 * nothing. Reduced motion renders the text directly and never starts the
 * interval.
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

    let interval: ReturnType<typeof setInterval> | undefined;

    const run = () => {
      if (started.current) return;
      started.current = true;
      let frame = 0;
      const total = text.length * revealDelay + text.length;
      interval = setInterval(() => {
        frame++;
        const revealed = Math.floor(frame / revealDelay);
        setDisplay(
          text
            .split("")
            .map((ch, i) => {
              if (ch === " ") return " ";
              if (i < revealed) return ch;
              return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            })
            .join("")
        );
        if (frame >= total) {
          clearInterval(interval);
          setDisplay(text);
        }
      }, speed);
    };

    if (immediate) {
      run();
      return () => clearInterval(interval);
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
    return () => {
      io.disconnect();
      clearInterval(interval);
    };
  }, [text, reduced, immediate, speed, revealDelay]);

  return (
    <span ref={ref} className={cn(className)}>
      <span className="sr-only">{text}</span>
      {/* Non-breaking space rather than empty, so the label reserves its line
          box before the first frame and nothing below it shifts. */}
      <span aria-hidden>{reduced ? text : display || " "}</span>
    </span>
  );
}
