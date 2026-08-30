"use client";

import { accentColor, projects } from "@/lib/content";
import { ProjectVisual } from "@/components/work/ProjectVisual";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { HeroCarousel, type HeroCarouselItem } from "@/components/ui/HeroCarousel";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The lookbook.
 *
 * A filmstrip of the six projects sharing one top edge, the focused one unfurled
 * to twice the height of its neighbours, with the whole background re-graded to
 * that project's accent every time the focus moves.
 *
 * **This section paints a ground, and it is the only one on the page that may.**
 * CONTINUUM says there is exactly one background for the document and sections
 * are transparent over it (see `backdrop/SiteBackdrop.tsx`). The rule exists so
 * nothing spanning a section boundary can cut the continuous scroll in half.
 * This is the opposite case: a deliberate full-viewport occlusion, the same
 * licence `BandWipe`'s full-bleed band takes one section earlier. The entire
 * effect *is* the ground swinging colour, so there is nothing left of it if the
 * shader shows through. It occupies exactly one viewport and hands the backdrop
 * straight back.
 *
 * No autoplay. Autoplay would pull in the whole WCAG 2.2.2 obligation that
 * `Testimonials` documents — pause control, presence pause, off-screen pause —
 * for an effect that is better under the visitor's own hand anyway.
 */

/** "NEON ATLAS" → "NEON\nATLAS"; single words stay on one line. */
function twoLines(title: string): string {
  const at = title.lastIndexOf(" ");
  return at === -1 ? title : `${title.slice(0, at)}\n${title.slice(at + 1)}`;
}

const looks: HeroCarouselItem[] = projects.map((project) => ({
  id: project.slug,
  title: twoLines(project.title),
  credit: project.role,
  meta: [project.category, project.year, project.stack[0]],
  // The six projects cycle magenta → violet → cyan → magenta …, so no two
  // adjacent cards grade the backdrop to the same hue and the swing never
  // disappears mid-strip. That falls out of `accentColor` — it *is* the ramp.
  accent: accentColor[project.accent],
  // `image`, not `shot`.
  //
  // The grade is `mix-blend-mode: color` over the picture: it keeps the
  // luminance it is given and replaces the hue. That needs a photograph. Fed
  // `ProjectVisual` instead, the backdrop becomes a blown-up card — its own
  // label text legible across the whole viewport — and the swing collapses to a
  // flat wash, because a panel that is already one accent has almost no
  // luminance range to re-hue. `shot` is also the wrong source twice over: the
  // files are not in `public/work/` yet, and next/image answers a missing local
  // file with a 400, so every slide would cost a failed request to arrive back
  // at the panel.
  //
  // `visual` stays underneath as the fallback, exactly as `ShotImage` layers
  // them, so a placeholder that fails to load still leaves a designed card.
  image: project.image,
  visual: (
    <ProjectVisual
      index={project.index}
      title={project.title}
      category={project.category}
      accent={project.accent}
    />
  ),
}));

/** "2022 — 2025", derived so it cannot drift from the project list. */
const years = projects.map((p) => Number(p.year));
const span = `${Math.min(...years)} — ${Math.max(...years)}`;

export function Lookbook() {
  const reduced = useReducedMotion();

  return (
    <section
      id="lookbook"
      data-act="void"
      data-chapter="LOOKBOOK"
      className="relative"
      aria-label="Lookbook"
    >
      <ChapterSeam />

      {reduced ? (
        // Reduced motion gets a different composition, not a stripped one: the
        // whole strip laid flat, every project readable at once, no stage, no
        // wheel handler and nothing that moves.
        <div className="relative mx-auto max-w-[1800px] px-5 py-24 md:px-8 lg:px-16">
          <h2 className="display-caps text-[clamp(1.6rem,4.4vw,4.25rem)] text-fg">
            Lookbook
          </h2>
          <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.slug}>
                <div className="relative aspect-[3/4] w-full overflow-hidden">
                  <ProjectVisual
                    index={project.index}
                    title={project.title}
                    category={project.category}
                    accent={project.accent}
                  />
                </div>
                {/* Title and category are already printed inside the panel —
                    the caption carries only what the strip's meta row adds. */}
                <p className="micro mt-3">
                  {project.year} — {project.stack[0]}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        // Pinned, the way the hero is, and for a reason the hero does not have:
        // the carousel only takes the wheel once it is filling the viewport, so
        // it needs to be able to *reach* that state and hold it. A plain `h-dvh`
        // block passes through alignment in a single frame and the strip would
        // grab the gesture wherever the visitor happened to stop — usually with
        // the rail below the fold. The runway is short; the page does not scroll
        // at all while the strip is stepping, so it only has to cover the lead
        // in and out.
        //
        // `h-dvh` on the inner box is load-bearing too: every size in the
        // carousel is a ratio of the box its ResizeObserver measures, and
        // `h-full` on the stage needs a parent with a real height.
        <div className="relative h-[170vh]">
          <div className="sticky top-0 h-dvh w-full overflow-hidden">
            <HeroCarousel
              items={looks}
              defaultIndex={Math.floor(looks.length / 2)}
              label="Selected work, as a lookbook"
              // The navbar is fixed and this is the only section that scrolls a
              // top bar of its own underneath it.
              topInset={56}
            // Not the chapter name: the navbar, the frame rail and the seam all
            // already say LOOKBOOK, and a fourth would be signage rather than
            // information. The span the strip covers is the one fact the top
              // bar can add.
              brand={span}
            />
          </div>
        </div>
      )}
    </section>
  );
}
