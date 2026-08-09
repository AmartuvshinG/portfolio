"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { timeline, stats, sectionIndex } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "text-fg border-line-strong",
  ONLINE: "text-muted border-line-strong",
  ARCHIVED: "text-faint border-line",
};

/**
 * The ledger: numbers, then career log as a scroll-tracked system record.
 *
 * The numbers block stays merged in here — both halves answer "how long, and at
 * what scale", and splitting them made the page's back half read as an unbroken
 * run of identical header-plus-grid blocks.
 *
 * The log itself is the NEXUS design, restored. The year sticks to the top of
 * the viewport while its entry scrolls past, so the date reads as a chapter
 * heading rather than a label — you always know which era you're in. A beam
 * fills the rail as you descend, masked at both ends so it fades rather than
 * terminating in a hard stop.
 *
 * The beam gradient is the spectrum ramp verbatim. Of everywhere the ramp is
 * used on the site this is the best fit: a single travelling line is exactly
 * the shape a gradient wants to be, and it puts the accent in the motion rather
 * than in a fill.
 *
 * **Under reduced motion** the beam, the head and the sticky year all go, and
 * the 34vh gaps collapse. Those gaps exist to give the beam room to travel
 * between entries; with no beam they are a third of a screen of nothing, ten
 * times over, and the section becomes a long scroll past empty space. What
 * stays is the IntersectionObserver — which era you are in is information, not
 * motion, and the preference asks for one and not the other.
 */
export function Timeline() {
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const [railHeight, setRailHeight] = useState(0);

  /* Track the list height so the beam can be sized in pixels. Observed rather
     than measured once — font swaps and responsive reflow both change it. */
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () => setRailHeight(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Deliberately the widest range on the page. The beam used to fill inside a
     few hundred pixels of scroll and then just sit there — the animation was
     over before you had read the first entry, which wasted the one moment on
     this page that rewards slow scrolling. Starting a full viewport earlier and
     ending a third of the way up stretches the same travel across roughly twice
     the scroll distance, so the beam is always still moving while you read. */
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 95%", "end 35%"],
  });

  const beamHeight = useTransform(scrollYProgress, [0, 1], [0, railHeight]);
  const beamOpacity = useTransform(scrollYProgress, [0, 0.06], [0, 1]);
  /* The head — a bloom pinned to the beam's tip. The rail alone gives the eye
     nothing to track; a travelling light does, and it is what makes the beam
     read as something advancing rather than as a bar filling. */
  const headY = useTransform(scrollYProgress, [0, 1], [0, railHeight]);
  const headOpacity = useTransform(
    scrollYProgress,
    [0, 0.06, 0.94, 1],
    [0, 1, 1, 0]
  );

  /* Which entry is under the reading line. Highest ratio wins rather than
     last-intersecting, which is what stops the year flicking backwards when two
     entries straddle the line — same rule the navbar's active pill uses. */
  const [active, setActive] = useState(0);
  const entryRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const nodes = entryRefs.current.filter((n): n is HTMLDivElement => !!n);
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!hit) return;
        const i = nodes.indexOf(hit.target as HTMLDivElement);
        if (i >= 0) setActive(i);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="timeline"
      data-act="deck"
      data-chapter="LEDGER"
      className="relative"
      aria-label="Experience and numbers"
    >
      <ChapterSeam />

      {/* --- Numbers --- */}
      <div className="mx-auto max-w-[1800px] px-5 pt-24 md:px-8 md:pt-36">
        <Reveal>
          <span className="micro">
            {sectionIndex("#timeline")} — By the numbers
          </span>
        </Reveal>
        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 border-t border-line pt-10 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dd className="display-caps text-[clamp(2rem,5vw,4.5rem)] text-fg">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  unit={stat.unit}
                />
              </dd>
              <dt className="micro mt-3">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      {/* --- Career log --- */}
      <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-24 md:px-8 md:pb-36 md:pt-32">
        <Reveal>
          {/* Unnumbered. This is the ledger's second *block*, not the page's
              next section — it used to print `09`, which took Contact's number
              and pushed every index after it out of step with the nav. One
              section, one index, and it is on the block above. */}
          <span className="micro">Track record</span>
        </Reveal>

        <div ref={listRef} className="relative mt-16 pl-10 md:pl-0">
          {/* Rail + travelling beam */}
          <div
            aria-hidden
            className="absolute left-[3px] top-0 w-px overflow-hidden bg-line md:left-[13.5rem]"
            style={{
              height: railHeight,
              maskImage:
                "linear-gradient(to bottom, transparent 0%, black 6%, black 92%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 6%, black 92%, transparent 100%)",
            }}
          >
            {!reduced && (
              <motion.div
                className="absolute inset-x-0 top-0 w-px rounded-full"
                style={{
                  height: beamHeight,
                  opacity: beamOpacity,
                  background:
                    "linear-gradient(to top, var(--spectrum-1) 0%, var(--spectrum-2) 40%, var(--spectrum-3) 72%, transparent 100%)",
                }}
              />
            )}
          </div>

          {/* The beam head. Outside the rail's `overflow-hidden` so its bloom
              is not clipped to one pixel of width. */}
          {!reduced && (
            <motion.span
              aria-hidden
              className="absolute left-[3px] top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full md:left-[13.5rem]"
              style={{
                y: headY,
                opacity: headOpacity,
                background: "var(--spectrum-3)",
                boxShadow:
                  "0 0 12px 4px color-mix(in srgb, var(--spectrum-3) 60%, transparent), 0 0 34px 12px color-mix(in srgb, var(--spectrum-2) 40%, transparent)",
              }}
            />
          )}

          <div className={cn("space-y-20", reduced ? "md:space-y-24" : "md:space-y-[34vh]")}>
            {timeline.map((entry, i) => {
              const isActive = i === active;
              return (
              <div
                key={entry.year + entry.title}
                ref={(el) => {
                  entryRefs.current[i] = el;
                }}
                className="relative grid gap-4 md:grid-cols-[13.5rem_1fr] md:gap-12"
              >
                {/* Sticky year — the chapter heading.
                    Held at 40% of the viewport rather than just under the navbar
                    so it sits on the reading line while its entry passes, which
                    is the whole reason it is sticky. */}
                <div
                  className={cn(
                    "md:self-start md:pr-10 md:text-right",
                    !reduced && "md:sticky md:top-[40vh]"
                  )}
                >
                  <span
                    className={cn(
                      "tabular block origin-right font-display leading-none transition-all duration-500",
                      // The active year carries the ramp; every other year stays
                      // faint. Colour marks exactly one thing on this rail.
                      isActive
                        ? "spectrum-text scale-[1.06]"
                        : "scale-100 text-faint"
                    )}
                    style={{
                      fontSize: "clamp(1.5rem, 3.6vw, 3rem)",
                      // Bloom behind the glyphs. Can't be a text-shadow on the
                      // active state alone — `spectrum-text` makes the glyphs
                      // transparent, so a text-shadow would draw the shadow of
                      // nothing. This lights the box instead.
                      filter: isActive
                        ? "drop-shadow(0 0 18px color-mix(in srgb, var(--spectrum-2) 55%, transparent))"
                        : "none",
                    }}
                  >
                    {entry.year}
                  </span>
                  <span
                    className={cn(
                      // 0.625rem, not 0.6: 10px is the floor for type on this
                      // site. Below it the mono face loses its counters at any
                      // tracking and stops being readable at all on a phone.
                      "mt-2 hidden font-mono text-[0.625rem] uppercase tracking-[0.28em] transition-colors duration-500 md:block",
                      isActive ? "text-fg" : "text-faint"
                    )}
                  >
                    {entry.org}
                  </span>
                </div>

                {/* Node marker on the rail. Lights as the beam reaches it. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-3 h-2 w-2 border bg-void transition-all duration-500 md:left-[13.25rem]",
                    isActive
                      ? "scale-150 border-transparent"
                      : entry.status === "ACTIVE"
                        ? "animate-blink border-transparent"
                        : "border-line-strong"
                  )}
                  style={
                    isActive || entry.status === "ACTIVE"
                      ? { backgroundImage: "var(--gradient-spectrum)" }
                      : undefined
                  }
                />

                <Reveal delay={i * 0.04} className="min-w-0">
                  <div
                    className={cn(
                      "border-b pb-8 transition-colors duration-500",
                      isActive ? "border-line-strong" : "border-line"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-tech text-2xl font-bold uppercase text-fg md:text-3xl">
                        {entry.title}
                      </h3>
                      <span
                        className={cn(
                          "border px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-widest",
                          STATUS_STYLES[entry.status]
                        )}
                      >
                        {entry.status}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted md:hidden">
                      {entry.org}
                    </p>
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
                      {entry.description}
                    </p>
                  </div>
                </Reveal>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
