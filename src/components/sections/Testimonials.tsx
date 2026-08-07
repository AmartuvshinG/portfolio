"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { testimonials } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Nebula } from "@/components/layout/Nebula";

/** Dwell per quote, ms. */
const HOLD = 6500;

/**
 * One quote, set enormous, holding the whole viewport — KPR's full-bleed
 * question frame.
 *
 * The old version was a three-across card grid, which is how testimonials are
 * always done and is exactly why nobody reads them. At this scale the quote is
 * unavoidable, and only one is on screen at a time so it has to be the one
 * worth reading.
 */
export function Testimonials() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % testimonials.length),
      HOLD
    );
    return () => clearInterval(id);
  }, [reduced]);

  // Reduced motion gets the full list rather than a carousel it cannot advance.
  if (reduced) {
    return (
      <section
        data-act="deck"
        data-chapter="VOICES"
        className="relative bg-bg py-24"
        aria-label="Testimonials"
      >
        <div className="mx-auto max-w-[1800px] space-y-16 px-5 md:px-8 lg:px-16">
          {testimonials.map((t) => (
            <figure key={t.author}>
              <blockquote className="font-editorial text-[clamp(1.75rem,4vw,3.25rem)] leading-[1.1] text-fg">
                “{t.quote}”
              </blockquote>
              <figcaption className="micro mt-5">
                {t.author} — {t.role}, {t.org}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    );
  }

  const active = testimonials[index];

  return (
    <section
      data-act="deck"
      data-chapter="VOICES"
      className="relative flex min-h-[92vh] items-center overflow-hidden bg-bg py-24"
      aria-label="Testimonials"
    >
      <Nebula
        className="pointer-events-none absolute inset-0 h-full w-full"
        opacity={0.34}
      />

      <div className="relative mx-auto w-full max-w-[1800px] px-5 md:px-8 lg:px-16">
        <div className="flex items-center gap-4">
          <span className="micro tabular">
            {String(index + 1).padStart(2, "0")} / {String(testimonials.length).padStart(2, "0")}
          </span>
          <span className="h-px flex-1 bg-current opacity-15" />
        </div>

        {/* `mode="wait"` so the outgoing quote clears before the next arrives —
            two blocks of 4vw serif cross-fading on top of each other is
            illegible for the whole overlap. */}
        <AnimatePresence mode="wait">
          <motion.figure
            key={active.author}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10"
          >
            <blockquote className="font-editorial text-[clamp(2rem,5.4vw,5rem)] leading-[1.06] text-fg">
              “{active.quote}”
            </blockquote>
            <figcaption className="mt-8 flex flex-wrap items-baseline gap-x-4">
              <span className="font-display text-lg font-bold uppercase text-fg">
                {active.author}
              </span>
              <span className="micro">
                {active.role} — {active.org}
              </span>
            </figcaption>
          </motion.figure>
        </AnimatePresence>

        {/* Progress ticks double as the control. */}
        <div className="mt-12 flex gap-2">
          {testimonials.map((t, i) => (
            <button
              key={t.author}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show quote from ${t.author}`}
              className="group h-6 w-16"
            >
              <span
                className={
                  i === index
                    ? "block h-0.5 w-full bg-signal"
                    : "block h-0.5 w-full bg-current opacity-20 transition-opacity group-hover:opacity-50"
                }
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
