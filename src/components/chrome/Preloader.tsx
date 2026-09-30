"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useLockScroll } from "@/hooks/useLockScroll";
import { markBooted } from "@/hooks/useBootReady";
import { useI18n } from "@/lib/i18n";
import { NeonSign } from "@/components/ui/NeonSign";
import { srand } from "@/lib/utils";

/**
 * First-load curtain.
 *
 * Replaces the old NEXUS boot sequence (`INITIALIZING KERNEL`, fake shader
 * pipeline logs). Faking a machine booting is a costume; a counter and the
 * wordmark resolving is what the reference sites actually do, and it earns the
 * delay instead of narrating it.
 *
 * Exits with a bottom-anchored curtain lift rather than a fade, so the hero is
 * revealed from underneath — the transition itself is the first piece of motion
 * the visitor sees and a crossfade wastes it.
 *
 * **A sign warming up.** Each letter of the name strikes on as its own neon
 * tube — in a seeded, not left-to-right, order, the way a real sign
 * catches — while rain runs down the glass. In the last stretch the vertical
 * Mongol-script sign lights in exactly the spot the hero's sign occupies, so
 * when the curtain lifts the sign is simply still there, and the hero's name
 * strikes in turn. (It replaced a purple glow-horizon arc: the one screen
 * still in the site's older look, and the first one anyone sees.)
 */

/** When each letter's tube strikes, ms from mount: a rough left-to-right
 *  sweep, jittered by a seeded hash so it catches like a real sign. */
const strikeAt = (i: number) => Math.round(180 + i * 72 + srand(i * 7 + 3) * 220);

/** Total run before the curtain lifts, ms. */
const RUN_MS = 1700;

export function Preloader() {
  const { c, t } = useI18n();
  const { profile } = c;
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(0);
  const startedAt = useRef(0);

  /* Derived, not stored. Setting `done` from an effect for the reduced-motion
     case would mean one committed frame with the curtain up — and a scroll lock
     taken and released — before it resolves. */
  const finished = reduced || done;

  useLockScroll(!finished);

  /* Release the hero. Fired as the curtain *starts* to lift, so the entrance
     underneath is already in motion when the reveal uncovers it — see
     useBootReady for why the hero cannot simply animate on mount. Also covers
     the reduced-motion path, where `finished` is true on the first render and
     there is no curtain at all. */
  useEffect(() => {
    if (finished) markBooted();
  }, [finished]);

  useEffect(() => {
    if (reduced) return;

    startedAt.current = performance.now();
    let raf = 0;

    const tick = () => {
      const t = Math.min(1, (performance.now() - startedAt.current) / RUN_MS);
      // Ease-out, so the count sprints early and settles on 100 — a linear
      // counter reads as a progress bar, which this is not.
      setCount(Math.round((1 - Math.pow(1 - t, 3)) * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDone(true);
      }
    };

    raf = requestAnimationFrame(tick);

    /* The curtain must not be able to stick.
       rAF is the right driver for the counter — it is the only way the digits
       animate smoothly — but it is also *paused entirely* while the tab is
       hidden or the window occluded. Left to rAF alone, a visitor who opens the
       site in a background tab and comes back finds a preloader that never
       finishes and a scroll lock that never lifts. This is the floor: whatever
       happened to the frame loop, the curtain lifts. */
    const floor = setTimeout(() => setDone(true), RUN_MS + 400);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(floor);
    };
  }, [reduced]);

  return (
    <AnimatePresence>
      {!finished && (
        <motion.div
          key="preloader"
          aria-hidden
          className="fixed inset-0 z-[120] flex flex-col justify-between overflow-hidden bg-void px-5 py-5 text-fg md:px-8 md:py-6"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        >
          {/* Rain on the glass, and the film's scanlines. Both are single
              layers; the rain is one transform loop, never a repaint. */}
          <div aria-hidden className="preloader-rain pointer-events-none absolute inset-0" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.28) 2px 3px)",
            }}
          />

          <div className="relative flex items-center justify-between">
            <span className="micro">{profile.kicker}</span>
            <span className="micro flex items-center gap-2 text-[var(--color-hazard)]">
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-[var(--color-hazard)]" />
              {t.preloader.loading}
            </span>
          </div>

          {/* The hero's sign, lit in its exact place so the hand-off is seamless. */}
          <div className="pointer-events-none absolute right-[5.5%] top-[13vh] hidden md:block">
            <div className="script-sign relative px-3 py-5">
              <NeonSign
                text={profile.nameScript}
                lit={count >= 70}
                tone="sodium"
                lang="mn-Mong"
                className="font-script text-[clamp(1.6rem,2.3vw,2.6rem)] leading-none"
                style={{ writingMode: "vertical-lr" }}
              />
            </div>
          </div>

          {/* The wordmark, letters rising out of a mask.
              Sized for eleven glyphs: Michroma sets AMARTUVSHIN at ~11× its
              font size, so the 8–11vw this had for a five-letter name ran it
              well past the frame, with the counter pushed off after it. On a
              phone the counter takes its own row rather than squeezing the
              name further. */}
          <div className="relative flex flex-col items-start gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
            {/* No rise out of a mask any more: the strike is the entrance, and
                a clipping box would cut every tube's glow into a rectangle. */}
            <h1 className="display-caps flex text-[7.6vw] leading-[0.95] md:text-[6vw]">
              {profile.wordmark.split("").map((ch, i) => (
                <NeonSign
                  key={`${ch}-${i}`}
                  text={ch}
                  lit
                  style={{ ["--neon-delay" as string]: `${strikeAt(i)}ms`, ["--neon-dur" as string]: "0.6s" }}
                />
              ))}
            </h1>

            <span className="tabular font-display text-[9vw] leading-none md:text-[3vw]">
              {count}
            </span>
          </div>

          {/* Fill rule, driven by the same counter */}
          <div className="relative h-px w-full bg-line">
            <motion.span
              className="absolute inset-y-0 left-0"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, var(--color-hazard), var(--spectrum-1) 45%, var(--spectrum-3))",
              }}
              animate={{ width: `${count}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
