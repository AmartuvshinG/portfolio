"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { projects, gallery, type Project } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePointerDrift } from "@/hooks/usePointerDrift";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { ProjectVisual } from "@/components/work/ProjectVisual";
import { ProjectDossier, type DossierOrigin } from "@/components/work/ProjectDossier";
import { cn } from "@/lib/utils";

/**
 * The lab — a 3D marquee of process work, and now something you can reach into.
 *
 * A grid rotated onto an isometric plane, its columns drifting in opposite
 * directions. It used to be pure decoration: `aria-hidden`, a `group` class that
 * nothing responded to, and sixteen tiles that could be hovered to no effect.
 * That is a lot of screen for a screensaver, so the plane is now the third way
 * into the work — hover lifts a tile out of the isometric and turns it to face
 * you, and clicking one opens the same dossier the work grid uses.
 *
 * The rotation still lives on one wrapper rather than on each tile, so the
 * entire plane is a single composited layer.
 *
 * **The un-skew is the trick worth understanding.** A hovered tile applies the
 * exact inverse of `PLANE` as its own transform. Composed under the parent's
 * rotation that lands on identity, so the tile turns to face the camera — with
 * no `transform-style: preserve-3d` anywhere, which is what would otherwise give
 * each of sixteen tiles its own 3D rendering context. Keep `INVERSE` in step
 * with `PLANE` or a hovered tile will turn to face somewhere else.
 */

/** The isometric plane. Tuned so the grid runs off all four corners. */
const PLANE = "rotateX(52deg) rotateY(0deg) rotateZ(-42deg)";
/** Exactly the inverse, applied in reverse order. */
const INVERSE = "rotateZ(42deg) rotateY(0deg) rotateX(-52deg)";

const COLUMNS = 4;

export function Lab() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const drift = usePointerDrift(18);
  const [origin, setOrigin] = useState<DossierOrigin | null>(null);
  const [held, setHeld] = useState(false);
  const [onScreen, setOnScreen] = useState(false);

  /* Four tiles per column, drawn from the real project and gallery data so the
     plane is showing actual work rather than placeholder rectangles. Four and
     not six: the plane is scaled to 0.78 and rotated 52° away, so the outer
     tiles of a six-row column are off the vignette entirely — they cost a
     composited layer each and were never visible. */
  const tiles = Array.from({ length: COLUMNS * 4 }, (_, i) => i);
  const chunks = Array.from({ length: COLUMNS }, (_, c) =>
    tiles.slice(c * 4, c * 4 + 4)
  );

  /* The drift only ticks while the plane is on screen — four infinite column
     animations running behind three other sections is four layers the
     compositor keeps in step for nobody. */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const moving = !reduced && onScreen && !held;

  return (
    <section
      ref={sectionRef}
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
            made it into a case file. Reach in and take one.
          </p>
        </div>
      </div>

      {/* The plane. `perspective` on the outer element and the rotation on the
          inner one — putting both on the same element flattens it, because the
          perspective is then applied *after* the rotation. */}
      <div
        className="relative mt-16 h-[62vh] overflow-hidden md:h-[78vh]"
        style={{ perspective: "1400px" }}
        onPointerEnter={() => setHeld(true)}
        onPointerLeave={() => setHeld(false)}
      >
        <div ref={drift} className="flex size-full items-center justify-center">
          <div className="w-[1720px] shrink-0 scale-[0.45] sm:scale-[0.6] lg:scale-[0.78]">
            <div
              className="grid origin-center grid-cols-4 gap-8"
              /* No `preserve-3d`. Only this wrapper is rotated and every tile
                 below it is flat, so preserving 3D just gave each of the
                 sixteen tiles its own 3D rendering context for nothing — and
                 the un-skew below composes correctly without it. */
              style={{ transform: PLANE }}
            >
              {chunks.map((chunk, col) => (
                <motion.div
                  key={col}
                  /* Alternating direction and period. Matched periods would let
                     the columns lock into step and the plane would read as one
                     block sliding rather than as depth.

                     Paused while the pointer is over the plane: a tile you are
                     trying to click should not be sliding out from under the
                     cursor. */
                  animate={moving ? { y: col % 2 === 0 ? 110 : -110 } : { y: 0 }}
                  transition={
                    moving
                      ? {
                          duration: col % 2 === 0 ? 11 : 16,
                          repeat: Infinity,
                          repeatType: "reverse",
                          ease: "easeInOut",
                        }
                      : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
                  }
                  className="flex flex-col items-start gap-8"
                >
                  {chunk.map((i) => (
                    <Tile
                      key={i}
                      index={i}
                      reduced={reduced}
                      onOpen={(project, rect) => setOrigin({ project, rect })}
                    />
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

      <ProjectDossier origin={origin} onClose={() => setOrigin(null)} />
    </section>
  );
}

function Tile({
  index,
  reduced,
  onOpen,
}: {
  index: number;
  reduced: boolean;
  onOpen: (project: Project, rect: DOMRect) => void;
}) {
  const project = projects[index % projects.length];
  const shot = gallery[index % gallery.length];

  return (
    <button
      type="button"
      onClick={(e) => onOpen(project, e.currentTarget.getBoundingClientRect())}
      aria-label={`${project.title} — open case file`}
      className={cn(
        "group notch-card-sm relative aspect-[97/70] w-full overflow-hidden",
        "ring-1 ring-inset ring-line transition-[transform,box-shadow] duration-500",
        !reduced && "hover:z-10 hover:shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
      )}
      /* Hover applies the inverse of the plane, so the tile lands facing the
         camera. `!reduced` guards it because a tile snapping out of the
         isometric is exactly the kind of motion the preference asks to stop. */
      style={
        reduced
          ? undefined
          : ({ "--lab-face": `${INVERSE} scale(1.12)` } as React.CSSProperties)
      }
    >
      <span className="lab-face block h-full w-full">
        <ProjectVisual
          index={project.index}
          title={project.title}
          category={shot.caption ?? project.category}
          accent={project.accent}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(236,238,251,0.4) 0 1px, transparent 1px 5px)",
          }}
        />
        {/* The caption only resolves once the tile is facing you — on the
            isometric it would be unreadable and just add noise. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{
            background:
              "linear-gradient(0deg, color-mix(in srgb, var(--color-void) 88%, transparent), transparent 70%)",
          }}
        >
          <span className="micro !text-fg">{project.title}</span>
          <span className="micro tabular">{project.index}</span>
        </span>
      </span>
    </button>
  );
}
