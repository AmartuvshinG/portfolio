"use client";

import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { capabilities, projects, type Project } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useHasWebGL } from "@/lib/gpu";
import { WorkCardGrid } from "./WorkCardGrid";
import { ProjectDossier, type DossierOrigin } from "./ProjectDossier";
import type { CardHit } from "@/components/three/WorkWorld";

const WorkWorld = dynamic(() => import("@/components/three/WorkWorld"), {
  ssr: false,
});

/** Viewport heights of scroll the pinned world consumes. */
const SCROLL_VH = 420;

/**
 * A WebGL context failure surfaces as a render throw from inside the Canvas.
 * Without a boundary that takes down the whole page, so the world degrades to
 * the card grid instead.
 */
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* -------------------------------------------------------------------------- */

/**
 * The dark act.
 *
 * Everything before this is paper and everything after it returns to paper, so
 * the drop into black is the structural centre of the page — it is doing the
 * job KPR gives its full-bleed chapters, which is to make the browsing surface
 * feel like a different place rather than a different section.
 *
 * Scroll is captured by a tall sticky container: the section is `SCROLL_VH`
 * tall, the canvas sticks to the viewport inside it, and the ratio between the
 * two is the camera dolly. Progress is written to a ref rather than to state —
 * this updates every frame, and re-rendering the React tree at 60fps to move a
 * camera would be pure waste.
 */
export function SelectedWork() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [origin, setOrigin] = useState<DossierOrigin | null>(null);
  const [hovered, setHovered] = useState<Project | null>(null);
  /* Both default to the flat layout, so SSR and first paint render the card
     grid and the world is opted into only once we know it can run. */
  const [small, setSmall] = useState(true);
  const gpu = useHasWebGL();

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setSmall(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const flat = reduced || small || !gpu;

  useEffect(() => {
    if (flat) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const el = ref.current;
        if (el) {
          const { top, height } = el.getBoundingClientRect();
          const travel = height - window.innerHeight;
          progress.current =
            travel > 0 ? Math.min(1, Math.max(0, -top / travel)) : 0;
        }
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [flat]);

  const onSelect = useCallback((hit: CardHit) => setOrigin(hit), []);
  const onHover = useCallback((p: Project | null) => setHovered(p), []);

  if (flat) {
    return (
      <section
        id="work"
        data-act="void"
        data-chapter="WORK"
        className="relative bg-bg py-24 md:py-32"
        aria-label="Selected work"
      >
        <Header />
        <div className="mt-14">
          <WorkCardGrid />
        </div>
      </section>
    );
  }

  return (
    <section
      id="work"
      data-act="void"
      data-chapter="WORK"
      ref={ref}
      className="relative bg-bg"
      style={{ height: `${SCROLL_VH}vh` }}
      aria-label="Selected work"
    >
      <div className="sticky top-0 h-dvh w-full overflow-hidden">
        <SceneBoundary
          fallback={
            <div className="flex h-full items-center overflow-y-auto py-24">
              <WorkCardGrid />
            </div>
          }
        >
          <WorkWorld
            progress={progress}
            onSelect={onSelect}
            onHover={onHover}
          />
        </SceneBoundary>

        {/* --- DOM overlay. The world is behind glass; all the type is here,
                where it stays crisp and selectable. --- */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 text-fg md:p-8 lg:px-16">
          <div className="pt-16 md:pt-20">
            <span className="micro">03 — Selected work</span>
            <h2 className="display-caps mt-3 text-[clamp(2.5rem,7vw,6rem)]">
              Work
            </h2>
          </div>

          <div className="flex items-end justify-between gap-8">
            {/* Active Theory's filter list. Not interactive filters — these are
                the disciplines the work covers, which is the question the list
                is really answering. */}
            <div className="hidden md:block">
              <span className="micro">What are you looking for?</span>
              <ul className="mt-3 space-y-1.5">
                {capabilities.slice(0, 5).map((c) => (
                  <li
                    key={c.code}
                    className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted"
                  >
                    <span className="mr-2 text-signal">{"->"}</span>
                    {c.title}
                  </li>
                ))}
              </ul>
            </div>

            <div className="ml-auto text-right">
              {/* Hover readout. The card art carries the title already, so this
                  adds the one-line summary rather than repeating the name. */}
              <p className="micro min-h-4">
                {hovered ? hovered.role : `${projects.length} case files`}
              </p>
              <p className="mt-2 max-w-xs font-editorial text-lg leading-snug text-fg md:text-xl">
                {hovered ? hovered.summary : "Drag through. Click any card."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ProjectDossier origin={origin} onClose={() => setOrigin(null)} />
    </section>
  );
}

function Header() {
  return (
    <div className="mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
      <span className="micro">03 — Selected work</span>
      <h2 className="display-caps mt-3 text-[clamp(2.5rem,7vw,6rem)] text-fg">
        Work
      </h2>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
        Systems designed and engineered end to end — each built for performance,
        motion and impact.
      </p>
    </div>
  );
}
