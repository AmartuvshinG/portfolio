"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from "lucide-react";
import { accentColor, type Project } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { CASE_EVENT, clearCase, readCase, replaceCase } from "@/lib/caseFile";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useOverlay } from "@/hooks/useOverlay";
import { EASE_EXPO } from "@/lib/motion";
import { ShotImage } from "@/components/work/ShotImage";

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

  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      clearCase();
    }
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

  if (!isClient) return null;

  const i = project ? projects.findIndex((p) => p.slug === project.slug) : -1;
  const prev = i >= 0 ? projects[(i - 1 + projects.length) % projects.length] : null;
  const next = i >= 0 ? projects[(i + 1) % projects.length] : null;
  const color = project ? accentColor[project.accent] : undefined;

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
            {/* Bar */}
            <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-5 md:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <span className="font-mono text-sm tabular" style={{ color }}>
                  {project.index}
                </span>
                <span className="micro truncate">{t.caseFile.label}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="micro hidden sm:inline">{t.caseFile.esc}</span>
                <button
                  type="button"
                  data-autofocus
                  onClick={onClose}
                  aria-label={t.caseFile.close}
                  className="flex h-11 w-11 items-center justify-center border border-line text-fg transition-colors hover:border-current"
                >
                  <X size={18} />
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
                          <a
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="chamfer-sm group inline-flex h-11 items-center gap-2 px-5 font-mono text-[0.8125rem] uppercase tracking-[0.18em] transition-transform duration-300 hover:scale-[1.03]"
                            style={
                              n === 0
                                ? { backgroundImage: "var(--gradient-spectrum)", color: "var(--color-void)" }
                                : { boxShadow: "inset 0 0 0 1px var(--color-line-strong)", color: "var(--color-fg)" }
                            }
                          >
                            {l.label}
                            <ArrowUpRight size={15} aria-hidden className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            <span className="sr-only">{t.common.newTab}</span>
                          </a>
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

                <div className="mt-14 grid gap-12 md:grid-cols-12">
                  <div className="md:col-span-7">
                    <h3 className="micro mb-4">{t.caseFile.overview}</h3>
                    <p className="text-base leading-relaxed text-fg/90 md:text-lg">
                      {project.description}
                    </p>

                    <h3 className="micro mb-4 mt-12">{t.caseFile.outcomes}</h3>
                    <ul>
                      {project.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-4 border-b border-line py-4 text-base text-muted">
                          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <aside className="md:col-span-5">
                    <div className="notch-card bg-surface p-6 ring-1 ring-inset ring-line md:p-7">
                      <h3 className="micro mb-4">{t.caseFile.stack}</h3>
                      <div className="flex flex-wrap gap-2">
                        {project.stack.map((s) => (
                          <span key={s} className="rounded-full border border-line px-3 py-1.5 font-mono text-[0.8125rem] uppercase tracking-wider text-fg">
                            {s}
                          </span>
                        ))}
                      </div>

                      {project.metrics.length > 0 && (
                        <>
                          <h3 className="micro mb-4 mt-8">{t.caseFile.metrics}</h3>
                          <div className="grid grid-cols-3 gap-4 border-t border-line pt-5">
                            {project.metrics.map((m) => (
                              <div key={m.label}>
                                <span className="micro">{m.label}</span>
                                <p className="tabular mt-2 font-display text-xl text-fg md:text-2xl">{m.value}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </aside>
                </div>

                {project.gallery?.length ? (
                  <section className="mt-16" aria-label={t.caseFile.gallery}>
                    <h3 className="micro mb-6">{t.caseFile.gallery}</h3>
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
                          </div>
                          {g.caption && <figcaption className="micro mt-3">{g.caption}</figcaption>}
                        </figure>
                      ))}
                    </div>
                  </section>
                ) : null}

                {prev && next && (
                  <nav className="mt-20 grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
                    {[
                      { p: prev, label: t.caseFile.prev, Icon: ArrowLeft, align: "text-left" },
                      { p: next, label: t.caseFile.next, Icon: ArrowRight, align: "sm:text-right" },
                    ].map(({ p, label, Icon, align }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => onGo(p)}
                        className={`group flex flex-col gap-2 border border-line p-5 transition-colors hover:border-line-strong ${align}`}
                      >
                        <span className={`micro flex items-center gap-2 ${align === "sm:text-right" ? "sm:justify-end" : ""}`}>
                          {Icon === ArrowLeft && <Icon size={14} aria-hidden />}
                          {label}
                          {Icon === ArrowRight && <Icon size={14} aria-hidden />}
                        </span>
                        <span className="display-caps text-lg text-fg md:text-xl">{p.title}</span>
                      </button>
                    ))}
                  </nav>
                )}
              </motion.article>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
