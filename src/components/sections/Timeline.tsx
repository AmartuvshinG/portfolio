"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { BriefcaseBusiness, GraduationCap, Layers } from "lucide-react";
import { sectionIndex, timeline as baseTimeline, type TimelineEntry } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { openCase } from "@/lib/caseFile";
import { isInteractive, modalOpen } from "@/lib/keys";
import { distanceKm, type StopKey } from "@/lib/routeGeo";
import { EASE_DEVELOP } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { IconArrowRight } from "@/components/ui/HudIcons";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { RouteMap, type RouteProgress } from "@/components/path/RouteMap";
import { DateStamp, yearNeon, type PathWords } from "@/components/path/NeonStamp";
import { ScriptLabel } from "@/components/ui/ScriptLabel";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Path: the route.

   His record is a journey with a shape — Ulaanbaatar, then Erie, then home —
   so the chapter flies it. A pinned stage: the LED globe across the top, the
   entry on screen below it on the left, and the whole route as a log on the
   right. Scrolling moves through the entries in the order they happened; at
   each change of city the stage stops to fly the leg, the line lighting across
   the Arctic on the way out and a packet running it back on the way home. The
   last entry's tail runs the freight between Ulaanbaatar and the mine, which
   is what that job was.

   The neon date stamps are the old ledger's, unchanged (path/NeonStamp).

   Phones and reduced motion get the same globe, drawn once, over the record as
   a list grouped by city — no pin.
   --------------------------------------------------------------------------- */

/** Scroll per entry, in viewport heights. */
const STEP_VH = 46;
/** Length of a flight, in entries. */
const LEG = 1.3;
/** Rest before the first entry. */
const EDGE = 0.3;
/** The last entry's stay, through which the freight runs. */
const TAIL = 1.1;

/** Locale-free: both languages list the same entries in the same places. */
const KM = Math.round(distanceKm("ub", "erie") / 10) * 10;

interface Leg {
  from: StopKey;
  to: StopKey;
  start: number;
  end: number;
  /** The entries either side of it. */
  before: number;
  after: number;
}

/** Where each entry and each flight sits along the stage, in entry units. */
function plan(entries: Pick<TimelineEntry, "stop">[]) {
  const at: number[] = [];
  const legs: Leg[] = [];
  let p = 0;
  entries.forEach((e, i) => {
    if (i > 0) {
      p += 1;
      const prev = entries[i - 1].stop;
      if (e.stop !== prev) {
        legs.push({ from: prev, to: e.stop, start: p - 0.5, end: p - 0.5 + LEG, before: i - 1, after: i });
        p += LEG;
      }
    }
    at.push(p);
  });
  const last = at[at.length - 1];
  const end = last + TAIL;
  return { at, legs, freight: [last - 0.3, end - 0.15] as const, span: end + EDGE };
}
const BEATS = plan(baseTimeline);
const OUT = BEATS.legs.find((l) => l.from === "ub" && l.to === "erie");
const BACK = BEATS.legs.find((l) => l.from === "erie" && l.to === "ub");

type Moment = { kind: "entry"; i: number } | { kind: "leg"; k: number };

function momentAt(pos: number): Moment {
  const k = BEATS.legs.findIndex((l) => pos >= l.start && pos < l.end);
  if (k >= 0) return { kind: "leg", k };
  let i = 0;
  BEATS.at.forEach((a, j) => {
    if (a - 0.5 <= pos) i = j;
  });
  return { kind: "entry", i };
}

const sameMoment = (a: Moment, b: Moment) =>
  a.kind === b.kind && (a.kind === "entry" ? a.i === (b as typeof a).i : a.k === (b as typeof a).k);

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const span = (pos: number, a: number, b: number) => clamp01((pos - a) / (b - a));

export function Timeline() {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  /* Stacked until we know there is room to pin; SSR and first paint agree. */
  const [roomy, setRoomy] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (min-height: 600px)");
    const update = () => setRoomy(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const pinned = roomy && !reduced;

  /* One <section> for both layouts, never swapped (see SelectedWork): the
     navbar, ChapterFrame and ChapterKeys hold on to it from mount. */
  return (
    <section
      ref={ref}
      id="timeline"
      data-act="deck"
      data-chapter="ROUTE"
      aria-label={t.path.aria}
      /* `clip`, not `hidden`: it trims the title card's streak at the edge of
         a phone without making a scroll container, so the stage still sticks. */
      className="relative overflow-x-clip"
      style={pinned ? { height: `${(BEATS.span + EDGE) * STEP_VH + 100}vh` } : undefined}
    >
      <ChapterSeam />
      {pinned ? <Stage sectionRef={ref} /> : <Record reduced={reduced} />}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* The pinned stage                                                           */
/* -------------------------------------------------------------------------- */

function Stage({ sectionRef: ref }: { sectionRef: React.RefObject<HTMLElement | null> }) {
  const { c, t } = useI18n();
  const P = t.path;
  const entries = c.timeline;
  const { scrollTo } = useSmoothScroll();

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const pos = useTransform(scrollYProgress, (p) => p * (BEATS.span + EDGE) - EDGE);
  const out = useTransform(pos, (v) => (OUT ? span(v, OUT.start, OUT.end) : 1));
  const back = useTransform(pos, (v) => (BACK ? span(v, BACK.start, BACK.end) : 0));
  const freight = useTransform(pos, (v) => span(v, BEATS.freight[0], BEATS.freight[1]));
  const progress = useMemo<RouteProgress>(() => ({ out, back, freight }), [out, back, freight]);

  const [moment, setMoment] = useState<Moment>(() => momentAt(pos.get()));
  useMotionValueEvent(pos, "change", (v) => {
    const m = momentAt(v);
    setMoment((prev) => (sameMoment(prev, m) ? prev : m));
  });

  /** Scroll to entry `i`'s plateau. */
  const goTo = useCallback(
    (i: number) => {
      const el = ref.current;
      if (!el) return;
      const k = Math.min(entries.length - 1, Math.max(0, i));
      const top = el.getBoundingClientRect().top + window.scrollY;
      const travel = el.offsetHeight - window.innerHeight;
      scrollTo(top + ((BEATS.at[k] + EDGE) / (BEATS.span + EDGE)) * travel);
    },
    [entries.length, scrollTo, ref]
  );

  /* ←/→ while the stage is pinned, as in Work. Up/down stay with ChapterKeys. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (modalOpen() || isInteractive(document.activeElement)) return;
      const r = ref.current?.getBoundingClientRect();
      if (!r || r.top > 1 || r.bottom < window.innerHeight - 1) return;
      e.preventDefault();
      const fwd = e.key === "ArrowRight";
      if (moment.kind === "entry") goTo(moment.i + (fwd ? 1 : -1));
      else {
        const leg = BEATS.legs[moment.k];
        goTo(fwd ? leg.after : leg.before);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moment, goTo, ref]);

  const here: StopKey | null = moment.kind === "entry" ? entries[moment.i].stop : null;
  /** Entries before this are behind us. */
  const reached = moment.kind === "entry" ? moment.i : BEATS.legs[moment.k].after;

  return (
    <div className="sticky top-0 h-dvh w-full overflow-hidden">
      <div className="relative mx-auto flex h-full max-w-[1800px] flex-col px-5 pb-6 pt-20 md:px-8 lg:px-16">
        {/* The globe, with the masthead over its dark upper corner. */}
        <div className="relative min-h-0 flex-[1.05] [@media(max-height:820px)]:flex-[0.8]">
          <RouteMap
            className="absolute inset-0"
            progress={progress}
            here={here}
            labels={P.places}
            distance={P.distance(KM)}
          />
          <div className="relative flex items-start justify-between gap-6 pt-3">
            <div className="relative">
              <ScriptLabel href="#timeline" />
              <span className="eyebrow kicker-plate">
                {sectionIndex("#timeline")} — {P.eyebrow}
              </span>
              <h2 className="display-caps mt-3 text-[clamp(1.6rem,3.4vw,3.25rem)] text-fg">{P.title}</h2>
            </div>
            <span className="micro tabular hidden pt-2 lg:block">{P.hint}</span>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 pt-2 lg:gap-14">
          {/* The entry on screen. Decoration: the log beside it carries the
              same words, and more, for assistive tech. */}
          <div aria-hidden className="relative min-h-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={moment.kind === "entry" ? `e${moment.i}` : `l${moment.k}`}
                className="absolute inset-0"
                initial={{ opacity: 0, clipPath: "inset(0% 0% 100% 0%)" }}
                animate={{ opacity: 1, clipPath: "inset(0% 0% 0% 0%)" }}
                exit={{ opacity: 0, transition: { duration: 0.14 } }}
                transition={{ duration: 0.45, ease: EASE_DEVELOP }}
              >
                {moment.kind === "entry" ? (
                  <EntryCard entry={entries[moment.i]} words={P} />
                ) : (
                  <TransitCard leg={BEATS.legs[moment.k]} words={P} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <Log entries={entries} moment={moment} reached={reached} words={P} goTo={goTo} />
        </div>
      </div>
    </div>
  );
}

/** The entry on screen: the neon stamp beside what it was. */
function EntryCard({ entry, words }: { entry: TimelineEntry; words: PathWords }) {
  /* The stamp strikes when it arrives: flip `play` on the frame after mount
     (framer's `initial={false}` would otherwise land on the end state). */
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPlay(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-6 lg:gap-9">
      <DateStamp entry={entry} play={play} instant={false} words={words} size="md" />
      <div className="min-w-0">
        <KindTag kind={entry.kind} words={words} />
        {/* A long title steps down a size rather than pushing the card off
            the stage: the stage is one screen tall and does not scroll. */}
        <h3
          className={cn(
            "mt-3 font-tech font-bold uppercase leading-[1.08] text-balance text-fg",
            entry.title.length > 40
              ? "text-xl lg:text-2xl [@media(max-height:820px)]:text-lg"
              : "text-2xl lg:text-[2rem] [@media(max-height:820px)]:text-2xl"
          )}
        >
          {entry.title}
        </h3>
        <p className="mt-2 font-mono text-sm uppercase tracking-[0.18em] text-fg/70">{entry.org}</p>
        <p className="mt-3 line-clamp-5 max-w-2xl text-base leading-relaxed text-fg/80 lg:text-[1.0625rem] [@media(max-height:820px)]:text-[0.9375rem] [@media(max-height:820px)]:leading-snug">
          {entry.description}
        </p>
        <Extra entry={entry} words={words} className="mt-4" />
      </div>
    </div>
  );
}

/** Between cities: where from, where to, how far. */
function TransitCard({ leg, words }: { leg: Leg; words: PathWords }) {
  return (
    <div>
      <span className="micro !text-[var(--color-holo)]">{words.transit}</span>
      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-tech text-2xl font-bold uppercase leading-tight text-fg lg:text-[2rem]">
        <span>{words.placesLong[leg.from]}</span>
        <IconArrowRight size={22} className="text-[var(--color-hazard)]" />
        <span>{words.placesLong[leg.to]}</span>
      </p>
      <p
        className="display-caps tabular mt-5 text-[clamp(1.5rem,2.6vw,2.5rem)] leading-none"
        style={{ color: "var(--color-holo)", textShadow: "0 0 18px color-mix(in srgb, var(--color-holo) 45%, transparent)" }}
      >
        {words.distance(KM)}
      </p>
    </div>
  );
}

function KindTag({ kind, words }: { kind: TimelineEntry["kind"]; words: PathWords }) {
  const Icon = kind === "education" ? GraduationCap : kind === "project" ? Layers : BriefcaseBusiness;
  return (
    <span className="hud-brackets inline-flex items-center gap-1.5 px-3 py-1 font-mono text-sm uppercase tracking-wider text-muted [--hud-c:color-mix(in_srgb,var(--color-hazard)_80%,transparent)] [--hud-l:6px]">
      <Icon size={14} aria-hidden />
      {kind === "education" ? words.education : kind === "project" ? words.project : words.work}
    </span>
  );
}

/** The figures an entry carries: the GPA on the degree, the capstone's measurements. */
function Extra({ entry, words, className }: { entry: TimelineEntry; words: PathWords; className?: string }) {
  const { c } = useI18n();
  if (entry.extra === "gpa") {
    return (
      <div className={cn("flex items-baseline gap-3", className)}>
        <span className="display-caps tabular text-2xl text-fg">
          3.68<span className="text-base text-muted">/4</span>
        </span>
        <span className="micro">{words.gpa}</span>
      </div>
    );
  }
  if (entry.extra === "spotfixes") {
    const metrics = c.projects.find((p) => p.slug === "spotfixes")?.metrics ?? [];
    return (
      <dl className={cn("flex flex-wrap gap-x-7 gap-y-2", className)}>
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col-reverse">
            <dt className="micro">{m.label}</dt>
            <dd className="display-caps tabular text-xl text-fg">{m.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return null;
}

/**
 * The route log: every entry, in order, with the flights between them. Each
 * row takes you to its entry. Rows ahead of you are dim; the one on screen
 * decodes its title like a departures board turning over.
 *
 * This is also the chapter's text for assistive tech: each row's button is
 * named by its year, title and city, and the period, organisation and
 * description follow it as hidden text.
 */
function Log({
  entries,
  moment,
  reached,
  words,
  goTo,
}: {
  entries: TimelineEntry[];
  moment: Moment;
  reached: number;
  words: PathWords;
  goTo: (i: number) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-line-strong pb-2">
        <span className="micro">{words.board}</span>
        <button
          type="button"
          onClick={() => openCase("spotfixes")}
          className="micro inline-flex min-h-6 items-center gap-1.5 !text-fg transition-colors hover:!text-[var(--color-hazard)]"
        >
          {words.openCase} <IconArrowRight size={13} />
        </button>
      </div>
      <ol className="min-h-0 overflow-hidden">
        {entries.map((e, i) => {
          const on = moment.kind === "entry" && moment.i === i;
          const leg = BEATS.legs.find((l) => l.after === i);
          const legOn = leg && moment.kind === "leg" && BEATS.legs[moment.k] === leg;
          return (
            <li key={`${e.title}-${i}`}>
              {leg && (
                <div
                  aria-hidden
                  className={cn(
                    "flex items-center gap-3 border-b border-line px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.2em] transition-colors duration-300 [@media(max-height:820px)]:py-1",
                    legOn ? "text-[var(--color-holo)]" : i <= reached ? "text-faint" : "text-faint/60"
                  )}
                >
                  <span>{words.places[leg.from]}</span>
                  <IconArrowRight size={11} />
                  <span>{words.places[leg.to]}</span>
                  <span className="tabular ml-auto">{words.distance(KM)}</span>
                </div>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={on ? "step" : undefined}
                  className={cn(
                    "grid w-full grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-line px-3 py-2 text-left transition-[opacity,background-color] duration-300 [@media(max-height:820px)]:py-1.5",
                    on
                      ? "bg-[color-mix(in_srgb,var(--color-hazard)_9%,transparent)]"
                      : "hover:bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)]",
                    !on && i > reached && "opacity-45"
                  )}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-1 left-0 w-[2px] transition-colors duration-300"
                    style={{ background: on ? "var(--color-hazard)" : "transparent" }}
                  />
                  <span className="display-caps tabular text-sm" style={{ color: yearNeon(e.start.year) }}>
                    {e.start.year}
                  </span>
                  <span className="min-w-0 truncate font-tech text-[0.9375rem] font-semibold uppercase tracking-wide text-fg">
                    {on ? <ScrambleText key={`s${i}`} text={e.title} immediate speed={28} /> : e.title}
                  </span>
                  <span className="micro hidden xl:inline">{words.places[e.stop]}</span>
                </button>
                <span className="sr-only">
                  {e.period}. {e.org}. {e.description}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Phones and reduced motion: the globe over the record                       */
/* -------------------------------------------------------------------------- */

function Record({ reduced }: { reduced: boolean }) {
  const { c, t } = useI18n();
  const P = t.path;
  const entries = c.timeline;

  /* The route draws once, the first time the globe is seen — out, home, then
     the freight — and stays drawn. Under reduced motion it is simply there. */
  const out = useMotionValue(reduced ? 1 : 0);
  const back = useMotionValue(reduced ? 1 : 0);
  const freight = useMotionValue(reduced ? 1 : 0);
  const progress = useMemo<RouteProgress>(() => ({ out, back, freight }), [out, back, freight]);
  const mapRef = useRef<HTMLDivElement>(null);
  const seen = useInView(mapRef, { once: true, amount: 0.4 });
  useEffect(() => {
    if (!seen) return;
    if (reduced) {
      out.set(1);
      back.set(1);
      freight.set(1);
      return;
    }
    let stopped = false;
    const run = async () => {
      await animate(out, 1, { duration: 1.6, ease: [0.4, 0, 0.2, 1] });
      if (stopped) return;
      await animate(back, 1, { duration: 1.1, ease: "linear" });
      if (stopped) return;
      await animate(freight, 0.999, { duration: 1.4, ease: "linear" });
      if (!stopped) freight.set(1);
    };
    void run();
    return () => {
      stopped = true;
    };
  }, [seen, reduced, out, back, freight]);

  /* The record in runs of one city, with the flight that led to each run. */
  const groups: { stop: StopKey; leg?: Leg; items: { entry: TimelineEntry; i: number }[] }[] = [];
  entries.forEach((entry, i) => {
    const last = groups[groups.length - 1];
    if (last && last.stop === entry.stop) last.items.push({ entry, i });
    else groups.push({ stop: entry.stop, leg: BEATS.legs.find((l) => l.after === i), items: [{ entry, i }] });
  });

  return (
    <div className="mx-auto max-w-[1800px] px-5 pb-24 pt-24 md:px-8 md:pb-36 md:pt-36 lg:px-16">
      <SectionHeader index={sectionIndex("#timeline")} label={P.eyebrow} title={P.title} chapter="#timeline" />

      <div ref={mapRef} className="relative mt-8 h-[min(48vw,440px)] w-full">
        <RouteMap
          className="absolute inset-0"
          progress={progress}
          here={null}
          labels={P.places}
          distance={P.distance(KM)}
        />
      </div>

      {groups.map((g, k) => (
        <div key={k} className="mt-10 first-of-type:mt-6">
          {g.leg && (
            <p className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-holo)]">
              <span>{P.places[g.leg.from]}</span>
              <IconArrowRight size={12} />
              <span>{P.places[g.leg.to]}</span>
              <span className="tabular text-faint">· {P.distance(KM)}</span>
            </p>
          )}
          <h3 className="flex items-center gap-3 font-mono text-sm uppercase tracking-[0.22em] text-fg">
            <span aria-hidden className="h-2 w-2 rotate-45 bg-[var(--color-hazard)]" />
            {P.placesLong[g.stop]}
          </h3>
          <ol className="mt-2">
            {g.items.map(({ entry, i }) => (
              <Row key={`${entry.title}-${i}`} entry={entry} reduced={reduced} words={P} />
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

function Row({ entry, reduced, words }: { entry: TimelineEntry; reduced: boolean; words: PathWords }) {
  const ref = useRef<HTMLLIElement>(null);
  /* Not `once`: leaving the screen resets the stamp, so it strikes again when
     the row comes back. */
  const inView = useInView(ref, { margin: "0px 0px -18% 0px", amount: 0.25 });
  const play = reduced || inView;

  return (
    <li
      ref={ref}
      className="grid gap-5 border-b border-line py-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10 md:py-12 lg:grid-cols-[19rem_minmax(0,1fr)]"
    >
      <div>
        <span className="sr-only">{entry.period}</span>
        <DateStamp entry={entry} play={play} instant={reduced} words={words} />
      </div>
      <div>
        <KindTag kind={entry.kind} words={words} />
        <h4 className="mt-4 font-tech text-3xl font-bold uppercase leading-[1.08] text-balance text-fg md:text-4xl">
          {entry.title}
        </h4>
        <p className="mt-3 font-mono text-sm uppercase tracking-[0.18em] text-fg/70 md:text-base">{entry.org}</p>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-fg/80">{entry.description}</p>
        <Extra entry={entry} words={words} className="mt-5" />
        {entry.extra === "spotfixes" && (
          <button
            type="button"
            onClick={() => openCase("spotfixes")}
            className="micro mt-5 inline-flex min-h-11 items-center gap-1.5 !text-fg transition-colors hover:!text-[var(--color-hazard)]"
          >
            {words.openCase} <IconArrowRight size={13} />
          </button>
        )}
      </div>
    </li>
  );
}
