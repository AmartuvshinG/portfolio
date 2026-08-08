"use client";

import { motion } from "framer-motion";
import { profile, contact } from "@/lib/content";
import { GlowHorizon } from "@/components/ui/GlowHorizon";
import { GlitchText } from "@/components/motion/GlitchText";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { usePointerDrift } from "@/hooks/usePointerDrift";

const rise = {
  hidden: { y: "110%" },
  show: {
    y: "0%",
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/**
 * The opening frame: the name at a scale that has to break to fit, and a
 * horizon of light rising past it.
 *
 * The relationship that makes it a composition rather than type on a background
 * is depth order — the wordmark is painted *behind* the horizon, so the crown
 * of the arc cuts across the letterforms. That job was previously done by a
 * shaft of light (and before that by a stock photo); it is now done by the
 * glow-horizon arcs, which are the same gesture the preloader hands off with
 * and the same one every section boundary uses. The hero is where that language
 * is stated at full strength.
 *
 * Hovering the wordmark splits it into magenta and cyan — the NEXUS glitch,
 * restored, and the only interaction in the frame.
 */
export function Hero() {
  const drift = usePointerDrift(30);

  return (
    <section
      id="hero"
      data-act="void"
      data-chapter="INDEX"
      className="relative flex min-h-dvh w-full flex-col justify-end overflow-hidden"
      aria-label="Introduction"
    >
      {/* --- Layer 1: the wordmark, behind everything.
              `pointer-events-auto` on the glyphs only — the wrapper stays
              transparent to the cursor so it can't eat clicks across the whole
              upper viewport, but the glitch still needs a hover target. */}
      <div className="pointer-events-none absolute inset-x-0 top-[18vh] flex justify-center md:top-[16vh]">
        <h1 className="display-caps flex overflow-hidden text-[15vw] leading-[0.95] text-fg md:text-[13vw]">
          <motion.span
            variants={rise}
            initial="hidden"
            animate="show"
            className="pointer-events-auto block"
            style={{ paddingBottom: "0.08em" }}
          >
            <GlitchText text={profile.wordmark} />
          </motion.span>
        </h1>
      </div>

      {/* --- Layer 2: the horizon, cresting through it.
              Delayed past the preloader's 0.9s curtain lift so the arcs are
              still arriving as the curtain clears — the hand-off is one
              continuous move rather than two sequential ones. */}
      <div
        ref={drift}
        className="pointer-events-none absolute inset-x-0 bottom-[-18vh] top-[22vh] will-change-transform"
      >
        <GlowHorizon variant="bottom" idle delay={0.35} />
      </div>

      {/* Legibility scrim, small screens only. On desktop the copy sits in the
          margins either side of the horizon, but a phone has no margins — the
          lead line and the sub land directly on the light and neither is
          readable without this. The arcs are brighter than the shaft they
          replaced, so this matters more than it used to, not less. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] md:hidden"
        style={{
          background:
            "linear-gradient(0deg, var(--color-void) 22%, color-mix(in srgb, var(--color-void) 82%, transparent) 55%, transparent 100%)",
        }}
      />

      {/* --- Layer 3: copy, in front of both --- */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1800px] flex-col gap-10 px-5 pb-8 pt-28 md:px-8 md:pb-10 lg:px-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          {/* Availability card, carrying the one piece of information a
              prospective client actually wants. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="notch-card-sm w-fit border border-line bg-deck/80 px-5 py-4 backdrop-blur-md"
          >
            <span className="micro">Currently</span>
            <p className="mt-2 max-w-[15rem] font-tech text-sm font-semibold uppercase leading-tight text-fg">
              {profile.status}
            </p>
            <a
              href={`mailto:${contact.email}`}
              className="spectrum-underline mt-3 inline-block font-mono text-[0.6875rem] lowercase tracking-wider text-fg"
            >
              {contact.email}
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md md:text-right"
          >
            {/* The lead. Chakra Petch rather than the display face — its
                chamfered terminals carry the same cut as the notch cards while
                staying readable at paragraph scale, which Michroma does not. */}
            <p className="font-tech text-3xl font-medium leading-[1.12] text-fg md:text-4xl">
              {profile.heroLead}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {profile.heroSub}
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 1 }}
          className="flex items-center justify-between border-t border-line pt-4"
        >
          <ScrambleText text={profile.kicker} immediate className="micro" />
          <span className="micro hidden md:block">{profile.location}</span>
          <span className="micro flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-signal" />
            Scroll
          </span>
        </motion.div>
      </div>
    </section>
  );
}
