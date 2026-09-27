"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { BriefcaseBusiness, GraduationCap } from "lucide-react";
import { sectionIndex, type TimelineEntry } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { cn } from "@/lib/utils";

/** The line on screen the rail's head rides, as a fraction of the viewport. */
const READ_LINE = 0.6;

/**
 * Path: the numbers, then the record.
 *
 * **Three lanes: year, rail, role.** The rail runs *between* the years and the
 * roles, so the years are a column of their own on the left, set larger than
 * the titles, and each row's node sits on the rail level with its year.
 *
 * **The head says where you are.** The beam fills to a fixed reading line, and
 * the head riding its tip is a glass chip that reads the span of the row it has
 * reached ("2025–2026"). Which row that is comes from the head's own position
 * against the measured row tops — not from a separate observer band — so the
 * chip, the lit node and the highlighted year always agree.
 *
 * **Each year pops as its row arrives**, scrubbed by that row's own scroll
 * progress (so it reverses on the way back up), through a spring so a quick
 * flick overshoots a little. The role follows a beat behind.
 *
 * **The beam** is `scaleY` on a full-height line, not an animated `height`:
 * height is layout, and it was being recomputed on every scroll frame.
 *
 * **Phones** fold to two lanes: the rail on the left, and the year sitting
 * over its role.
 */
export function Timeline() {
  const { c, t } = useI18n();
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  const tops = useRef<number[]>([]);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: [`start ${READ_LINE * 100}%`, `end ${READ_LINE * 100}%`],
  });
  const headY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const headOpacity = useTransform(scrollYProgress, [0, 0.02, 0.98, 1], [0, 1, 1, 0]);

  /* Each row's node centre, relative to the list. Measured from the nodes
     themselves, which never move: the pop transforms live on other cells. */
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const origin = list.getBoundingClientRect().top;
      tops.current = Array.from(list.querySelectorAll<HTMLElement>("[data-node]")).map((n) => {
        const r = n.getBoundingClientRect();
        return r.top - origin + r.height / 2;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [c.timeline]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const list = listRef.current;
    if (!list) return;
    const head = p * list.offsetHeight;
    let i = 0;
    tops.current.forEach((top, k) => {
      if (top <= head) i = k;
    });
    if (i !== active) setActive(i);
  });

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
              <dt className="mt-3 text-base leading-snug text-muted">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      {/* --- Record --- */}
      <div className="mx-auto max-w-[1800px] px-5 pb-24 pt-24 md:px-8 md:pb-36 md:pt-28 lg:px-16">
        <Reveal>
          <span className="micro">{t.path.record}</span>
        </Reveal>

        {/* The lane widths are variables so the rail's x can be derived from
            the same numbers the grid uses — it can never drift off the nodes. */}
        <div className="relative mt-10 [--lane:2.25rem] [--yc:0rem] md:[--lane:6.5rem] md:[--yc:13rem] lg:[--lane:8.5rem] lg:[--yc:19rem]">
          <div
            aria-hidden
            className="absolute bottom-0 top-0 w-px bg-line"
            style={{ left: "calc(var(--yc) + var(--lane) / 2)" }}
          >
            {!reduced && (
              <>
                <motion.div
                  className="absolute inset-0 origin-top"
                  style={{
                    scaleY: scrollYProgress,
                    background:
                      "linear-gradient(to bottom, var(--spectrum-1), var(--spectrum-2) 50%, var(--spectrum-3))",
                  }}
                />
                {/* The head rides a full-height wrapper translated by a
                    percentage — a transform's % is of the element's own
                    height, which here is the rail's — so it travels the whole
                    rail without animating `top`. */}
                <motion.div className="absolute inset-0" style={{ y: headY, opacity: headOpacity }}>
                  <span
                    className="absolute -left-[5px] -top-[5px] h-[11px] w-[11px] rounded-full md:hidden"
                    style={{
                      background: "var(--spectrum-3)",
                      boxShadow: "0 0 12px 3px color-mix(in srgb, var(--spectrum-3) 55%, transparent)",
                    }}
                  />
                  <span
                    className="liquid-glass absolute left-0 top-0 hidden -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full px-3 py-1.5 md:block"
                    style={{
                      boxShadow:
                        "0 0 18px 2px color-mix(in srgb, var(--spectrum-2) 45%, transparent), inset 0 0 0 1px rgba(236,238,251,0.16)",
                    }}
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={current.span}
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -12, opacity: 0 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="block whitespace-nowrap font-mono text-xs font-semibold tabular text-fg"
                      >
                        {current.span}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </motion.div>
              </>
            )}
          </div>

          <ol ref={listRef}>
            {c.timeline.map((entry, i) => (
              <Row
                key={entry.title}
                entry={entry}
                on={i === active}
                past={i < active}
                reduced={reduced}
                kindLabel={entry.kind === "education" ? t.path.education : t.path.work}
                nowLabel={t.path.now}
              />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Row({
  entry,
  on,
  past,
  reduced,
  kindLabel,
  nowLabel,
}: {
  entry: TimelineEntry;
  on: boolean;
  past: boolean;
  reduced: boolean;
  kindLabel: string;
  nowLabel: string;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 96%", `start ${READ_LINE * 100}%`] });
  const pop = useSpring(scrollYProgress, { stiffness: 260, damping: 20, mass: 0.6 });
  const yearY = useTransform(pop, [0, 1], [56, 0]);
  const yearScale = useTransform(pop, [0, 1], [0.7, 1]);
  const yearOpacity = useTransform(scrollYProgress, [0, 0.45], [0, 1]);
  const bodyY = useTransform(scrollYProgress, [0.2, 1], [36, 0]);
  const bodyOpacity = useTransform(scrollYProgress, [0.2, 0.7], [0, 1]);

  const Kind = entry.kind === "education" ? GraduationCap : BriefcaseBusiness;
  const [from, to] = entry.span.split("–");

  return (
    <li
      ref={ref}
      className="relative grid grid-cols-[var(--lane)_minmax(0,1fr)] border-b border-line py-10 [grid-template-areas:'lane_year'_'lane_body'] first:pt-2 md:grid-cols-[var(--yc)_var(--lane)_minmax(0,1fr)] md:py-14 md:[grid-template-areas:'year_lane_body']"
    >
      {/* Year. Transform-origin left so the pop grows out of the column's edge
          rather than out of its middle. */}
      <motion.div
        className="relative origin-left [grid-area:year]"
        style={reduced ? undefined : { y: yearY, scale: yearScale, opacity: yearOpacity }}
      >
        <div
          className={cn(
            "spectrum-text tabular inline-block pr-1 font-tech font-bold leading-[0.95] transition-[filter,opacity] duration-300",
            past && "opacity-55",
            on && "drop-shadow-[0_0_22px_rgba(123,92,255,0.45)]"
          )}
          style={{ fontSize: "clamp(2.75rem, 5vw, 4.75rem)" }}
        >
          <span className="block">{from}</span>
          {to && <span className="block">–{to}</span>}
        </div>
        <p className="mt-3 font-mono text-base text-muted">{entry.period}</p>
        <p
          className={cn(
            "micro mt-2 !text-fg transition-opacity duration-300",
            on ? "opacity-100" : "opacity-0"
          )}
          aria-hidden={!on}
        >
          ● {nowLabel}
        </p>
      </motion.div>

      {/* Node on the rail, level with the year's first line. */}
      <div aria-hidden className="relative flex justify-center [grid-area:lane]">
        <span
          data-node
          className={cn(
            "mt-[calc(clamp(2.75rem,5vw,4.75rem)*0.45-7px)] h-3.5 w-3.5 rotate-45 border transition-all duration-200",
            on || past ? "border-transparent" : "border-line-strong bg-bg",
            on && "scale-125"
          )}
          style={on || past ? { backgroundImage: "var(--gradient-spectrum)" } : undefined}
        />
      </div>

      <motion.div
        className="mt-5 [grid-area:body] md:mt-0"
        style={reduced ? undefined : { y: bodyY, opacity: bodyOpacity }}
      >
        <span className="liquid-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm uppercase tracking-wider text-muted">
          <Kind size={14} aria-hidden />
          {kindLabel}
        </span>
        <h3
          className={cn(
            "mt-4 font-tech text-3xl font-bold uppercase leading-[1.08] text-balance transition-colors duration-200 md:text-4xl lg:text-[2.75rem]",
            on ? "text-fg" : "text-fg/85"
          )}
        >
          {entry.title}
        </h3>
        <p className="mt-3 font-mono text-sm uppercase tracking-[0.18em] text-fg/70 md:text-base">{entry.org}</p>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-fg/80">{entry.description}</p>
      </motion.div>
    </li>
  );
}
