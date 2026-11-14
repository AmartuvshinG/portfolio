"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play, ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { photoSrc, PHOTOS } from "@/lib/pathPhotos";
import { openCase } from "@/lib/caseFile";
import { cn } from "@/lib/utils";
import { education, type TimelineEntry } from "@/lib/content";

/**
 * Map: the journey as a mood board.
 *
 * After the Mood Board carousel reference (docs/reference), built natively
 * rather than through its third-party embed: two endless filmstrips of the ten
 * real photos glide in opposite directions around the chapter's name, each
 * frame tilted and stamped with its year. Pick one and its stop opens below
 * (period, place, what happened). The years along the bottom are a rail into
 * the same stops.
 *
 * The strips are one CSS transform animation each. They pause off screen,
 * while the pointer or focus is inside them, and on the pause button. Under
 * reduced motion they don't move at all: the frames sit in a wrapped grid.
 */

const yearOf = (e: TimelineEntry) => e.start.year;

export function Timeline() {
  const { c, t } = useI18n();
  const reduced = useReducedMotion();
  const entries = c.timeline;
  const [sel, setSel] = useState(entries.length - 1);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [live, setLive] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const half = Math.ceil(entries.length / 2);
  const rows = [entries.slice(0, half).map((e, i) => ({ e, i })), entries.slice(half).map((e, i) => ({ e, i: i + half }))];
  const years = Array.from(new Set(entries.map(yearOf))).sort();
  const cur = entries[sel];
  const running = live && !paused && !held && !reduced;

  return (
    <section
      id="timeline"
      ref={ref}
      data-act="void"
      data-chapter="JOURNEY"
      aria-label={t.path.aria}
      className="relative z-10 overflow-hidden py-24 md:py-32"
    >
      <ChapterSeam wipe />
      <div className="mood" data-run={running ? "true" : "false"} data-still={reduced ? "true" : "false"}>
        <h2 className="mood-title display-caps" aria-label={t.path.title}>
          <span aria-hidden className="mood-title-outline">{t.path.title}</span>
          <span aria-hidden className="mood-title-fill spectrum-text">{t.path.title}</span>
        </h2>
        <p className="mood-span micro">
          {years[0]} — {years[years.length - 1]} · {t.path.places.ub} → {t.path.places.erie}
        </p>

        {rows.map((row, r) => (
          <div key={r} className={cn("mood-row", r === 1 && "mood-row--rev")}>
            {/* Two copies for a seamless loop; the second is decoration only. */}
            {[0, 1].map((copy) => (
              <ul key={copy} className="mood-track" aria-hidden={copy === 1 ? true : undefined}>
                {row.map(({ e, i }) => (
                  <li key={`${copy}-${i}`} className="mood-frame" style={{ "--tilt": `${((i * 37) % 9) - 4}deg` } as React.CSSProperties}>
                    <button
                      type="button"
                      tabIndex={copy === 1 ? -1 : 0}
                      aria-pressed={copy === 0 ? sel === i : undefined}
                      aria-label={copy === 0 ? `${t.path.choose}: ${e.period} · ${e.title}` : undefined}
                      data-sel={sel === i ? "true" : "false"}
                      onClick={() => setSel(i)}
                      onFocus={() => setHeld(true)}
                      onBlur={() => setHeld(false)}
                    >
                      {e.photo ? (
                        <Image
                          src={photoSrc(e.photo, PHOTOS[e.photo].widths[0])}
                          alt=""
                          fill
                          sizes="300px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : null}
                      <span className="mood-year tag">{yearOf(e)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        ))}

        <div className="mood-controls">
          <button type="button" className="mood-pause" onClick={() => setPaused((p) => !p)} aria-label={paused ? t.path.play : t.path.pause} disabled={reduced}>
            {paused ? <Play aria-hidden size={18} /> : <Pause aria-hidden size={18} />}
          </button>
          <ol className="mood-rail" aria-label={t.path.board}>
            {years.map((y) => {
              const first = entries.findIndex((e) => yearOf(e) === y);
              const on = yearOf(cur) === y;
              return (
                <li key={y}>
                  <button type="button" data-on={on ? "true" : "false"} onClick={() => setSel(first)}>
                    {y}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <article className="mood-card" aria-live="polite" key={sel}>
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
        </article>
      </div>
    </section>
  );
}
