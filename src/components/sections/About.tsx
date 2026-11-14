"use client";

import { education, sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { Reveal } from "@/components/motion/Reveal";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import {
  motion,
  useInView,
  useMotionValue,
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
import { PIN_QUERY } from "@/lib/viewport";

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
 * It sits on the shared ground, like every section.
 */

/** Room for the pinned frame: the statement and the numbers at full size. */
const STAGE_QUERY = PIN_QUERY;
/** The pinned runway: one screen to light the line, a little to hold. */
const STAGE_VH = 210;
/** Where the line has finished lighting, in stage progress. */
const LEAD_END = 0.58;
/** Where the first figure strikes, and the gap to the next. */
const STAT_AT = 0.6;
const STAT_GAP = 0.06;

export function About() {
  const { c, t } = useI18n();
  const { about } = c;
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

      {/* ---- 3. THE ID, then the story, page by page ------------------- */}
      {pinned ? <ProfileBoot /> : <ProfileFlow reduced={reduced} />}
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
      <div className="sticky top-0 flex h-svh flex-col justify-center">
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
    <div className="relative mx-auto w-full max-w-[112.5rem] px-5 md:px-8 lg:px-16">
      <div className="relative">
        <ScriptLabel href="#about" />
        <span className="micro kicker-plate">
          {sectionIndex("#about")} — {heading}
        </span>
        {/* The statement, at the size of the screen. Michroma sets wide, so
            this is ~5vw rather than a grotesk's 8. */}
        <h2 className="display-caps mt-8 max-w-[22ch] text-[clamp(1.75rem,min(5.1vw,7.2vh),5.75rem)] leading-[1.04] md:mt-10 md:pr-24">
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
function IdCard({ boot }: { boot?: boolean }) {
  const { c, t } = useI18n();
  const { about, profile } = c;
  const reduced = useReducedMotion();
  const plateRef = useRef<HTMLDivElement>(null);
  /* Same threshold as the scan below, so each value decodes as the line
     passes it. */
  const seen = useInView(plateRef, { once: true, amount: 0.6 });
  /* A pinned stage hands in its own clock; in flow, the card boots when most
     of it is on screen. */
  const scanned = boot ?? seen;

  const fields = [
    ...about.signature.map((s) => ({ k: s.k, v: s.v, wide: false })),
    { k: t.about.status, v: profile.status, wide: true },
  ];

  return (
    <div ref={plateRef}>
      <GlareCard tilt={6} className={cn("id-card bg-[#05040c]/85", scanned && "id-card--on")}>
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
            animate={scanned ? { y: "0%", opacity: [1, 1, 0] } : undefined}
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
/* 4. The story                                                               */
/* -------------------------------------------------------------------------- */

type Page = { key: string; text: string; games: string[] | null };

/** The pages of the dossier: the two paragraphs, then the off-hours list. */
function usePages(): Page[] {
  const { c } = useI18n();
  const { about } = c;
  return [
    ...about.paragraphs.map((text, i) => ({ key: `p${i}`, text, games: null })),
    { key: "off", text: about.offHours.note, games: about.offHours.games },
  ];
}

/** Profile boot, pinned: the card prints (scan, decode, brackets lock), then
 *  the dossier deals its pages in beside it, one per stretch of scroll. Each
 *  page lights its words as it lands; the one before steps back into the
 *  stack. Once printed, the card stays printed. */
const BOOT_VH = 320;
const BOOT_AT = 0.03;
const PAGES_FROM = 0.14;

function ProfileBoot() {
  const ref = useRef<HTMLDivElement>(null);
  const pages = usePages();
  const n = pages.length;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [booted, setBooted] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (p > BOOT_AT) setBooted(true);
  });

  return (
    <div ref={ref} className="relative" style={{ height: `${BOOT_VH}vh` }}>
      <div className="sticky top-0 flex h-svh items-center">
        <div className="mx-auto grid w-full max-w-[112.5rem] items-center gap-10 px-8 lg:grid-cols-12 lg:gap-14 lg:px-16">
          <div className="lg:col-span-7">
            <IdCard boot={booted} />
          </div>
          <div className="dossier-stack lg:col-span-5">
            {pages.map((pg, i) => (
              <DossierPage key={pg.key} index={i} count={n} page={pg} progress={scrollYProgress} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DossierPage({
  index,
  count,
  page,
  progress,
}: {
  index: number;
  count: number;
  page: Page;
  progress: MotionValue<number>;
}) {
  const span = (1 - PAGES_FROM) / count;
  const a = PAGES_FROM + index * span;
  const b = a + span;
  /* In over the first fifth of its stretch, lit across the next half, then
     it holds; the next page's arrival pushes it back into the stack. */
  const x = useTransform(progress, [a - span * 0.05, a + span * 0.2], ["70%", "0%"]);
  const opacity = useTransform(progress, [a - span * 0.05, a + span * 0.15], [0, 1]);
  const back = useTransform(progress, [b - span * 0.05, b + span * 0.2], [0, 1]);
  const scale = useTransform(back, [0, 1], [1, 0.92]);
  const y = useTransform(back, [0, 1], ["0%", "-8%"]);
  const dim = useTransform(back, [0, 1], [1, 0.08]);
  const words = useTransform(progress, [a + span * 0.1, a + span * 0.7], [0, 1]);
  const last = index === count - 1;

  return (
    <motion.article className="dossier-page" style={{ x, y, scale, opacity, zIndex: index + 1 }}>
      <motion.div style={{ opacity: last ? 1 : dim }}>
        <PageBody page={page} index={index} count={count}>
          <ScrubWords text={page.text} progress={words} />
        </PageBody>
        {page.games ? <GameChips games={page.games} progress={progress} at={a + span * 0.5} /> : null}
      </motion.div>
    </motion.article>
  );
}

function PageBody({
  page,
  index,
  count,
  children,
}: {
  page: Page;
  index: number;
  count: number;
  children: React.ReactNode;
}) {
  const { c, t } = useI18n();
  return (
    <>
      <header className="dossier-page-head">
        <span className="tag text-[var(--color-rim)]">{page.games ? c.about.offHours.label : t.about.file}</span>
        <span className="tag text-fg/85">
          {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>
      </header>
      <p className="text-base leading-relaxed text-fg md:text-lg">{children}</p>
    </>
  );
}

/** The off-hours titles, popping in one after another once their page has
 *  landed (or as soon as they render, in flow). */
function GameChips({ games, progress, at = 0 }: { games: string[]; progress?: MotionValue<number>; at?: number }) {
  const { c } = useI18n();
  const [hit, setHit] = useState(false);
  const fallback = useMotionValue(1);
  useMotionValueEvent(progress ?? fallback, "change", (p) => {
    if (p >= at) setHit(true);
  });
  const on = !progress || hit;
  return (
    <ul className="game-chips" aria-label={c.about.offHours.label} data-on={on ? "true" : "false"}>
      {games.map((g, i) => (
        <li key={g} className="game-chip" style={{ "--i": i } as React.CSSProperties}>
          {g}
        </li>
      ))}
    </ul>
  );
}

/** The same story in flow: the card, then each page lights as it scrolls by. */
function ProfileFlow({ reduced }: { reduced: boolean }) {
  const pages = usePages();
  return (
    <div className="relative mx-auto max-w-[112.5rem] px-5 pb-20 pt-6 md:px-8 md:pb-28 lg:px-16">
      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-7">
          <IdCard />
        </Reveal>
        <div className="flex flex-col gap-6 lg:col-span-5">
          {pages.map((pg, i) => (
            <Reveal key={pg.key} delay={i * 0.06}>
              <article className="dossier-page dossier-page--flow">
                <PageBody page={pg} index={i} count={pages.length}>
                  {reduced ? pg.text : <ScrubWords text={pg.text} />}
                </PageBody>
                {pg.games ? <GameChips games={pg.games} /> : null}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
