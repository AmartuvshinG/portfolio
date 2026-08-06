"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { timeline, stats } from "@/lib/content";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { Reveal } from "@/components/motion/Reveal";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The ledger: numbers and history in one act.
 *
 * These were two separate stacked sections before. Merging them is the right
 * call structurally — both answer "how long, and at what scale", and splitting
 * them made the page's back half read as an unbroken run of identical
 * header-plus-grid blocks, which is exactly the rhythm the references avoid.
 *
 * The history runs horizontally, driven by vertical scroll. A career is a line;
 * drawing it as one costs nothing and breaks the vertical monotony at the point
 * in the page where it has become most noticeable.
 */
export function Timeline() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Four entries, three gaps: travel far enough that the last one clears the
  // right edge, and no further, or the track ends on empty space.
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-64%"]);

  return (
    <section
      data-act="paper"
      data-chapter="LEDGER"
      className="relative bg-bg"
      aria-label="Experience and numbers"
    >
      {/* --- Numbers, KPR-scale --- */}
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

      {/* --- History --- */}
      {reduced ? (
        // Ref still attached: `useScroll` above runs unconditionally (hooks
        // can't be skipped), and it warns if its target never hydrates.
        <div
          ref={ref}
          className="mx-auto max-w-[1800px] space-y-10 px-5 py-24 md:px-8 lg:px-16"
        >
          {timeline.map((entry) => (
            <TimelineEntry key={entry.year} entry={entry} />
          ))}
        </div>
      ) : (
        <div ref={ref} className="relative h-[280vh]">
          <div className="sticky top-0 flex h-dvh flex-col justify-center overflow-hidden">
            <div className="mx-auto w-full max-w-[1800px] px-5 md:px-8 lg:px-16">
              <span className="micro">06 — Track record</span>
            </div>

            <motion.ol style={{ x }} className="mt-10 flex gap-8 px-5 md:px-8 lg:px-16">
              {timeline.map((entry) => (
                <li
                  key={entry.year}
                  className="w-[78vw] shrink-0 sm:w-[52vw] lg:w-[34vw]"
                >
                  <TimelineEntry entry={entry} />
                </li>
              ))}
            </motion.ol>
          </div>
        </div>
      )}
    </section>
  );
}

function TimelineEntry({ entry }: { entry: (typeof timeline)[number] }) {
  return (
    <article className="notch-card h-full bg-paper-2 p-7 ring-1 ring-inset ring-ink/10">
      <div className="flex items-baseline justify-between">
        <span className="display-caps text-5xl text-fg">{entry.year}</span>
        <span className="micro">{entry.status}</span>
      </div>
      <h3 className="mt-8 font-editorial text-2xl leading-tight text-fg md:text-3xl">
        {entry.title}
      </h3>
      <p className="micro mt-2">{entry.org}</p>
      <p className="mt-5 text-sm leading-relaxed text-muted">
        {entry.description}
      </p>
    </article>
  );
}
