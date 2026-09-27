"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import type { Project } from "@/lib/content";
import { accentColor } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useOverlay } from "@/hooks/useOverlay";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { EASE_EXPO } from "@/lib/motion";
import { ProjectVisual } from "@/components/work/ProjectVisual";

export interface DossierOrigin {
  project: Project;
  /** Viewport rect of the card that was clicked — the expansion's start state. */
  rect: DOMRect;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const GUTTER = 24;
const MAX_W = 1040;
const MAX_H = 760;

const noopSubscribe = () => () => {};

/**
 * True once running on the client. `createPortal` needs a real `document`, and
 * this is the sanctioned way to ask — an effect that flips a boolean would just
 * be a cascading render.
 */
function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

function targetBox(): Box {
  const width = Math.min(window.innerWidth - GUTTER * 2, MAX_W);
  const height = Math.min(window.innerHeight - GUTTER * 2, MAX_H);
  return {
    width,
    height,
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
  };
}

/**
 * Expanding case-file quick-look.
 *
 * Grows out of the card you clicked and fills the viewport with the project's
 * dossier, then collapses back into the same card. Deep links still belong to
 * `/work/[slug]` — this is a fast look without losing your scroll position, not
 * a replacement for the route.
 *
 * Implementation note: this animates `top/left/width/height` from a captured
 * `DOMRect` rather than using Framer's `layoutId`. The trigger cards live
 * inside a GSAP-pinned, `transform`ed track, and layout projection measured
 * through that transform mis-origins the expansion. Explicit geometry is
 * immune to whatever the ancestor is doing — and only one element animates, so
 * the layout cost stays trivial.
 */
export function ProjectDossier({
  origin,
  onClose,
}: {
  origin: DossierOrigin | null;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const isClient = useIsClient();
  const [resizeTick, setResizeTick] = useState(0);

  const open = Boolean(origin);

  /* The target box is derived during render, not set from an effect. Deriving
     it means the panel exists on the very first open render — an effect would
     leave one frame where the dialog is empty, and the focus effect below
     would run against a panel that isn't mounted yet and silently do nothing.
     `resizeTick` exists only to force this recomputation when the viewport
     changes under an open panel (device rotate, window drag). */
  void resizeTick;
  const box: Box | null = open && isClient ? targetBox() : null;

  useEffect(() => {
    if (!open) return;
    const onResize = () => setResizeTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  const close = useCallback(() => onClose(), [onClose]);
  useOutsideClick(panelRef, close, open);

  /* Escape, the focus trap, restore and the scroll lock all live in the hook
     now — this component was the only surface on the site that had them right,
     so they were lifted out of it verbatim and the other three overlays were
     moved onto the same contract. Behaviour here is unchanged by design: it is
     the regression baseline for the other three. */
  useOverlay({ open, onClose: close, ref: panelRef });

  if (!isClient) return null;

  const project = origin?.project;
  const from = origin?.rect;
  const color = project ? accentColor[project.accent] : undefined;

  return createPortal(
    <AnimatePresence>
      {open && project && from && box && (
        // `data-act` is pinned rather than inherited: this renders into a
        // portal at document level, so it has no section to take its tokens
        // from and `<html data-act>` could be mid-transition when it opens.
        <div data-act="void" className="fixed inset-0 z-[90]" role="presentation">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-void/85 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dossier-title"
            className="notch-card absolute flex flex-col overflow-hidden bg-surface ring-1 ring-inset ring-line"
            initial={
              reduced
                ? { ...box, opacity: 0 }
                : {
                    top: from.top,
                    left: from.left,
                    width: from.width,
                    height: from.height,
                    opacity: 0.5,
                  }
            }
            animate={{ ...box, opacity: 1 }}
            exit={
              reduced
                ? { opacity: 0 }
                : {
                    top: from.top,
                    left: from.left,
                    width: from.width,
                    height: from.height,
                    opacity: 0,
                  }
            }
            transition={{ duration: 0.55, ease: EASE_EXPO }}
          >
            {/* Visual header — the element that visually "is" the card */}
            <div className="relative h-40 shrink-0 overflow-hidden sm:h-52">
              <ProjectVisual
                index={project.index}
                title={project.title}
                category={project.category}
                accent={project.accent}
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(0deg, rgba(5, 6, 13, 0.95), transparent 65%)",
                }}
              />
              <button
                type="button"
                data-autofocus
                onClick={close}
                aria-label="Close case file"
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-void/70 text-fg backdrop-blur transition-colors hover:border-current"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <motion.div
              className="flex min-h-0 flex-1 flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.35, delay: reduced ? 0 : 0.22 }}
            >
              <div className="border-b border-line px-6 py-5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs" style={{ color }}>
                    Case file {project.index}
                  </span>
                  <span className="h-px flex-1 bg-line" />
                  <span className="micro">{project.year}</span>
                </div>
                <h2
                  id="dossier-title"
                  className="display-caps mt-3 text-2xl text-fg md:text-3xl"
                >
                  {project.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted md:text-base">
                  {project.summary}
                </p>
              </div>

              {/* Scrollable detail */}
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="grid gap-8 md:grid-cols-2">
                  <div>
                    <h3 className="micro mb-3">Overview</h3>
                    <p className="text-sm leading-relaxed text-fg/85">
                      {project.description}
                    </p>

                    <h3 className="micro mb-3 mt-8">Key outcomes</h3>
                    <ul className="space-y-2.5">
                      {project.highlights.map((h) => (
                        <li
                          key={h}
                          className="flex items-start gap-3 text-sm text-muted"
                        >
                          <span className="mt-0.5 font-mono text-xs" style={{ color }}>
                            →
                          </span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="micro mb-3">Stack</h3>
                    <div className="flex flex-wrap gap-2">
                      {project.stack.map((s) => (
                        <span
                          key={s}
                          className="rounded-full border border-line px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-fg"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {project.metrics.length > 0 && (
                      <>
                        <h3 className="micro mb-3 mt-8">Metrics</h3>
                        <div className="grid grid-cols-3 gap-4 border-t border-line pt-4">
                          {project.metrics.map((m) => (
                            <div key={m.label}>
                              <span className="micro">{m.label}</span>
                              <p
                                className="tabular mt-1 font-display text-xl text-fg"
                              >
                                {m.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {project.links?.length ? (
                      <>
                        <h3 className="micro mb-3 mt-8">Links</h3>
                        <ul className="flex flex-wrap gap-x-5 gap-y-2">
                          {project.links.map((l) => (
                            <li key={l.href}>
                              <a
                                href={l.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="spectrum-underline inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-fg"
                              >
                                {l.label}
                                <ArrowUpRight size={12} aria-hidden />
                                <span className="sr-only">(opens in a new tab)</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}

                    <dl className="mt-8 space-y-3 border-t border-line pt-4">
                      {[
                        ["Role", project.role],
                        ["Category", project.category],
                        ["Status", project.status],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4">
                          <dt className="micro">{k}</dt>
                          <dd className="font-mono text-xs uppercase text-fg">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="flex shrink-0 items-center justify-between gap-4 border-t border-line px-6 py-4">
                <span className="micro hidden sm:inline">Esc to close</span>
                <Link
                  href={`/work/${project.slug}`}
                  style={{ backgroundImage: "var(--gradient-spectrum)" }}
                  className="chamfer-sm group inline-flex items-center gap-2 px-5 py-3 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-void transition-transform duration-300 hover:scale-[1.03]"
                >
                  Open full case file
                  <ArrowUpRight
                    size={14}
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
