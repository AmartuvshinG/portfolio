"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { openCase } from "@/lib/caseFile";
import { PHOTOS, photoSrc } from "@/lib/pathPhotos";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { sectionIndex } from "@/lib/content";
import styles from "./CarouselDraft.module.css";

export function DraftControls() {
  const draft = useLocalDraft();
  const { t } = useI18n();
  if (draft === "off") return null;
  return <nav className={`${styles.draftControls} ${draft === "cinematic" ? "cin-comparison" : ""}`} aria-label={t.draft.label}>
    <span>{t.draft.label}</span>
    {(["cinematic", "off"] as const).map((mode) =>
      <a key={mode} href={`?draft=${mode}`} aria-current={draft === mode ? "page" : undefined}>{t.draft[mode]}</a>)}
  </nav>;
}

/** Adapted from Cue's chained spring arc: local cards, finite spring work,
 * scoped controls, and no global wheel listener or hover-driven state. */
export function ArcWork() {
  const { c, t } = useI18n();
  const [active, setActive] = useState(0);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const project = c.projects[active];
  const count = c.projects.length;

  useEffect(() => {
    const nodes = cards.current;
    const angles = nodes.map((el, i) => Number(el?.dataset.angle ?? (i - active) * 17));
    const velocities = angles.map(() => 0);
    let frame = 0;
    let previous = 0;
    let visible = false;
    const step = (now: number) => {
      // Time-normalized physics preserves the original feel on 60–240 Hz screens.
      const dt = previous ? Math.min(2, (now - previous) / (1000 / 60)) : 1;
      previous = now;
      let settled = true;
      for (let i = count - 1; i >= 0; i--) {
        const target = (i - active) * 17;
        const chained = i === count - 1 ? target : angles[i + 1] - 17;
        velocities[i] = (velocities[i] + (chained - angles[i]) * 0.2 * dt) * Math.pow(0.4, dt);
        angles[i] = reduced ? target : angles[i] + velocities[i] * dt;
        if (Math.abs(target - angles[i]) > 0.03 || Math.abs(velocities[i]) > 0.03) settled = false;
        const el = nodes[i];
        if (el) {
          el.style.transform = `rotate(${angles[i]}deg) translateY(calc(-1 * var(--arc-radius)))`;
          el.dataset.angle = String(angles[i]);
        }
      }
      if (!reduced && !settled && visible) frame = requestAnimationFrame(step);
      else frame = 0;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) { previous = 0; frame = requestAnimationFrame(step); }
      else if (!visible) { cancelAnimationFrame(frame); frame = 0; }
    });
    if (root.current) observer.observe(root.current);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [active, count, reduced]);

  const move = (direction: number) => setActive((index) => Math.max(0, Math.min(count - 1, index + direction)));
  return <div ref={root} className={styles.work} data-reduced={reduced}>
    <div className="mx-auto max-w-[1440px] px-6 md:px-12"><SectionHeader index={sectionIndex("#work")} label={t.work.eyebrow} title={t.work.title} chapter="#work" /></div>
    <div className={styles.arc} role="group" aria-label={t.work.rail}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          const next = Math.max(0, Math.min(count - 1, active + (event.key === "ArrowRight" ? 1 : -1)));
          setActive(next);
          cards.current[next]?.focus({ preventScroll: true });
        }
      }}>
      <div className={styles.arcGuide} aria-hidden />
      <div className={styles.pivot}>
        {c.projects.map((item, i) => <button type="button" key={item.slug}
          ref={(el) => { cards.current[i] = el; }}
          className={styles.arcCard} data-active={i === active}
          aria-label={t.work.preview(item.title)} aria-pressed={i === active}
          tabIndex={reduced || i === active ? 0 : -1}
          onClick={() => i === active ? openCase(item.slug) : setActive(i)}
          style={{ zIndex: count - Math.abs(i - active), transform: `rotate(${(i - active) * 17}deg) translateY(calc(-1 * var(--arc-radius)))` }}>
          <span className={styles.cardTop}><span>{item.index}</span><ArrowUpRight size={20} /></span>
          {item.shot && <Image unoptimized src={item.shot} alt="" width={640} height={400} sizes="(max-width: 600px) 230px, 340px" />}
          <span className={styles.cardBottom}><span className="tag">{item.year}</span><strong>{item.title}</strong><span>{item.category}</span></span>
        </button>)}
      </div>
    </div>
    <div className={styles.workDetail}>
      <div className={styles.workNav}>
        <button type="button" aria-label={t.work.prev} disabled={active === 0} onClick={() => move(-1)}><ArrowLeft /></button>
        <span className="tag">{t.work.count(active + 1, count)}</span>
        <button type="button" aria-label={t.work.next} disabled={active === count - 1} onClick={() => move(1)}><ArrowRight /></button>
      </div>
      <div aria-live="polite" aria-atomic="true"><h3>{project.title}</h3><p>{project.summary}</p></div>
      <button className={styles.caseLink} type="button" onClick={() => openCase(project.slug)}>{t.work.open}<ArrowUpRight size={20} /></button>
    </div>
  </div>;
}

/** Local adaptation of the mood-board strip. The supplied component is an
 * external SR demo embed; real Journey photos keep this draft self-contained. */
export function MoodJourney() {
  const { c, t } = useI18n();
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const entries = c.timeline.filter((entry) => entry.photo);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={root} className={styles.mood} data-still={reduced}>
    <div className={styles.moodHeading}><span className="tag">{t.path.eyebrow}</span><h2>{t.path.title}</h2></div>
    <div className={styles.film} style={{ animationPlayState: visible && !paused && !reduced ? "running" : "paused" }}>
      {[0, 1].map((repeat) => <div className={styles.filmSet} key={repeat} aria-hidden={repeat === 1 ? true : undefined}>
        {entries.map((entry, i) => <figure key={`${entry.title}-${i}`} style={{ "--tilt": `${i % 2 ? 5 : -5}deg` } as CSSProperties}>
          <Image unoptimized src={photoSrc(entry.photo!, PHOTOS[entry.photo!].widths[0])} alt="" width={400} height={480} sizes="(max-width: 600px) 190px, 280px" />
          <figcaption><span>{entry.org}</span><span>{entry.start.year}</span></figcaption>
        </figure>)}
      </div>)}
    </div>
    {!reduced && <button className={styles.pause} type="button" onClick={() => setPaused(!paused)} aria-label={paused ? t.draft.play : t.draft.pause}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>}
  </div>;
}
