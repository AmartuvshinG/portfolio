"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { testimonials, sectionIndex } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";

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
 *
 * It also auto-advances, which makes it a moving-content control under WCAG
 * 2.2.2 and obliges it to be stoppable. Three things stop it: the explicit
 * PAUSE button in the counter row, pointer or keyboard presence anywhere in the
 * section, and the quote leaving the viewport. The first is the one the rule
 * asks for; the other two are what stops the timer being a nuisance in
 * practice — reading a five-line quote takes longer than 6500ms, and a carousel
 * ticking three sections above you is work nobody is watching.
 */
export function Testimonials() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [engaged, setEngaged] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const ticking = playing && !engaged && onScreen && !reduced;

  /* Same pattern as Lab's plane drift — nothing advances while the section is
     off screen. */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % testimonials.length),
      HOLD
    );
    return () => clearInterval(id);
  }, [ticking]);

  // Reduced motion gets the full list rather than a carousel it cannot advance.
  if (reduced) {
    return (
      <section
        id="testimonials"
        data-act="deck"
        data-chapter="VOICES"
        className="relative py-24"
        aria-label="Testimonials"
      >
        <div className="mx-auto max-w-[1800px] space-y-16 px-5 md:px-8 lg:px-16">
          <span className="micro tabular">
            {sectionIndex("#testimonials")} — Voices
          </span>
          {testimonials.map((t) => (
            <figure key={t.author}>
              <blockquote className="font-tech text-[clamp(1.75rem,4vw,3.25rem)] leading-[1.1] text-fg">
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
      /* Both branches need the id — the nav observes it, and a reduced-motion
         visitor navigating to Voices must land somewhere. */
      id="testimonials"
      ref={sectionRef}
      data-act="deck"
      data-chapter="VOICES"
      className="relative flex min-h-[92vh] items-center overflow-hidden py-24"
      aria-label="Testimonials"
      /* Presence pauses. `focus`/`blur` rather than `focusin`/`focusout` would
         not bubble; React's synthetic onFocus/onBlur do, which is what makes a
         tab into the tick row stop the rotation. */
      onPointerEnter={() => setEngaged(true)}
      onPointerLeave={() => setEngaged(false)}
      onFocus={() => setEngaged(true)}
      onBlur={() => setEngaged(false)}
    >
      <ChapterSeam />

      <div className="relative mx-auto w-full max-w-[1800px] px-5 md:px-8 lg:px-16">
        <div className="flex items-center gap-4">
          {/* The section's own index, which this was the one chapter never to
              print — leaving a hole at 07 that made every number after it look
              off by one. Distinct from the quote counter beside it. */}
          <span className="micro tabular">
            {sectionIndex("#testimonials")} — Voices
          </span>
          <span className="micro tabular">
            {String(index + 1).padStart(2, "0")} / {String(testimonials.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            aria-label={playing ? "Pause quote rotation" : "Play quote rotation"}
            className="micro flex h-11 items-center gap-2 pr-2 transition-colors hover:text-fg"
          >
            {playing ? <Pause size={12} /> : <Play size={12} />}
            {playing ? "Pause" : "Play"}
          </button>
          <span className="h-px flex-1 bg-current opacity-15" />
        </div>

        {/* `mode="wait"` so the outgoing quote clears before the next arrives —
            two blocks of 4vw serif cross-fading on top of each other is
            illegible for the whole overlap.

            The live region is `off` while it is rotating on its own and
            `polite` once it has stopped. Announcing an auto-advancing carousel
            interrupts a screen reader every 6.5 seconds with something the user
            did not ask for and cannot get back to — worse than silence. Once
            the rotation is under their control, the change *is* the response to
            their action, and then it should be announced. */}
        <div aria-live={ticking ? "off" : "polite"} aria-atomic="true">
        <AnimatePresence mode="wait">
          <motion.figure
            key={active.author}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10"
          >
            <blockquote className="font-tech text-[clamp(2rem,5.4vw,5rem)] leading-[1.06] text-fg">
              “{active.quote}”
            </blockquote>
            <figcaption className="mt-8 flex flex-wrap items-baseline gap-x-4">
              <span className="font-tech text-lg font-bold uppercase text-fg">
                {active.author}
              </span>
              <span className="micro">
                {active.role} — {active.org}
              </span>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
        </div>

        {/* Progress ticks double as the control.
            `h-11`, not `h-6`: the hairline inside is unchanged, so this is a
            24px→44px hit box with zero visual difference. */}
        <div className="mt-12 flex gap-2">
          {testimonials.map((t, i) => (
            <button
              key={t.author}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show quote from ${t.author}`}
              aria-current={i === index}
              className="group flex h-11 w-16 items-center"
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
