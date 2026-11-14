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
import { photoSrc, PHOTOS } from "@/lib/pathPhotos";
import { openCase } from "@/lib/caseFile";
import { PIN_QUERY } from "@/lib/viewport";
import { cn } from "@/lib/utils";
import { education, type TimelineEntry } from "@/lib/content";

/**
 * Journey: the mood board, driven by the scroll.
 *
 * Two filmstrips of the real photos run in opposite directions around the
 * chapter's name. On a wide screen the chapter pins and the scroll is the
 * whole control: it runs the strips, fills JOURNEY with the ramp from left to
 * right, slides the marker along the years and deals each stop into the card
 * below (period, place, what happened), oldest first. Nothing needs a click;
 * a year or a photo can still be clicked, and that scrolls there.
 *
 * With scroll timelines the strips and the fill run on the compositor
 * (ride.css); framer is the fallback. React re-renders only when the stop in
 * the card changes. Phones and short windows: the strips still follow the
 * scroll as the chapter passes, and a tap picks the stop. Reduced motion: the
 * photos sit in a wrapped grid.
 */

const yearOf = (e: TimelineEntry) => e.start.year;
/** Scroll per stop while pinned, in viewport heights. */
const STEP_VH = 55;

export function Timeline() {
  const { c, t } = useI18n();
  const reduced = useReducedMotion();
  const room = useMediaQuery(PIN_QUERY);
  const css = useScrollTimelines();
  const pinned = room && !reduced;
  const { scrollTo } = useSmoothScroll();
  /* Oldest first, so the scroll travels forward in time. */
  const entries = [...c.timeline].sort((a, b) => yearOf(a) - yearOf(b));
  const n = entries.length;
  const [picked, setPicked] = useState(n - 1);
  const [scrolled, setScrolled] = useState(0);
  const sel = pinned ? scrolled : picked;
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: pinned ? ["start start", "end end"] : ["start end", "end start"],
  });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!pinned) return;
    const k = Math.min(n - 1, Math.max(0, Math.floor(p * n * 0.9999)));
    setScrolled((s) => (s === k ? s : k));
  });
  /* Fallback motion (no scroll timelines). */
  const rowA = useTransform(scrollYProgress, [0, 1], ["0%", "-45%"]);
  const rowB = useTransform(scrollYProgress, [0, 1], ["-45%", "0%"]);
  const fillOut = useTransform(scrollYProgress, [0, 1], ["-100%", "0%"]);
  const fillIn = useTransform(scrollYProgress, [0, 1], ["100%", "0%"]);
  const fallback = !css && !reduced;

  const half = Math.ceil(n / 2);
  const rows = [entries.slice(0, half).map((e, i) => ({ e, i })), entries.slice(half).map((e, i) => ({ e, i: i + half }))];
  const years = Array.from(new Set(entries.map(yearOf))).sort();
  const cur = entries[sel];
  const yearAt = years.indexOf(yearOf(cur));

  const pick = (i: number) => {
    if (!pinned) {
      setPicked(i);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    scrollTo(top + ((i + 0.5) / n) * travel);
  };

  const strip = (row: { e: TimelineEntry; i: number }[], copy: number) => (
    <ul key={copy} className="mood-track" aria-hidden={copy === 1 ? true : undefined}>
      {row.map(({ e, i }) => (
        <li key={`${copy}-${i}`} className="mood-frame" style={{ "--tilt": `${((i * 37) % 9) - 4}deg` } as React.CSSProperties}>
          <button
            type="button"
            tabIndex={copy === 1 ? -1 : 0}
            aria-pressed={copy === 0 ? sel === i : undefined}
            aria-label={copy === 0 ? `${t.path.choose}: ${e.period} · ${e.title}` : undefined}
            data-sel={sel === i ? "true" : "false"}
            onClick={() => pick(i)}
          >
            {e.photo ? (
              <Image src={photoSrc(e.photo, PHOTOS[e.photo].widths[0])} alt="" fill sizes="300px" className="object-cover" unoptimized />
            ) : null}
            <span className="mood-year tag">{yearOf(e)}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  const board = (
    <div className={cn("mood", pinned && "mood--pinned", css && !reduced && "mood--scroll")} data-still={reduced ? "true" : "false"}>
      <h2 className="mood-title display-caps" aria-label={t.path.title}>
        <span aria-hidden className="mood-title-outline">
          {t.path.title}
        </span>
        {/* The ramp fill, revealed left to right by the scroll: a window that
            opens rightward while the text inside it holds still. */}
        <motion.span aria-hidden className="mood-title-fill" style={fallback ? { x: fillOut } : undefined}>
          <motion.span className="spectrum-text" style={fallback ? { x: fillIn } : undefined}>
            {t.path.title}
          </motion.span>
        </motion.span>
      </h2>
      <p className="mood-span micro">
        {years[0]} — {years[years.length - 1]} · {t.path.places.ub} → {t.path.places.erie}
      </p>

      {rows.map((row, r) => (
        <div key={r} className={cn("mood-row", r === 1 && "mood-row--rev")}>
          <motion.div className="mood-run" style={fallback ? { x: r === 0 ? rowA : rowB } : undefined}>
            {strip(row, 0)}
            {strip(row, 1)}
          </motion.div>
        </div>
      ))}

      <div className="mood-dock">
        <div className="mood-controls">
          <ol className="mood-rail" aria-label={t.path.board} style={{ "--y": yearAt } as React.CSSProperties}>
            {years.map((y) => {
              const first = entries.findIndex((e) => yearOf(e) === y);
              const on = yearOf(cur) === y;
              return (
                <li key={y}>
                  <button type="button" data-on={on ? "true" : "false"} onClick={() => pick(first)}>
                    {y}
                  </button>
                </li>
              );
            })}
            <li aria-hidden className="mood-marker" />
          </ol>
          {pinned && (
            <span className="tag tabular text-fg/85">
              {String(sel + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
          )}
        </div>

        <article className="mood-card" aria-live="polite">
          <span key={`w-${sel}`} aria-hidden className="mood-wipe">
            <span />
            <span />
          </span>
          <div key={sel} className="mood-card-body">
            <span className="micro text-fg/85">
              {cur.period} · {t.path[cur.kind]}
            </span>
            <h3 className="mood-card-title">{cur.title}</h3>
            <p className="micro text-fg/85">{cur.org}</p>
            <p className="mt-3 text-sm text-fg/85">{cur.description}</p>
            {cur.extra === "gpa" && (
              <p className="mood-stat">
                <span className="display-caps spectrum-text">{education.gpaRecent.toFixed(2)}</span>
                <span className="micro text-fg/85">{t.path.gpaRecent}</span>
                <span className="display-caps">{education.gpaOverall.toFixed(2)}</span>
                <span className="micro text-fg/85">{t.path.gpaOverall}</span>
              </p>
            )}
            {cur.extra === "spotfixes" && (
              <button type="button" className="mood-link" onClick={() => openCase("spotfixes")}>
                {t.path.caseLink} <ArrowUpRight aria-hidden size={18} />
              </button>
            )}
          </div>
        </article>
      </div>
    </div>
  );

  return (
    <section
      id="timeline"
      ref={ref}
      data-act="void"
      data-chapter="JOURNEY"
      aria-label={t.path.aria}
      className={cn("relative z-10", pinned ? "journey-timeline" : "overflow-hidden py-24 md:py-32", !pinned && !reduced && "journey-view")}
      style={pinned ? { height: `${n * STEP_VH + 100}svh` } : undefined}
    >
      <ChapterSeam wipe />
      {pinned ? <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">{board}</div> : board}
    </section>
  );
}
