"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { sectionIndex, timeline as baseTimeline, type TimelineEntry } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { openCase } from "@/lib/caseFile";
import { isInteractive, modalOpen } from "@/lib/keys";
import { distanceKm, type StopKey } from "@/lib/routeGeo";
import { airAt, shotAt, WHOLE_ROUTE, type FlightPlan } from "@/lib/routeFlight";
import type { GlobeFrame } from "@/lib/globeShader";
import { EASE_DEVELOP } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { IconArrowRight } from "@/components/ui/HudIcons";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { RouteGlobe } from "@/components/path/RouteGlobe";
import { DateStamp, yearNeon, type PathWords } from "@/components/path/NeonStamp";
import { ScriptLabel } from "@/components/ui/ScriptLabel";
import { OrgMark } from "@/components/ui/OrgMark";
import { DecodeText, ReadLine, Shard, shardLamp } from "@/components/path/Shard";
import { LandingPhotos } from "@/components/path/LandingPhotos";
import { PhotoFigure } from "@/components/path/PhotoPlate";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Path: the route.

   His record is a journey with a shape — Ulaanbaatar, then Erie, then home —
   so the chapter flies it. A pinned stage with the LED globe across all of it
   and one board on the right. Scrolling moves through the entries in the order
   they happened while the camera (lib/routeFlight) holds over each city, and
   at each change of city it climbs and flies the leg: the line lighting
   across the top of the world on the way out, a packet running it home. Over
   the long Erie stay the camera keeps drifting in, so the map never sits
   dead. The last entry's tail runs the freight between Ulaanbaatar and the
   mine, which is what that job was.

   At each city the place itself lands out of its lamp: a photo on a plate,
   tethered to the lamp, each with its own reveal (path/LandingPhotos). The
   camera lifts the city while one is up, so the plate sits under it.

   The board says each thing once: every entry is a row, and the one on screen
   opens in place with its neon stamp (the old ledger's, path/NeonStamp), what
   it was, and its figures. The flights are rows too.

   Phones and reduced motion get the whole route as one still view of the
   globe, drawn once, over the record grouped by city — no pin. Without WebGL
   the record alone carries the route, as text.
   --------------------------------------------------------------------------- */

/** Scroll per entry, in viewport heights. */
const STEP_VH = 46;
/** Length of a flight, in entries. */
const LEG = 1.6;
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

/** Each entry's stretch of the stage: up to the next entry or flight. The
    first begins where the stage does; the last runs to its end. */
const WINDOWS: [number, number][] = BEATS.at.map((a, i, all) => [
  i === 0 ? -EDGE : a - 0.5,
  i === all.length - 1 ? BEATS.span : a + 0.5,
]);

/** Where the subject sits, 0–1 down the stage: higher over a city, so the
    landing photo fits under it; back to the middle in flight. */
const FY_GROUND = 0.38;
const FY_AIR = 0.56;

const FLIGHT: FlightPlan = {
  from: -EDGE,
  to: BEATS.span,
  out: OUT ?? { start: 0, end: 0 },
  back: BACK ?? { start: BEATS.span, end: BEATS.span },
};

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

  /* The subject sits left of the board: further left when the board is
     proportionally wider. */
  const fx = useMotionValue(0.33);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => fx.set(mq.matches ? 0.33 : 0.27);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [fx]);

  const frame = useTransform<number, GlobeFrame>([pos, fx], ([p, x]) => ({
    ...shotAt(p, FLIGHT, x, FY_GROUND + (FY_AIR - FY_GROUND) * airAt(p, FLIGHT)),
    out: OUT ? span(p, OUT.start, OUT.end) : 1,
    back: BACK ? span(p, BACK.start, BACK.end) : 0,
    freight: span(p, BEATS.freight[0], BEATS.freight[1]),
  }));

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
  const [noGlobe, setNoGlobe] = useState(false);

  return (
    <div className="sticky top-0 h-dvh w-full overflow-hidden">
      <RouteGlobe
        className="absolute inset-0"
        frame={frame}
        here={here}
        labels={P.places}
        distance={P.distance(KM)}
        onUnavailable={() => setNoGlobe(true)}
      />
      <LandingPhotos entries={entries} windows={WINDOWS} pos={pos} frame={frame} words={P} tether={!noGlobe} />
      {/* The page falls off behind the board, so its text sits on dark. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-[58%] bg-[linear-gradient(to_right,transparent,color-mix(in_srgb,var(--color-bg)_70%,transparent)_38%)]"
      />
      <div className="pointer-events-none relative mx-auto flex h-full max-w-[1800px] flex-col px-5 pb-6 pt-20 md:px-8 lg:px-16">
        {/* The masthead on the left, the board on the right from the top:
            the board needs the height more than the hint does. */}
        <div className="flex min-h-0 flex-1 items-start justify-between gap-6 pt-3">
          <div className="pointer-events-auto relative">
            <ScriptLabel href="#timeline" />
            <span className="eyebrow kicker-plate">
              {sectionIndex("#timeline")} — {P.eyebrow}
            </span>
            <h2 className="display-caps mt-3 text-[clamp(1.6rem,3.4vw,3.25rem)] text-fg [@media(max-height:820px)]:text-[clamp(1.4rem,2.6vw,2.4rem)]">
              {P.title}
            </h2>
            <span className="micro tabular mt-3 hidden !text-fg/85 lg:block">{P.hint}</span>
          </div>
          <Board
            entries={entries}
            moment={moment}
            pos={pos}
            words={P}
            goTo={goTo}
            className="pointer-events-auto max-h-full w-[min(58%,640px)] lg:w-[min(50%,720px)]"
          />
        </div>
      </div>
    </div>
  );
}

/** The figures an entry carries: the GPA on the degree, the capstone's measurements. */
function Extra({
  entry,
  words,
  compact,
  className,
}: {
  entry: TimelineEntry;
  words: PathWords;
  /** Set smaller, for the board. */
  compact?: boolean;
  className?: string;
}) {
  const { c } = useI18n();
  if (entry.extra === "gpa") {
    return (
      <div className={cn("flex items-baseline gap-3", className)}>
        <span className={cn("display-caps tabular text-fg", compact ? "text-xl" : "text-2xl")}>
          3.68<span className="text-base text-muted">/4</span>
        </span>
        <span className="micro">{words.gpa}</span>
      </div>
    );
  }
  if (entry.extra === "spotfixes") {
    const metrics = c.projects.find((p) => p.slug === "spotfixes")?.metrics ?? [];
    return (
      <dl className={cn("flex flex-wrap gap-y-2", compact ? "gap-x-5" : "gap-x-7", className)}>
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col-reverse">
            <dt className="micro">{m.label}</dt>
            <dd className={cn("display-caps tabular text-fg", compact ? "text-lg" : "text-xl")}>{m.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return null;
}

/**
 * The board: every entry, in order, with the flights between them. Each row
 * takes you to its entry; the one on screen opens in place, and a flight's row
 * opens while it is flown. Rows ahead of you are dim.
 *
 * This is also the chapter's text for assistive tech: each row's button is
 * named by its year, title and city, and the period, organisation and
 * description follow it as hidden text (the opened detail is decoration).
 */
function Board({
  entries,
  moment,
  pos,
  words,
  goTo,
  className,
}: {
  entries: TimelineEntry[];
  moment: Moment;
  /** Where the stage is, in entry units: a flight's packet runs on it. */
  pos: MotionValue<number>;
  words: PathWords;
  goTo: (i: number) => void;
  className?: string;
}) {
  const reached = moment.kind === "entry" ? moment.i : BEATS.legs[moment.k].after;
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col self-start border border-line bg-[color-mix(in_srgb,var(--color-bg)_80%,transparent)] px-4 pb-2 pt-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] lg:px-5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-line-strong">
        <span className="micro">{words.board}</span>
        <button
          type="button"
          onClick={() => openCase("spotfixes")}
          className="micro inline-flex min-h-11 items-center gap-1.5 !text-fg transition-colors hover:!text-[var(--color-hazard)]"
        >
          {words.openCase} <IconArrowRight size={13} />
        </button>
      </div>
      <ol className="min-h-0 overflow-hidden">
        {entries.map((e, i) => {
          const on = moment.kind === "entry" && moment.i === i;
          const leg = BEATS.legs.find((l) => l.after === i);
          const legOn = !!leg && moment.kind === "leg" && BEATS.legs[moment.k] === leg;
          return (
            <li key={`${e.title}-${i}`}>
              {leg && <LegRow leg={leg} on={legOn} done={i <= reached} words={words} pos={pos} />}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={on ? "step" : undefined}
                  className={cn(
                    "grid w-full grid-cols-[3.75rem_minmax(0,1fr)] items-center gap-4 border-b border-line px-2 py-2.5 text-left transition-[opacity,background-color] duration-300 [@media(max-height:820px)]:py-1",
                    on
                      ? "bg-[color-mix(in_srgb,var(--color-hazard)_9%,transparent)]"
                      : "hover:bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)]",
                    !on && i > reached && "opacity-60"
                  )}
                >
                  {/* The row's lamp, in its shard's class colour: a notch while
                      closed, so the type reads down the list, the full bar
                      when open. */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0 top-1/2 w-[2px] -translate-y-1/2 transition-[height,opacity] duration-300",
                      on ? "h-[calc(100%-8px)] opacity-100" : "h-2 opacity-60"
                    )}
                    style={shardLamp(e.kind)}
                  />
                  <span className="display-caps tabular text-base" style={{ color: yearNeon(e.start.year) }}>
                    {e.start.year}
                  </span>
                  <span className="line-clamp-2 min-w-0 font-tech text-base font-semibold uppercase leading-tight tracking-wide text-fg lg:text-lg lg:leading-tight">
                    {on ? <ScrambleText key={`s${i}-${e.title}`} text={e.title} immediate speed={28} /> : e.title}
                  </span>
                  <span className="sr-only">, {words.places[e.stop]}</span>
                </button>
                <span className="sr-only">
                  {e.period}. {e.org}. {e.description}
                </span>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div
                      key="open"
                      aria-hidden
                      className="overflow-hidden"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.42, ease: EASE_DEVELOP }}
                    >
                      <Opened entry={e} words={words} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** A flight between cities, as a board row; while it is flown, it opens. */
function LegRow({
  leg,
  on,
  done,
  words,
  pos,
}: {
  leg: Leg;
  on: boolean;
  done: boolean;
  words: PathWords;
  pos: MotionValue<number>;
}) {
  return (
    <div aria-hidden className="border-b border-line">
      <div
        className={cn(
          "tag flex items-center gap-3 px-2 py-1.5 transition-colors duration-300 [@media(max-height:820px)]:py-1",
          on ? "text-[var(--color-holo)]" : done ? "text-muted" : "text-faint"
        )}
      >
        <span>{words.places[leg.from]}</span>
        <IconArrowRight size={13} />
        <span>{words.places[leg.to]}</span>
        <span className="tabular ml-auto">{words.distance(KM)}</span>
      </div>
      <AnimatePresence initial={false}>
        {on && (
          <motion.div
            key="open"
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.42, ease: EASE_DEVELOP }}
          >
            <div className="px-2 pb-4 pt-1">
              <span className="micro !text-[var(--color-holo)]">{words.transit}</span>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-tech text-xl font-bold uppercase leading-tight text-fg">
                <span>{words.placesLong[leg.from]}</span>
                <IconArrowRight size={18} className="text-[var(--color-hazard)]" />
                <span>{words.placesLong[leg.to]}</span>
              </p>
              <p
                className="display-caps tabular mt-3 text-[clamp(1.4rem,2.2vw,2.1rem)] leading-none"
                style={{ color: "var(--color-holo)", textShadow: "0 0 18px color-mix(in srgb, var(--color-holo) 45%, transparent)" }}
              >
                {words.distance(KM)}
              </p>
              <Packet leg={leg} pos={pos} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The flight as a packet on a dotted line — the ground's rain turned on its
 * side: the trail fills behind it and the head runs the distance as the leg
 * is flown. Scrubbed by the leg's own progress, so it is driven and
 * reversible, and still when the scroll is.
 */
function Packet({ leg, pos }: { leg: Leg; pos: MotionValue<number> }) {
  const p = useTransform(pos, (v) => span(v, leg.start, leg.end));
  const x = useTransform(p, (v) => `${v * 100}%`);
  return (
    <div aria-hidden className="relative mt-4 h-2 w-full">
      <span
        className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 opacity-50"
        style={{
          backgroundImage: "radial-gradient(circle, var(--color-holo) 0 1px, transparent 1.4px)",
          backgroundSize: "6px 3px",
          backgroundRepeat: "repeat-x",
        }}
      />
      <motion.span
        className="absolute inset-x-0 top-1/2 h-px origin-left -translate-y-1/2"
        style={{ scaleX: p, background: "linear-gradient(90deg, transparent, var(--color-holo))" }}
      />
      <motion.span className="absolute inset-0" style={{ x }}>
        <span
          className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#dcfbff]"
          style={{ boxShadow: "0 0 10px 2px var(--color-holo)" }}
        />
      </motion.span>
    </div>
  );
}

/** The entry on screen, opened: its neon stamp beside what it was. */
function Opened({ entry, words }: { entry: TimelineEntry; words: PathWords }) {
  /* The stamp strikes when it arrives: flip `play` on the frame after mount
     (framer's `initial={false}` would otherwise land on the end state). */
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPlay(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-5 px-2 pb-3 pt-3 lg:gap-6">
      <DateStamp entry={entry} play={play} instant={false} words={words} size="md" noNote />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <Shard entry={entry} words={words} play={play} instant={false} className="ml-[5px] mt-[5px]" />
          {entry.mark && <OrgMark mark={entry.mark} height={44} className="mt-1" />}
        </div>
        <div className="relative mt-3.5">
          <ReadLine play={play} instant={false} />
          <p className="tag text-fg/85">
            <DecodeText text={entry.org} play={play} instant={false} />
          </p>
          <p className="mt-1.5 text-base leading-snug text-fg/85">{entry.description}</p>
          <Extra entry={entry} words={words} compact className="mt-2.5" />
        </div>
      </div>
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
  const [noGlobe, setNoGlobe] = useState(false);

  /* The route draws once, the first time the globe is seen — out, home, then
     the freight — and stays drawn. Under reduced motion it is simply there. */
  const out = useMotionValue(reduced ? 1 : 0);
  const back = useMotionValue(reduced ? 1 : 0);
  const freight = useMotionValue(reduced ? 1 : 0);
  /* The whole route is wider than it is tall: on a narrow box the camera
     stands further off, so both ends stay in frame. */
  const aspect = useMotionValue(1);
  const frame = useTransform<number, GlobeFrame>([out, back, freight, aspect], ([o, b, f, a]) => ({
    ...WHOLE_ROUTE,
    h: WHOLE_ROUTE.h * Math.max(1, a * 1.25),
    fx: 0.5,
    fy: 0.74,
    out: o,
    back: b,
    freight: f,
  }));
  const mapRef = useRef<HTMLDivElement>(null);
  const seen = useInView(mapRef, { once: true, amount: 0.4 });
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => aspect.set(el.clientHeight / Math.max(1, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect, noGlobe]);
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

      {!noGlobe && (
        <div ref={mapRef} className="relative mt-8 h-[min(82vw,460px)] w-full">
          {/* The southern half is open sea: it falls away into the page. */}
          <RouteGlobe
            className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_72%,transparent)]"
            frame={frame}
            here={null}
            labels={P.places}
            distance={P.distance(KM)}
            mask="small"
            pitch={4}
            onUnavailable={() => setNoGlobe(true)}
          />
        </div>
      )}

      {groups.map((g, k) => (
        <div key={k} className="mt-10 first-of-type:mt-6">
          {g.leg && (
            <p className="tag mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--color-holo)]">
              <span>{P.places[g.leg.from]}</span>
              <IconArrowRight size={12} />
              <span>{P.places[g.leg.to]}</span>
              <span className="tabular text-muted">· {P.distance(KM)}</span>
            </p>
          )}
          <h3 className="flex items-center gap-3 font-mono text-base uppercase tracking-[0.1em] text-fg">
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
        <DateStamp entry={entry} play={play} instant={reduced} words={words} noNote />
      </div>
      <div>
        <div className="flex items-start justify-between gap-4">
          <Shard entry={entry} words={words} play={play} instant={reduced} className="ml-[5px] mt-[5px]" />
          {entry.mark && <OrgMark mark={entry.mark} height={48} />}
        </div>
        <h4 className="mt-5 font-tech text-3xl font-bold uppercase leading-[1.08] text-balance text-fg md:text-4xl">
          {entry.title}
        </h4>
        <p className="mt-3 font-mono text-base uppercase tracking-[0.08em] text-fg/85">
          <DecodeText text={entry.org} play={play} instant={reduced} />
        </p>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-fg/85">{entry.description}</p>
        {entry.photo && (
          <PhotoFigure
            photo={entry.photo}
            caption={words.photos[entry.photo].caption}
            alt={words.photos[entry.photo].alt}
            crop={entry.crop}
            reduced={reduced}
            className="mt-6 max-w-2xl"
          />
        )}
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
