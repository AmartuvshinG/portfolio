"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { BriefcaseBusiness, GraduationCap } from "lucide-react";
import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { EASE_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Path: the numbers, then the record.
 *
 * **Every role carries its own year.** There used to be one sticky year panel
 * that crossfaded to whichever entry was on the reading line. Its exit and
 * enter ran one after the other (~0.7s a change), and it only switched once an
 * entry crossed a narrow band mid-screen, so the year always lagged the scroll.
 * Now each row is `[year | role]`: two 2026 roles show 2026 twice, and nothing
 * waits on shared state. The year is set as loud as the role title, in the ramp.
 *
 * **Each row reveals itself** as it enters, in 0.35s, with the year leading
 * the title by a beat.
 *
 * **The beam** is `scaleY` on a full-height line, not an animated `height`:
 * height is layout, and it was being recomputed on every scroll frame.
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

        <div className="mt-10">
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
                    className="relative grid gap-x-10 gap-y-3 border-b border-line py-9 first:pt-2 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] md:py-11 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]"
                  >
                    <motion.div
                      className="relative"
                      initial={reduced ? false : { opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
                      transition={{ duration: 0.35, ease: EASE_EXPO }}
                    >
                      {/* Node, level with the year's centre and out in the
                          gutter on the rail. The x offsets are the rail's x
                          minus the list's padding. */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute -left-[36.5px] h-3 w-3 rotate-45 border transition-all duration-200 md:-left-[46.5px]",
                          on ? "border-transparent" : "border-line-strong bg-bg"
                        )}
                        style={{
                          top: "calc(clamp(2rem, 3.6vw, 3.5rem) / 2 - 6px)",
                          ...(on && { backgroundImage: "var(--gradient-spectrum)" }),
                        }}
                      />
                      <span
                        className="spectrum-text tabular inline-block pr-1 font-tech font-bold uppercase leading-none"
                        style={{ fontSize: "clamp(2rem, 3.6vw, 3.5rem)" }}
                      >
                        {entry.year}
                      </span>
                      <p className="mt-2 font-mono text-sm text-muted">{entry.period}</p>
                    </motion.div>

                    <motion.div
                      initial={reduced ? false : { opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
                      transition={{ duration: 0.35, ease: EASE_EXPO, delay: reduced ? 0 : 0.06 }}
                    >
                      <span className="liquid-glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-xs uppercase tracking-wider text-muted">
                        <Kind size={13} aria-hidden />
                        {entry.kind === "education" ? t.path.education : t.path.work}
                      </span>
                      <h3
                        className={cn(
                          "mt-3 font-tech text-2xl font-bold uppercase leading-tight text-balance transition-colors duration-200 md:text-3xl",
                          on ? "text-fg" : "text-fg/80"
                        )}
                      >
                        {entry.title}
                      </h3>
                      <p className="micro mt-3">{entry.org}</p>
                      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
                        {entry.description}
                      </p>
                    </motion.div>
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
