"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { SliceTitle } from "@/components/motion/SliceTitle";
import { openCase } from "@/lib/caseFile";
import { isInteractive, modalOpen } from "@/lib/keys";
import { EASE_EXPO } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScriptLabel } from "@/components/ui/ScriptLabel";
import { IconArrowRight } from "@/components/ui/HudIcons";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { BeatDetail, BeatNotes, DUPLICATE, MatrixTable } from "@/components/anatomy/BeatDetail";
import type { UiStrings } from "@/lib/ui";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Capstone: how Spotfixes works, in six plain steps.

   Built from the team's final capstone report (Spring 2026). A bug report
   travels a single rail of six stations — report, security, severity,
   duplicates, results, and his own part — and a glowing packet runs along
   it with the scroll, lighting each station as it passes. Under the rail
   sits one card: the step's headline, two sentences a non-engineer can
   follow, and the step's drawing. A new step wipes in sideways, the same
   direction the packet travels.

   The architecture was the team's; the chapter says so. The example input,
   the votes, the word scores and the neighbours are illustrations and are
   labelled so; every figure is the report's (or the deck's, and said so).

   A pinned stage with a resting plateau per step, ←/→ between steps, one
   `useScroll` driving it. Short screens, phones and reduced motion get the
   steps as a list.
   ------------------------------------------------------------------------- */

/** Half-width of each resting plateau, in beats. */
const HOLD = 0.26;
/** Extra rest before the first beat and after the last. */
const EDGE = 0.3;
/** Scroll per beat, in viewport heights. Long enough that a step taller than
 *  the stage reads through at about the speed of the scroll (see StepCard). */
const STEP_VH = 75;

export function Anatomy() {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  /* The pinned stage shows a whole step at full reading size. Six short
     steps fit a laptop; below this the steps read as a list instead of
     shrinking. */
  const [stageRoom, setStageRoom] = useState(false);
  useEffect(() => {
    const big = window.matchMedia("(min-width: 1024px) and (min-height: 700px)");
    const update = () => setStageRoom(big.matches);
    update();
    big.addEventListener("change", update);
    return () => big.removeEventListener("change", update);
  }, []);
  const pinned = stageRoom && !reduced;
  const n = t.anatomy.beats.length;

  return (
    <section
      ref={ref}
      id="anatomy"
      data-act="void"
      data-chapter="CAPSTONE"
      aria-label={t.anatomy.aria}
      className="relative overflow-x-clip"
      style={pinned ? { height: `${(n - 1 + 2 * EDGE) * STEP_VH + 100}vh` } : undefined}
    >
      <ChapterSeam />
      {pinned ? <Stage sectionRef={ref} /> : <Sequence reduced={reduced} />}
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

  /* The packet's place on the rail: whole stations held on their plateaus,
     the runs between them eased, so it rests on a station while you read. */
  const along = useTransform(pos, (v) => {
    const c = Math.min(n - 1, Math.max(0, v));
    const i = Math.floor(c);
    const f = c - i;
    const t = Math.min(1, Math.max(0, (f - HOLD) / (1 - 2 * HOLD)));
    return (i + t * t * (3 - 2 * t)) / (n - 1);
  });
  const b = A.beats[beat];
  const boxRef = useRef<HTMLDivElement>(null);

  return (
    <div className="sticky top-0 h-dvh w-full overflow-hidden">
      <div className="relative mx-auto flex h-full max-w-[93.75rem] flex-col px-5 pb-6 pt-20 md:px-8 lg:px-16">
        <header className="relative flex flex-wrap items-end justify-between gap-x-10 gap-y-2 pt-3">
          <div>
            <ScriptLabel href="#anatomy" />
            <span className="eyebrow kicker-plate">
              {sectionIndex("#anatomy")} — {A.eyebrow}
            </span>
            <h2 className="display-caps mt-3 text-[clamp(1.75rem,2.8vw,3rem)] text-fg">
              <SliceTitle text={A.title} />
            </h2>
          </div>
          <p className="flex flex-col items-end gap-1 pb-1 text-right">
            <span className="micro !text-[var(--color-hazard)]">{A.credit}</span>
            <span className="micro">{A.source}</span>
          </p>
        </header>

        <Rail words={A} along={along} beat={beat} goTo={goTo} />

        {/* The step on screen. Decoration for assistive tech, which reads the
            full sequence below instead. Never a scroll box of its own: the
            wheel over it must move the page, or the stage stalls under the
            pointer. A step taller than the box is carried up through it by
            the page scroll instead (StepCard). */}
        <div ref={boxRef} aria-hidden className="relative mt-6 min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <StepCard key={beat} i={beat} n={n} pos={pos} boxRef={boxRef}>
              <div className="min-w-0">
                <span className="display-caps tabular text-[clamp(3rem,5vw,5.5rem)] leading-none text-[var(--color-holo)] [text-shadow:0_0_28px_color-mix(in_srgb,var(--color-holo)_45%,transparent)]">
                  {String(beat + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 font-tech text-3xl font-bold uppercase leading-[1.05] text-fg lg:text-4xl">
                  <ScrambleText key={`t${beat}-${b.title}`} text={b.title} immediate speed={26} />
                </h3>
                <p className="mt-4 text-lg leading-relaxed text-fg/85">{b.body}</p>
                <BeatNotes i={beat} words={A} className="mt-5" />
                {beat === n - 1 && <CaseLink words={A} className="mt-5" />}
              </div>
              <div className="min-w-0 self-center">
                <BeatDetail i={beat} words={A} animate />
              </div>
            </StepCard>
          </AnimatePresence>
        </div>

        <p className="micro mt-3 !text-fg/85">{A.hint}</p>
        <SrSequence words={A} />
      </div>
    </div>
  );
}

/**
 * One step's card. When it is taller than the stage's box, the page scroll
 * carries it up through the box across the step's stretch of the scroll —
 * top showing as the step arrives, foot showing as it leaves — so the whole
 * step is read without the card ever capturing the wheel.
 */
const StepCard = forwardRef<
  HTMLElement,
  {
    i: number;
    n: number;
    pos: MotionValue<number>;
    boxRef: React.RefObject<HTMLDivElement | null>;
    children: React.ReactNode;
  }
>(function StepCard({ i, n, pos, boxRef, children }, outer) {
  const ref = useRef<HTMLElement>(null);
  useImperativeHandle(outer, () => ref.current as HTMLElement);
  const over = useMotionValue(0);
  useEffect(() => {
    const el = ref.current;
    const box = boxRef.current;
    if (!el || !box) return;
    const measure = () => over.set(Math.max(0, el.offsetHeight - box.clientHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(box);
    return () => ro.disconnect();
  }, [boxRef, over]);
  /* The read runs from just after the previous wipe to just before the next;
     the first and last steps use their edge rests too. */
  const lo = i === 0 ? -EDGE + 0.05 : -0.4;
  const hi = i === n - 1 ? EDGE - 0.05 : 0.4;
  const y = useTransform([pos, over], ([p, o]: number[]) => {
    const t = Math.min(1, Math.max(0, (p - i - lo) / (hi - lo)));
    return -o * t;
  });
  return (
    <motion.article
      ref={ref}
      className="liquid-glass absolute inset-x-0 top-0 grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-10 rounded-[20px] p-7 lg:gap-14 lg:p-9"
      style={{ y }}
      initial={{ clipPath: "inset(0 100% 0 0 round 20px)", x: 24 }}
      animate={{ clipPath: "inset(0 0% 0 0 round 20px)", x: 0 }}
      exit={{ clipPath: "inset(0 0 0 100% round 20px)", x: -24, transition: { duration: 0.35, ease: EASE_EXPO } }}
      transition={{ duration: 0.7, ease: EASE_EXPO }}
    >
      {children}
    </motion.article>
  );
});

/**
 * The pipeline: six stations on one line, a lit track that fills behind the
 * packet, and the packet itself. Every station is a button to its step.
 */
function Rail({
  words,
  along,
  beat,
  goTo,
}: {
  words: UiStrings["anatomy"];
  along: MotionValue<number>;
  beat: number;
  goTo: (i: number) => void;
}) {
  const n = words.beats.length;
  const fill = along;
  const packet = useTransform(along, (v) => `${v * 100}%`);
  return (
    <div className="relative mt-7">
      {/* The track runs station centre to station centre. */}
      <div aria-hidden className="absolute top-[11px] h-[2px] bg-[var(--color-line-strong)]" style={{ left: `${50 / n}%`, right: `${50 / n}%` }}>
        <motion.span className="spectrum-rule absolute inset-0 origin-left" style={{ scaleX: fill }} />
        <motion.span className="absolute inset-0" style={{ x: packet }}>
          <span className="absolute -left-[7px] -top-[6px] block h-[14px] w-[14px] rounded-full bg-[var(--color-holo)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-holo)_25%,transparent),0_0_24px_4px_color-mix(in_srgb,var(--color-holo)_70%,transparent)]" />
        </motion.span>
      </div>
      <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {words.beats.map((s, i) => {
          const done = i < beat;
          const on = i === beat;
          return (
            <li key={i} className="flex justify-center">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={on ? "step" : undefined}
                className="group flex min-h-11 flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full border-2 transition-[border-color,background-color,transform] duration-300",
                    on
                      ? "scale-110 border-[var(--color-holo)] bg-[var(--color-bg)]"
                      : done
                        ? "border-[var(--color-holo)] bg-[color-mix(in_srgb,var(--color-holo)_35%,var(--color-bg))]"
                        : "border-[var(--color-line-strong)] bg-[var(--color-bg)] group-hover:border-[var(--color-fg)]"
                  )}
                />
                <span
                  className={cn(
                    "tag whitespace-nowrap transition-colors duration-300",
                    on ? "text-fg" : done ? "text-fg/80" : "text-muted group-hover:text-fg"
                  )}
                >
                  <span className="tabular mr-1.5 text-[var(--color-holo)]">{String(i + 1).padStart(2, "0")}</span>
                  {s.station}
                  {/* The name starts with what is on screen (WCAG 2.5.3), then
                      says where it goes. */}
                  <span className="sr-only">: {s.title}</span>
                </span>
              </button>
            </li>
          );
        })}
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

/** The parts of a step's drawings that are facts, as plain text. */
function SrDetail({ i, words }: { i: number; words: UiStrings["anatomy"] }) {
  return (
    <>
      {words.beats[i].show.map((k) => {
        if (k === "access")
          return (
            <ul key={k}>
              {(["S", "I", "E"] as const).map((r) => (
                <li key={r}>
                  {words.risks[r].name}: {words.risks[r].threat}. {words.controlLabel}: {words.risks[r].control}.
                </li>
              ))}
            </ul>
          );
        if (k === "timing") {
          const T = words.timing;
          return (
            <p key={k}>
              {T.prediction}: 3.4 {T.unit}. {T.similarity}: 1.2 {T.unit}. {T.target}: &lt; 5 {T.unit}.
            </p>
          );
        }
        if (k === "neighbours") {
          const X = words.example2;
          return (
            <p key={k}>
              {X.label}. {X.newBug}: “{DUPLICATE.query}”. {X.matches}:{" "}
              {DUPLICATE.matches.map((m) => `“${m.text}”, ${Math.round(m.score * 100)}% ${X.similar}`).join("; ")}.
            </p>
          );
        }
        if (k === "measured") {
          const M = words.measured;
          return (
            <div key={k}>
              <p>
                {M.report.v} {M.report.k}. {M.scope}: {M.metrics.map((m) => `${m.k} ${m.v}`).join(", ")}. {M.caveat}{" "}
                {M.loop}
              </p>
              <MatrixTable words={words} />
            </div>
          );
        }
        if (k === "usability") {
          const U = words.usability;
          return (
            <p key={k}>
              {U.target}: {U.targetText}. {U.result}: {U.status}. {U.figures.map((f) => `${f.v} ${f.k}`).join(". ")}.{" "}
              {U.blockedBy}
            </p>
          );
        }
        if (k === "fixes") {
          const U = words.usability;
          return (
            <ul key={k}>
              {U.fixes.map((f) => (
                <li key={f.problem}>
                  {U.priority[f.priority]}: {f.problem}. {f.fix}. {f.open ? U.open : U.fixed}.
                </li>
              ))}
            </ul>
          );
        }
        return null;
      })}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Phones and reduced motion: the beats as a list                             */
/* -------------------------------------------------------------------------- */

function Sequence({ reduced }: { reduced: boolean }) {
  const { t } = useI18n();
  const A = t.anatomy;
  return (
    <div className="mx-auto max-w-[93.75rem] px-5 pb-24 pt-24 md:px-8 md:pb-36 md:pt-36 lg:px-16">
      <SectionHeader index={sectionIndex("#anatomy")} label={A.eyebrow} title={A.title} chapter="#anatomy" voice="tech" />
      <p className="mt-6 flex flex-col gap-1">
        <span className="micro !text-[var(--color-hazard)]">{A.credit}</span>
        <span className="micro">{A.source}</span>
      </p>
      <ol className="mt-6">
        {A.beats.map((b, i) => (
          <Step key={i} i={i} reduced={reduced} words={A} />
        ))}
      </ol>
      <CaseLink words={A} className="mt-8" />
    </div>
  );
}

function Step({ i, reduced, words }: { i: number; reduced: boolean; words: UiStrings["anatomy"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true });
  const b = words.beats[i];
  return (
    <li className="grid gap-x-14 border-b border-line py-9 md:py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div>
        <span className="micro tabular !text-[var(--color-holo)]">
          {words.step(i + 1, words.beats.length)} · {b.station}
        </span>
        <h3 className="mt-3 font-tech text-3xl font-bold uppercase leading-[1.05] text-fg md:text-4xl">{b.title}</h3>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-fg/85 md:text-xl">{b.body}</p>
        <BeatNotes i={i} words={words} className="mt-4 max-w-2xl" />
      </div>
      {/* Always in the document (its words are content), finished; it is
          drawn on again, once, as it scrolls in. Reduced motion: still. */}
      <div ref={ref} className="mt-6 max-w-2xl lg:mt-0">
        <BeatDetail key={seen ? "on" : "off"} i={i} words={words} animate={seen && !reduced} />
      </div>
    </li>
  );
}
