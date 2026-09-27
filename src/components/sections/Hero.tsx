"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePointerDrift } from "@/hooks/usePointerDrift";
import { useBootReady } from "@/hooks/useBootReady";
import { pulseBackdrop, setBackdropIntensity } from "@/lib/backdrop";
import { GlitchText } from "@/components/motion/GlitchText";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { WordRevealLines } from "@/components/motion/WordReveal";
import { EntranceArc, Focus } from "@/components/hero/Entrance";

/**
 * The opening frame: the name at a scale that has to break to fit, and a
 * horizon of light rising past it.
 *
 * The relationship that makes this a composition rather than type on a
 * background is depth order — **the wordmark is painted behind the horizon**, so
 * the crown of the arc cuts across the letterforms. That is the whole idea, it
 * survives from the checkpoint build, and it is the reason there is no object in
 * this frame: the occlusion the reference gets from a centrepiece, we get from
 * the light itself. Nothing here is a photograph, a city, or a rendered solid.
 *
 * ---------------------------------------------------------------------------
 * **What used to be here, and why it isn't.**
 *
 * A ten-plate neo-Tokyo stack: rain in two layers, standing water, two skyline
 * SVGs, a searchlight, a blimp, a rooftop parapet and a projected point cloud.
 * It was well built and it was the wrong film. It also cost ten permanently
 * promoted full-viewport layers, which is most of why the page scrolled badly.
 *
 * Two planes now move on scroll — the name and the arc — and the gap between
 * them is the entire parallax. Ten plates were not ten times the depth; past
 * about three, differential travel stops reading as more depth and starts
 * reading as more weather.
 * ---------------------------------------------------------------------------
 *
 * The arrival is the two reference clips bundled into one run, in this order:
 *
 *   0.35s  the arc blooms white across the whole frame and collapses to a
 *          crescent on the bottom edge          — hero-animation.mp4
 *   0.20s  the name rises out of its own clip, resolving from 26px of blur
 *   1.10s  a glitch burst hits the name and passes
 *   1.15s  the lead arrives one word at a time, line two lagging line one
 *          — hero-2.mp4, and the split-and-converge on each word is that
 *          clip's fringing
 *   2.60s  a bloom pulse flares off the horizon and decays, kicking the site
 *          backdrop with it                     — hero-2.mp4's floor flare
 *   2.70s  the availability card, the sub and the footer row settle
 *
 * Then scroll separates the two planes, the copy clears out ahead of them, and
 * the frame closes to void — a cut into About rather than a fade.
 */

/** Scroll runway. Long enough that the separation is legible, short enough
 *  that nobody thinks the page has stopped. Shorter on a phone, where a
 *  viewport height is a much larger fraction of a thumb's travel. */
const RUN = "h-[130vh] md:h-[180vh]";

/** When the glitch burst fires and how long it holds, ms from mount. */
const GLITCH_AT = 1100;
const GLITCH_FOR = 900;

export function Hero() {
  const { c, t } = useI18n();
  const { profile, contact } = c;
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  const [burst, setBurst] = useState(false);

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

  /* One observer drives whether the two planes are promoted and how far the
     shared backdrop steps back. Both want the same answer — is this the thing
     being looked at — so they share a callback rather than each mounting an
     observer of their own.

     0.55, not the 0.25 the plate stack used: with the city gone the site
     backdrop *is* this section's ground, and dimming it away leaves the name
     floating on flat black. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setActive(entry.isIntersecting);
        setBackdropIntensity(entry.intersectionRatio > 0.5 ? 0.55 : 1);
      },
      { threshold: [0, 0.5, 1] }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      setBackdropIntensity(1);
    };
  }, []);

  /* The glitch burst, and the bloom pulse's kick into the backdrop shader.
     Both are one-shot arrival beats on a timer rather than animation callbacks:
     the alternative is threading `onAnimationComplete` through four components
     to reconstruct a schedule that is already written down above. */
  useEffect(() => {
    if (!play) return;
    const on = setTimeout(() => setBurst(true), GLITCH_AT);
    const off = setTimeout(() => setBurst(false), GLITCH_AT + GLITCH_FOR);
    const kick = setTimeout(() => pulseBackdrop(0.9), 2600);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
      clearTimeout(kick);
    };
  }, [play]);

  /* Travel. The name goes further than the arc, so the horizon sinks through
     the letterforms as you leave — the same crossing as the entrance, run
     backwards and driven by you. The name is also the one thing that scales:
     without it the pair reads as two cards sliding past each other rather than
     as a camera moving in. */
  const markY = useTransform(scrollYProgress, [0, 1], ["0vh", "-30vh"]);
  const markScale = useTransform(scrollYProgress, [0, 1], [1, 1.14]);
  const arcY = useTransform(scrollYProgress, [0, 1], ["0vh", "-12vh"]);

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
        {/* ---- THE NAME, behind the light ----------------------------- */}
        {/* Set low, and the empty third above it is the composition, not waste.
            `GlowHorizon` sizes its arcs off its container, so the crown lands at
            roughly `0.62·top + 46` vh however the container is nudged — the
            constant dominates, which means the crown cannot practically be
            raised to meet type parked at 16vh. Raising the arc instead only
            turns it into the viewport-wide dome its own comments warn about.
            So the name comes down to the light: its baseline sits an inch into
            the crown, which is the one relationship the reference clips share
            and the thing that makes this a frame rather than two stacked bands. */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-[33vh] z-10 flex justify-center md:top-[46vh]"
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
                  wide with this one. The `top` above is lowered by the height
                  the smaller type gave back, so the baseline still sits an
                  inch into the horizon's crown. */}
              <h1 className="display-caps flex overflow-hidden text-[8vw] leading-[0.95] text-fg">
                <motion.span
                  initial={reduced ? false : { y: "110%" }}
                  animate={{ y: play || reduced ? "0%" : "110%" }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  className="pointer-events-auto block"
                  style={{ paddingBottom: "0.08em" }}
                >
                  {/* `always` for the arrival burst only, then it falls back to
                      hover. A permanent RGB split on 13vw of type is a headache;
                      one that fires as the name lands and then waits for you is
                      the same effect with a hundredth of the exposure. */}
                  <GlitchText text={profile.wordmark} always={burst} />
                </motion.span>
              </h1>
            </Focus>
          </div>
        </motion.div>

        {/* ---- THE LIGHT, in front of it ------------------------------
            Inset rather than full-bleed, and this matters more than it looks:
            GlowHorizon sizes its arcs as a percentage of their container, so an
            `inset-0` container makes the crown a viewport-wide dome that eats
            the entire composition. Held to the lower two thirds it reads as
            what it is — a horizon behind a name. */}
        {/* The mobile geometry is not a scaled-down desktop one, and it cannot
            be. `GlowHorizon`'s arcs are ellipses sized as a percentage of their
            container, so on a 390×844 portrait box they come out *tall and
            narrow* — a lens flare standing on its end, with its crown pushed so
            far down the frame that it lands behind the copy and reads as
            nothing at all. A horizon needs a container wider than it is tall.
            So on phones the box is bled 70% past both edges and cut off well
            above the fold: same wide, shallow arc as desktop, sitting under the
            name instead of under the paragraph. */}
        <motion.div
          className="pointer-events-none absolute -inset-x-[70%] bottom-[36vh] top-[26vh] z-20 md:inset-x-0 md:bottom-[-20vh] md:top-[34vh]"
          style={reduced ? undefined : { y: arcY, willChange: promote }}
        >
          <EntranceArc delay={0.35} play={play} />
        </motion.div>

        {/* The bloom pulse. hero-2's floor flare: the horizon surges once as
            the last word lands, then decays. One radial gradient on the ramp,
            keyframed on opacity alone — a bloom that animates blur or scale is
            a full-bleed surface re-rasterised for a second and a half. */}
        {play && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[25]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0] }}
            transition={{
              duration: 1.6,
              times: [0, 0.28, 1],
              ease: [0.16, 1, 0.3, 1],
              delay: 2.6,
            }}
            style={{
              background:
                "radial-gradient(120% 62% at 50% 104%, var(--spectrum-1) 0%, color-mix(in srgb, var(--spectrum-2) 60%, transparent) 34%, transparent 70%)",
              mixBlendMode: "screen",
            }}
          />
        )}

        {/* ---- CHROME ------------------------------------------------- */}

        {/* Legibility scrim, small screens only. On desktop the copy sits in
            the margins either side of the horizon; a phone has no margins, and
            the lead lands directly on the light. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[85] h-[62%] md:hidden"
          style={{
            background:
              "linear-gradient(0deg, var(--color-void) 22%, color-mix(in srgb, var(--color-void) 82%, transparent) 55%, transparent 100%)",
          }}
        />

        {/* There is no closing veil here any more, and its absence is the point.
            The old hero ramped an opaque `bg-void` over the last quarter of the
            run — a deliberate cut, and the right call when the thing being cut
            away was a ten-plate city that could not otherwise leave frame
            cleanly. With one continuous backdrop under the whole document, that
            veil is a section painting its own ground: the hero ended on flat
            black and About opened on the live field, which is exactly the
            "cut-off look between sections" this pass exists to remove.

            The hero now simply scrolls away. The name and the arc travel out on
            their own differential, the copy clears ahead of them, and About's
            own `ChapterSeam` marks the join. Nothing repaints. */}
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
              transition={{ delay: 2.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              /* 95%, not 80: the card sits on the brightest part of the
                 horizon, and at 80% the arc bled through enough to take the
                 muted label to 3.36:1. */
              className="notch-card-sm w-fit border border-line bg-deck/95 px-5 py-4 backdrop-blur-md"
            >
              <span className="micro">{t.hero.currently}</span>
              <p className="mt-2 max-w-[15rem] font-tech text-sm font-semibold uppercase leading-tight text-fg">
                {profile.status}
              </p>
              <a
                href={`mailto:${contact.email}`}
                className="spectrum-underline mt-3 inline-block font-mono text-[0.8125rem] lowercase tracking-wider text-fg"
              >
                {contact.email}
              </a>
            </motion.div>

            <div className="max-w-md md:text-right">
              {/* The lead, arriving a word at a time. Chakra Petch rather than
                  the display face: Michroma is unreadable at this size. */}
              <WordRevealLines
                lines={profile.heroLeadLines}
                delay={1.15}
                play={play}
                className="font-tech text-3xl font-medium leading-[1.12] text-fg md:text-4xl"
              />
              <motion.p
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={play || reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ delay: 2.7, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4 text-sm leading-relaxed text-muted"
              >
                {profile.heroSub}
              </motion.p>
            </div>
          </div>

          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: play || reduced ? 1 : 0 }}
            transition={{ delay: 2.9, duration: 1 }}
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
