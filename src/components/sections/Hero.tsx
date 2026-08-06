"use client";

import { motion } from "framer-motion";
import { profile, contact } from "@/lib/content";
import { HeroPortrait } from "@/components/sections/HeroPortrait";
import { Contour } from "@/components/layout/Contour";

const rise = {
  hidden: { y: "110%" },
  show: {
    y: "0%",
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/**
 * The opening frame, on Lando's model: one enormous subject centred on paper,
 * the name set at a scale that has to break to fit, and almost nothing else.
 *
 * The single detail that makes it work is depth order — the wordmark is painted
 * *behind* the portrait, so the cutout's shoulders occlude the letterforms. That
 * one relationship is what turns a photo-on-a-background into a composition;
 * without it the same elements read as a stock header.
 */
export function Hero() {
  return (
    <section
      id="hero"
      data-act="paper"
      data-chapter="INDEX"
      className="relative flex min-h-dvh w-full flex-col justify-end overflow-hidden bg-bg"
      aria-label="Introduction"
    >
      <Contour className="pointer-events-none absolute inset-0 h-full w-full text-ink" />

      {/* --- Layer 1: the wordmark, behind everything --- */}
      <div className="pointer-events-none absolute inset-x-0 top-[16vh] flex justify-center md:top-[14vh]">
        <h1 className="display-caps flex overflow-hidden text-[26vw] leading-[0.8] text-ink md:text-[22vw]">
          <motion.span
            variants={rise}
            initial="hidden"
            animate="show"
            className="block"
            style={{ paddingBottom: "0.08em" }}
          >
            {profile.wordmark}
          </motion.span>
        </h1>
      </div>

      {/* --- Layer 2: the portrait, occluding it --- */}
      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="absolute inset-x-0 bottom-0 top-[8vh]"
      >
        <HeroPortrait />
      </motion.div>

      {/* Legibility scrim, small screens only. On desktop the copy sits in the
          margins either side of the portrait, but a phone has no margins — the
          serif line and the sub land directly on the photo and neither is
          readable without this. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] md:hidden"
        style={{
          background:
            "linear-gradient(0deg, var(--color-paper) 22%, color-mix(in srgb, var(--color-paper) 82%, transparent) 55%, transparent 100%)",
        }}
      />

      {/* --- Layer 3: copy, in front of both --- */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1800px] flex-col gap-10 px-5 pb-8 pt-28 md:px-8 md:pb-10 lg:px-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          {/* Availability card — Lando's sticky "NEXT RACE" widget, carrying
              the one piece of information a prospective client actually wants. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="notch-card-sm w-fit bg-ink px-5 py-4 text-paper"
          >
            <span className="micro !text-paper/50">Currently</span>
            <p className="mt-2 max-w-[15rem] font-display text-sm font-semibold uppercase leading-tight">
              {profile.status}
            </p>
            <a
              href={`mailto:${contact.email}`}
              className="signal-underline mt-3 inline-block font-mono text-[0.6875rem] lowercase tracking-wider text-paper"
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
            {/* The serif line. One editorial voice against all the grotesk
                is what stops the page reading as a tech template. */}
            <p className="font-editorial text-3xl leading-[1.08] text-ink md:text-4xl">
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
          <span className="micro">{profile.kicker}</span>
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
