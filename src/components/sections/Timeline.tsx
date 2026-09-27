"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { BriefcaseBusiness, GraduationCap } from "lucide-react";
import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { cn } from "@/lib/utils";

/**
 * Path: the numbers, then the record.
 *
 * **The year column.** It used to carry five sticky years, one per entry,
 * each parked at 40% of the viewport — so while scrolling, two or three of them
 * overlapped each other and slid under the navbar, and each was a gradient
 * scaled 1.06× inside a box it did not fit (183px of Michroma in 176px), which
 * is what clipped the last digit. Now there is **one** sticky panel that
 * crossfades to the year of whichever entry is on the reading line, set at a
 * size four digits always fit, with inline padding so the gradient has room
 * for the glyphs' overhang.
 *
 * **The beam** is `scaleY` on a full-height line, not an animated `height`:
 * height is layout, and it was being recomputed on every scroll frame.
 *
 * **Phones** get no panel — the year and dates sit with each entry — and the
 * rail node lives in the gutter instead of on top of the year.
 */
export function Timeline() {
  const { c, t } = useI18n();
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  const entryRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 70%", "end 45%"],
  });
  const beam = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const headY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const headOpacity = useTransform(scrollYProgress, [0, 0.04, 0.96, 1], [0, 1, 1, 0]);

  /* Which entry is on the reading line. Highest ratio wins rather than
     last-intersecting, so the year never flicks backwards when two entries
     straddle the line. */
  useEffect(() => {
    const nodes = entryRefs.current.filter((n): n is HTMLLIElement => !!n);
    if (!nodes.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!hit) return;
        const i = nodes.indexOf(hit.target as HTMLLIElement);
        if (i >= 0) setActive(i);
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const current = c.timeline[active] ?? c.timeline[0];

  return (
    <section
      id="timeline"
      data-act="deck"
      data-chapter="LEDGER"
      className="relative"
      aria-label={t.path.aria}
    >
      <ChapterSeam />

      <div className="mx-auto max-w-[1800px] px-5 pt-24 md:px-8 md:pt-36 lg:px-16">
        <SectionHeader index={sectionIndex("#timeline")} label={t.path.eyebrow} title={t.path.title} />

        {/* --- Numbers --- */}
        <Reveal className="mt-14">
          <span className="micro">{t.path.numbers}</span>
        </Reveal>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-line pt-10 md:grid-cols-4">
          {c.stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <dd className="display-caps text-[clamp(2rem,5vw,4.25rem)] text-fg">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} unit={stat.unit} />
              </dd>
              <dt className="mt-3 text-sm leading-snug text-muted">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      {/* --- Record --- */}
      <div className="mx-auto max-w-[1800px] px-5 pb-24 pt-24 md:px-8 md:pb-36 md:pt-28 lg:px-16">
        <Reveal>
          <span className="micro">{t.path.record}</span>
        </Reveal>

        <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-14 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          {/* The one sticky year. */}
          <div className="hidden md:block">
            <div className={cn(!reduced && "sticky top-[32vh]")}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={reduced ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -14 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span
                    className="spectrum-text tabular inline-block px-1 font-display leading-none"
                    style={{ fontSize: "clamp(2.5rem, 4.4vw, 4.25rem)" }}
                  >
                    {current.year}
                  </span>
                  <p className="micro mt-4 !text-fg">{current.org}</p>
                  <p className="mt-1.5 font-mono text-sm text-muted">{current.period}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Entries on a rail. */}
          <div className="relative pl-9 md:pl-12">
            <div aria-hidden className="absolute bottom-0 left-[5px] top-0 w-px bg-line md:left-[7px]">
              {!reduced && (
                <>
                  <motion.div
                    className="absolute inset-0 origin-top"
                    style={{
                      scaleY: beam,
                      background:
                        "linear-gradient(to bottom, var(--spectrum-1), var(--spectrum-2) 50%, var(--spectrum-3))",
                    }}
                  />
                  {/* The head rides a full-height wrapper translated by a
                      percentage — a transform's % is of the element's own
                      height, which here is the rail's — so the dot travels the
                      whole rail without animating `top`. */}
                  <motion.div
                    className="absolute inset-0"
                    style={{ y: headY, opacity: headOpacity }}
                  >
                    <span
                      className="absolute -left-[5px] -top-[5px] h-[11px] w-[11px] rounded-full"
                      style={{
                        background: "var(--spectrum-3)",
                        boxShadow:
                          "0 0 12px 3px color-mix(in srgb, var(--spectrum-3) 55%, transparent)",
                      }}
                    />
                  </motion.div>
                </>
              )}
            </div>

            <ol ref={listRef}>
              {c.timeline.map((entry, i) => {
                const on = i === active;
                const Kind = entry.kind === "education" ? GraduationCap : BriefcaseBusiness;
                return (
                  <li
                    key={entry.title}
                    ref={(el) => {
                      entryRefs.current[i] = el;
                    }}
                    className="relative border-b border-line py-9 first:pt-2 md:py-11"
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="font-mono text-sm tabular text-fg md:hidden">{entry.year}</span>
                      <span className="font-mono text-sm text-muted">{entry.period}</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 font-mono text-xs uppercase tracking-wider text-muted">
                        <Kind size={13} aria-hidden />
                        {entry.kind === "education" ? t.path.education : t.path.work}
                      </span>
                    </div>

                    <h3
                      className={cn(
                        "relative mt-4 font-tech text-2xl font-bold uppercase leading-tight text-balance transition-colors duration-500 md:text-3xl",
                        on ? "text-fg" : "text-fg/80"
                      )}
                    >
                      {/* Node, anchored to the title so it is always level
                          with the first line, and out in the gutter on the
                          rail — never on top of the year or the text. The
                          offsets are the rail's x minus the list's padding. */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute -left-[36.5px] top-[0.45em] h-3 w-3 rotate-45 border transition-all duration-500 md:-left-[46.5px]",
                          on ? "border-transparent" : "border-line-strong bg-bg"
                        )}
                        style={on ? { backgroundImage: "var(--gradient-spectrum)" } : undefined}
                      />
                      {entry.title}
                    </h3>
                    <p className="micro mt-3">{entry.org}</p>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
                      {entry.description}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
