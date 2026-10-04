"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePointerDrift } from "@/hooks/usePointerDrift";
import { useBootReady } from "@/hooks/useBootReady";
import { NeonSign } from "@/components/ui/NeonSign";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { WordRevealLines } from "@/components/motion/WordReveal";
import { Focus } from "@/components/hero/Entrance";
import { InkSign } from "@/components/ui/InkSign";
import { Signature } from "@/components/hero/Signature";
import { FlyThrough } from "@/components/hero/FlyThrough";
import { DecodeText } from "@/components/motion/DecodeText";
import { groundStrike } from "@/lib/groundBus";
import { sectionIndex } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * The opening frame: the name at a scale that has to break to fit, over the
 * same aurora as every other section.
 *
 * There used to be a horizon of light rising through the letterforms here, and
 * it was the only section with its own backdrop. Scrolling out of the hero
 * therefore always looked like leaving one site for another. The arc is gone,
 * and the hero now sits on the one shared ground like everything else. What
 * gives the frame its depth is the name's own travel: it drifts against the
 * cursor, and on scroll it rises and scales past the copy.
 *
 * The arrival, from the moment the preloader curtain starts to lift:
 *
 *   0.20s  the name rises out of its own clip, resolving from 26px of blur
 *   1.25s  the name strikes like a neon tube: a stutter, then it holds
 *   1.15s  the lead arrives one word at a time, line two lagging line one
 *   1.60s  his name in Mongol bichig is brushed in light across the Latin
 *          one, like a signature across a printed name (hero/Signature)
 *   1.70s  the panel, the sub and the footer row settle; the panel's rows
 *          decode once
 *   ~6s    the signature flies into the sign at the frame's edge, which
 *          lights already written
 *
 * The exit, on the pinned runway (hero/FlyThrough): the copy clears, the name
 * becomes a window onto the moon, and the camera flies through its last
 * letter into About.
 *
 * Nothing in the hero follows the pointer except the name's existing drift.
 */

/** Scroll runway. The frame is pinned for all but one viewport of it, and the
 *  fly-through needs that pinned stretch: at the old 130/180vh the frame was
 *  pinned for only 30/80vh and the window would have opened as it slid away.
 *  A phone has no fly-through (its SVG mask re-rasterises every frame and
 *  dropped phones well under 60fps), so it keeps the old short runway: the
 *  copy clears and the lit name scrolls away with the frame. */
const RUN = "h-[130vh] md:h-[260vh]";

/** When the name's tube strikes, ms after the curtain starts to lift — just
 *  after it has finished rising out of its clip. */
const STRIKE_AT = 1250;

export function Hero() {
  const { c, t } = useI18n();
  const { profile } = c;
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  /* The fly-through is md and up only. Matches RUN's breakpoint. */
  const fly = useMediaQuery("(min-width: 768px)") && !reduced;
  const [active, setActive] = useState(false);
  const [struck, setStruck] = useState(false);
  /* The signature has landed in the edge sign (or there was none to land). */
  const [landed, setLanded] = useState(false);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const tubeRef = useRef<HTMLSpanElement>(null);
  const signRef = useRef<HTMLDivElement>(null);

  /* Everything below hangs off this. The arrival is 2.9s long and the curtain
     is up for the first 1.7 of them — on mount the whole sequence played behind
     an opaque wall and the visitor met the resting frame. `ready` flips as the
     curtain begins to lift. */
  const ready = useBootReady();
  const play = ready && !reduced;

  /* The name drifts against the cursor, so the frame has depth before you have
     scrolled at all. The hook no-ops on coarse pointers and under reduced
     motion, so there is nothing to branch on here. */
  const drift = usePointerDrift(30);

  /* 0 at the top, 1 as the pinned frame is about to scroll away. Everything
     on the way out is keyed to the pin, not to the section leaving, so it
     all happens while the frame holds still. */
  const { scrollYProgress: pin } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  /* Promote the moving plane only while the hero is on screen. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* The strike. A one-shot arrival beat on a timer rather than an animation
     callback: the alternative is threading `onAnimationComplete` through three
     components to reconstruct a schedule written down above. It replaced a
     glitch burst: a sign flickering on is the same jolt, but it is something
     the city does, not something the screen does wrong. */
  useEffect(() => {
    if (!play) return;
    const on = setTimeout(() => {
      setStruck(true);
      /* The ground lights with it: the sign's glow spills over the footage. */
      groundStrike();
    }, STRIKE_AT);
    return () => clearTimeout(on);
  }, [play]);
  const lit = reduced || struck;

  /* Travel. The name lifts a little as the copy clears; after that the
     camera's move is the fly-through, not the name's. */
  const markY = useTransform(pin, [0, 0.45], ["0vh", "-8vh"]);
  const markScale = useTransform(pin, [0, 0.45], [1, 1.04]);

  /* Copy clears out before the window opens. The opacities are functions,
     not ranges, on purpose: framer hands a ranged scroll opacity to a native
     ViewTimeline, and with keyframes that do not start at 0 that path held
     every one of them at 0 from the first frame. */
  const copyOpacity = useTransform(pin, (v) => fade(v, 0.05, 0.3));
  const copyY = useTransform(pin, [0, 0.45], ["0vh", "-14vh"]);

  /* The tube becomes the hole it was lit on, and the edge sign goes with it,
     as the void plate comes up (FlyThrough, 0.25 -> 0.45). */
  const tubeOpacity = useTransform(pin, (v) => fade(v, 0.3, 0.45));

  const promote = active && !reduced ? "transform" : "auto";

  return (
    <section
      ref={ref}
      id="hero"
      data-act="void"
      data-chapter="INDEX"
      className={reduced ? "relative" : `relative ${RUN}`}
      aria-label={t.hero.aria}
    >
      <div
        className={
          reduced
            ? "relative flex min-h-svh w-full flex-col justify-end overflow-hidden"
            : "sticky top-0 flex h-svh w-full flex-col justify-end overflow-hidden"
        }
      >
        {/* ---- THE NAME ---------------------------------------------- */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-[27vh] z-10 flex justify-center md:top-[36vh]"
          style={
            reduced
              ? undefined
              : { y: markY, scale: markScale, willChange: promote }
          }
        >
          {/* Two wrappers, and they are not interchangeable. The outer one is
              framer's (scroll transform); the inner one is written to directly
              every frame by usePointerDrift. Put both on one element and the
              drift's raw `transform` and framer's composed one overwrite each
              other at 60Hz. */}
          <div ref={drift} className="relative">
            {/* Without the fly-through there is no window for the tube to
                become, so on a phone it stays lit and leaves with the frame. */}
            <motion.div style={fly ? { opacity: tubeOpacity } : undefined}>
            <Focus delay={0.45} amount={26} duration={0.95} play={play}>
              {/* 8vw at every width. Michroma sets AMARTUVSHIN at ~11.07× its
                  font size, so 8vw fills ~89% of the frame — one line from a
                  390px phone up, with a gutter either side. The old 13–16vw
                  was sized for a five-letter wordmark and ran 1.8 viewports
                  wide with this one. АМАРТҮВШИН in Montserrat 600 is ten
                  glyphs at ~8.4× its size, so Mongolian takes 10.6vw for the
                  same fill. Both are also capped by height: on a wide, short
                  screen (1280×800) a width-only size ran the name down into
                  the lead. */}
              {/* The clip is only needed while the name rises; lit, it would
                  cut the glow off in a hard box. */}
              <h1 ref={nameRef} className={`display-caps flex ${lit ? "overflow-visible" : "overflow-hidden"} text-[min(8vw,15vh)] leading-[0.95] text-fg [:root:lang(mn)_&]:text-[min(10.6vw,16vh)]`}>
                <motion.span
                  initial={reduced ? false : { y: "110%" }}
                  animate={{ y: play || reduced ? "0%" : "110%" }}
                  /* Weight: a heavy spring that overshoots a hair and settles,
                     so the name lands rather than slides. */
                  transition={{ type: "spring", stiffness: 62, damping: 13, mass: 1.5, delay: 0.2 }}
                  className="pointer-events-auto block"
                  style={{ paddingBottom: "0.08em" }}
                >
                  <span ref={tubeRef}>
                    <NeonSign text={profile.wordmark} lit={lit} />
                  </span>
                </motion.span>
              </h1>
            </Focus>
            {/* Inside the tube's fade: a signature still writing as the
                visitor scrolls goes with the name it was written on. */}
            {!reduced && (
              <Signature play={play} nameRef={nameRef} targetRef={signRef} onLanded={() => setLanded(true)} />
            )}
            </motion.div>
            {/* The strike's flare: one anamorphic streak across the name as
                the tube catches, the way a lens smears a light that comes on
                in frame. Once; transform and opacity only. */}
            {play && (
              <motion.span
                aria-hidden
                className="hero-streak"
                initial={{ x: "-55%", opacity: 0, scaleY: 0.6 }}
                animate={struck ? { x: "55%", opacity: [0, 1, 0.9, 0], scaleY: [0.6, 1, 1, 0.8] } : { x: "-55%", opacity: 0 }}
                transition={{ duration: 1.1, ease: [0.3, 0, 0.2, 1], times: [0, 0.18, 0.6, 1] }}
              />
            )}
            {fly && <FlyThrough progress={pin} text={profile.wordmark} textRef={tubeRef} active={active} />}
          </div>
        </motion.div>

        {/* ---- THE SIGN ---------------------------------------------- */}
        {/* His name in Mongol bichig, hung vertically at the frame's edge
            like the signage of every rain-soaked street in the genre, except
            this script was vertical first. Lit with the name, in sodium, with
            the odd flicker a real tube has. Decorative. */}
        <motion.div
          aria-hidden
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: lit ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none absolute right-[5.5%] top-[13vh] z-10 hidden md:block"
          style={reduced ? undefined : { y: copyY }}
        >
          <motion.div
            className="script-sign relative px-3 py-5"
            style={reduced ? undefined : { opacity: tubeOpacity }}
          >
            {/* The dark tube waits; the signature written across the name
                flies in and lands on it, and it lights already written.
                Click it to write it again. Remounted on landing, because
                `written` is read once. */}
            <div ref={signRef}>
              <InkSign
                key={landed ? "lit" : "dark"}
                tone="neon"
                lit={reduced ? true : landed ? "write" : false}
                written={landed}
                idle
                rewritable
                className="h-[min(21vh,13rem)]"
              />
            </div>
          </motion.div>
        </motion.div>

        {/* ---- COPY, in front of everything --------------------------- */}
        <motion.div
          /* The bottom padding takes the larger of the design value and the
             home-indicator inset, so the footer row is never under a gesture
             bar on a phone and is unchanged everywhere else. */
          className="relative z-[90] mx-auto flex w-full max-w-[112.5rem] flex-col gap-10 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-28 md:px-8 md:pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:px-16"
          style={reduced ? undefined : { opacity: copyOpacity, y: copyY }}
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <HeroPanel play={play} reduced={reduced} />

            {/* Wider in Mongolian: the same two lines run ~20% longer in Exo 2,
                and at `max-w-2xl` each wrapped, so four lines climbed up
                into the name. */}
            <div className="max-w-xl md:text-right lg:max-w-2xl [:root:lang(mn)_&]:lg:max-w-3xl">
              {/* The lead, arriving a word at a time. Chakra Petch rather than
                  the display face: Michroma is unreadable at this size. */}
              <WordRevealLines
                lines={profile.heroLeadLines}
                delay={1.15}
                play={play}
                className="font-tech text-3xl font-medium leading-[1.1] text-fg max-md:[:root:lang(mn)_&]:text-2xl md:text-4xl lg:text-5xl xl:[:root:lang(mn)_&]:text-[2.75rem] 2xl:[:root:lang(mn)_&]:text-5xl"
              />
              <motion.p
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={play || reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ delay: 1.7, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5 text-base leading-relaxed text-fg/75 md:text-lg"
              >
                {profile.heroSub}
              </motion.p>
            </div>
          </div>

          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: play || reduced ? 1 : 0 }}
            transition={{ delay: 1.9, duration: 0.6 }}
            className="flex items-center justify-between border-t border-line pt-4"
          >
            <ScrambleText text={profile.kicker} immediate className="micro" />
            <span className="micro hidden md:block">{profile.location}</span>
            <span className="micro flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 animate-blink rounded-full"
                style={{ background: "var(--color-hazard)" }}
              />
              {t.hero.scroll}
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/** 1 before `from`, 0 after `to`, linear between. */
function fade(v: number, from: number, to: number) {
  return Math.min(1, Math.max(0, (to - v) / (to - from)));
}

/* -------------------------------------------------------------------------- */
/* The panel                                                                  */
/* -------------------------------------------------------------------------- */

/** The hero's readout, as a KPR instrument panel: cut corners, a ramp edge
 *  with a ruler under it, and three readouts that decode once as it arrives.
 *
 *  Wide screens only (xl). On a phone the copy stacks and the panel climbed
 *  over the name; at 1024 it was crushed beside the lead into a column
 *  taller than the frame. Availability and the address are both in Contact
 *  and the menu sheet. */
function HeroPanel({ play, reduced }: { play: boolean; reduced: boolean }) {
  const { c, t } = useI18n();
  const { profile, contact } = c;

  const decode = play && !reduced;
  const rows: { k: string; v: string; lamp?: boolean; href?: string }[] = [
    { k: t.hero.statusLabel, v: profile.status, lamp: true },
    { k: t.hero.emailLabel, v: contact.email, href: `mailto:${contact.email}` },
    { k: t.hero.degreeLabel, v: profile.degree },
  ];

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={play || reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ delay: 1.7, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="notch-card relative hidden w-[25rem] shrink-0 bg-[#061317]/80 ring-1 ring-inset ring-line xl:block"
    >
      <span aria-hidden className="spectrum-rule absolute inset-x-0 top-0 h-px" />
      <div aria-hidden className="hud-ruler mt-px" />
      {/* Labels beside their values, not above them: stacked, the panel
          stood tall enough to climb into the name on a 1280×800 screen. */}
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 px-5 pb-8 pt-1">
        {rows.map((r, i) => (
          <div key={r.k} className={cn("col-span-2 grid grid-cols-subgrid py-2.5", i > 0 && "border-t border-line")}>
            {/* Brighter than a stock micro-label: the rain runs behind the
                panel (measured 3.3:1 at muted; 4.5 needed). */}
            <dt className="micro flex items-center gap-2 text-fg/80">
              {r.lamp && <span aria-hidden className="hud-lamp" />}
              {r.k}
            </dt>
            <dd className="min-w-0 break-words pt-px font-tech text-sm font-semibold uppercase leading-tight text-fg">
              {r.href ? (
                <a href={r.href} className="spectrum-underline font-mono lowercase tracking-wider">
                  <DecodeText text={r.v} play={decode} delay={1.9 + i * 0.12} />
                </a>
              ) : (
                <DecodeText text={r.v} play={decode} delay={1.9 + i * 0.12} />
              )}
            </dd>
          </div>
        ))}
      </dl>
      {/* The panel's ID, KPR's convention: the section's own index. */}
      <span aria-hidden className="micro absolute bottom-2 right-4 text-[var(--color-holo)]">
        [ {sectionIndex("#hero")} ]
      </span>
    </motion.div>
  );
}
