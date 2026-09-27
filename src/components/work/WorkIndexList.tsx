"use client";

import Link from "next/link";
import { projects, type Project } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * The case-file roster — the work world's keyboard surface, and the only way
 * into the section that does not require a pointer.
 *
 * The pinned world draws its eight projects as three.js planes: no DOM nodes,
 * no names, no tab stops, and the DOM overlay above them is
 * `pointer-events-none`. On a desktop with WebGL the entire Work section was
 * therefore unreachable and unannounced — the accessible `WorkCardGrid` only
 * renders on the reduced-motion / small / no-GPU branch.
 *
 * It takes the slot that held five inert capability titles under "What are you
 * looking for?" — a list that answered the question with content that wasn't
 * the answer, and the one place in the composition already shaped like a list
 * of links. Focusing a row dollies the camera to that card; Enter opens the
 * quick-look; ⌘-Enter and middle-click go to the real route.
 */
export function WorkIndexList({
  onFocusCard,
  onOpen,
  activeSlug,
}: {
  /** Called with a card index when a row is focused or hovered. */
  onFocusCard: (index: number) => void;
  /**
   * Quick-look. Handed the row's own rect so the dossier expands out of the
   * roster when it is opened from here, exactly as it expands out of a card
   * when opened from the canvas.
   */
  onOpen: (project: Project, rect: DOMRect) => void;
  activeSlug?: string | null;
}) {
  return (
    <nav
      aria-label="Case files"
      /* The only `pointer-events-auto` island in an overlay that is otherwise
         `pointer-events-none` — the canvas underneath keeps its drag and hover
         everywhere else. */
      className="pointer-events-auto whitespace-nowrap"
      /* `-1` clears the highlight. Guarded on `relatedTarget` so moving between
         two rows doesn't blink the card off and on between them. */
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onFocusCard(-1);
        }
      }}
      onMouseLeave={() => onFocusCard(-1)}
    >
      {/* The count lives in the readout on the other side of the row; this is
          the heading the list needed and the slot already had. */}
      <span className="micro">Case files</span>
      <ul className="mt-3 space-y-1.5">
        {projects.map((project, i) => (
          <li key={project.slug}>
            <Link
              href={`/work/${project.slug}`}
              onFocus={() => onFocusCard(i)}
              onMouseEnter={() => onFocusCard(i)}
              onClick={(e) => {
                /* Middle-click, ctrl/cmd-click and the like must still navigate
                   to the real route — the quick-look is an enhancement over the
                   link, not a replacement for it. Same guard as WorkCardGrid. */
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                onOpen(project, e.currentTarget.getBoundingClientRect());
              }}
              className={cn(
                "flex items-baseline gap-2 font-mono text-[0.8125rem] uppercase tracking-[0.16em] transition-colors",
                activeSlug === project.slug ? "text-fg" : "text-muted hover:text-fg"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "transition-colors",
                  activeSlug === project.slug ? "text-signal" : "text-signal/60"
                )}
              >
                {"->"}
              </span>
              {project.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
