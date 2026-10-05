"use client";

import { useEffect, useRef } from "react";

/* ---------------------------------------------------------------------------
   Split-flap: text that arrives the way a departures board updates.

   Every character is a cell. On `play` each cell flips through a few
   characters of its own script — Latin, Cyrillic or digits, whichever the
   final character is — and lands on it, left to right in a cascade, each
   flip a short rotateX of the cell (transform and opacity only). It runs
   once per `play` and then the text is just text.

   **Each flip is a Web Animation, started fresh.** It used to restart a CSS
   keyframe by removing its class, reading `offsetWidth` and adding the class
   back — a forced layout per cell per flip, inside one rAF loop: a dozen
   synchronous layouts of the whole page in a frame while a Journey row's
   dates landed. `animate()` restarts without reading anything.

   **Width never shifts.** A cell is sized by its final character, set
   invisibly; the flipping character is laid over it, centred. Words are
   kept whole (nowrap), so a title wraps where it would anyway.

   **The DOM, not React.** Flips are written straight to the cell nodes from
   one rAF loop; React renders the cells once. Screen readers get the real
   string from a visually hidden copy. Reduced motion (or `instant`) shows
   the final text and never starts the loop.
   --------------------------------------------------------------------------- */

const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CYRILLIC = "АБВГДЕЖЗИЙКЛМНОӨПРСТУҮФХЦЧШЭЮЯ";
const DIGITS = "0123456789";

function poolFor(ch: string): string | null {
  if (/[0-9]/.test(ch)) return DIGITS;
  if (/[A-Za-z]/.test(ch)) return LATIN;
  if (/[Ѐ-ӿ]/.test(ch)) return CYRILLIC;
  return null;
}

/** One flip: the new character drops in from the top half, as a flap falls. */
const FLIP_KEYS: Keyframe[] = [
  { transform: "rotateX(-82deg)", opacity: 0.35 },
  { transform: "rotateX(0deg)", opacity: 1 },
];
const FLIP_TIMING: KeyframeAnimationOptions = { duration: 110, easing: "cubic-bezier(0.3, 0, 0.2, 1)" };

/** A small deterministic PRNG: the same text flips the same way every time. */
function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function SplitFlap({
  text,
  play = true,
  instant = false,
  delay = 0,
  /** Time between one cell starting and the next, s. */
  stagger = 0.022,
  /** How many flips a cell makes before it lands (it varies ±2 around this). */
  flips = 4,
  /** One flip, s. */
  flip = 0.055,
  className,
}: {
  text: string;
  play?: boolean;
  instant?: boolean;
  delay?: number;
  stagger?: number;
  flips?: number;
  flip?: number;
  className?: string;
}) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const chars = Array.from(text.toUpperCase());

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const cells = Array.from(box.querySelectorAll<HTMLSpanElement>("[data-flap]"));
    const finals = cells.map((c) => c.dataset.flap ?? "");
    const settle = () => cells.forEach((c, i) => {
      c.textContent = finals[i];
    });
    const knock = (c: HTMLSpanElement) => c.animate(FLIP_KEYS, FLIP_TIMING);
    if (instant || !play) {
      settle();
      return;
    }

    let seed = 0;
    for (const ch of text) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    const rand = mulberry(seed);
    /* Each cell: when it starts, how many flips, and the characters it shows. */
    const plan = cells.map((_, i) => {
      const pool = poolFor(finals[i]);
      const n = pool ? Math.max(1, flips + Math.round(rand() * 4 - 2)) : 0;
      const seq = pool ? Array.from({ length: n }, () => pool[Math.floor(rand() * pool.length)]) : [];
      return { at: delay + i * stagger, n, seq, shown: -2 };
    });
    /* Blank until its turn, so the cascade reads. */
    cells.forEach((c, i) => {
      if (plan[i].n) c.textContent = " ";
    });

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      let busy = false;
      cells.forEach((c, i) => {
        const p = plan[i];
        if (!p.n) return;
        const k = Math.floor((t - p.at) / flip);
        if (k < 0) {
          busy = true;
          return;
        }
        if (k >= p.n) {
          if (p.shown !== p.n) {
            p.shown = p.n;
            c.textContent = finals[i];
            knock(c); // the landing flip
          }
          return;
        }
        busy = true;
        if (k !== p.shown) {
          p.shown = k;
          c.textContent = p.seq[k];
          knock(c);
        }
      });
      if (busy) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      settle();
    };
  }, [text, play, instant, delay, stagger, flips, flip]);

  /* Words as nowrap groups of cells; the spaces between them stay real. */
  const words: string[][] = [];
  let cur: string[] = [];
  for (const ch of chars) {
    if (ch === " ") {
      words.push(cur);
      cur = [];
    } else cur.push(ch);
  }
  words.push(cur);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span ref={boxRef} aria-hidden className="[perspective:400px]">
        {words.map((w, wi) => (
          <span key={wi}>
            {wi > 0 && " "}
            <span className="whitespace-nowrap">
              {w.map((ch, ci) => (
                <span key={ci} className="relative inline-block">
                  <span className="invisible">{ch}</span>
                  <span data-flap={ch} className="flap-cell absolute inset-0 text-center">
                    {ch}
                  </span>
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}
