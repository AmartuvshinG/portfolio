"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePointerDrift } from "@/hooks/usePointerDrift";
import { useBootReady } from "@/hooks/useBootReady";
import { NeonSign } from "@/components/ui/NeonSign";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { WordRevealLines } from "@/components/motion/WordReveal";
import { Focus } from "@/components/hero/Entrance";

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
 *   1.70s  the availability card, the sub and the footer row settle
 */

/** Scroll runway. Long enough that the separation is legible, short enough
 *  that nobody thinks the page has stopped. Shorter on a phone, where a
 *  viewport height is a much larger fraction of a thumb's travel. */
const RUN = "h-[130vh] md:h-[180vh]";

/** When the name's tube strikes, ms after the curtain starts to lift — just
 *  after it has finished rising out of its clip. */
const STRIKE_AT = 1250;

export function Hero() {
  const { c, t } = useI18n();
  const { profile, contact } = c;
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  const [struck, setStruck] = useState(false);

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

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
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
    const on = setTimeout(() => setStruck(true), STRIKE_AT);
    return () => clearTimeout(on);
  }, [play]);
  const lit = reduced || struck;

  /* Travel. The name rises and scales as you leave, so the pair reads as a
     camera moving in rather than as a page sliding up. */
  const markY = useTransform(scrollYProgress, [0, 1], ["0vh", "-30vh"]);
  const markScale = useTransform(scrollYProgress, [0, 1], [1, 1.14]);

  /* Copy clears out well before the close reaches it. */
  const copyOpacity = useTransform(scrollYProgress, [0.3, 0.55], [1, 0]);
  const copyY = useTransform(scrollYProgress, [0, 1], ["0vh", "-22vh"]);

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
            ? "relative flex min-h-dvh w-full flex-col justify-end overflow-hidden"
            : "sticky top-0 flex h-dvh w-full flex-col justify-end overflow-hidden"
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
          <div ref={drift}>
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
              <h1 className={`display-caps flex ${lit ? "overflow-visible" : "overflow-hidden"} text-[min(8vw,15vh)] leading-[0.95] text-fg [:root:lang(mn)_&]:text-[min(10.6vw,16vh)]`}>
                <motion.span
                  initial={reduced ? false : { y: "110%" }}
                  animate={{ y: play || reduced ? "0%" : "110%" }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  className="pointer-events-auto block"
                  style={{ paddingBottom: "0.08em" }}
                >
                  <NeonSign text={profile.wordmark} lit={lit} />
                </motion.span>
              </h1>
            </Focus>
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
          <div className="script-sign relative px-3 py-5">
            <NeonSign
              text={profile.nameScript}
              lit={lit}
              tone="sodium"
              idle
              lang="mn-Mong"
              className="font-script text-[clamp(1.6rem,2.3vw,2.6rem)] leading-none"
              style={{ writingMode: "vertical-lr" }}
            />
          </div>
        </motion.div>

        {/* ---- COPY, in front of everything --------------------------- */}
        <motion.div
          /* The bottom padding takes the larger of the design value and the
             home-indicator inset, so the footer row is never under a gesture
             bar on a phone and is unchanged everywhere else. */
          className="relative z-[90] mx-auto flex w-full max-w-[1800px] flex-col gap-10 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-28 md:px-8 md:pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:px-16"
          style={reduced ? undefined : { opacity: copyOpacity, y: copyY }}
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={play || reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 1.7, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              /* Desktop only. On a phone the copy stacks, and with this card
                 on top the stack climbed over the name. Availability and the
                 address are both in Contact and the menu sheet. */
              className="liquid-glass hidden w-fit rounded-2xl px-5 py-4 md:block"
            >
              <span className="micro">{t.hero.currently}</span>
              <p className="mt-2 max-w-[15rem] font-tech text-sm font-semibold uppercase leading-tight text-fg">
                {profile.status}
              </p>
              <a
                href={`mailto:${contact.email}`}
                className="spectrum-underline mt-3 inline-block font-mono text-xs lowercase tracking-wider text-fg"
              >
                {contact.email}
              </a>
            </motion.div>

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
                className="font-tech text-3xl font-medium leading-[1.1] text-fg max-md:[:root:lang(mn)_&]:text-2xl md:text-4xl lg:text-5xl"
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
