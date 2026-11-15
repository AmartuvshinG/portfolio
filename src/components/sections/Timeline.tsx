"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useScrollTimelines } from "@/hooks/useScrollTimelines";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { FrameLock } from "@/components/motion/FrameLock";
import { photoSrc, PHOTOS, type PhotoKey } from "@/lib/pathPhotos";
import { openCase } from "@/lib/caseFile";
import { PIN_QUERY } from "@/lib/viewport";
import { cn } from "@/lib/utils";
import { education, type TimelineEntry } from "@/lib/content";

/**
 * Journey: a vertical flight log, built to be read while it moves.
 *
 * On a wide screen the chapter pins and the scroll travels forward in time,
 * oldest first, one stop per stretch of scroll. Everything is arranged around
 * one eye line, a little above the middle of the frame:
 *
 *   - left, the years slide up a column so the current one always sits on
 *     the eye line, large and in the ramp;
 *   - centre, the spine fills with the ramp as the scroll runs (scrubbed),
 *     with a playhead fixed on the eye line;
 *   - right, the stop itself: its photo and what happened, always at the
 *     same place, so the eye never has to hunt. The stop before shows dimmed
 *     above it and the next one below, like a teleprompter.
 *
 * Readability is the rule. A stop changes only at the boundary of its stretch,
 * and the change is a short vertical move in the direction of the scroll (the
 * old stop rises out, the new one rises in); for the rest of the stretch the
 * text holds perfectly still. Only the photo drifts, slowly, with the scroll.
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
      {pinned ? <FlightLog /> : <FlightList />}
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
      <p className="micro text-fg/85">
        {Math.min(...years)} — {Math.max(...years)} · {t.path.places.ub} → {t.path.places.erie} → {t.path.places.ub}
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

function FlightLog() {
  const { t } = useI18n();
  const { scrollTo } = useSmoothScroll();
  const entries = useEntries();
  const n = entries.length;
  const ref = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const k = Math.min(n - 1, Math.max(0, Math.floor(p * n * 0.9999)));
    setSel((s) => (s === k ? s : k));
  });

  const years = Array.from(new Set(entries.map(yearOf))).sort();
  const yearAt = years.indexOf(yearOf(entries[sel]));

  const pick = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    scrollTo(top + ((i + 0.5) / n) * travel);
  };

  return (
    <div ref={ref} className="jr-runway relative" style={{ height: `${n * STEP_VH + 100}svh`, "--n": n } as React.CSSProperties}>
      <div className="jr-stage sticky top-0 h-svh overflow-hidden">
        <div className="jr-grid">
          {/* The years: the column slides so the current one sits on the
              eye line. Each year jumps to its first stop. */}
          <nav className="jr-years" aria-label={t.path.years}>
            <ol style={{ "--y": yearAt } as React.CSSProperties}>
              {years.map((y, yi) => {
                const first = entries.findIndex((e) => yearOf(e) === y);
                const d = yi - yearAt;
                return (
                  <li key={y} data-d={Math.max(-2, Math.min(2, d))}>
                    <button type="button" aria-current={d === 0 ? "true" : undefined} onClick={() => pick(first)}>
                      {y}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* The spine: filled by the scroll, a playhead on the eye line. */}
          <div className="jr-spine" aria-hidden style={{ "--sel": sel } as React.CSSProperties}>
            <span className="jr-spine-fill" />
            {/* A node per stop, lit once the playhead has passed it. */}
            {entries.map((_, i) => (
              <span key={i} className="jr-spine-node" data-on={i <= sel ? "true" : "false"} style={{ top: `${((i + 0.5) / n) * 100}%` }} />
            ))}
            <span className="jr-spine-head" />
            {/* The playhead turns a quarter at every new stop, then settles. */}
            <span className="jr-playhead" data-turn={sel % 2} />
            <span className="jr-count tag tabular">
              {String(sel + 1).padStart(2, "0")}
              <span className="text-fg/60">/{String(n).padStart(2, "0")}</span>
            </span>
          </div>

          <div className="jr-reader">
            {/* The stop before, dimmed above. */}
            <div className="jr-ghosts jr-ghosts--prev" aria-hidden>
              {entries.map((e, i) => (
                <p key={i} className="jr-ghost" data-on={i === sel - 1 ? "true" : "false"} data-dir={i < sel - 1 ? "up" : "down"}>
                  <span className="tag tabular">{yearOf(e)}</span> {e.title}
                </p>
              ))}
            </div>

            {/* The stop: every one rendered on the same spot, only the
                current one showing. Live region, so a screen reader hears
                each new stop once. */}
            <div className="jr-cards" aria-live="polite">
              {entries.map((e, i) => (
                <StopCard key={i} entry={e} index={i} count={n} state={i < sel ? "past" : i > sel ? "next" : "cur"} near={Math.abs(i - sel) <= 1} />
              ))}
            </div>

            {/* The stop after, dimmed below. */}
            <div className="jr-ghosts jr-ghosts--next" aria-hidden>
              {entries.map((e, i) => (
                <p key={i} className="jr-ghost" data-on={i === sel + 1 ? "true" : "false"} data-dir={i > sel + 1 ? "down" : "up"}>
                  <span className="tag tabular">{yearOf(e)}</span> {e.title}
                </p>
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
  count,
  state,
  near,
}: {
  entry: TimelineEntry;
  index: number;
  count: number;
  state: "past" | "cur" | "next";
  near: boolean;
}) {
  const on = state === "cur";
  return (
    <article className="jr-card" data-state={state} aria-hidden={on ? undefined : true} style={{ "--i": index } as React.CSSProperties}>
      <StopPhoto entry={e} play={on} load={near} />
      <StopText entry={e} index={index} count={count} interactive={on} />
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
      <figcaption className="micro mt-2 text-fg/85">{text[e.photo]?.caption}</figcaption>
    </figure>
  );
}

function StopText({
  entry: e,
  index,
  count,
  interactive,
}: {
  entry: TimelineEntry;
  index: number;
  count: number;
  interactive: boolean;
}) {
  const { t } = useI18n();
  const live = ongoing(e);
  return (
    <div className="jr-text">
      <p className="micro flex flex-wrap items-center gap-x-3 gap-y-1 text-fg/85">
        {live ? <span className="jr-now">{t.path.now}</span> : null}
        <span>{e.period}</span>
        <span aria-hidden>·</span>
        <span>{t.path[e.kind]}</span>
        <span aria-hidden className="ml-auto tabular text-fg/60">
          {String(index + 1).padStart(2, "0")}/{String(count).padStart(2, "0")}
        </span>
      </p>
      <h3 className="jr-card-title">{e.title}</h3>
      <p className="micro text-fg/85">{e.org}</p>
      <p className="jr-desc">{e.description}</p>
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
  const n = entries.length;
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
                <StopText entry={e} index={i} count={n} interactive />
              </div>
            </FrameLock>
          </li>
        );
      })}
    </ol>
  );
}
