"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { projects, gallery, type Project, sectionIndex } from "@/lib/content";
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

/**
 * Column count, plane width and scale, per tier.
 *
 * This was one fixed `w-[1720px] scale-[0.45]`, and `scale` is a transform:
 * the *layout* box stayed 1720px wide however small the viewport got. On a
 * 390px phone that put roughly 192px of plane past each edge — the outer
 * columns of a four-column grid simply were not on screen. The plane is
 * *meant* to run off the corners; the bug was showing four columns' worth of
 * content in space for two.
 *
 * So the column count moves with the width instead of the width being cropped
 * to fit the count. Fewer columns is also fewer promoted layers, which is the
 * other thing a phone GPU cares about here. The last row reproduces the
 * previous desktop values exactly — above 1024px nothing changes.
 */
const TIERS = [
  { max: 640, columns: 2, width: 860, scale: 0.62 },
  { max: 1024, columns: 3, width: 1290, scale: 0.6 },
  { max: Infinity, columns: 4, width: 1720, scale: 0.78 },
] as const;

type Tier = (typeof TIERS)[number];

/**
 * Widest tier first so SSR and the first client render agree — the effect then
 * narrows it. Rendering the *narrow* tier by default would be the wrong bet:
 * the plane sits inside `overflow-hidden`, so an over-wide first frame is
 * cropped, whereas an over-narrow one is a visible pop outward.
 */
function useLabTier(): Tier {
  const [tier, setTier] = useState<Tier>(TIERS[TIERS.length - 1]);

  useEffect(() => {
    const pick = () => {
      const w = window.innerWidth;
      setTier(TIERS.find((t) => w <= t.max) ?? TIERS[TIERS.length - 1]);
    };
    pick();
    window.addEventListener("resize", pick);
    return () => window.removeEventListener("resize", pick);
  }, []);

  return tier;
}

export function Lab() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const drift = usePointerDrift(18);
  const [origin, setOrigin] = useState<DossierOrigin | null>(null);
  const [held, setHeld] = useState(false);
  const [onScreen, setOnScreen] = useState(false);

  const tier = useLabTier();

  /* Four tiles per column, drawn from the real project and gallery data so the
     plane is showing actual work rather than placeholder rectangles. Four and
     not six: the plane is scaled to 0.78 and rotated 52° away, so the outer
     tiles of a six-row column are off the vignette entirely — they cost a
     composited layer each and were never visible. */
  const tiles = Array.from({ length: tier.columns * 4 }, (_, i) => i);
  const chunks = Array.from({ length: tier.columns }, (_, c) =>
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
              <span className="micro tabular">{sectionIndex("#lab")}</span>
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
          <div
            className="shrink-0"
            style={{ width: tier.width, transform: `scale(${tier.scale})` }}
          >
            <div
              className="grid origin-center gap-8"
              /* No `preserve-3d`. Only this wrapper is rotated and every tile
                 below it is flat, so preserving 3D just gave each of the
                 sixteen tiles its own 3D rendering context for nothing — and
                 the un-skew below composes correctly without it.

                 The column count is inline rather than a `grid-cols-*` class:
                 it is a runtime value, and Tailwind cannot generate a class it
                 never sees in the source. */
              style={{
                transform: PLANE,
                gridTemplateColumns: `repeat(${tier.columns}, minmax(0, 1fr))`,
              }}
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
