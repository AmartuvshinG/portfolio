"use client";

import { useCallback, useEffect, useRef } from "react";

/** The split-flap alphabets the nav labels resolve through. Each glyph flips
 *  through its own script and case, so a Mongolian label never shows Latin
 *  mid-flip and a lowercase one never jumps to capitals. */
const FLAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const FLAP_CYR = "АБВГДЕЖЗИЙКЛМНОӨПРСТУҮФХЦЧШЭЮЯ";
const FLAP_CYR_LOWER = FLAP_CYR.toLowerCase();

function flapFor(ch: string) {
  if (/[а-яөү]/.test(ch)) return FLAP_CYR_LOWER;
  if (/[А-ЯӨҮ]/.test(ch)) return FLAP_CYR;
  return FLAP;
}

/**
 * A label that decodes itself on hover (nav links, buttons): every glyph flips through the
 * alphabet and they lock left to right, in ~260ms.
 *
 * Written straight to the node — no re-render per frame — and the span's
 * width is pinned for the run, so the proportional face swapping glyphs can
 * never jostle the row. The accessible name is a separate sr-only copy, so
 * nothing ever hears the scramble.
 */
export function useScramble(text: string) {
  const ref = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);

  const run = useCallback(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cancelAnimationFrame(raf.current);
    const chars = Array.from(text);
    el.style.width = `${el.getBoundingClientRect().width}px`;
    const t0 = performance.now();
    const DUR = 260;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / DUR);
      const flip = Math.floor(now / 40);
      el.textContent = chars
        .map((ch, i) =>
          ch === " " || p >= (i + 1) / chars.length
            ? ch
            : flapFor(ch)[(flip * 7 + i * 13) % flapFor(ch).length]
        )
        .join("");
      if (p < 1) raf.current = requestAnimationFrame(step);
      else {
        el.textContent = text;
        el.style.width = "";
      }
    };
    raf.current = requestAnimationFrame(step);
  }, [text]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return { ref, run };
}
