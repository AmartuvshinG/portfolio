"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Cta } from "@/components/ui/Cta";
import { IconArrowLeft, IconArrowRight, IconClose } from "@/components/ui/HudIcons";
import { accentColor, readable, type Project } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { CASE_EVENT, clearCase, readCase, replaceCase } from "@/lib/caseFile";
import { playInkWipe } from "@/lib/inkWipe";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useOverlay } from "@/hooks/useOverlay";
import { EASE_EXPO } from "@/lib/motion";
import { ShotImage } from "@/components/work/ShotImage";
import { NeonSign } from "@/components/ui/NeonSign";

const noopSubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * The case-file host: owns which case file is open, and keeps it in the URL.
 *
 * Mounted once on the home page. Everything that opens a case file — the work
 * theatre, the command palette, Craft's "proven in" links, a pasted
 * `/#case=spotfixes` — goes through the hash (see lib/caseFile), so there is one
 * source of truth and the Back button always does the expected thing: it closes
 * the file, because opening one was a history entry.
 */
export function CaseFileHost() {
  const { c } = useI18n();
  const [slug, setSlug] = useState<string | null>(null);
  /** Whether *we* pushed the current entry — decides back() vs replace. */
  const pushed = useRef(false);

  useEffect(() => {
    const sync = (e?: Event) => {
      const detail = (e as CustomEvent<{ pushed?: boolean }> | undefined)?.detail;
      if (e?.type === CASE_EVENT && detail?.pushed) pushed.current = true;
      /* Back lands on the entry under the file, which `openCase` stripped of
         its section hash — so the router has no anchor to scroll to and the
         page stays exactly where the reader left it. */
      if (e?.type === "popstate") pushed.current = false;
      setSlug(readCase());
    };
    sync();
    window.addEventListener(CASE_EVENT, sync);
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener(CASE_EVENT, sync);
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const project = c.projects.find((p) => p.slug === slug) ?? null;

  /* Closing is the same cut in reverse: ink floods over the dossier, and the
     page it was opened from is what drains back into view. */
  const close = useCallback(() => {
    playInkWipe({
      onCovered: () => {
        if (pushed.current) {
          pushed.current = false;
          window.history.back();
        } else {
          clearCase();
        }
      },
    });
  }, []);

  const go = useCallback((next: Project) => replaceCase(next.slug), []);

  return <CaseFile project={project} projects={c.projects} onClose={close} onGo={go} />;
}

/**
 * The full case file, over the page.
 *
 * It replaces both the old quick-look dossier and the separate `/work/[slug]`
 * pages. The dossier grew out of the clicked card by animating `top`, `left`,
 * `width` and `height` — layout on every frame — and was only ever a summary
 * that pointed at the real page. This is the real page: hero shot, overview,
 * outcomes, the gallery, stack, metrics and links, with prev/next between
 * files. It enters on transform and opacity only.
 *
 * The panel scrolls on its own (`data-lenis-prevent`), and the page behind it
 * stays exactly where it was.
 */
function CaseFile({
  project,
  projects,
  onClose,
  onGo,
}: {
  project: Project | null;
  projects: Project[];
  onClose: () => void;
  onGo: (p: Project) => void;
}) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const isClient = useIsClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const open = Boolean(project);

  useOverlay({ open, onClose, ref: panelRef });

  /* Switching files in place should start at the top of the new one. */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [project?.slug]);

  /* The reading rail: which chapter the reader is in, watched against the
     panel's own scroller (the page behind does not move). */
  const [active, setActive] = useState("cf-overview");
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !project) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { root, rootMargin: "-25% 0px -65% 0px" }
    );
    root.querySelectorAll("[data-chapter-id]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [project]);
  const jump = (id: string) => {
    const root = scrollRef.current;
    const el = root?.querySelector<HTMLElement>(`#${id}`);
    if (!root || !el) return;
    // Measured against the scroller: offsetTop is relative to the nearest
    // positioned ancestor, which is not the panel.
    const top = root.scrollTop + el.getBoundingClientRect().top - root.getBoundingClientRect().top - 24;
    root.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    setActive(id);
  };

  if (!isClient) return null;

  const i = project ? projects.findIndex((p) => p.slug === project.slug) : -1;
  const prev = i >= 0 ? projects[(i - 1 + projects.length) % projects.length] : null;
  const next = i >= 0 ? projects[(i + 1) % projects.length] : null;
  const color = project ? accentColor[project.accent] : undefined;
  const chapters = project
    ? [
        { id: "cf-overview", label: t.caseFile.overview },
        { id: "cf-stack", label: t.caseFile.stack },
        { id: "cf-outcomes", label: t.caseFile.outcomes },
        ...(project.gallery?.length ? [{ id: "cf-gallery", label: t.caseFile.gallery }] : []),
      ]
    : [];

  return createPortal(
    <AnimatePresence>
      {project && (
        <div data-act="void" className="fixed inset-0 z-[90]" role="presentation">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-void/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Sodium targeting brackets framing the file, 6px outside the
              panel: the panel is a notch clip-path, which would cut them off
              if they lived inside it. Desktop only, where the panel is inset. */}
          {!reduced && (
            <motion.span
              aria-hidden
              className="hud-brackets pointer-events-none absolute hidden md:inset-2.5 md:block lg:inset-4 [--hud-c:var(--color-hazard)] [--hud-l:22px] [--hud-w:2px]"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.25, ease: EASE_EXPO }}
            />
          )}

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-title"
            className="absolute inset-0 flex flex-col overflow-hidden bg-bg ring-1 ring-inset ring-line md:inset-4 md:notch-card lg:inset-6"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 32 }}
            transition={{ duration: 0.5, ease: EASE_EXPO }}
          >
            {/* The scan-in: one sodium line sweeps down the file as it opens
                (a full-size layer with the line on its bottom edge, slid from
                -100% to 0, then gone). Transform and opacity only. */}
            {!reduced && (
              <motion.span
                key={`scan-${project.slug}`}
                aria-hidden
                className="pointer-events-none absolute inset-0 z-20"
                style={{
                  background:
                    "linear-gradient(180deg, transparent calc(100% - 60px), color-mix(in srgb, var(--color-hazard) 14%, transparent) calc(100% - 2px), var(--color-hazard))",
                }}
                initial={{ y: "-100%", opacity: 1 }}
                animate={{ y: "0%", opacity: [1, 1, 0] }}
                transition={{ duration: 0.75, ease: [0.45, 0, 0.2, 1], opacity: { times: [0, 0.8, 1], duration: 0.75 } }}
              />
            )}

            {/* Bar */}
            <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-5 md:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <span className="font-mono text-sm tabular" style={{ color: color && readable(color) }}>
                  {project.index}
                </span>
                <span className="micro truncate">
                  {t.caseFile.label}
                  <span className="text-[var(--color-hazard)]"> · {project.title}</span>
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="micro hidden sm:inline">{t.caseFile.esc}</span>
                <button
                  type="button"
                  data-autofocus
                  onClick={onClose}
                  aria-label={t.caseFile.close}
                  className="cta cta-icon group"
                >
                  <span aria-hidden className="cta-curtain" />
                  <IconClose size={17} />
                </button>
              </div>
            </div>

            <div ref={scrollRef} data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <motion.article
                key={project.slug}
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE_EXPO, delay: reduced ? 0 : 0.08 }}
                className="mx-auto max-w-[1280px] px-5 pb-16 pt-10 md:px-10 md:pt-14"
              >
                <header>
                  <span className="micro">{project.category}</span>
                  <h2
                    id="case-title"
                    className="display-caps mt-4 text-fg"
                    style={{ fontSize: "clamp(1.9rem, 5vw, 4.25rem)" }}
                  >
                    {project.title}
                  </h2>
                  <p className="mt-5 max-w-3xl font-tech text-xl leading-snug text-fg md:text-2xl">
                    {project.summary}
                  </p>

                  <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 md:grid-cols-4">
                    {[
                      [t.caseFile.role, project.role],
                      [t.caseFile.year, project.year],
                      [t.caseFile.category, project.category],
                      [t.caseFile.status, project.status],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="micro">{k}</dt>
                        <dd className="mt-2 font-tech text-lg font-semibold uppercase leading-snug text-fg">
                          {v}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {project.links?.length ? (
                    <ul className="mt-8 flex flex-wrap gap-3">
                      {project.links.map((l, n) => (
                        <li key={l.href}>
                          <Cta variant={n === 0 ? "primary" : "secondary"} href={l.href} external label={l.label} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </header>

                <div className="notch-card relative mt-10 aspect-[16/10] w-full overflow-hidden bg-surface ring-1 ring-inset ring-line">
                  <ShotImage
                    project={project}
                    sizes="(max-width: 1280px) 100vw, 1280px"
                    className="object-cover object-top"
                  />
                </div>

                {/* The file as an editorial sequence: numbered chapters, a
                    reading rail that follows you down the panel (lg+), and
                    the next file waiting at the foot. Every word is the
                    project's own fields; nothing is written for the layout. */}
                <div className="mt-14 grid gap-12 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-16">
                  <nav aria-label={t.caseFile.contents} className="hidden lg:block">
                    <ol className="sticky top-8 flex flex-col border-l border-line">
                      {chapters.map((ch, n) => {
                        const on = active === ch.id;
                        return (
                          <li key={ch.id}>
                            <button
                              type="button"
                              onClick={() => jump(ch.id)}
                              aria-current={on ? "true" : undefined}
                              className={`relative -ml-px flex min-h-10 w-full items-baseline gap-3 border-l px-4 text-left font-mono text-xs uppercase tracking-[0.18em] transition-colors ${on ? "border-[var(--color-holo)] text-fg" : "border-transparent text-muted hover:text-fg"}`}
                            >
                              <span className={`tabular ${on ? "text-[var(--color-holo)]" : "text-faint"}`}>0{n + 1}</span>
                              {ch.label}
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </nav>

                  <div className="min-w-0">
                    <Chapter id="cf-overview" n={1} title={t.caseFile.overview}>
                      <p className="max-w-3xl text-base leading-relaxed text-fg/90 md:text-lg">{project.description}</p>
                    </Chapter>

                    <Chapter id="cf-stack" n={2} title={t.caseFile.stack}>
                      {/* The stack as a system listing, not a cloud of pills. */}
                      <ol className="grid border-t border-line sm:grid-cols-2 sm:gap-x-10">
                        {project.stack.map((s, n) => (
                          <li
                            key={s}
                            className="flex items-baseline gap-4 border-b border-line py-3 font-mono text-sm uppercase tracking-[0.12em] text-fg"
                          >
                            <span aria-hidden className="tabular text-xs text-[var(--color-holo)]">
                              {String(n + 1).padStart(2, "0")}
                            </span>
                            {s}
                          </li>
                        ))}
                      </ol>
                    </Chapter>

                    <Chapter id="cf-outcomes" n={3} title={t.caseFile.outcomes}>
                      {project.metrics.length > 0 && (
                        <dl className="mb-8 grid grid-cols-3 gap-4">
                          {project.metrics.map((m) => (
                            <div key={m.label} className="flex flex-col gap-2 border-l border-line pl-4">
                              <dt className="micro order-2">{m.label}</dt>
                              {/* The results as lit numerals: each strikes on
                                  the first time it scrolls into view. */}
                              <dd className="tabular order-1 font-display text-3xl md:text-5xl">
                                <NeonSign text={m.value} lit="view" />
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      <ul className="max-w-3xl">
                        {project.highlights.map((h) => (
                          <li key={h} className="flex items-start gap-4 border-b border-line py-4 text-base text-muted">
                            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </Chapter>

                    {project.gallery?.length ? (
                      <Chapter id="cf-gallery" n={4} title={t.caseFile.gallery}>
                        <div className="grid gap-x-6 gap-y-10 md:grid-cols-2">
                          {project.gallery.map((g) => (
                            <figure key={g.src}>
                              <div className="notch-card relative overflow-hidden bg-surface ring-1 ring-inset ring-line">
                                <Image
                                  src={g.src}
                                  alt={g.alt}
                                  width={2000}
                                  height={1250}
                                  sizes="(max-width: 768px) 100vw, 620px"
                                  className="h-auto w-full"
                                />
                                {/* The film's scanlines, static. */}
                                <span
                                  aria-hidden
                                  className="pointer-events-none absolute inset-0"
                                  style={{
                                    backgroundImage:
                                      "repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.16) 2px 3px)",
                                  }}
                                />
                              </div>
                              {g.caption && <figcaption className="micro mt-3">{g.caption}</figcaption>}
                            </figure>
                          ))}
                        </div>
                      </Chapter>
                    ) : null}

                    {prev && next && (
                      <nav
                        aria-label={`${t.caseFile.prev} / ${t.caseFile.next}`}
                        className="mt-4 flex flex-col gap-4 border-t border-line pt-8"
                      >
                        {/* The next file, waiting: its shot, its name. */}
                        <button
                          type="button"
                          onClick={() => onGo(next)}
                          className="cta cta-secondary group !h-auto !items-stretch !justify-start gap-0 p-0 normal-case tracking-normal"
                        >
                          <span aria-hidden className="cta-curtain" />
                          <span className="grid w-full items-center gap-6 p-5 text-left sm:grid-cols-[minmax(0,1fr)_14rem] md:p-6">
                            <span className="flex flex-col gap-3">
                              <span className="micro flex items-center gap-2">
                                {t.caseFile.nextFile} <IconArrowRight size={14} />
                              </span>
                              <span className="flex items-baseline gap-4">
                                <span className="font-mono text-sm tabular text-[var(--color-holo)]">{next.index}</span>
                                <span className="display-caps text-2xl text-fg md:text-4xl">{next.title}</span>
                              </span>
                              <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted">{next.category}</span>
                            </span>
                            <span aria-hidden className="relative hidden aspect-[16/10] overflow-hidden ring-1 ring-inset ring-line sm:block">
                              <ShotImage
                                project={next}
                                sizes="224px"
                                className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                              />
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onGo(prev)}
                          className="micro flex min-h-11 items-center gap-2 self-start transition-colors hover:text-fg"
                        >
                          <IconArrowLeft size={14} />
                          {t.caseFile.prev} · {prev.title}
                        </button>
                      </nav>
                    )}
                  </div>
                </div>
              </motion.article>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** One numbered chapter of a case file. */
function Chapter({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} data-chapter-id="" aria-labelledby={`${id}-h`} className="scroll-mt-6 pb-16">
      <h3 id={`${id}-h`} className="mb-6 flex items-baseline gap-4">
        <span className="font-mono text-sm tabular text-[var(--color-holo)]">0{n}</span>
        <span className="micro !text-fg">{title}</span>
        <span aria-hidden className="h-px flex-1 -translate-y-[0.25em] bg-line" />
      </h3>
      {children}
    </section>
  );
}
