"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type Transition,
} from "framer-motion";
import { BriefcaseBusiness, GraduationCap } from "lucide-react";
import { sectionIndex, type Stamp, type TimelineEntry } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { EASE_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** The line on screen the rail's head rides, as a fraction of the viewport. */
const READ_LINE = 0.6;

/** The month line's size. The rail node is centred on it, so both read it. */
const MONTH_SIZE = "clamp(1.5rem, 2.4vw, 2.25rem)";

type PathWords = ReturnType<typeof useI18n>["t"]["path"];

/**
 * Path: the numbers, then the record.
 *
 * **Three lanes: date, rail, role.** The rail runs between the dates and the
 * roles; each row's node sits on it, level with that row's month.
 *
 * **Each date is said once.** A row shows its start as a stamp — the month
 * over a large year — and its end beside an arrow, leaving out whatever the end
 * shares with the start ("JUN 2026 → SEP", never "2026 … 2026"). The phrase a
 * screen reader hears is the row's `period`; the stamp itself is decoration.
 *
 * **The year is set in the display face** — the wordmark's, and the stats'
 * just above — lit in a neon of its own per year so years read apart at a
 * glance.
 *
 * **The stamp is dark until its row arrives**, then strikes on like a neon
 * sign: the month flashes, stutters and holds; then each digit of the year
 * does the same, left to right. It resets when the
 * row leaves the screen, so it plays again on the way back. It replaced an
 * odometer roll that read as a lottery machine. Under reduced motion it is
 * simply there.
 *
 * **The beam** is `scaleY` on a full-height line, not an animated `height`:
 * height is layout, and it was being recomputed on every scroll frame.
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
     themselves, which never move: the animations live on other cells. */
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
        <div className="relative mt-10 [--lane:2.25rem] [--yc:0rem] md:[--lane:5rem] md:[--yc:14rem] lg:[--lane:7rem] lg:[--yc:19rem]">
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
                    className="absolute -left-[5px] -top-[5px] h-[11px] w-[11px] rounded-full"
                    style={{
                      background: "var(--spectrum-3)",
                      boxShadow: "0 0 12px 3px color-mix(in srgb, var(--spectrum-3) 55%, transparent)",
                    }}
                  />
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
                words={t.path}
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
  words,
}: {
  entry: TimelineEntry;
  on: boolean;
  past: boolean;
  reduced: boolean;
  words: PathWords;
}) {
  const ref = useRef<HTMLLIElement>(null);
  /* Not `once`: leaving the screen resets the stamp, so it prints again when
     the row comes back. */
  const inView = useInView(ref, { margin: "0px 0px -18% 0px", amount: 0.25 });
  const play = reduced || inView;

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 96%", `start ${READ_LINE * 100}%`] });
  const bodyY = useTransform(scrollYProgress, [0.2, 1], [36, 0]);
  const bodyOpacity = useTransform(scrollYProgress, [0.2, 0.7], [0, 1]);

  const Kind = entry.kind === "education" ? GraduationCap : BriefcaseBusiness;

  return (
    <li
      ref={ref}
      className="relative grid grid-cols-[var(--lane)_minmax(0,1fr)] border-b border-line py-10 [grid-template-areas:'lane_year'_'lane_body'] first:pt-2 md:grid-cols-[var(--yc)_var(--lane)_minmax(0,1fr)] md:py-14 md:[grid-template-areas:'year_lane_body']"
    >
      <div className="relative [grid-area:year]">
        <DateStamp entry={entry} play={play} instant={reduced} words={words} />
      </div>

      {/* Node on the rail, level with the month. */}
      <div aria-hidden className="relative flex justify-center [grid-area:lane]">
        <span
          data-node
          className={cn(
            "h-3.5 w-3.5 rotate-45 border transition-all duration-200",
            on || past ? "border-transparent" : "border-line-strong bg-bg",
            on && "scale-125"
          )}
          style={{
            marginTop: `calc(${MONTH_SIZE} * 0.5 - 7px)`,
            ...(on || past ? { background: yearNeon(entry.start.year) } : {}),
            ...(on ? { boxShadow: `0 0 14px 2px ${yearNeon(entry.start.year)}` } : {}),
          }}
        />
      </div>

      <motion.div
        className="mt-5 [grid-area:body] md:mt-0"
        style={reduced ? undefined : { y: bodyY, opacity: bodyOpacity }}
      >
        <span className="liquid-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm uppercase tracking-wider text-muted">
          <Kind size={14} aria-hidden />
          {entry.kind === "education" ? words.education : words.work}
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

function stampLabel(s: Stamp, words: PathWords): string | null {
  if (s.season === "summer") return words.summer;
  if (s.month) return words.months[s.month - 1];
  return null;
}

/**
 * Each year has its own neon, so years read apart at a glance: the start year,
 * an end year that differs, and the row's node all carry it. Three are the
 * site's spectrum stops (violet lifted for contrast), plus the hazard amber and
 * a coral. Lime is deliberately absent — it is the colour of the reference
 * this site must not resemble.
 */
const YEAR_NEON: Record<number, string> = {
  2026: "#22e0ff",
  2025: "#ff2d8f",
  2024: "#ffa02b",
  2023: "#a48bff",
  2022: "#ff6a5c",
};
const FALLBACK_NEON = ["#22e0ff", "#ff2d8f", "#ffa02b", "#a48bff", "#ff6a5c"];
function yearNeon(year: number): string {
  return YEAR_NEON[year] ?? FALLBACK_NEON[year % FALLBACK_NEON.length];
}

/**
 * The start as month-over-year, the end beside an arrow. The end drops
 * whatever it shares with the start: the year when it is the same year
 * ("JUN 2026 → SEP"), the season when it is the same season ("SUMMER 2022 →
 * 2023").
 */
function DateStamp({
  entry,
  play,
  instant,
  words,
}: {
  entry: TimelineEntry;
  play: boolean;
  instant: boolean;
  words: PathWords;
}) {
  const { start, end, note } = entry;
  const startLabel = stampLabel(start, words);
  const endLabel = end ? stampLabel(end, words) : null;
  const endShowsLabel = !!end && !!endLabel && (endLabel !== startLabel || end.year === start.year);
  const endShowsYear = !!end && end.year !== start.year;
  const neon = yearNeon(start.year);

  return (
    <>
      {/* What assistive tech reads. The stamp below is drawn segments and
          flickering words, none of which would read as a date. */}
      <span className="sr-only">{entry.period}</span>

      <div aria-hidden>
        {startLabel && (
          <Ignite play={play} instant={instant} delay={0}>
            <span
              className="block font-tech font-bold uppercase leading-none tracking-wide text-fg"
              style={{ fontSize: MONTH_SIZE }}
            >
              {startLabel}
            </span>
          </Ignite>
        )}

        <NeonYear
          value={start.year}
          color={neon}
          play={play}
          instant={instant}
          delay={0.18}
          className="mt-3 text-[clamp(2.25rem,4vw,3.75rem)]"
        />

        {end && (endShowsLabel || endShowsYear) && (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Arrow play={play} instant={instant} delay={0.7} />
            {endShowsLabel && (
              <Ignite play={play} instant={instant} delay={0.8}>
                <span className="block font-tech text-2xl font-bold uppercase leading-none text-fg md:text-[1.75rem]">
                  {endLabel}
                </span>
              </Ignite>
            )}
            {endShowsYear && (
              <NeonYear
                value={end.year}
                color={yearNeon(end.year)}
                play={play}
                instant={instant}
                delay={0.9}
                className="text-xl md:text-2xl"
              />
            )}
          </div>
        )}

        {note === "graduated" && (
          <Ignite play={play} instant={instant} delay={0.7} className="mt-4">
            <span
              className="inline-flex rounded-full border px-3 py-1 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-fg"
              style={{ borderColor: `color-mix(in srgb, ${neon} 60%, transparent)` }}
            >
              {words.graduated}
            </span>
          </Ignite>
        )}
      </div>
    </>
  );
}

/**
 * A neon tube striking: dark, a hard flash, a stutter, then steady. Opacity
 * only, one short burst, no loop — it reads as the sign coming on, not as a
 * fault, because it happens once and settles.
 */
const STRIKE = { opacity: [0, 1, 0.15, 0.85, 0.35, 1], times: [0, 0.12, 0.26, 0.44, 0.6, 1] };

function strike(play: boolean, instant: boolean, delay: number, duration: number) {
  if (instant) return { animate: { opacity: 1 }, transition: { duration: 0 } };
  if (!play) return { animate: { opacity: 0 }, transition: { duration: 0 } };
  return {
    animate: { opacity: STRIKE.opacity },
    transition: { duration, times: STRIKE.times, delay, ease: "linear" as const },
  };
}

function Ignite({
  play,
  instant,
  delay,
  className,
  children,
}: {
  play: boolean;
  instant: boolean;
  delay: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div className={cn("w-fit", className)} initial={false} {...strike(play, instant, delay, 0.6)}>
      {children}
    </motion.div>
  );
}

/**
 * A year in the display face — the same one as the wordmark in the navbar and
 * the figures under "By the numbers" — lit in its year's neon. Each digit
 * strikes on by itself, left to right. The glow is a static text-shadow: one
 * paint when the digit appears, nothing per frame.
 *
 * It replaced two hand-drawn SVG numeral faces (seven-segment, then angular
 * tubes). Both read as a device rather than as this site; the display face is
 * already the voice of every other number on the page.
 */
function NeonYear({
  value,
  color,
  play,
  instant,
  delay,
  className,
}: {
  value: number;
  color: string;
  play: boolean;
  instant: boolean;
  delay: number;
  className?: string;
}) {
  return (
    <span
      className={cn("display-caps tabular flex leading-none", className)}
      style={{
        color,
        textShadow: `0 0 18px color-mix(in srgb, ${color} 55%, transparent), 0 0 2px color-mix(in srgb, ${color} 80%, white)`,
      }}
    >
      {String(value)
        .split("")
        .map((ch, i) => (
          <motion.span key={i} className="inline-block" initial={false} {...strike(play, instant, delay + i * 0.12, 0.5)}>
            {ch}
          </motion.span>
        ))}
    </span>
  );
}

/** A short arrow that draws itself from the start date toward the end. */
function Arrow({ play, instant, delay }: { play: boolean; instant: boolean; delay: number }) {
  const t: Transition = instant || !play ? { duration: 0 } : { duration: 0.4, ease: EASE_EXPO, delay };
  return (
    <svg width="34" height="14" viewBox="0 0 34 14" fill="none" className="shrink-0 text-muted">
      <motion.path
        d="M1 7 H31 M25 1.5 L31 7 L25 12.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ pathLength: play ? 1 : 0 }}
        transition={t}
      />
    </svg>
  );
}
