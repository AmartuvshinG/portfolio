"use client";

import { motion } from "framer-motion";
import { projects, gallery } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { ProjectVisual } from "@/components/work/ProjectVisual";
import { cn } from "@/lib/utils";

/**
 * The lab — a 3D marquee of process work.
 *
 * A grid rotated onto an isometric plane, its columns drifting in opposite
 * directions forever. It is the third distinct way this page shows work (after
 * the dolly through the work world and the flight of the zoom), and the
 * difference matters: this one is peripheral, ambient, never asks to be read.
 * It fills the stretch between the work world and the archive with something
 * moving rather than with more headings.
 *
 * The rotation lives on one wrapper rather than on each tile, so the entire
 * plane is a single composited layer — rotating 24 tiles individually is 24
 * transform hierarchies the compositor has to keep in step.
 */

/** The isometric plane. Tuned so the grid runs off all four corners. */
const PLANE = "rotateX(52deg) rotateY(0deg) rotateZ(-42deg)";

const COLUMNS = 4;

export function Lab() {
  const reduced = useReducedMotion();

  /* Four tiles per column, drawn from the real project and gallery data so the
     plane is showing actual work rather than placeholder rectangles. Four and
     not six: the plane is scaled to 0.78 and rotated 52° away, so the outer
     tiles of a six-row column are off the vignette entirely — they cost a
     composited layer each and were never visible. */
  const tiles = Array.from({ length: COLUMNS * 4 }, (_, i) => i);
  const chunks = Array.from({ length: COLUMNS }, (_, c) =>
    tiles.slice(c * 4, c * 4 + 4)
  );

  return (
    <section
      id="lab"
      data-act="deck"
      data-chapter="LAB"
      className="relative overflow-hidden py-24 md:py-32"
      aria-label="Lab"
    >
      <ChapterSeam />

      <div className="relative z-10 mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <span className="micro tabular">05</span>
              <span className="h-px w-10 bg-current opacity-25" />
              <span className="micro">Process, in the open</span>
            </div>
            <h2
              className="display-caps text-fg"
              style={{ fontSize: "clamp(1.6rem, 4.4vw, 4.25rem)" }}
            >
              Lab
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Shader studies, interface experiments and the frames that never
            made it into a case file.
          </p>
        </div>
      </div>

      {/* The plane. `perspective` on the outer element and the rotation on the
          inner one — putting both on the same element flattens it, because the
          perspective is then applied *after* the rotation. */}
      <div
        aria-hidden={reduced}
        className="relative mt-16 h-[62vh] overflow-hidden md:h-[78vh]"
        style={{ perspective: "1400px" }}
      >
        <div className="flex size-full items-center justify-center">
          <div className="w-[1720px] shrink-0 scale-[0.45] sm:scale-[0.6] lg:scale-[0.78]">
            <div
              className="grid origin-center grid-cols-4 gap-8"
              /* No `preserve-3d`. Only this wrapper is rotated and every tile
                 below it is flat, so preserving 3D just gave each of the
                 sixteen tiles its own 3D rendering context for nothing. */
              style={{ transform: PLANE }}
            >
              {chunks.map((chunk, col) => (
                <motion.div
                  key={col}
                  /* Alternating direction and period. Matched periods would let
                     the columns lock into step and the plane would read as one
                     block sliding rather than as depth. */
                  animate={reduced ? undefined : { y: col % 2 === 0 ? 110 : -110 }}
                  transition={{
                    duration: col % 2 === 0 ? 11 : 16,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                  }}
                  className="flex flex-col items-start gap-8"
                >
                  {chunk.map((i) => (
                    <Tile key={i} index={i} />
                  ))}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Vignette. The plane runs to the edges of its container and would
            otherwise terminate on a hard rectangle at every side. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(75% 65% at 50% 50%, transparent 35%, var(--color-void) 100%)",
          }}
        />
      </div>
    </section>
  );
}

function Tile({ index }: { index: number }) {
  const project = projects[index % projects.length];
  const shot = gallery[index % gallery.length];

  return (
    <div
      className={cn(
        "group notch-card-sm relative aspect-[97/70] w-full overflow-hidden",
        "ring-1 ring-inset ring-line transition-shadow duration-300"
      )}
    >
      <ProjectVisual
        index={project.index}
        title={project.title}
        category={shot.caption ?? project.category}
        accent={project.accent}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(236,238,251,0.4) 0 1px, transparent 1px 5px)",
        }}
      />
    </div>
  );
}
