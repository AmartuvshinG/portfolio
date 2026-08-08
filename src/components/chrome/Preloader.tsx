"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useLockScroll } from "@/hooks/useLockScroll";
import { profile } from "@/lib/content";
import { Nebula } from "@/components/backdrop/Nebula";
import { GlowHorizon } from "@/components/ui/GlowHorizon";

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
 */

/** Total run before the curtain lifts, ms. */
const RUN_MS = 1700;

export function Preloader() {
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(0);
  const startedAt = useRef(0);

  /* Derived, not stored. Setting `done` from an effect for the reduced-motion
     case would mean one committed frame with the curtain up — and a scroll lock
     taken and released — before it resolves. */
  const finished = reduced || done;

  useLockScroll(!finished);

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
          <Nebula
            className="pointer-events-none absolute inset-0 h-full w-full"
            opacity={0.5}
          />

          {/* The hand-off. The curtain lifts *over* a horizon already rising
              behind it, so the first gesture the visitor sees is the same arc
              the hero, every section seam and every route change will use —
              one entrance language, stated before anything else loads.
              Without this the curtain reveals a static frame and the hero's own
              arcs start from nothing a beat later, which reads as two separate
              animations rather than one continuous arrival.

              Confined to the bottom two-fifths and run at low intensity. At full
              height the arc stack's white specular layer is wider than the
              viewport and simply whites the curtain out — the arcs only read as
              a horizon when the frame is taller than the crown. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%]">
            <GlowHorizon variant="bottom" intensity={0.5} delay={0.3} />
          </div>

          <span className="micro relative">{profile.kicker}</span>

          {/* The wordmark, letters rising out of a mask */}
          <div className="relative flex items-end justify-between gap-6">
            <h1 className="display-caps flex overflow-hidden text-[11vw] leading-[0.95] md:text-[8vw]">
              {profile.wordmark.split("").map((ch, i) => (
                <motion.span
                  key={`${ch}-${i}`}
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{
                    delay: 0.06 * i,
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="block"
                >
                  {ch}
                </motion.span>
              ))}
            </h1>

            <span className="tabular font-display text-[7vw] leading-none md:text-[3vw]">
              {count}
            </span>
          </div>

          {/* Fill rule, driven by the same counter */}
          <div className="relative h-px w-full bg-line">
            <motion.span
              className="absolute inset-y-0 left-0"
              style={{ backgroundImage: "var(--gradient-spectrum)" }}
              animate={{ width: `${count}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
