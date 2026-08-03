"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { Maximize2 } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { projects, type Project } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ProjectVisual } from "./ProjectVisual";
import { ProjectDossier, type DossierOrigin } from "./ProjectDossier";
import { cn } from "@/lib/utils";

/**
 * Horizontal, scroll-driven project rail. The section pins and the track
 * translates left as the user scrolls (GSAP). Reduced-motion users get a
 * native horizontal scroll container with snap points instead.
 *
 * Each card stays a real `<Link>` to its case-file route — crawlable, works
 * without JS, and middle/modifier clicks navigate as expected. A plain left
 * click is intercepted and expands the dossier instead, so browsing the
 * archive never costs you your scroll position.
 */
export function WorkRail() {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<DossierOrigin | null>(null);

  const openDossier = (
    e: React.MouseEvent<HTMLAnchorElement>,
    project: Project
  ) => {
    // Let the browser handle "open in new tab/window" and non-primary buttons.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const visual = e.currentTarget.querySelector("[data-card-visual]");
    if (!visual) return;
    e.preventDefault();
    setOrigin({ project, rect: visual.getBoundingClientRect() });
  };

  useGSAP(
    () => {
      if (reduced || !root.current || !track.current) return;
      const el = track.current;
      const getAmount = () => el.scrollWidth - window.innerWidth;

      gsap.to(el, {
        x: () => -getAmount(),
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => "+=" + getAmount(),
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      // useGSAP's scoped context reverts this tween + its ScrollTrigger on cleanup.
    },
    { scope: root, dependencies: [reduced] }
  );

  return (
    <div ref={root} className="relative overflow-hidden">
      <div className="flex min-h-dvh flex-col justify-center py-16">
        <div className="mb-8 flex items-center justify-between px-5 md:px-8">
          <span className="hud-label text-cyan/70">ARCHIVE // ALL SYSTEMS</span>
          <span className="hud-label hidden items-center gap-2 md:flex">
            {reduced ? "SWIPE" : "SCROLL"} TO NAVIGATE →
          </span>
        </div>

        <div
          ref={track}
          className={cn(
            "flex gap-6 px-5 md:px-8",
            reduced && "snap-x snap-mandatory overflow-x-auto pb-4"
          )}
          style={{ willChange: "transform" }}
        >
          {projects.map((project) => (
            <Link
              key={project.slug}
              href={`/work/${project.slug}`}
              onClick={(e) => openDossier(e, project)}
              className="group relative flex w-[82vw] shrink-0 snap-start flex-col sm:w-[62vw] lg:w-[44vw]"
            >
              <div
                data-card-visual
                className="relative aspect-[16/11] w-full overflow-hidden border border-line transition-colors duration-300 group-hover:border-line-strong"
              >
                <ProjectVisual
                  index={project.index}
                  title={project.title}
                  category={project.category}
                  accent={project.accent}
                />
                {/* Hover scan sweep */}
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(115deg,transparent,rgba(0,229,255,0.12),transparent)] transition-transform duration-700 ease-out group-hover:translate-x-full" />
                {/* Quick-look affordance */}
                <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-2 border border-cyan/40 bg-bg/70 px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-cyan opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Maximize2 size={11} />
                  Quick look
                </span>
              </div>

              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-2xl font-bold uppercase text-fg transition-colors group-hover:text-cyan">
                    {project.title}
                  </h3>
                  <p className="mt-1 max-w-md text-sm text-muted">
                    {project.summary}
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-line text-muted transition-colors group-hover:border-cyan group-hover:text-cyan">
                  <Maximize2 size={16} />
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3 font-mono text-[0.65rem] uppercase tracking-widest text-faint">
                <span style={{ color: "var(--color-cyan)" }}>{project.index}</span>
                <span className="h-px flex-1 bg-line" />
                <span>{project.role}</span>
              </div>
            </Link>
          ))}

          {/* Tail card: view archive */}
          <div className="flex w-[60vw] shrink-0 snap-start items-center justify-center sm:w-[40vw] lg:w-[24vw]">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="font-display text-6xl font-black text-faint">
                {String(projects.length).padStart(2, "0")}
              </span>
              <span className="hud-label">END OF ARCHIVE</span>
            </div>
          </div>
        </div>
      </div>

      <ProjectDossier origin={origin} onClose={() => setOrigin(null)} />
    </div>
  );
}
