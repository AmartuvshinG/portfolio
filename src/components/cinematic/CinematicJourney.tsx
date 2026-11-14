"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { sectionIndex } from "@/lib/content";
import { PHOTOS, photoSrc } from "@/lib/pathPhotos";
import { PLACES } from "@/lib/routeGeo";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useScrollTimelines } from "@/hooks/useScrollTimelines";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function CinematicJourney() {
  const { c, t } = useI18n();
  const reduced = useReducedMotion();
  const roomy = useMediaQuery("(min-width:1100px) and (min-height:900px)");
  const pinned = roomy && !reduced;
  const native = useScrollTimelines() && pinned;
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const [travel, setTravel] = useState(0);
  const [position, setPosition] = useState(0);
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end end"] });
  const journeyProgress = useTransform(scrollYProgress, [0, .04, .96, 1], [0, 0, 1, 1]);
  useMotionValueEvent(journeyProgress, "change", (progress) => {
    if (pinned) setPosition(Math.round(progress * Math.max(0, c.timeline.length - 1)));
  });
  const x = useTransform(journeyProgress, [0, 1], [0, -travel]);
  const { scrollTo } = useSmoothScroll();
  const step = (direction: number) => {
    const element = root.current;
    if (!element || !pinned) return;
    const index = Math.round(journeyProgress.get() * (c.timeline.length - 1));
    const next = Math.max(0, Math.min(c.timeline.length - 1, index + direction));
    const progress = next === 0 ? 0 : next === c.timeline.length - 1 ? 1 : .04 + .92 * next / Math.max(1, c.timeline.length - 1);
    scrollTo(element.getBoundingClientRect().top + window.scrollY + (element.offsetHeight - window.innerHeight) * progress);
  };
  useEffect(() => {
    const measure = () => {
      const el = track.current;
      if (!el || !pinned) { setTravel(0); return; }
      const last = el.lastElementChild as HTMLElement | null;
      setTravel(last ? Math.max(0, last.offsetLeft + last.offsetWidth + window.innerWidth * .05 - window.innerWidth) : 0);
    };
    const observer = new ResizeObserver(measure);
    if (track.current) observer.observe(track.current);
    window.addEventListener("resize", measure);
    measure();
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [pinned]);
  const points = [PLACES.ub, PLACES.erie].map((place) => ({ x: ((place.lon + 180) / 360) * 180 + 10, y: ((90 - place.lat) / 180) * 60 + 4 }));
  return <div ref={root} className="cin-journey" data-pinned={pinned} style={pinned ? { height: `${100 + Math.max(0, c.timeline.length - 1) * 32}svh` } : undefined}>
    <div className="cin-journey-frame" role="group" aria-label={t.path.board} onKeyDown={(event) => {
      if (pinned && (event.key === "ArrowLeft" || event.key === "ArrowRight")) { event.preventDefault(); event.stopPropagation(); step(event.key === "ArrowRight" ? 1 : -1); }
    }}>
      <div className="cin-journey-header"><SectionHeader index={sectionIndex("#timeline")} label={t.path.eyebrow} title={t.path.title} chapter="#timeline" />
        <div className="cin-route" aria-hidden><svg viewBox="0 0 200 60"><path d={`M${points[0].x} ${points[0].y} Q100 -8 ${points[1].x} ${points[1].y}`} fill="none" stroke="currentColor" strokeWidth="1" />{points.map((point, i) => <circle key={i} cx={point.x} cy={point.y} r="3" fill="currentColor" />)}</svg><div className="cin-route-labels"><span>{t.path.places.ub}</span><span>{t.path.places.erie}</span></div></div>
      </div>
      <motion.ol ref={track} className="cin-photo-track" data-native={native} style={native ? { "--travel": `${-travel}px` } as React.CSSProperties : pinned ? { x } : undefined}>
        {c.timeline.map((entry, index) => <li key={`${entry.title}-${index}`} className="cin-photo-entry">
          {entry.photo && <span className="cin-photo-image"><Image unoptimized src={photoSrc(entry.photo, PHOTOS[entry.photo].widths[0])} alt="" width={640} height={420} sizes="(max-width:767px) 90vw, 400px" /></span>}
          <time>{entry.period}</time><h3>{entry.title}</h3><div className="cin-photo-org">{entry.org}</div><p>{entry.description}</p>
        </li>)}
      </motion.ol>
      {pinned && <div className="cin-journey-position"><div className="cin-project-arrows"><button type="button" aria-label={t.draft.previousStop} disabled={position === 0} onClick={() => step(-1)}><ArrowLeft size={20} /></button><button type="button" aria-label={t.draft.nextStop} disabled={position === c.timeline.length - 1} onClick={() => step(1)}><ArrowRight size={20} /></button></div><span className="tag" aria-live="polite">{t.work.count(position + 1, c.timeline.length)}</span><span className="tag cin-journey-hint">{t.path.hint}</span><span><motion.i style={{ scaleX: journeyProgress }} /></span></div>}
    </div>
  </div>;
}
