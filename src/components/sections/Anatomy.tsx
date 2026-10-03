"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { openCase } from "@/lib/caseFile";
import { isInteractive, modalOpen } from "@/lib/keys";
import { EASE_DEVELOP } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScriptLabel } from "@/components/ui/ScriptLabel";
import { IconArrowRight } from "@/components/ui/HudIcons";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { Schematic } from "@/components/anatomy/Schematic";
import { BeatDetail, BeatNotes, DUPLICATE, MatrixTable } from "@/components/anatomy/BeatDetail";
import type { UiStrings } from "@/lib/ui";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Inside: the anatomy of one Spotfixes prediction.

   Built from the team's final capstone report (Spring 2026), which the case
   file only summarises. One example report travels the system as the reader
   scrolls — through the two trust boundaries and their STRIDE threats, the
   Random Forest and the keyword override, the RAG lane beside it — and lands
   as a result measured against its target. Then the designs the team turned
   down, and last his own part: the usability test he ran and what it found,
   including the target it missed.

   The architecture was the team's; the chapter says so on screen. The
   example input, the tree votes, the token weights and the neighbours are
   illustrations and are labelled as such; every figure is the report's.

   Same stage as Work and Path: a pinned screen where each beat sits on a
   resting plateau, ←/→ between beats, and one `useScroll` driving it. Phones
   and reduced motion get the beats as a list.
   ------------------------------------------------------------------------- */

/** Half-width of each resting plateau, in beats. */
const HOLD = 0.26;
/** Extra rest before the first beat and after the last. */
const EDGE = 0.3;
/** Scroll per beat, in viewport heights. */
const STEP_VH = 52;

export function Anatomy() {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [roomy, setRoomy] = useState(false);
  /* The pinned stage shows a whole beat at once at full reading size, which
     takes a tall screen. Below this (a 1366×768 laptop, a tablet) the beats
     read as a list instead of shrinking or scrolling inside the stage. */
  const [stageRoom, setStageRoom] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (min-height: 600px)");
    const big = window.matchMedia("(min-width: 1200px) and (min-height: 860px)");
    const update = () => {
      setRoomy(mq.matches);
      setStageRoom(big.matches);
    };
    update();
    mq.addEventListener("change", update);
    big.addEventListener("change", update);
    return () => {
      mq.removeEventListener("change", update);
      big.removeEventListener("change", update);
    };
  }, []);
  const pinned = stageRoom && !reduced;
  const n = t.anatomy.beats.length;

  return (
    <section
      ref={ref}
      id="anatomy"
      data-act="void"
      data-chapter="INSIDE"
      aria-label={t.anatomy.aria}
      className="relative overflow-x-clip"
      style={pinned ? { height: `${(n - 1 + 2 * EDGE) * STEP_VH + 100}vh` } : undefined}
    >
      <ChapterSeam />
      {pinned ? <Stage sectionRef={ref} /> : <Sequence reduced={reduced} roomy={roomy} />}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* The pinned stage                                                           */
/* -------------------------------------------------------------------------- */

function Stage({ sectionRef: ref }: { sectionRef: React.RefObject<HTMLElement | null> }) {
  const { t } = useI18n();
  const A = t.anatomy;
  const n = A.beats.length;
  const span = n - 1 + 2 * EDGE;
  const { scrollTo } = useSmoothScroll();

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const pos = useTransform(scrollYProgress, (p) => p * span - EDGE);
  const [beat, setBeat] = useState(0);
  useMotionValueEvent(pos, "change", (v) => {
    const b = Math.min(n - 1, Math.max(0, Math.round(v)));
    setBeat((prev) => (prev === b ? prev : b));
  });

  const goTo = useCallback(
    (i: number) => {
      const el = ref.current;
      if (!el) return;
      const k = Math.min(n - 1, Math.max(0, i));
      const top = el.getBoundingClientRect().top + window.scrollY;
      const travel = el.offsetHeight - window.innerHeight;
      scrollTo(top + ((k + EDGE) / span) * travel);
    },
    [n, span, scrollTo, ref]
  );

  /* ←/→ while pinned, as in Work and Path. Up/down stay with ChapterKeys. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (modalOpen() || isInteractive(document.activeElement)) return;
      const r = ref.current?.getBoundingClientRect();
      if (!r || r.top > 1 || r.bottom < window.innerHeight - 1) return;
      e.preventDefault();
      goTo(beat + (e.key === "ArrowRight" ? 1 : -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beat, goTo, ref]);

  return (
    <div className="sticky top-0 h-dvh w-full overflow-hidden">
      {/* The footage falls off behind the text column, so the prose sits on
          dark rather than on the tunnel's brightest edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-[62%] bg-[linear-gradient(to_right,transparent,color-mix(in_srgb,var(--color-bg)_78%,transparent)_30%)]"
      />
      <div className="relative mx-auto flex h-full max-w-[1800px] flex-col px-5 pb-6 pt-20 md:px-8 lg:px-16">
        {/* Two columns the full height of the screen: the masthead heads the
            drawing, so the beat's text gets every line below the navbar. */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 pt-3 lg:gap-12 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="flex min-h-0 flex-col">
            <header className="relative">
              <ScriptLabel href="#anatomy" />
              <span className="eyebrow kicker-plate">
                {sectionIndex("#anatomy")} — {A.eyebrow}
              </span>
              <h2 className="display-caps mt-3 text-[clamp(1.75rem,2.6vw,2.75rem)] text-fg [@media(max-height:820px)]:text-[clamp(1.5rem,2.2vw,2.25rem)]">
                {A.title}
              </h2>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <span className="micro !text-[var(--color-hazard)]">{A.credit}</span>
                <span className="micro">{A.source}</span>
              </p>
            </header>
            <div className="relative min-h-0 flex-1 py-3">
              <Schematic pos={pos} hold={HOLD} beat={beat} words={A} />
            </div>
          </div>

          <div className="flex min-h-0 flex-col pt-1">
            <Ticks n={n} beat={beat} words={A} goTo={goTo} />
            <p className="micro mt-1 hidden !text-fg/85 lg:block">{A.hint}</p>
            {/* The beat on screen. Decoration for assistive tech, which reads
                the full sequence below instead. It never shrinks its type to
                fit: on a short screen a long beat scrolls inside itself
                (Lenis leaves it alone). */}
            <div
              aria-hidden
              data-lenis-prevent
              className="relative mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 [scrollbar-width:thin]"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={beat}
                  className="absolute inset-x-0 top-0 pb-2 pr-2"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.16 } }}
                  transition={{ duration: 0.45, ease: EASE_DEVELOP }}
                >
                  <h3 className="font-tech text-3xl font-bold uppercase leading-[1.05] text-fg lg:text-4xl">
                    <ScrambleText key={`t${beat}-${A.beats[beat].title}`} text={A.beats[beat].title} immediate speed={26} />
                  </h3>
                  <p className="mt-3 max-w-2xl text-lg leading-relaxed text-fg/85">{A.beats[beat].body}</p>
                  <BeatNotes i={beat} words={A} className="mt-4 max-w-2xl" />
                  <div className="mt-5 max-w-2xl">
                    <BeatDetail i={beat} words={A} animate />
                  </div>
                  {beat === n - 1 && <CaseLink words={A} className="mt-5" />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <SrSequence words={A} />
      </div>
    </div>
  );
}

/** One tick per beat: where you are, and a way to any other. */
function Ticks({ n, beat, words, goTo }: { n: number; beat: number; words: UiStrings["anatomy"]; goTo: (i: number) => void }) {
  return (
    <div className="flex items-center gap-4">
      <span className="micro tabular !text-[var(--color-holo)]">{words.step(beat + 1, n)}</span>
      <ol className="flex flex-1 items-center gap-1.5">
        {words.beats.map((b, i) => (
          <li key={i} className="flex-1">
            <button
              type="button"
              onClick={() => goTo(i)}
              aria-label={words.goTo(b.title)}
              aria-current={i === beat ? "step" : undefined}
              className="group flex h-6 w-full items-center"
            >
              <span
                className={cn(
                  "block h-[3px] w-full transition-colors duration-300",
                  i === beat
                    ? "bg-[var(--color-holo)]"
                    : i < beat
                      ? "bg-[color-mix(in_srgb,var(--color-holo)_45%,transparent)]"
                      : "bg-[var(--color-line-strong)] group-hover:bg-[var(--color-fg)]/50"
                )}
              />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CaseLink({ words, className }: { words: UiStrings["anatomy"]; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => openCase("spotfixes")}
      className={cn(
        "micro inline-flex min-h-11 items-center gap-1.5 !text-fg transition-colors hover:!text-[var(--color-hazard)]",
        className
      )}
    >
      {words.openCase} <IconArrowRight size={13} />
    </button>
  );
}

/** The whole sequence as text, for assistive tech, under the pinned stage. */
function SrSequence({ words }: { words: UiStrings["anatomy"] }) {
  return (
    <div className="sr-only">
      <p>
        {words.credit}. {words.source}.
      </p>
      <ol>
        {words.beats.map((b, i) => (
          <li key={i}>
            <h3>{b.title}</h3>
            <p>{b.body}</p>
            <BeatNotes i={i} words={words} />
            <SrDetail i={i} words={words} />
          </li>
        ))}
      </ol>
      <CaseLink words={words} />
    </div>
  );
}

/** The parts of a beat's drawing that are facts, as plain text. */
function SrDetail({ i, words }: { i: number; words: UiStrings["anatomy"] }) {
  const T = words.threats;
  const threat = (k: keyof typeof T) => (
    <li key={k}>
      {words.stride[k]}: {T[k].threat}. {words.controlLabel}: {T[k].control}.
    </li>
  );
  if (i === 1) return <ul>{(["S", "D"] as const).map(threat)}</ul>;
  if (i === 2) return <ul>{(["T", "I", "E", "R"] as const).map(threat)}</ul>;
  if (i === 6)
    return (
      <p>
        {words.timing.prediction}: 3.4 {words.timing.unit}. {words.timing.similarity}: 1.2 {words.timing.unit}.{" "}
        {words.timing.target}: &lt; 5 {words.timing.unit}. {words.extras.map((e) => `${e.v} ${e.k}`).join(". ")}.
      </p>
    );
  if (i === 5) {
    const X = words.example2;
    return (
      <p>
        {X.label}. {X.newBug}: “{DUPLICATE.query}”. {X.matches}:{" "}
        {DUPLICATE.matches.map((m) => `“${m.text}”, ${Math.round(m.score * 100)}% ${X.similar}`).join("; ")}.
      </p>
    );
  }
  if (i === 7) {
    const M = words.measured;
    return (
      <>
        <p>
          {M.report.v} {M.report.k}. {M.scope}: {M.metrics.map((m) => `${m.k} ${m.v}`).join(", ")}. {M.caveat} {M.loop}
        </p>
        <MatrixTable words={words} />
      </>
    );
  }
  if (i === 8)
    return (
      <ul>
        {words.alternatives.map((a) => (
          <li key={a.name}>
            {a.name}: {a.why}
          </li>
        ))}
      </ul>
    );
  if (i === 9) {
    const D = words.design;
    return (
      <>
        <p>
          {D.flowsLabel}: {D.flows.map((f) => f.join(" → ")).join("; ")}.
        </p>
        <ul>
          {D.roles.map((r) => (
            <li key={r.name}>
              {r.name}: {r.can}
            </li>
          ))}
        </ul>
      </>
    );
  }
  if (i === 10) {
    const U = words.usability;
    return (
      <p>
        {U.target}: {U.targetText}. {U.result}: {U.status}. {U.figures.map((f) => `${f.v} ${f.k}`).join(". ")}.{" "}
        {U.blockedBy}
      </p>
    );
  }
  if (i === 11) {
    const U = words.usability;
    return (
      <ul>
        {U.fixes.map((f) => (
          <li key={f.problem}>
            {U.priority[f.priority]}: {f.problem}. {f.fix}. {f.open ? U.open : U.fixed}.
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Phones and reduced motion: the beats as a list                             */
/* -------------------------------------------------------------------------- */

function Sequence({ reduced, roomy }: { reduced: boolean; roomy: boolean }) {
  const { t } = useI18n();
  const A = t.anatomy;
  return (
    <div className="mx-auto max-w-[1800px] px-5 pb-24 pt-24 md:px-8 md:pb-36 md:pt-36 lg:px-16">
      <SectionHeader index={sectionIndex("#anatomy")} label={A.eyebrow} title={A.title} chapter="#anatomy" voice="tech" />
      <p className="mt-6 flex flex-col gap-1">
        <span className="micro !text-[var(--color-hazard)]">{A.credit}</span>
        <span className="micro">{A.source}</span>
      </p>

      <div className={cn(roomy && "grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-14")}>
        {/* The drawing needs room to be read: on phones the beats carry it. */}
        {roomy && (
          <div className="relative">
            <div className="sticky top-24 mt-12 h-[min(78vh,760px)]">
              <Schematic pos={null} beat={null} words={A} />
            </div>
          </div>
        )}
        <ol className="mt-6">
          {A.beats.map((b, i) => (
            <Step key={i} i={i} reduced={reduced} words={A} />
          ))}
        </ol>
      </div>
      <CaseLink words={A} className="mt-8" />
    </div>
  );
}

function Step({ i, reduced, words }: { i: number; reduced: boolean; words: UiStrings["anatomy"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true });
  const b = words.beats[i];
  return (
    <li className="border-b border-line py-9 md:py-12">
      <span className="micro tabular !text-[var(--color-holo)]">{words.step(i + 1, words.beats.length)}</span>
      <h3 className="mt-3 font-tech text-3xl font-bold uppercase leading-[1.05] text-fg md:text-4xl">{b.title}</h3>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-fg/85 md:text-xl">{b.body}</p>
      <BeatNotes i={i} words={words} className="mt-4 max-w-2xl" />
      {/* Always in the document (its words are content), finished; it is
          drawn on again, once, as it scrolls in. Reduced motion: still. */}
      <div ref={ref} className="mt-6 max-w-2xl">
        <BeatDetail key={seen ? "on" : "off"} i={i} words={words} animate={seen && !reduced} />
      </div>
    </li>
  );
}
