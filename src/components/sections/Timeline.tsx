"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { timeline, stats } from "@/lib/content";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

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
 */
export function Timeline() {
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

  /* Spans list-height + a quarter viewport of scroll, so the beam tracks the
     entry you're actually reading. A tighter range (e.g. "start 15%") fills
     the whole rail within a few hundred pixels and the beam is just done. */
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 75%", "end 50%"],
  });

  const beamHeight = useTransform(scrollYProgress, [0, 1], [0, railHeight]);
  const beamOpacity = useTransform(scrollYProgress, [0, 0.08], [0, 1]);

  return (
    <section
      id="timeline"
      data-act="deck"
      data-chapter="LEDGER"
      className="relative bg-bg"
      aria-label="Experience and numbers"
    >
      {/* --- Numbers --- */}
      <div className="mx-auto max-w-[1800px] px-5 pt-24 md:px-8 md:pt-36">
        <Reveal>
          <span className="micro">05 — By the numbers</span>
        </Reveal>
        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 border-t border-line pt-10 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dd className="display-caps text-[clamp(3rem,8vw,7rem)] text-fg">
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
          <span className="micro">06 — Track record</span>
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
            <motion.div
              className="absolute inset-x-0 top-0 w-px rounded-full"
              style={{
                height: beamHeight,
                opacity: beamOpacity,
                background:
                  "linear-gradient(to top, var(--spectrum-1) 0%, var(--spectrum-2) 40%, var(--spectrum-3) 72%, transparent 100%)",
              }}
            />
          </div>

          <div className="space-y-16 md:space-y-28">
            {timeline.map((entry, i) => (
              <div
                key={entry.year + entry.title}
                className="relative grid gap-4 md:grid-cols-[13.5rem_1fr] md:gap-12"
              >
                {/* Sticky year — the chapter heading */}
                <div className="md:sticky md:top-32 md:self-start md:pr-10 md:text-right">
                  <span
                    className="tabular font-display font-black leading-none text-faint transition-colors"
                    style={{ fontSize: "clamp(2.25rem, 6vw, 4.5rem)" }}
                  >
                    {entry.year}
                  </span>
                  <span className="mt-1 hidden font-mono text-[0.6rem] uppercase tracking-[0.28em] text-muted md:block">
                    {entry.org}
                  </span>
                </div>

                {/* Node marker on the rail. The active entry gets the ramp; the
                    rest stay achromatic, so colour marks *one* thing. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-3 h-2 w-2 border bg-bg md:left-[13.25rem]",
                    entry.status === "ACTIVE"
                      ? "animate-blink border-transparent"
                      : "border-line-strong"
                  )}
                  style={
                    entry.status === "ACTIVE"
                      ? { backgroundImage: "var(--gradient-spectrum)" }
                      : undefined
                  }
                />

                <Reveal delay={i * 0.04} className="min-w-0">
                  <div className="border-b border-line pb-8">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-2xl font-bold uppercase text-fg md:text-3xl">
                        {entry.title}
                      </h3>
                      <span
                        className={cn(
                          "border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-widest",
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
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
