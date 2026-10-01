"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { useLockScroll } from "@/hooks/useLockScroll";
import { markBooted } from "@/hooks/useBootReady";
import { useI18n } from "@/lib/i18n";
import { InkScroll } from "@/components/chrome/InkScroll";
import { useIntroReplays } from "@/lib/intro";
import { requestRewrite } from "@/lib/inkWriteQueue";

/**
 * First-load curtain: his name in Mongol bichig, written by brush on a
 * hanging scroll in a dark room, framed like the first shot of a film.
 *
 * It replaced the dot-matrix LED sign. A sign is something the city switches
 * on; this is something a hand makes — and the hero then shows the same
 * name as the city's neon, which is the whole story of the site in two shots.
 *
 * The room and its beats are InkScroll's (the lamp, the unrolling, the brush,
 * the seal). This component owns the frame around it and the exit:
 *
 *   - 2.39:1 letterbox bars with a slate: reel and status up top, the
 *     wordmark, a skip hint and the ink's progress rule below;
 *   - when the scroll is done, a rack focus past it (the scroll goes soft)
 *     while the curtain dissolves onto the hero's city and the bars slide
 *     off. `markBooted` fires as the dissolve starts, so the hero's own
 *     focus-pull plays under it and lands as the curtain clears.
 *
 * Any key, click, wheel or touch skips: the brush finishes in a quarter of a
 * second, the seal stamps, and it lifts. A second view in the same tab, or
 * Save-Data, runs at 0.55×; a replay (lib/intro — the footer, the palette)
 * runs at full length again. A ceiling timer lifts it regardless, so a stalled
 * frame loop (a background tab) can never strand the page behind it.
 *
 * **First paint is the dark room.** Reduced motion is read with
 * useSyncExternalStore and a server snapshot of "motion allowed", so the
 * curtain is in the server HTML. Visitors who do prefer reduced motion, or
 * have no JavaScript, never see it: CSS hides `.preloader` for them before
 * any script runs (globals.css, and a <noscript> style in the layout).
 */

const SEEN_KEY = "ink-intro-seen";
/** Lift no matter what after this long (× timeScale). */
const CEILING_MS = 13000;

const QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const noSubscribe = () => () => {};

/** 0.55 on a repeat view or Save-Data, else 1. Client-only; nothing in the
 *  markup depends on it, so the server's 1 cannot mismatch. */
function initialTimeScale(): number {
  if (typeof window === "undefined") return 1;
  let seen = false;
  try {
    seen = sessionStorage.getItem(SEEN_KEY) === "1";
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* Storage blocked: every view is a first view. */
  }
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    ?.saveData;
  return seen || saveData ? 0.55 : 1;
}

/** The bars' height: the same rule as `letterboxBar` in lib/inkShader. */
const BAR =
  "h-[clamp(6dvh,calc((100dvh-41.841vw)/2),16dvh)] portrait:h-[7dvh]";

export function Preloader() {
  /* Keyed by the replay count: a replay is a fresh curtain with fresh state. */
  const replays = useIntroReplays();
  return <Curtain key={replays} replay={replays > 0} />;
}

function Curtain({ replay }: { replay: boolean }) {
  const { c, t } = useI18n();
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
  const [timeScale] = useState(() => (replay ? 1 : initialTimeScale()));
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [writing, setWriting] = useState(false);
  const [skip, setSkip] = useState(false);
  const touch = useSyncExternalStore(
    noSubscribe,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false
  );

  const focus = useMotionValue(0);
  const progress = useMotionValue(0);

  const finished = reduced || done;
  /* After a replay the signs on screen write themselves again. */
  useEffect(() => {
    if (!replay || !done) return;
    const id = window.setTimeout(requestRewrite, 900);
    return () => window.clearTimeout(id);
  }, [replay, done]);
  useLockScroll(!finished);

  /* Release the hero as the dissolve starts (see useBootReady). Also covers
     reduced motion, where `finished` resolves true straight after hydration
     and there is no curtain. Never from the server snapshot. */
  useEffect(() => {
    if (finished) markBooted();
  }, [finished]);

  useEffect(() => {
    return progress.on("change", (v) => {
      if (v > 0) setWriting(true);
    });
  }, [progress]);

  /* READY first, then the exit: AnimatePresence freezes the tree it is
     removing, so a label changed in the same render never shows. */
  const lift = useCallback(() => {
    setReady(true);
    animate(focus, 1, { duration: 1.0, ease: [0.45, 0, 0.2, 1] });
    setTimeout(() => setDone(true), 240);
  }, [focus]);

  useEffect(() => {
    if (reduced) return;
    const ceiling = setTimeout(lift, CEILING_MS * timeScale);
    let skipped = false;
    const onSkip = () => {
      if (skipped) return;
      skipped = true;
      setSkip(true);
    };
    const SKIP_EVENTS = ["keydown", "pointerdown", "wheel", "touchstart"] as const;
    for (const ev of SKIP_EVENTS) window.addEventListener(ev, onSkip, { passive: true });
    return () => {
      clearTimeout(ceiling);
      for (const ev of SKIP_EVENTS) window.removeEventListener(ev, onSkip);
    };
  }, [reduced, timeScale, lift]);

  const status = ready ? t.preloader.ready : writing ? t.preloader.writing : t.preloader.loading;

  return (
    <AnimatePresence>
      {!finished && (
        <motion.div
          key="preloader"
          aria-hidden
          className="preloader fixed inset-0 z-[120] overflow-hidden bg-void text-fg"
          /* First load: the server's dark room is already there. A replay
             fades the room in over the page. */
          initial={replay ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          /* A visitor who skipped has said they are in a hurry. */
          transition={skip ? { duration: 0.6, delay: 0.1 } : { duration: 1.1, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <InkScroll
            timeScale={timeScale}
            skip={skip}
            focus={focus}
            progress={progress}
            onDone={lift}
          />

          {/* ---- the letterbox, and the slate in it ---------------------- */}
          <motion.div
            className={`absolute inset-x-0 top-0 flex items-end justify-between bg-[#020306] px-5 pb-3 md:px-10 md:pb-4 ${BAR}`}
            exit={{ y: "-100%" }}
            transition={{ duration: 1.0, delay: 0.25, ease: [0.7, 0, 0.3, 1] }}
          >
            <span className="micro text-fg/70">{t.preloader.reel}</span>
            <span className="micro flex items-center gap-4 text-fg/70">
              <span className="flex items-center gap-2 text-[var(--color-hazard)]">
                <span
                  className={`h-1.5 w-1.5 rounded-full bg-[var(--color-hazard)] ${ready ? "" : "animate-blink"}`}
                />
                {status}
              </span>
            </span>
          </motion.div>

          <motion.div
            className={`absolute inset-x-0 bottom-0 flex items-start justify-between gap-6 bg-[#020306] px-5 pt-3 md:px-10 md:pt-4 ${BAR}`}
            exit={{ y: "100%" }}
            transition={{ duration: 1.0, delay: 0.25, ease: [0.7, 0, 0.3, 1] }}
          >
            <motion.span
              className="micro pl-[0.1em] tracking-[0.5em] text-[#ffd8a0]"
              initial={{ opacity: 0, y: 4 }}
              animate={ready || skip ? { opacity: 0.9, y: 0 } : { opacity: 0, y: 4 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {c.profile.wordmark}
            </motion.span>

            <motion.span
              className="micro hidden text-fg/45 md:block"
              animate={{ opacity: skip || ready ? 0 : 1 }}
              transition={{ duration: 0.3 }}
            >
              {touch ? t.preloader.skipTap : t.preloader.skipKey}
            </motion.span>

            {/* The rule fills as the name is written. */}
            <div className="relative mt-[0.45em] h-px w-24 shrink-0 bg-line md:w-40">
              <motion.span
                className="absolute inset-0 origin-left"
                style={{
                  scaleX: progress,
                  backgroundImage: "linear-gradient(90deg, #ff6a1a, var(--color-hazard) 55%, #fff1dc)",
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
