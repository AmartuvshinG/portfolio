"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { profile } from "@/lib/content";
import { HeroCanvas } from "@/components/three/HeroCanvas";
import { ControlPanelButton } from "@/components/motion/ControlPanelButton";
import { GlitchText } from "@/components/motion/GlitchText";
import { HeadlineFlip } from "@/components/motion/HeadlineFlip";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { TelemetryReadout } from "@/components/hud/TelemetryReadout";
import { DataGraph } from "@/components/hud/DataGraph";
import { cn } from "@/lib/utils";

const lineParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const lineChild = {
  hidden: { y: "115%" },
  show: {
    y: "0%",
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function Hero() {
  /* The title lines rise out of a clipped mask. Once that entrance finishes
     the mask has to go: the third line holds a plate that resizes as its word
     swaps, and a live `overflow-hidden` would shear its border and glow. */
  const [entered, setEntered] = useState(false);

  return (
    <section
      id="hero"
      className="relative min-h-dvh w-full overflow-hidden"
      aria-label="Introduction"
    >
      {/* WebGL artifact */}
      <HeroCanvas />

      {/* Legibility scrim (bottom-weighted; stronger on small screens where
          the artifact sits behind the copy) */}
      <div
        className="pointer-events-none absolute inset-0 md:hidden"
        style={{
          background:
            "linear-gradient(0deg, rgba(5,5,5,0.96) 8%, rgba(5,5,5,0.7) 45%, rgba(5,5,5,0.25) 75%, transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden md:block"
        style={{
          background:
            "radial-gradient(80% 80% at 20% 80%, rgba(5,5,5,0.85), transparent 60%), linear-gradient(0deg, rgba(5,5,5,0.9), transparent 45%)",
        }}
      />

      {/* Rotated side label */}
      <span className="hud-label absolute right-5 top-1/2 hidden -translate-y-1/2 rotate-90 whitespace-nowrap text-faint lg:block">
        {profile.version} — {profile.role.toUpperCase()}
      </span>

      {/* Content */}
      {/* pb clears the fixed console dock at the bottom centre of the viewport */}
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-[1600px] flex-col justify-end px-5 pb-10 pt-28 md:px-8 md:pb-24">
        {/* Kicker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.8 }}
          className="mb-6 flex items-center gap-4"
        >
          <span className="h-px w-12 bg-cyan" />
          <ScrambleText
            text={profile.kicker}
            immediate
            className="text-xs uppercase tracking-[0.3em] text-cyan"
          />
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={lineParent}
          initial="hidden"
          animate="show"
          className="font-display font-black uppercase leading-[0.82] text-fg"
          // Bounded by height as well as width: on a short laptop viewport a
          // pure vw scale pushed the closing telemetry row below the fold.
          style={{ fontSize: "clamp(3.2rem, min(12vw, 13.5vh), 11rem)" }}
        >
          {profile.heroLines.map((line, i) => {
            const isLast = i === profile.heroLines.length - 1;
            return (
              <span
                key={line}
                className={cn("block", !(isLast && entered) && "overflow-hidden")}
              >
                <motion.span
                  variants={lineChild}
                  className="block"
                  style={{ paddingBottom: "0.06em" }}
                  onAnimationComplete={
                    isLast ? () => setEntered(true) : undefined
                  }
                >
                  {i === 0 ? (
                    <GlitchText text={line} />
                  ) : i === 1 ? (
                    <span
                      style={{
                        background: "linear-gradient(100deg,#00e5ff,#a855f7)",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      {line}
                    </span>
                  ) : (
                    <HeadlineFlip words={profile.heroFlipWords} />
                  )}
                </motion.span>
              </span>
            );
          })}
        </motion.h1>

        {/* Sub + CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
        >
          <p className="max-w-md text-base leading-relaxed text-muted md:text-lg">
            {profile.heroSub}
          </p>
          <div className="flex flex-wrap gap-4">
            <ControlPanelButton href="#work" variant="primary">
              Access Work
            </ControlPanelButton>
            <ControlPanelButton href="#contact" variant="outline">
              Initiate Contact
            </ControlPanelButton>
          </div>
        </motion.div>

        {/* HUD footer row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-12 flex items-end justify-between gap-8 border-t border-line pt-5"
        >
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            <TelemetryReadout label="Status" value="OPERATIONAL" accent blink />
            <TelemetryReadout label="Discipline" value="INTERFACE / MOTION" />
            <TelemetryReadout
              label="Location"
              value={profile.location.toUpperCase()}
              className="hidden sm:flex"
            />
          </div>

          <div className="hidden w-52 flex-col gap-2 md:flex">
            <span className="hud-label">RENDER TELEMETRY</span>
            <DataGraph />
          </div>
        </motion.div>
      </div>

      {/* Scroll cue — pinned to the left gutter, since the console dock now
          occupies the bottom centre of every viewport. */}
      <div className="absolute bottom-8 left-5 hidden items-center gap-3 lg:flex md:left-8">
        <ArrowDown size={14} className="animate-blink text-cyan" />
        <span className="hud-label text-faint">SCROLL</span>
      </div>
    </section>
  );
}
