"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useScrollTimelines } from "@/hooks/useScrollTimelines";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { FrameLock } from "@/components/motion/FrameLock";
import { Rich } from "@/components/ui/Rich";
import { photoSrc, PHOTOS, type PhotoKey } from "@/lib/pathPhotos";
import { openCase } from "@/lib/caseFile";
import { PIN_QUERY } from "@/lib/viewport";
import { cn } from "@/lib/utils";
import { education, type TimelineEntry } from "@/lib/content";

/**
 * Journey: a vertical flight log, built to be read while it moves.
 *
 * On a wide screen the chapter pins and the scroll travels forward in time,
 * oldest first. Everything runs on ONE clock, the runway's scroll, and meets
 * on one eye line a little above the middle of the frame:
 *
 *   - left, the wheel: one row per stop (its year, and its node on the
 *     spine). It rolls with the scroll itself, so a row reaches the eye line
 *     exactly when its stop is reached, and its node crosses the fixed
 *     playhead at that moment;
 *   - right, the stop: its text rises in as its row nears the eye line, holds
 *     while the row sits there, and rises out as the row leaves, scrubbed by
 *     the same scroll rather than popped on a timer.
 *
 * Stop k is reached at progress k / (n - 1). The wheel, the selection and a
 * click on a row all use that one mapping.
 *
 * Phones and short windows: the same stops as a vertical list on a spine, each
 * locking in as it scrolls by. Reduced motion: the list at rest.
 */

const yearOf = (e: TimelineEntry) => e.start.year;
/** Scroll per stop while pinned, in small-viewport heights. */
const STEP_VH = 62;
/** An ongoing role: no end date and not a single moment like a graduation. */
const ongoing = (e: TimelineEntry) => !e.end && !e.note && e.kind === "work";

type PhotoText = { caption: string; alt: string };

export function Timeline() {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const room = useMediaQuery(PIN_QUERY);
  const css = useScrollTimelines();
  const pinned = room && !reduced;

  return (
    <section
      id="timeline"
      data-act="void"
      data-chapter="JOURNEY"
      aria-label={t.path.aria}
      className={cn("relative z-10 overflow-x-clip", !pinned && "pb-24 md:pb-32")}
    >
      <ChapterSeam wipe />
      <JourneyHead scrub={css && !reduced} />
      {pinned ? <FlightLog css={css} /> : <FlightList />}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/** The chapter's name, filled with the ramp left to right as it scrolls up. */
function JourneyHead({ scrub }: { scrub: boolean }) {
  const { c, t } = useI18n();
  const years = c.timeline.map(yearOf);
  return (
    <header className={cn("jr-head", scrub && "jr-head--scrub")}>
      <h2 className="jr-title display-caps" aria-label={t.path.title}>
        <span aria-hidden className="jr-title-outline">
          {t.path.title}
        </span>
        <span aria-hidden className="jr-title-fill">
          <span className="spectrum-text">{t.path.title}</span>
        </span>
      </h2>
      <p className="jr-span display-caps tabular">
        {Math.min(...years)} — {Math.max(...years)}
      </p>
    </header>
  );
}

/** Oldest first, so the scroll travels forward in time. */
function useEntries() {
  const { c } = useI18n();
  return [...c.timeline].sort((a, b) => yearOf(a) - yearOf(b) || (a.start.month ?? 6) - (b.start.month ?? 6));
}

function usePhotoText() {
  const { t } = useI18n();
  return t.path.photos as unknown as Record<PhotoKey, PhotoText>;
}

/* -------------------------------------------------------------------------- */
/* Pinned: the flight log                                                     */
/* -------------------------------------------------------------------------- */

function FlightLog({ css }: { css: boolean }) {
  const { t } = useI18n();
  const { scrollTo } = useSmoothScroll();
  const entries = useEntries();
  const n = entries.length;
  const last = Math.max(1, n - 1);
  const ref = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const k = Math.round(Math.min(1, Math.max(0, p)) * last);
    setSel((s) => (s === k ? s : k));
  });
  /* Fallback roll (no scroll timelines): the same maths as `jr-wheel`. */
  const roll = useTransform(scrollYProgress, (p) => `calc(${-(Math.min(1, Math.max(0, p)) * last + 0.5)} * var(--row))`);

  const pick = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    scrollTo(top + (i / last) * travel);
  };

  const rows = entries.map((e, i) => {
    const d = i - sel;
    const repeat = i > 0 && yearOf(entries[i - 1]) === yearOf(e);
    return (
      <li key={i} data-d={Math.max(-3, Math.min(3, d))} data-repeat={repeat ? "true" : "false"}>
        <button type="button" aria-current={d === 0 ? "true" : undefined} aria-label={`${yearOf(e)} · ${e.title}`} onClick={() => pick(i)}>
          {yearOf(e)}
        </button>
        <span aria-hidden className="jr-wheel-node" data-on={i <= sel ? "true" : "false"} />
      </li>
    );
  });

  return (
    <div
      ref={ref}
      className={cn("jr-runway relative", css && "jr-runway--css")}
      style={{ height: `${n * STEP_VH + 100}svh`, "--n": n } as React.CSSProperties}
    >
      <div className="jr-stage sticky top-0 h-svh overflow-hidden">
        <div className="jr-grid">
          {/* The spine: a quiet track, lit above the eye line (the way
              travelled), with the playhead fixed on the eye line. */}
          <div className="jr-spine" aria-hidden>
            <span className="jr-spine-fill" />
            <span className="jr-playhead" data-turn={sel % 2} />
            <span className="jr-count tag tabular">
              {String(sel + 1).padStart(2, "0")}
              <span className="text-fg/80">/{String(n).padStart(2, "0")}</span>
            </span>
          </div>

          {/* The wheel: years and spine nodes on one track, rolled by the
              scroll. Each row jumps to its stop. */}
          <nav className="jr-years" aria-label={t.path.years}>
            {css ? (
              <ol className="jr-wheel jr-wheel--css">{rows}</ol>
            ) : (
              <motion.ol className="jr-wheel" style={{ y: roll }}>
                {rows}
              </motion.ol>
            )}
          </nav>

          <div className="jr-reader">
            {/* The stop: every one rendered on the same spot; the scroll
                passes them through. Live region, so a screen reader hears
                each new stop once. */}
            <div className="jr-cards" aria-live="polite">
              {entries.map((e, i) => (
                <StopCard key={i} entry={e} index={i} state={i < sel ? "past" : i > sel ? "next" : "cur"} near={Math.abs(i - sel) <= 1} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One stop on the eye line. `state` places it: risen out above (past),
 *  waiting below (next), or showing (cur). Only near stops load their photo. */
function StopCard({
  entry: e,
  index,
  state,
  near,
}: {
  entry: TimelineEntry;
  index: number;
  state: "past" | "cur" | "next";
  near: boolean;
}) {
  const on = state === "cur";
  return (
    <article className="jr-card" data-state={state} aria-hidden={on ? undefined : true} style={{ "--i": index } as React.CSSProperties}>
      <StopPhoto entry={e} play={on} load={near} />
      <StopText entry={e} interactive={on} />
    </article>
  );
}

function StopPhoto({ entry: e, play, load }: { entry: TimelineEntry; play: boolean; load: boolean }) {
  const text = usePhotoText();
  if (!e.photo) return <div className="jr-photo jr-photo--empty" />;
  const meta = PHOTOS[e.photo];
  const w = meta.widths[meta.widths.length - 1];
  return (
    <figure className="jr-photo" data-reveal={meta.reveal} data-play={play ? "true" : "false"}>
      <div
        className="jr-photo-frame"
        style={{ aspectRatio: String(meta.aspect), "--fx": `${meta.focus.x * 100}%`, "--fy": `${meta.focus.y * 100}%` } as React.CSSProperties}
      >
        {load ? (
          <span className="jr-photo-drift">
            <Image src={photoSrc(e.photo, w)} alt={text[e.photo]?.alt ?? ""} fill sizes="(min-width: 1024px) 28rem, 90vw" className="object-cover" unoptimized />
          </span>
        ) : null}
      </div>
      <figcaption className="micro mt-2 text-fg/85 max-md:hidden">{text[e.photo]?.caption}</figcaption>
    </figure>
  );
}

/** The stop's words, in order of weight: when, what, where, then the story
 *  with its key phrase lit. */
function StopText({ entry: e, interactive }: { entry: TimelineEntry; interactive: boolean }) {
  const { t } = useI18n();
  const live = ongoing(e);
  return (
    <div className="jr-text">
      <p className="flex flex-wrap items-center gap-2">
        {live ? <span className="jr-now tag">{t.path.now}</span> : null}
        <span className="jr-kind tag">{t.path[e.kind]}</span>
      </p>
      <p className="jr-period display-caps tabular">{e.period}</p>
      <h3 className="jr-card-title">{e.title}</h3>
      <p className="jr-org">{e.org}</p>
      <p className="jr-desc">
        <Rich text={e.description} />
      </p>
      {e.extra === "gpa" && (
        <p className="mood-stat">
          <span className="display-caps spectrum-text">{education.gpaRecent.toFixed(2)}</span>
          <span className="micro text-fg/85">{t.path.gpaRecent}</span>
          <span className="display-caps">{education.gpaOverall.toFixed(2)}</span>
          <span className="micro text-fg/85">{t.path.gpaOverall}</span>
        </p>
      )}
      {e.extra === "spotfixes" && (
        <button type="button" className="mood-link" tabIndex={interactive ? 0 : -1} onClick={() => openCase("spotfixes")}>
          {t.path.caseLink} <ArrowUpRight aria-hidden size={18} />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Flow: the list on a spine                                                  */
/* -------------------------------------------------------------------------- */

function FlightList() {
  const entries = useEntries();
  return (
    <ol className="jr-list">
      {entries.map((e, i) => {
        const newYear = i === 0 || yearOf(entries[i - 1]) !== yearOf(e);
        return (
          <li key={i} className="jr-item">
            {newYear && <span className="jr-year-chip display-caps">{yearOf(e)}</span>}
            <span aria-hidden className="jr-node" />
            <FrameLock as="article" className="jr-card jr-card--flow">
              <div className="fl-in" style={{ "--i": 0 } as React.CSSProperties}>
                <StopPhoto entry={e} play load />
              </div>
              <div className="fl-in" style={{ "--i": 1 } as React.CSSProperties}>
                <StopText entry={e} interactive />
              </div>
            </FrameLock>
          </li>
        );
      })}
    </ol>
  );
}
