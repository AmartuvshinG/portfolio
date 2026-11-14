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
import { ScriptLabel } from "@/components/ui/ScriptLabel";
import { openCase } from "@/lib/caseFile";
import { sectionIndex, type Project } from "@/lib/content";
import { cn } from "@/lib/utils";
import { PIN_QUERY } from "@/lib/viewport";

/**
 * Projects: the reel.
 *
 * Every project is one full frame, the whole screenshot uncropped, with its
 * other shots in a strip beneath it. On a wide screen the chapter pins and
 * the vertical scroll runs the reel sideways: the frame in the gate is lit
 * and full size, the ones either side recede into the dark, and its title
 * card comes in as a stage of the hero's menu.
 *
 * **Scroll drives it, never the pointer** (AGENTS.md). With scroll timelines
 * the reel's travel is CSS on the compositor (`.reel-track`, ride.css); framer
 * is the fallback. React only re-renders when the frame in the gate changes.
 * Clicking a frame in the gate opens its case file; clicking one beside it
 * scrolls the reel there.
 *
 * Phones and reduced motion: a native swipe row with snap, no pin.
 */

/** Scroll per project while pinned, in viewport heights. */
const STEP_VH = 90;

export function SelectedWork() {
  const { c, t } = useI18n();
  const reduced = useReducedMotion();
  const wide = useMediaQuery(PIN_QUERY);
  const pinned = wide && !reduced;
  const css = useScrollTimelines();
  const projects = c.projects;
  const n = projects.length;
  const { scrollTo } = useSmoothScroll();

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const [front, setFront] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!pinned) return;
    const k = Math.round(Math.min(1, Math.max(0, p)) * (n - 1));
    setFront((f) => (f === k ? f : k));
  });
  /* Fallback travel: the same maths as the CSS keyframes. */
  const x = useTransform(scrollYProgress, (p) => `calc(${-Math.min(1, Math.max(0, p)) * (n - 1)} * (var(--fw) + var(--fg)))`);
  const bar = useTransform(scrollYProgress, (p) => Math.min(1, Math.max(0, p)));

  const goFrame = (i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    scrollTo(top + (i / Math.max(1, n - 1)) * travel);
  };

  return (
    <section
      id="work"
      ref={sectionRef}
      data-act="void"
      data-chapter="WORK"
      aria-label={t.work.aria}
      className={cn("relative z-10", pinned && "reel-timeline")}
      style={pinned ? { height: `${(n - 1) * STEP_VH + 100}svh` } : undefined}
    >
      <ChapterSeam />
      <div
        className={cn("reel", pinned ? "reel--pinned sticky top-0 h-[100svh] overflow-clip" : "reel--flow py-24")}
        style={{ "--n": n } as React.CSSProperties}
        onKeyDown={(e) => {
          if (!pinned) return;
          if (e.key === "ArrowRight" && front < n - 1) {
            e.preventDefault();
            goFrame(front + 1);
          } else if (e.key === "ArrowLeft" && front > 0) {
            e.preventDefault();
            goFrame(front - 1);
          }
        }}
      >
        <header className="reel-head">
          <div className="relative">
            <ScriptLabel href="#work" />
            <span className="micro kicker-plate">
              {sectionIndex("#work")} — {t.work.eyebrow}
            </span>
          </div>
          {pinned && (
            <div className="reel-meter" aria-hidden>
              <span className="tag tabular text-fg">{t.work.count(front + 1, n)}</span>
              <span className="reel-meter-track">
                {css ? <span className="reel-meter-fill reel-meter-fill--css" /> : <motion.span className="reel-meter-fill" style={{ scaleX: bar }} />}
              </span>
              <span className="micro hidden text-fg/85 lg:inline">{t.work.hint}</span>
            </div>
          )}
        </header>

        <div className={cn("reel-gate", !pinned && "reel-gate--swipe")}>
          {pinned && !css ? (
            <motion.ol className="reel-track" style={{ x }}>
              <Frames projects={projects} front={front} pinned={pinned} onPick={goFrame} />
            </motion.ol>
          ) : (
            <ol className={cn("reel-track", pinned && "reel-track--css")}>
              <Frames projects={projects} front={front} pinned={pinned} onPick={goFrame} />
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

function Frames({
  projects,
  front,
  pinned,
  onPick,
}: {
  projects: Project[];
  front: number;
  pinned: boolean;
  onPick: (i: number) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      {projects.map((p, i) => {
        const on = !pinned || i === front;
        const shots = (p.gallery ?? []).slice(0, 3);
        return (
          <li key={p.slug} className="reel-frame" data-on={on ? "true" : "false"} data-side={i < front ? "l" : i > front ? "r" : "c"}>
            <button
              type="button"
              className="reel-shot"
              tabIndex={on ? 0 : -1}
              aria-label={on ? t.work.preview(p.title) : `${p.title} · ${t.work.count(i + 1, projects.length)}`}
              onClick={() => (on ? openCase(p.slug) : onPick(i))}
            >
              {p.shot ? (
                <Image src={p.shot} alt="" fill sizes="(max-width: 768px) 88vw, 70vw" className="object-cover object-top" />
              ) : null}
              <span aria-hidden className="reel-shot-glow" />
              <span aria-hidden className="reel-corners" />
            </button>

            {/* The title card: one lit stage of the hero's menu. */}
            <div className="reel-card">
              <span className="ms-item reel-stage" data-lit={on ? "true" : "false"}>
                <span className="ms-code tag">{p.index}</span>
                <span className="ms-label">{p.title}</span>
              </span>
              <span className="micro mt-3 block text-fg/85">
                {p.category} · {p.year}
              </span>
              <p className="reel-summary text-sm leading-relaxed text-fg/85 md:text-base">{p.summary}</p>
              <button type="button" className="reel-open tag" tabIndex={on ? 0 : -1} onClick={() => openCase(p.slug)}>
                {t.work.open} <ArrowUpRight aria-hidden size={16} />
              </button>
            </div>

            {shots.length > 0 && (
              <ul className="reel-strip" aria-hidden>
                {shots.map((g, k) => (
                  <li key={g.src} style={{ "--k": k } as React.CSSProperties}>
                    <Image src={g.src} alt="" fill sizes="220px" className="object-cover object-top" />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </>
  );
}
