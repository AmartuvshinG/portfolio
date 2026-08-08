"use client";

import Image from "next/image";
import { useState } from "react";
import type { Project } from "@/lib/content";
import { ProjectVisual } from "@/components/work/ProjectVisual";

/**
 * A project's screenshot, with its generated visual permanently underneath.
 *
 * The screenshots in `public/work/` are supplied by the site owner and may
 * simply not exist yet. Rendering the `<Image>` unconditionally leaves a broken
 * frame on top of the fallback (and next/image answers a missing local file
 * with a 500, not a 404), so the image removes itself on error and reveals the
 * generated panel instead — same box, same aspect, no layout shift.
 *
 * Deliberately *not* solved by checking for the file at build time: the whole
 * point is that dropping a file into `public/work/` is the only step needed.
 */
export function ShotImage({
  project,
  sizes,
  className,
}: {
  project: Project;
  sizes: string;
  className?: string;
}) {
  const [missing, setMissing] = useState(false);

  return (
    <>
      <ProjectVisual
        index={project.index}
        title={project.title}
        category={project.category}
        accent={project.accent}
      />
      {!missing && (
        <Image
          src={project.shot}
          alt=""
          fill
          sizes={sizes}
          className={className}
          onError={() => setMissing(true)}
        />
      )}
    </>
  );
}
