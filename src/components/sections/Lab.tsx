"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

/* Each exhibit is its own chunk, loaded when the LAB is near: none of this
   is needed to read the page. */
const BrushExhibit = dynamic(() => import("@/components/lab/BrushExhibit"), { ssr: false });
const FilmExhibit = dynamic(() => import("@/components/lab/FilmExhibit"), { ssr: false });
const DiodeExhibit = dynamic(() => import("@/components/lab/DiodeExhibit"), { ssr: false });

type Tab = "brush" | "film" | "diodes";
const TABS: Tab[] = ["brush", "film", "diodes"];

/**
 * LAB: this site is the experiment.
 *
 * The brief asked for a playground of experiments, and the honest material
 * for one is the machinery this page already runs on — so the exhibits are
 * that, opened up and live: the intro's brush bake (scrub the writing, see
 * its arrival field and distance field, follow the route), the film's grade
 * (raw against graded through a divider), and the footer's diodes (type a
 * message onto them). Nothing is staged for the exhibit; each one is the
 * site's own code with its controls exposed.
 *
 * One exhibit at a time behind tabs (the WAI-ARIA tabs pattern, arrow keys
 * between them), and only while the section is near the screen — so the
 * LAB never holds more than one GL context, and none at all elsewhere.
 */
export function Lab() {
  const { t } = useI18n();
  const L = t.lab;
  const ref = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tab, setTab] = useState<Tab>("brush");
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "150px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next]);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      ref={ref}
      id="lab"
      data-act="deck"
      data-chapter="LAB"
      className="relative overflow-hidden py-24 md:py-36"
      aria-label={L.aria}
    >
      <ChapterSeam />

      <div className="relative mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeader index={sectionIndex("#lab")} label={L.eyebrow} title={L.title} />
          <Reveal>
            <p className="max-w-md text-lg leading-relaxed text-muted md:text-right">{L.lead}</p>
          </Reveal>
        </div>

        <div role="tablist" aria-label={L.tabs} className="mt-14 flex flex-wrap gap-2 border-b border-line">
          {TABS.map((id, i) => {
            const on = tab === id;
            return (
              <button
                key={id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`lab-tab-${id}`}
                aria-selected={on}
                aria-controls="lab-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => setTab(id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={cn(
                  "relative -mb-px flex min-h-12 items-baseline gap-3 px-4 font-mono text-sm uppercase tracking-[0.2em] transition-colors",
                  on ? "text-fg" : "text-muted hover:text-fg"
                )}
              >
                <span className={cn("tabular text-xs", on ? "text-[var(--color-holo)]" : "text-faint")}>
                  0{i + 1}
                </span>
                {L[id].tab}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-2 bottom-0 h-px transition-opacity",
                    on ? "bg-[var(--color-holo)] opacity-100 shadow-[0_0_8px_var(--color-holo)]" : "opacity-0"
                  )}
                />
              </button>
            );
          })}
        </div>

        <div id="lab-panel" role="tabpanel" aria-labelledby={`lab-tab-${tab}`} className="mt-10">
          {tab === "brush" && <BrushExhibit live={near} />}
          {tab === "film" && <FilmExhibit live={near} />}
          {tab === "diodes" && <DiodeExhibit live={near} />}
        </div>
      </div>
    </section>
  );
}
