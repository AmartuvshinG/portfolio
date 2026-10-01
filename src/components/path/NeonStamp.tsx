"use client";

import { motion, type Transition } from "framer-motion";
import type { Stamp, TimelineEntry } from "@/lib/content";
import type { useI18n } from "@/lib/i18n";
import { strike } from "@/lib/neonStrike";
import { EASE_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* The Path's neon date stamps. Moved here unchanged from the old ledger
   (Timeline.tsx) when it became the route: these are the part that stayed. */

/** The month line's size. */
export const MONTH_SIZE = "clamp(1.5rem, 2.4vw, 2.25rem)";

export type PathWords = ReturnType<typeof useI18n>["t"]["path"];

export function stampLabel(s: Stamp, words: PathWords): string | null {
  if (s.season === "summer") return words.summer;
  if (s.month) return words.months[s.month - 1];
  return null;
}

/**
 * Each year has its own neon, so years read apart at a glance: the start year,
 * an end year that differs, and the row's lamp all carry it. Three are the
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
  2020: "#ffa02b",
};
const FALLBACK_NEON = ["#22e0ff", "#ff2d8f", "#ffa02b", "#a48bff", "#ff6a5c"];
export function yearNeon(year: number): string {
  return YEAR_NEON[year] ?? FALLBACK_NEON[year % FALLBACK_NEON.length];
}

/**
 * The start as month-over-year, the end beside an arrow. The end drops
 * whatever it shares with the start: the year when it is the same year
 * ("JUN 2026 → SEP"), the season when it is the same season ("SUMMER 2022 →
 * 2023").
 *
 * The stamp is drawn segments and flickering words, none of which would read
 * as a date, so it is decoration; the caller provides the `period` phrase for
 * assistive tech.
 */
export function DateStamp({
  entry,
  play,
  instant,
  words,
  size = "lg",
}: {
  entry: TimelineEntry;
  play: boolean;
  instant: boolean;
  words: PathWords;
  size?: "lg" | "md";
}) {
  const { start, end, note } = entry;
  const startLabel = stampLabel(start, words);
  const endLabel = end ? stampLabel(end, words) : null;
  const endShowsLabel = !!end && !!endLabel && (endLabel !== startLabel || end.year === start.year);
  const endShowsYear = !!end && end.year !== start.year;
  const neon = yearNeon(start.year);
  const md = size === "md";

  return (
    <div aria-hidden>
      {startLabel && (
        <Ignite play={play} instant={instant} delay={0}>
          <span
            className="block font-tech font-bold uppercase leading-none tracking-wide text-fg"
            style={{ fontSize: md ? "clamp(1.1rem, 1.6vw, 1.6rem)" : MONTH_SIZE }}
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
        className={md ? "mt-2 text-[clamp(1.9rem,3.2vw,3rem)]" : "mt-3 text-[clamp(2.25rem,4vw,3.75rem)]"}
      />

      {end && (endShowsLabel || endShowsYear) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Arrow play={play} instant={instant} delay={0.7} />
          {endShowsLabel && (
            <Ignite play={play} instant={instant} delay={0.8}>
              <span
                className={cn(
                  "block font-tech font-bold uppercase leading-none text-fg",
                  md ? "text-xl" : "text-2xl md:text-[1.75rem]"
                )}
              >
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
              className={md ? "text-lg" : "text-xl md:text-2xl"}
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
  );
}

export function Ignite({
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
 * A year in the display face — the same one as the wordmark in the navbar —
 * lit in its year's neon. Each digit strikes on by itself, left to right. The
 * glow is a static text-shadow: one paint when the digit appears, nothing per
 * frame.
 */
export function NeonYear({
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
export function Arrow({ play, instant, delay }: { play: boolean; instant: boolean; delay: number }) {
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
