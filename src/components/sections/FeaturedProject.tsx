"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { ArrowUpRight } from "lucide-react";
import { gsap } from "@/lib/gsap";
import type { Project } from "@/lib/content";
import { accentColor } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ProjectVisual } from "./ProjectVisual";

const STAGES = [
  { code: "01", name: "SILHOUETTE", note: "Signal detected. Structure obscured." },
  { code: "02", name: "POWER ON", note: "Core energised. Surface illuminated." },
  { code: "03", name: "BLUEPRINT", note: "Engineering schematic overlay engaged." },
  { code: "04", name: "ARCHITECTURE", note: "Internal systems and stack revealed." },
  { code: "05", name: "DEPLOYED", note: "Full system online. Ready for review." },
];

/**
 * The centrepiece: a featured project that "boots up" through five staged
 * states as the user scrolls. The stage container is pinned and a GSAP
 * timeline is scrubbed by scroll. Reduced-motion users get the final,
 * fully-revealed state with no pinning.
 */
export function FeaturedProject({ project }: { project: Project }) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(reduced ? 4 : 0);
  const color = accentColor[project.accent];

  useGSAP(
    () => {
      if (reduced || !root.current) return;
      const q = gsap.utils.selector(root);
      const dark = q(".stage-dark");
      const blueprint = q(".stage-blueprint");
      const annotations = q(".stage-annotation");
      const finalPanel = q(".stage-final");

      gsap.set(annotations, { opacity: 0, y: 20 });
      gsap.set(finalPanel, { opacity: 0, y: 30 });
      gsap.set(blueprint, { opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=3200",
          scrub: 1,
          pin: q(".stage-pin")[0],
          anticipatePin: 1,
          onUpdate: (self) =>
            setStage(Math.min(4, Math.floor(self.progress * 5))),
        },
      });

      tl.to(dark, { opacity: 0.12, duration: 1 })
        .to(blueprint, { opacity: 0.85, duration: 1 }, ">")
        .to(blueprint, { opacity: 0.18, duration: 1 }, ">")
        .to(annotations, { opacity: 1, y: 0, stagger: 0.15, duration: 1 }, "<")
        .to(finalPanel, { opacity: 1, y: 0, duration: 1 }, ">");
    },
    { scope: root, dependencies: [reduced] }
  );

  return (
    <div ref={root} className="relative">
      {/* Pinned stage */}
      <div className="stage-pin relative flex min-h-dvh items-center overflow-hidden py-20">
        <div className="mx-auto grid w-full max-w-[1600px] gap-10 px-5 md:grid-cols-12 md:px-8">
          {/* Left: stage HUD */}
          <div className="flex flex-col justify-center md:col-span-4">
            <span className="hud-label mb-4" style={{ color }}>
              FEATURED // BOOT SEQUENCE
            </span>
            <h3 className="font-display text-5xl font-black uppercase text-fg md:text-6xl">
              {project.title}
            </h3>
            <p className="mt-3 font-mono text-xs uppercase tracking-widest text-muted">
              {project.category} — {project.year}
            </p>

            {/* Stage indicator */}
            <div className="mt-8 border-t border-line pt-6">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm tabular" style={{ color }}>
                  {STAGES[stage].code}
                </span>
                <span className="font-display text-xl uppercase text-fg">
                  {STAGES[stage].name}
                </span>
              </div>
              <p className="mt-2 min-h-[2.5rem] text-sm text-muted">
                {STAGES[stage].note}
              </p>

              {/* Stage progress ticks */}
              <div className="mt-4 flex gap-1.5">
                {STAGES.map((s, i) => (
                  <span
                    key={s.code}
                    className="h-1 flex-1 transition-colors duration-300"
                    style={{
                      background: i <= stage ? color : "var(--color-surface-2)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: visual stage */}
          <div className="relative md:col-span-8">
            <div className="relative aspect-[16/10] w-full overflow-hidden border border-line">
              <ProjectVisual
                index={project.index}
                title={project.title}
                category={project.category}
                accent={project.accent}
              />

              {/* Silhouette darkening */}
              <div
                className="stage-dark pointer-events-none absolute inset-0 bg-bg"
                style={{ opacity: reduced ? 0.12 : 0.92 }}
              />

              {/* Blueprint overlay */}
              <div
                className="stage-blueprint pointer-events-none absolute inset-0"
                style={{ opacity: reduced ? 0.18 : 0 }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(0,229,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.5) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                    mixBlendMode: "screen",
                  }}
                />
                <span className="hud-label absolute left-4 top-4 text-cyan">
                  BLUEPRINT MODE
                </span>
              </div>

              {/* Architecture annotations */}
              <div className="pointer-events-none absolute inset-0 p-6">
                <div className="flex h-full flex-col justify-end gap-2">
                  {project.stack.map((tech) => (
                    <span
                      key={tech}
                      className="stage-annotation w-fit border border-line bg-bg/70 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-cyan backdrop-blur"
                      style={reduced ? { opacity: 1 } : undefined}
                    >
                      + {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Final panel: metrics + CTA */}
            <div
              className="stage-final mt-4 flex flex-wrap items-center justify-between gap-6 border border-line bg-surface/40 p-5"
              style={reduced ? { opacity: 1, transform: "none" } : undefined}
            >
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {project.metrics.map((m) => (
                  <div key={m.label} className="flex flex-col">
                    <span className="hud-label">{m.label}</span>
                    <span
                      className="font-display text-2xl font-bold tabular"
                      style={{ color }}
                    >
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href={`/work/${project.slug}`}
                className="group inline-flex items-center gap-2 border border-line-strong px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-fg transition-colors hover:bg-cyan hover:text-bg"
              >
                Open Case File
                <ArrowUpRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
