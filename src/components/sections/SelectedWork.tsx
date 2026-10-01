"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  cubicBezier,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { accentColor, projects as baseProjects, readable, sectionIndex, type Project } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { openCase } from "@/lib/caseFile";
import { isInteractive, modalOpen } from "@/lib/keys";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { ShotImage } from "@/components/work/ShotImage";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { cn } from "@/lib/utils";
import { IconArrowLeft, IconArrowRight } from "@/components/ui/HudIcons";
import { Cta } from "@/components/ui/Cta";

/* ---------------------------------------------------------------------------
   The work theatre.

   A pinned stage that plays the case files one at a time as you scroll: the
   live site on a monitor to the right, the story of it to the left, and the
   next file wiping up over the last. It replaces a WebGL world of flat cards
   flying at the camera — which read as rectangles passing by, cost three.js,
   r3f and a post-processing stack, and put every screenshot at an angle.

   **Rhythm.** Scroll position is mapped onto a continuous `pos` where each case
   file sits at an integer. Around every integer there is a *plateau* (±HOLD)
   where nothing moves, and the transitions live in the gaps between plateaus.
   So wherever a reader stops, they stop on a resolved frame — there is no
   scroll-snap fighting their wheel, because there is nothing half-finished to
   snap away from. EDGE extends the first and last plateau so the section does
   not start or end mid-transition.

   **Cost.** One `useScroll` drives everything through `useTransform`; nothing
   re-renders per frame except a single `active` index, which only changes at
   plateau midpoints. Every moving property is `transform` or `opacity`. The
   screen wipe is a translate on a clipping wrapper against a counter-translate
   on its child — the look of a clip-path reveal with none of the repaint.

   **Clicks.** A reader should never have to scroll to find something: the rail
   ticks, prev/next and ←/→ all jump to a plateau through Lenis, and the monitor
   itself opens the case file.
   ------------------------------------------------------------------------- */

/** Half-width of each resting plateau, in case-file units. */
const HOLD = 0.26;
/** Extra rest before the first file and after the last. */
const EDGE = 0.32;
/** Scroll distance per case file, in viewport heights. */
const STEP_VH = 95;
/** The `pos` range the section scrolls through, first plateau to last. */
const SPAN = projectCount() - 1 + EDGE * 2;

/* Every locale lists the same case files, so the count is locale-free. */
function projectCount() {
  return baseProjects.length;
}

export function SelectedWork() {
  const reduced = useReducedMotion();
  /* Stacked layout until we know there is room to pin; SSR and first paint
     agree on it. */
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const { t } = useI18n();
  const ref = useRef<HTMLElement>(null);
  const pinned = wide && !reduced;

  /* One <section> for both layouts, never swapped. The navbar's section
     observer, ChapterFrame's triggers and ChapterKeys all grab `#work` once at
     mount; when the layouts rendered their own <section>, switching from the
     SSR stack to the theatre replaced the node under all three and left them
     watching a detached element — the nav went on lighting SIGNAL through the
     whole of Work. */
  return (
    <section
      id="work"
      ref={ref}
      data-act="void"
      data-chapter="WORK"
      aria-label={t.work.aria}
      className={pinned ? "relative" : "relative py-24 md:py-32"}
      style={pinned ? { height: `${SPAN * STEP_VH + 100}vh` } : undefined}
    >
      {pinned ? <Theatre sectionRef={ref} /> : <Stack reduced={reduced} />}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Theatre({ sectionRef: ref }: { sectionRef: React.RefObject<HTMLElement | null> }) {
  const { c, t } = useI18n();
  const projects = c.projects;
  const n = projects.length;
  const span = SPAN;

  const { scrollTo } = useSmoothScroll();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const pos = useTransform(scrollYProgress, (p) => p * span - EDGE);

  const [active, setActive] = useState(0);
  useMotionValueEvent(pos, "change", (v) => {
    const next = Math.min(n - 1, Math.max(0, Math.round(v)));
    setActive((a) => (a === next ? a : next));
  });

  /* Whether the stage is anywhere near the viewport. Every moving layer is
     promoted (`will-change`) only while this is true: unpromoted, each scroll
     frame repainted a full-screen gradient, four paragraphs and the
     screenshots — measured, that doubled the long frames through this section.
     Promoted permanently, the layers would hold GPU memory for the whole
     session for a section that is on screen for a fraction of it. */
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setLive(entry.isIntersecting), {
      rootMargin: "50% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  /** Scroll to case file `k`'s plateau. */
  const goTo = useCallback(
    (k: number) => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(n - 1, Math.max(0, k));
      const top = el.getBoundingClientRect().top + window.scrollY;
      const travel = el.offsetHeight - window.innerHeight;
      scrollTo(top + ((i + EDGE) / span) * travel);
    },
    [n, span, scrollTo, ref]
  );

  /* ←/→ while the stage is pinned. Up/down and j/k stay with ChapterKeys. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (modalOpen() || isInteractive(document.activeElement)) return;
      const r = ref.current?.getBoundingClientRect();
      if (!r || r.top > 1 || r.bottom < window.innerHeight - 1) return;
      e.preventDefault();
      goTo(active + (e.key === "ArrowRight" ? 1 : -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo, ref]);

  const current = projects[active];

  return (
    <>
      {/* The pinned stage had no seam, so Work was the one chapter without a
          join or a chapter card. */}
      <ChapterSeam />
      <div className="sticky top-0 h-dvh w-full overflow-hidden">
        {/* Per-file light. A radial gradient each, crossfaded on opacity — no
            blur filter, so nothing here is re-rasterised on scroll. */}
        {projects.map((p, i) => (
          <Glow key={p.slug} pos={pos} i={i} n={n} live={live} color={accentColor[p.accent]} />
        ))}

        <div className="relative mx-auto flex h-full max-w-[1800px] flex-col px-5 pb-8 pt-24 md:px-8 lg:px-16">
          {/* Masthead */}
          <div className="flex items-end justify-between gap-6">
            <div>
              <span className="eyebrow kicker-plate">
                {sectionIndex("#work")} — {t.work.eyebrow}
              </span>
              <h2 className="display-caps mt-3 text-[clamp(1.6rem,3.4vw,3.25rem)] text-fg">
                {t.work.title}
              </h2>
            </div>
            <span className="micro tabular hidden lg:block">{t.work.hint}</span>
          </div>

          {/* Stage */}
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-8 lg:gap-14">
            {/* Story */}
            <div className="relative h-full max-h-[34rem] min-h-[26rem]">
              {projects.map((p, i) => (
                <Story key={p.slug} project={p} pos={pos} i={i} n={n} live={live} active={i === active} />
              ))}
            </div>

            {/* Monitor */}
            <div className="relative flex items-center justify-center">
              <div className="relative w-full" style={{ maxWidth: "min(100%, calc((100dvh - 17rem) * 1.6))" }}>
                {projects.map((p, i) => (
                  <Plates key={p.slug} project={p} pos={pos} i={i} n={n} live={live} />
                ))}

                <button
                  type="button"
                  onClick={() => openCase(current.slug)}
                  data-cursor-label={t.work.view}
                  className="group relative block w-full text-left"
                >
                  {/* Named by a hidden text child, not `aria-label`: the monitor's
                      visible text is decorative (address bars, generated
                      panels), and an aria-label that doesn't contain it fails
                      WCAG 2.5.3 (label in name). The monitor is aria-hidden. */}
                  <span className="sr-only">{t.work.preview(current.title)}</span>
                  <div aria-hidden className="notch-card relative overflow-hidden bg-surface ring-1 ring-inset ring-line-strong shadow-[0_40px_120px_-20px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-out group-hover:-translate-y-1">
                    {/* The bezel: a field monitor's status strip, not a
                        browser's traffic lights. Which file is up, then the
                        real address of the build. */}
                    <div className="relative flex h-9 items-center gap-3 border-b border-line bg-[#06070c] px-4">
                      <span className="font-mono text-[0.625rem] tabular tracking-[0.22em] text-[var(--color-hazard)]" aria-hidden>
                        {current.index}/{String(n).padStart(2, "0")}
                      </span>
                      <span className="h-3 w-px bg-line" aria-hidden />
                      <div className="relative h-5 flex-1">
                        {projects.map((p, i) => (
                          <Address key={p.slug} project={p} pos={pos} i={i} n={n} live={live} fallback={t.work.noSite} />
                        ))}
                      </div>
                      <span className="micro flex items-center gap-1.5 !text-fg opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden>
                        {t.work.open} <ArrowUpRight size={13} />
                      </span>
                    </div>

                    {/* Screens. On hover the monitor answers: the picture leans in
                        a little, a scan band runs down it once, and a faint
                        scanline veil comes up — a structured response (see
                        .monitor-scan in globals.css), so it reads as the
                        screen waking, never as a fault. */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-void">
                      <div className="monitor-lean absolute inset-0">
                        {projects.map((p, i) => (
                          <Screen key={p.slug} project={p} pos={pos} i={i} n={n} live={live} />
                        ))}
                      </div>
                      <span aria-hidden className="monitor-veil" />
                      <span aria-hidden className="monitor-scan" />
                      {/* Reticle corners on the picture, closing in on hover. */}
                      <span aria-hidden className="monitor-reticle" />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Cta
                variant="icon"
                onClick={() => goTo(active - 1)}
                disabled={active === 0}
                aria-label={t.work.prev}
                icon={<IconArrowLeft size={16} />}
              />
              <Cta
                variant="icon"
                onClick={() => goTo(active + 1)}
                disabled={active === n - 1}
                aria-label={t.work.next}
                icon={<IconArrowRight size={16} />}
              />
              <span className="micro tabular ml-2 !text-fg">{t.work.count(active + 1, n)}</span>
            </div>

            {/* The rail: every file by name, one click away. */}
            <nav aria-label={t.work.rail} className="min-w-0">
              <ol className="flex items-center gap-1">
                {projects.map((p, i) => (
                  <li key={p.slug}>
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={i === active ? "step" : undefined}
                      className={cn(
                        "group flex h-11 items-center gap-2 px-2.5 font-mono text-xs uppercase tracking-[0.14em] transition-colors",
                        i === active ? "text-fg" : "text-faint hover:text-muted"
                      )}
                    >
                      <span
                        className="block h-px transition-all duration-250"
                        style={{
                          width: i === active ? 28 : 12,
                          background: i === active ? accentColor[p.accent] : "currentColor",
                        }}
                      />
                      <span className="tabular">{p.index}</span>
                      <span className={cn("hidden xl:inline", i === active ? "" : "opacity-70")}>{p.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Per-file layers. Each reads the shared `pos` and nothing else.              */
/* -------------------------------------------------------------------------- */

interface Layer {
  pos: MotionValue<number>;
  i: number;
  n: number;
  /** Promote while the stage is near the viewport — see `live` above. */
  live: boolean;
}

function promote(live: boolean, props = "transform, opacity") {
  return live ? props : "auto";
}

/**
 * The four breakpoints of file `i` on the `pos` axis: arrive, settle, hold,
 * leave. The first file is already settled at the top of the section and the
 * last never leaves, so their outer points are pushed out of reach.
 */
function stops(i: number, n: number): [number, number, number, number] {
  return [
    i === 0 ? -99 : i - 1 + HOLD,
    i === 0 ? -98 : i - HOLD,
    i === n - 1 ? 98 : i + HOLD,
    i === n - 1 ? 99 : i + 1 - HOLD,
  ];
}

/** In-out on the two moving segments, nothing on the hold between them. */
const inOut = cubicBezier(0.65, 0, 0.35, 1);
const linear = (t: number) => t;
const EASE = { ease: [inOut, linear, inOut] };

/**
 * Tighter stops for type. The screens can share a transition — one wipes over
 * the other — but two paragraphs cannot: crossfaded, they overlap as a ghosted
 * double exposure. So the outgoing story is fully gone by the midpoint and the
 * incoming one only starts there.
 */
function textStops(i: number, n: number): [number, number, number, number] {
  return [
    i === 0 ? -99 : i - 0.5,
    i === 0 ? -98 : i - HOLD,
    i === n - 1 ? 98 : i + HOLD,
    i === n - 1 ? 99 : i + 0.5,
  ];
}

function useTextFade({ pos, i, n }: Layer, travel = 48) {
  const s = textStops(i, n);
  const opacity = useTransform(pos, s, [0, 1, 1, 0], EASE);
  const y = useTransform(pos, s, [travel, 0, 0, -travel], EASE);
  return { opacity, y, s };
}

function useFade({ pos, i, n }: Layer, travel = 56) {
  const s = stops(i, n);
  const opacity = useTransform(pos, s, [0, 1, 1, 0], EASE);
  const y = useTransform(pos, s, [travel, 0, 0, -travel], EASE);
  return { opacity, y };
}

function Glow({ color, ...layer }: Layer & { color: string }) {
  const { opacity } = useFade(layer);
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        opacity,
        willChange: promote(layer.live, "opacity"),
        background: `radial-gradient(60% 55% at 70% 58%, color-mix(in srgb, ${color} 20%, transparent) 0%, transparent 70%)`,
      }}
    >
      {/* A beam falling on the monitor from above the frame, in the file's
          own colour: a light rig, not a backdrop. Static geometry; only the
          layer's opacity moves. */}
      <span
        className="absolute inset-0"
        style={{
          clipPath: "polygon(52% 0, 80% 0, 100% 100%, 38% 100%)",
          background: `linear-gradient(180deg, color-mix(in srgb, ${color} 16%, transparent) 0%, color-mix(in srgb, ${color} 6%, transparent) 55%, transparent 90%)`,
        }}
      />
    </motion.div>
  );
}

function Story({ project, active, ...layer }: Layer & { project: Project; active: boolean }) {
  const { t } = useI18n();
  const { opacity, y, s } = useTextFade(layer);
  /* The title rises out of its own mask, a beat behind the rest. */
  const titleY = useTransform(layer.pos, s, ["110%", "0%", "0%", "-110%"], EASE);
  const live = project.links?.[0];
  const color = accentColor[project.accent];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col justify-center"
      style={{ opacity, willChange: promote(layer.live, "opacity") }}
      aria-hidden={!active}
      inert={!active}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -left-2 top-1/2 -translate-y-1/2 select-none font-display leading-none text-transparent"
        style={{
          y,
          willChange: promote(layer.live, "transform"),
          fontSize: "clamp(8rem, 17vw, 17rem)",
          WebkitTextStroke: "1px color-mix(in srgb, var(--color-fg) 9%, transparent)",
        }}
      >
        {project.index}
      </motion.span>

      <motion.div className="relative" style={{ y, willChange: promote(layer.live, "transform") }}>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm tabular" style={{ color: readable(color) }}>
            {project.index}
          </span>
          <span className="h-px w-8 bg-current opacity-25" />
          <span className="micro text-fg/75">
            {project.category} · {project.year}
          </span>
        </div>

        <div className="mt-4 overflow-hidden pb-1">
          <motion.h3
            className="display-caps text-fg"
            style={{ y: titleY, willChange: promote(layer.live, "transform"), fontSize: "clamp(1.9rem, 3.3vw, 3.6rem)" }}
          >
            {project.title}
          </motion.h3>
        </div>

        <p className="micro mt-4 !text-fg">{project.role}</p>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{project.summary}</p>

        {project.metrics.length > 0 && (
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
            {project.metrics.map((m) => (
              <div key={m.label}>
                <dd className="tabular font-display text-2xl text-fg">{m.value}</dd>
                <dt className="micro mt-1.5">{m.label}</dt>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-3">
          {/* Not magnetic: this sits on a scroll-driven layer, and the lean
              would fight its transform. */}
          <Cta onClick={() => openCase(project.slug)} label={t.work.open} magnetic={false} />
          {live && <Cta variant="secondary" href={live.href} external label={live.label} magnetic={false} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** The address bar's text, crossfaded per file. */
function Address({ project, fallback, ...layer }: Layer & { project: Project; fallback: string }) {
  const { opacity } = useTextFade(layer, 0);
  const href = project.links?.[0]?.href;
  /* "This site" has no link to itself — its address is wherever it is being
     read. Client-only render, so reading `location` here is safe. */
  let host = project.self ? window.location.host : fallback;
  if (href) {
    try {
      host = new URL(href).host.replace(/^www\./, "");
    } catch {
      /* keep the fallback */
    }
  }
  return (
    <motion.span
      aria-hidden
      className="absolute inset-0 flex items-center justify-center truncate rounded-sm bg-fg/[0.06] px-3 font-mono text-xs text-muted"
      style={{ opacity, willChange: promote(layer.live, "opacity") }}
    >
      {host}
    </motion.span>
  );
}

/**
 * One screen. Files stack in order, so a later screen wipes up *over* the one
 * before it: the wrapper slides up from below while its content counter-slides,
 * which reads as a mask opening rather than a picture moving. The screen being
 * covered sinks and dims a little, so the change has depth.
 */
function Screen({ project, ...layer }: Layer & { project: Project }) {
  const { pos, i, n } = layer;
  const s = stops(i, n);
  const wrapY = useTransform(pos, [s[0], s[1]], ["100%", "0%"], { ease: inOut });
  const innerY = useTransform(pos, [s[0], s[1]], ["-55%", "0%"], { ease: inOut });
  const sink = useTransform(pos, [s[2], s[3]], [1, 0.94], { ease: inOut });
  const shade = useTransform(pos, [s[2], s[3]], [0, 0.6], { ease: inOut });

  return (
    /* `bg-void`: the generated fallback visual is partly transparent, and the
       screen underneath showed through it. */
    <motion.div
      className="absolute inset-0 overflow-hidden bg-void"
      style={{ y: wrapY, zIndex: i + 1, willChange: promote(layer.live, "transform") }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ y: innerY, scale: sink, willChange: promote(layer.live, "transform") }}
      >
        <ShotImage
          project={project}
          sizes="(max-width: 1280px) 58vw, 900px"
          className="object-cover object-top"
        />
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-void"
        style={{ opacity: shade, willChange: promote(layer.live, "opacity") }}
      />
    </motion.div>
  );
}

/**
 * Two gallery shots fanned behind the monitor, so a file reads as a body of
 * work rather than one screenshot. They drift in from the side a little slower
 * than the screen wipes, which is where the sense of depth comes from.
 */
function Plates({ project, ...layer }: Layer & { project: Project }) {
  const { opacity } = useFade(layer, 0);
  const s = stops(layer.i, layer.n);
  const x = useTransform(layer.pos, s, [60, 0, 0, -60], EASE);
  const shots = (project.gallery ?? []).slice(0, 2);
  if (!shots.length) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ opacity, x, willChange: promote(layer.live) }}
    >
      {shots.map((g, k) => (
        <div
          key={g.src}
          className="notch-card-sm absolute w-[46%] overflow-hidden ring-1 ring-inset ring-line"
          style={
            k === 0
              ? { top: "-9%", right: "-7%", rotate: "4deg" }
              : { bottom: "-11%", left: "-8%", rotate: "-5deg" }
          }
        >
          <Image src={g.src} alt="" width={2000} height={1250} sizes="26vw" className="h-auto w-full opacity-70" />
        </div>
      ))}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Phones and reduced motion: a stack of cards, no pin.                        */
/* -------------------------------------------------------------------------- */

/**
 * Below the pin breakpoint each file is a card, and on phones the cards stack:
 * each one sticks under the navbar and the next slides up over it, so the
 * section still feels like a deck being dealt without a scroll-jacked stage on
 * a 390px screen. Under reduced motion it is a plain list.
 */
function Stack({ reduced }: { reduced: boolean }) {
  const { c, t } = useI18n();

  return (
    <>
      <ChapterSeam />
      <div className="mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <span className="eyebrow kicker-plate">
          {sectionIndex("#work")} — {t.work.eyebrow}
        </span>
        <h2 className="display-caps mt-3 text-[clamp(1.6rem,4vw,3.75rem)] text-fg">{t.work.title}</h2>

        <div className={cn("mt-12", reduced ? "grid gap-8 md:grid-cols-2" : "space-y-6")}>
          {c.projects.map((p, i) => {
            const live = p.links?.[0];
            return (
              <article
                key={p.slug}
                className={cn(
                  "notch-card overflow-hidden bg-surface ring-1 ring-inset ring-line",
                  !reduced && "sticky"
                )}
                style={reduced ? undefined : { top: `calc(5rem + ${i * 0.9}rem)` }}
              >
                <button
                  type="button"
                  onClick={() => openCase(p.slug)}
                  data-cursor-label={t.work.view}
                  className="relative block aspect-[16/10] w-full overflow-hidden"
                >
                  {/* Hidden text name, decorative shot aria-hidden: see the
                      theatre's monitor button (WCAG 2.5.3, label in name). */}
                  <span className="sr-only">{t.work.preview(p.title)}</span>
                  <span aria-hidden className="absolute inset-0">
                    <ShotImage project={p} sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-top" />
                  </span>
                </button>
                <div className="p-5 md:p-6">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm tabular" style={{ color: readable(accentColor[p.accent]) }}>
                      {p.index}
                    </span>
                    <span className="micro text-fg/75">
                      {p.category} · {p.year}
                    </span>
                  </div>
                  <h3 className="display-caps mt-3 text-[clamp(1.4rem,6vw,2rem)] text-fg">{p.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-muted">{p.summary}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Cta onClick={() => openCase(p.slug)} label={t.work.open} magnetic={false} />
                    {live && <Cta variant="secondary" href={live.href} external label={live.label} magnetic={false} />}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
