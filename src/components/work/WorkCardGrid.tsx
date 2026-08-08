"use client";

import { useState } from "react";
import { projects, type Project } from "@/lib/content";
import { ShotImage } from "@/components/work/ShotImage";
import { ProjectDossier, type DossierOrigin } from "@/components/work/ProjectDossier";
import { GlareCard } from "@/components/motion/GlareCard";

/**
 * The work world's fallback, and a real layout in its own right — this is what
 * reduced-motion users, phones, and anyone without WebGL actually browse.
 *
 * It is not a degraded placeholder: same cards, same dossier, same notch
 * silhouette as the rest of the site. The 3D world adds camera movement to
 * this; it does not add content, which is the test a fallback has to pass.
 */
export function WorkCardGrid() {
  const [origin, setOrigin] = useState<DossierOrigin | null>(null);

  const open = (project: Project) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Middle-click, ctrl/cmd-click and the like must still navigate to the
    // real route — the quick-look is an enhancement over the link, not a
    // replacement for it.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    setOrigin({
      project,
      rect: e.currentTarget.getBoundingClientRect(),
    });
  };

  return (
    <>
      <div className="mx-auto grid max-w-[1800px] gap-4 px-5 md:grid-cols-2 md:px-8">
        {projects.map((project) => (
          <GlareCard
            key={project.slug}
            as="link"
            href={`/work/${project.slug}`}
            onClick={open(project)}
            tilt={7}
            className="notch-card block bg-surface ring-1 ring-inset ring-line"
          >
            <div
              className="relative aspect-[8/5] w-full overflow-hidden"
              /* Unique per slug: two elements sharing a
                 view-transition-name in one document makes the whole
                 transition abort. */
              style={{ viewTransitionName: `vt-shot-${project.slug}` }}
            >
              <ShotImage
                project={project}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent opacity-80" />
            </div>

            <div className="flex items-end justify-between gap-4 p-5">
              <div>
                <span className="micro tabular">
                  {project.index} — {project.category}
                </span>
                <h3
                  className="mt-2 font-tech text-2xl font-bold uppercase leading-none text-fg md:text-3xl"
                  style={{ viewTransitionName: `vt-title-${project.slug}` }}
                >
                  {project.title}
                </h3>
              </div>
              <span className="micro tabular shrink-0">{project.year}</span>
            </div>
          </GlareCard>
        ))}
      </div>

      <ProjectDossier origin={origin} onClose={() => setOrigin(null)} />
    </>
  );
}
