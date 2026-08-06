"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useLockScroll } from "@/hooks/useLockScroll";
import { profile } from "@/lib/content";
import { Contour } from "@/components/layout/Contour";

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
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <AnimatePresence>
      {!finished && (
        <motion.div
          key="preloader"
          aria-hidden
          className="fixed inset-0 z-[120] flex flex-col justify-between overflow-hidden bg-paper px-5 py-5 text-ink md:px-8 md:py-6"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        >
          <Contour
            className="pointer-events-none absolute inset-0 h-full w-full"
            opacity={0.16}
          />

          <span className="micro relative">{profile.kicker}</span>

          {/* The wordmark, letters rising out of a mask */}
          <div className="relative flex items-end justify-between gap-6">
            <h1 className="display-caps flex overflow-hidden text-[18vw] leading-[0.8] md:text-[13vw]">
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

            <span className="tabular font-display text-[9vw] font-black leading-none md:text-[4vw]">
              {count}
            </span>
          </div>

          {/* Fill rule, driven by the same counter */}
          <div className="relative h-px w-full bg-ink/15">
            <motion.span
              className="absolute inset-y-0 left-0 bg-signal"
              animate={{ width: `${count}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
