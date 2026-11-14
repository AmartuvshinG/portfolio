"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { type Project, sectionIndex } from "@/lib/content";
import { openCase } from "@/lib/caseFile";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { SectionHeader } from "@/components/ui/SectionHeader";

function ProjectPanel({ project }: { project: Project }) {
  const { t } = useI18n();
  return <div className="cin-work-layout cin-project-panel">
    <div className="cin-project-copy"><span className="tag">{project.index} / {project.year} · {project.category}</span>
      <h3>{project.title}</h3><p>{project.summary}</p><p className="cin-project-role">{project.role}</p>
      <button type="button" className="cin-project-link" onClick={() => openCase(project.slug)}>{t.work.open}<ArrowUpRight size={20} /></button>
    </div>
    <button type="button" className="cin-project-screen" onClick={() => openCase(project.slug)} aria-label={t.work.preview(project.title)}>
      {project.shot && <Image unoptimized src={project.shot} alt="" width={1200} height={750} sizes="(max-width:1023px) 90vw, 55vw" />}
      <span className="cin-project-open"><span>{project.category}</span><ArrowUpRight size={22} /></span>
    </button>
  </div>;
}

export function CinematicWork() {
  const { c, t } = useI18n();
  const reduced = useReducedMotion();
  const roomy = useMediaQuery("(min-width:1100px) and (min-height:820px)");
  const pinned = roomy && !reduced;
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollTo } = useSmoothScroll();
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end end"] });
  const count = c.projects.length;
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (pinned) setActive(Math.max(0, Math.min(count - 1, Math.round(progress * (count - 1)))));
  });
  const go = useCallback((index: number) => {
    const target = Math.max(0, Math.min(count - 1, index));
    const element = root.current;
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY;
    scrollTo(top + (element.offsetHeight - window.innerHeight) * target / Math.max(1, count - 1));
  }, [count, scrollTo]);
  return <div ref={root} className="cin-work" data-pinned={pinned} style={pinned ? { height: `${100 + (count - 1) * 90}svh` } : undefined}>
    <div className="cin-work-frame">
      <SectionHeader index={sectionIndex("#work")} label={t.work.eyebrow} title={t.work.title} chapter="#work" />
      {pinned ? <>
        <div className="cin-project-stage" role="group" aria-label={t.work.rail} onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); go(active + (event.key === "ArrowRight" ? 1 : -1)); }
        }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={c.projects[active].slug} initial={{ x: 45, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -25, opacity: 0 }} transition={{ duration: .32, ease: [.22,1,.36,1] }}>
              <ProjectPanel project={c.projects[active]} />
            </motion.div>
          </AnimatePresence>
          <div className="cin-project-controls">
            <div className="cin-project-arrows"><button type="button" aria-label={t.work.prev} disabled={active === 0} onClick={() => go(active - 1)}><ArrowLeft size={20} /></button><span className="tag" aria-live="polite">{t.work.count(active + 1, count)}</span><button type="button" aria-label={t.work.next} disabled={active === count - 1} onClick={() => go(active + 1)}><ArrowRight size={20} /></button></div>
            <div className="cin-project-fan">{c.projects.map((project, i) => <button key={project.slug} type="button" aria-label={t.draft.select(project.title)} aria-pressed={active === i} onClick={() => active === i ? openCase(project.slug) : go(i)} style={{ "--i": i } as React.CSSProperties}>
              {project.shot && <Image unoptimized src={project.shot} alt="" width={150} height={94} />}
            </button>)}</div>
          </div>
        </div>
      </> : <div className="cin-work-stack">{c.projects.map((project) => <ProjectPanel key={project.slug} project={project} />)}</div>}
    </div>
  </div>;
}
