"use client";

import { education, sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { Reveal, RevealStagger } from "@/components/motion/Reveal";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import {
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { DecodeText } from "@/components/motion/DecodeText";
import { InkSign } from "@/components/ui/InkSign";
import { NeonSign } from "@/components/ui/NeonSign";
import { ScrubWords } from "@/components/motion/ScrubWords";
import { GlareCard } from "@/components/motion/GlareCard";
import { ScriptLabel } from "@/components/ui/ScriptLabel";

/**
 * About: a statement, four numbers, then the story — Lando Norris's order
 * (a line the size of the screen, then the results, then the person), in the
 * city's light rather than his paper and lime.
 *
 *   1. **The statement.** The lead set at display size, lit a word at a time
 *      in the ramp as you scroll. On a screen with room for it, the frame
 *      pins while it lights, so the sentence is read at the pace you scroll.
 *   2. **The numbers.** Four figures, each striking on once like a tube as
 *      the statement completes. Settle-once, never a rolling counter (an
 *      odometer was turned down as "a lottery machine"). Every figure is
 *      already stated elsewhere on the page.
 *   3. **The story.** The two paragraphs beside his ID: the old dossier plate
 *      as a card that tilts toward the pointer, with its scan and decode.
 *
 * Then a band of what he does, scrubbed sideways by the scroll (not an idle
 * marquee: it moves only when the page does). It sits on the shared ground,
 * like every section.
 */

/** Room for the pinned frame: the statement and the numbers at full size. */
const STAGE_QUERY = "(min-width: 1200px) and (min-height: 860px)";
/** The pinned runway: one screen to light the line, a little to hold. */
const STAGE_VH = 210;
/** Where the line has finished lighting, in stage progress. */
const LEAD_END = 0.58;
/** Where the first figure strikes, and the gap to the next. */
const STAT_AT = 0.6;
const STAT_GAP = 0.06;

export function About() {
  const { c, t } = useI18n();
  const { about, profile } = c;
  const reduced = useReducedMotion();
  const [room, setRoom] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(STAGE_QUERY);
    const update = () => setRoom(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const pinned = room && !reduced;

  const stats = [
    { v: education.gpaRecent.toFixed(2), k: t.about.statGpa },
    { v: "222K+", k: t.about.statBugs },
    { v: `×${education.deansList}`, k: t.about.statDeans },
    { v: "2", k: t.about.statLangs },
  ];

  return (
    <section
      id="about"
      data-act="bloom"
      data-chapter="PROFILE"
      className="relative overflow-x-clip text-fg"
      aria-label={t.about.aria}
    >
      <ChapterSeam />

      {pinned ? (
        <PinnedStatement lead={about.lead} heading={about.heading} stats={stats} />
      ) : (
        <FlowStatement lead={about.lead} heading={about.heading} stats={stats} reduced={reduced} />
      )}

      {/* ---- 3. THE STORY ------------------------------------------------- */}
      <div className="relative mx-auto max-w-[1800px] px-5 pb-20 pt-6 md:px-8 md:pb-28 lg:px-16">
        <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5 lg:pt-10">
            <RevealStagger className="space-y-6">
              {about.paragraphs.map((p, i) => (
                <Reveal key={i} asChild>
                  <p className="text-base leading-relaxed text-fg/85 md:text-lg">{p}</p>
                </Reveal>
              ))}
            </RevealStagger>
          </Reveal>

          <Reveal className="lg:col-span-7" delay={0.1}>
            <IdCard />
          </Reveal>
        </div>

        {/* Off hours: one row under the card, not a chapter of its own. Plain
            text titles: no game logos, and nothing here is clickable. */}
        <Reveal className="mt-12 md:mt-14">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
            <div className="flex shrink-0 flex-col gap-1">
              <span className="micro text-[var(--color-holo)]">{about.offHours.label}</span>
              <span className="text-sm text-muted">{about.offHours.note}</span>
            </div>
            <ul className="flex flex-wrap gap-2" aria-label={about.offHours.label}>
              {about.offHours.games.map((g) => (
                <li
                  key={g}
                  className="border border-line bg-[#061317]/60 px-3 py-2 font-tech text-sm font-semibold uppercase tracking-wide text-fg"
                >
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      <Band text={`${profile.discipline} · ${profile.location.split(",")[0]}`} reduced={reduced} />
    </section>
  );
}

type Stat = { v: string; k: string };

/* -------------------------------------------------------------------------- */
/* 1–2. The statement and the numbers                                         */
/* -------------------------------------------------------------------------- */

/** The pinned frame: the stage's own progress lights the line, then the
 *  figures. The line never moves while pinned, so ScrubWords is handed this
 *  clock rather than measuring its own position. */
function PinnedStatement({ lead, heading, stats }: { lead: string; heading: string; stats: Stat[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const leadP = useTransform(scrollYProgress, [0.04, LEAD_END], [0, 1]);
  const [lit, setLit] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const n = stats.filter((_, i) => p >= STAT_AT + i * STAT_GAP).length;
    /* Once lit, a figure stays lit: a tube that went out as you scrolled
       back up would read as a fault. */
    setLit((prev) => Math.max(prev, n));
  });

  return (
    <div ref={ref} className="relative" style={{ height: `${STAGE_VH}vh` }}>
      <div className="sticky top-0 flex h-dvh flex-col justify-center">
        <StatementBody lead={lead} heading={heading} stats={stats} litCount={lit} progress={leadP} />
      </div>
    </div>
  );
}

/** The same beats as a plain stack: the line lights as it scrolls past, and
 *  the figures strike on as the row comes into view. */
function FlowStatement({
  lead,
  heading,
  stats,
  reduced,
}: {
  lead: string;
  heading: string;
  stats: Stat[];
  reduced: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const seen = useInView(rowRef, { once: true, amount: 0.5 });
  const [lit, setLit] = useState(0);
  const count = stats.length;
  useEffect(() => {
    if (reduced || !seen) return;
    const ids = Array.from({ length: count }, (_, i) =>
      window.setTimeout(() => setLit((n) => Math.max(n, i + 1)), i * 220)
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [seen, reduced, count]);

  return (
    <div className="relative pb-10 pt-24 md:pt-36">
      <StatementBody lead={lead} heading={heading} stats={stats} litCount={reduced ? count : lit} rowRef={rowRef} />
    </div>
  );
}

function StatementBody({
  lead,
  heading,
  stats,
  litCount,
  progress,
  rowRef,
}: {
  lead: string;
  heading: string;
  stats: Stat[];
  litCount: number;
  progress?: MotionValue<number>;
  rowRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[1800px] px-5 md:px-8 lg:px-16">
      <div className="relative">
        <ScriptLabel href="#about" />
        <span className="micro kicker-plate">
          {sectionIndex("#about")} — {heading}
        </span>
        {/* The statement, at the size of the screen. Michroma sets wide, so
            this is ~5vw rather than a grotesk's 8. */}
        <h2 className="display-caps mt-8 max-w-[22ch] text-[clamp(1.75rem,5.1vw,5.75rem)] leading-[1.04] md:mt-10 md:pr-24">
          <ScrubWords text={lead} progress={progress} ramp />
        </h2>
      </div>

      {/* The numbers. A <dl>: each figure is the value of its label. */}
      <div ref={rowRef}>
        <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:mt-16 lg:grid-cols-4 lg:gap-x-10">
          {stats.map((s, i) => (
            <div key={s.k} className="relative flex flex-col pt-5">
              <span aria-hidden className="spectrum-rule absolute inset-x-0 top-0 h-px opacity-80" />
              <dt className="tag order-2 mt-3 max-w-[18rem] text-[var(--color-holo)]">{s.k}</dt>
              {/* Sized so the widest figure (222K+, Michroma) fits a quarter
                  of the frame with the gutter to spare. */}
              <dd className="order-1 font-display text-[clamp(2.25rem,3.6vw,4.25rem)] leading-none">
                <NeonSign text={s.v} lit={i < litCount} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* His name, hung at the frame's right edge as in the hero. */}
      <div aria-hidden className="pointer-events-none absolute right-5 top-0 hidden md:block lg:right-16">
        <div className="script-sign relative px-3 py-5">
          <InkSign tone="neon" lit="view" idle className="h-[min(26vh,15rem)]" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. The ID                                                                  */
/* -------------------------------------------------------------------------- */

/** The dossier as an ID card: the same fields, the same scan and decode, on
 *  a card that tilts toward the pointer and carries the ramp on its rim. */
function IdCard() {
  const { c, t } = useI18n();
  const { about, profile } = c;
  const reduced = useReducedMotion();
  const plateRef = useRef<HTMLDivElement>(null);
  /* Same threshold as the scan below, so each value decodes as the line
     passes it. */
  const scanned = useInView(plateRef, { once: true, amount: 0.6 });

  const fields = [
    ...about.signature.map((s) => ({ k: s.k, v: s.v, wide: false })),
    { k: t.about.status, v: profile.status, wide: true },
  ];

  return (
    <div ref={plateRef}>
      <GlareCard tilt={6} className="id-card bg-[#061317]/85">
        {/* Own layer: .hud-brackets sets the `background` shorthand, and
            unlayered CSS would wipe the card's fill if they shared a node. */}
        <span
          aria-hidden
          className="hud-brackets pointer-events-none absolute inset-0 z-20 [--hud-c:var(--color-hazard)] [--hud-l:14px] [--hud-w:2px]"
        />
        {/* One sodium scan down the card as it arrives. */}
        {!reduced && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                "linear-gradient(180deg, transparent calc(100% - 28px), color-mix(in srgb, var(--color-hazard) 18%, transparent) calc(100% - 2px), var(--color-hazard))",
            }}
            initial={{ y: "-100%", opacity: 1 }}
            whileInView={{ y: "0%", opacity: [1, 1, 0] }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1.1, ease: [0.45, 0, 0.2, 1], opacity: { times: [0, 0.85, 1], duration: 1.1 } }}
          />
        )}

        <div className="relative p-6 md:p-9 md:pr-28">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <span className="micro text-[var(--color-hazard)]">
              {t.about.file} · {sectionIndex("#about")}
            </span>
            <span className="micro">{profile.role}</span>
          </div>
          <p className="mt-5 font-display text-[clamp(1.5rem,2.6vw,2.6rem)] uppercase leading-none text-fg">
            {profile.fullName}
          </p>
          <p className="spectrum-text mt-3 font-tech text-base font-semibold uppercase tracking-wide md:text-lg">
            {profile.discipline}
          </p>

          <dl className="mt-7 grid grid-cols-1 border-t border-line sm:grid-cols-2">
            {fields.map((f, i) => (
              <div
                key={f.k}
                className={cn("flex flex-col gap-2 border-b border-line py-4 sm:pr-6", f.wide && "sm:col-span-2")}
              >
                <dt className="micro">{f.k}</dt>
                <dd className="font-tech text-lg font-semibold uppercase leading-tight text-fg">
                  <DecodeText text={f.v} play={scanned} delay={0.3 + i * 0.12} />
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* The name again, in Mongol bichig, down the card's spine. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-20 items-center justify-center border-l border-line md:flex"
        >
          <InkSign tone="neon" lit="write" idle rewritable className="h-[min(78%,20rem)]" />
        </div>
      </GlareCard>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The band                                                                   */
/* -------------------------------------------------------------------------- */

/** What he does, as one line too wide for the screen, outlined in the ramp
 *  and slid sideways by the scroll. Decorative: every word of it is in the
 *  card above. Moves only when the page does, so it costs idle nothing. */
function Band({ text, reduced }: { text: string; reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["4%", "-38%"]);
  const line = `${text} · ${text}`;
  return (
    <div ref={ref} aria-hidden className="relative overflow-hidden py-8 md:py-12">
      <motion.p
        className="band-outline display-caps w-max whitespace-nowrap text-[clamp(3rem,9vw,9.5rem)] leading-none"
        style={reduced ? undefined : { x }}
      >
        {line}
      </motion.p>
    </div>
  );
}
