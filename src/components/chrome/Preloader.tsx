"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useLockScroll } from "@/hooks/useLockScroll";
import { usePointerDrift } from "@/hooks/usePointerDrift";
import { markBooted } from "@/hooks/useBootReady";
import { useI18n } from "@/lib/i18n";
import { LedSign } from "@/components/chrome/LedSign";
import { GlowHorizon } from "@/components/ui/GlowHorizon";

/**
 * First-load curtain: his name in Mongol bichig, on a dot-matrix LED panel,
 * powering up in the dark.
 *
 * It replaced the Latin wordmark striking on as neon tubes over a 0→100
 * counter. The counter narrated a delay; this one *is* the delay. The beats,
 * at timeScale 1:
 *
 *      0 ms   dark. Only the dead panel shows, the name faintly in it.
 *    200 ms   current enters the top of the stem and runs down it; every
 *             tooth and loop catches as it is reached (lib/ledSign).
 *    500 ms   the street begins to glow: a sodium glow horizon rises from
 *             the foot of the frame — the sign's light spilling outward.
 *   1350 ms   the sign brightens the room: the halos bloom, a sodium wash
 *             lifts the wall behind it, the rain shows where the light falls
 *             on it, the Latin name appears and the lamp reads READY.
 *   2050 ms   the curtain lifts (the hero starts underneath, useBootReady).
 *
 * Any key, click, wheel or touch skips: whatever is still dark catches at
 * once and the curtain lifts. A second view in the same tab, or Save-Data,
 * runs the whole thing at 0.55×. Background tabs cannot strand it: the beats
 * are timers, not frames, and the scroll lock goes with the curtain.
 *
 * **First paint is the dark room.** Reduced motion is read with
 * useSyncExternalStore and a server snapshot of "motion allowed", so the
 * curtain is in the server HTML. Visitors who do prefer reduced motion, or
 * have no JavaScript, never see it: CSS hides `.preloader` for them before
 * any script runs (globals.css, and a <noscript> style in the layout).
 */

/** The beats, ms at timeScale 1. */
const HORIZON_AT = 500;
const BRIGHT_AT = 1350;
const LIFT_AT = 2050;
/** From a skip to the lift. */
const SKIP_LIFT_MS = 320;
const SEEN_KEY = "led-intro-seen";

const QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

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

export function Preloader() {
  const { c, t } = useI18n();
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
  const [timeScale] = useState(initialTimeScale);
  const [done, setDone] = useState(false);
  const [horizon, setHorizon] = useState(false);
  const [bright, setBright] = useState(false);
  const [skip, setSkip] = useState(false);

  /* The sign writes `lit`; the story animates `glow`. Everything else on the
     screen is a transform of these two, so nothing re-renders per frame. */
  /* The parallax lives on the soft layers — the wall light and the rain — and
     never on the sign: a sub-pixel transform on the canvas blurs every diode. */
  const wallDrift = usePointerDrift(10);
  const rainDrift = usePointerDrift(26);
  const lit = useMotionValue(0);
  const glow = useMotionValue(0);
  const room = useTransform(() => lit.get() * 0.35 + glow.get() * 0.65);
  const rain = useTransform(() => 0.04 + glow.get() * 0.5);

  const finished = reduced || done;
  useLockScroll(!finished);

  /* Release the hero as the curtain starts to lift (see useBootReady). Also
     covers reduced motion, where `finished` resolves true straight after
     hydration and there is no curtain. Never from the server snapshot. */
  useEffect(() => {
    if (finished) markBooted();
  }, [finished]);

  useEffect(() => {
    if (reduced) return;
    const s = timeScale;
    let glowAnim: ReturnType<typeof animate> | null = null;
    const brighten = (duration: number) => {
      setHorizon(true);
      setBright(true);
      glowAnim?.stop();
      glowAnim = animate(glow, 1, { duration, ease: [0.16, 1, 0.3, 1] });
    };

    const timers = [
      setTimeout(() => setHorizon(true), HORIZON_AT * s),
      setTimeout(() => brighten(0.7 * s), BRIGHT_AT * s),
      setTimeout(() => setDone(true), LIFT_AT * s),
    ];

    let skipped = false;
    const onSkip = () => {
      if (skipped) return;
      skipped = true;
      timers.forEach(clearTimeout);
      setSkip(true);
      brighten(0.25);
      timers.push(setTimeout(() => setDone(true), SKIP_LIFT_MS));
    };
    const SKIP_EVENTS = ["keydown", "pointerdown", "wheel", "touchstart"] as const;
    for (const ev of SKIP_EVENTS) window.addEventListener(ev, onSkip, { passive: true });

    return () => {
      timers.forEach(clearTimeout);
      glowAnim?.stop();
      for (const ev of SKIP_EVENTS) window.removeEventListener(ev, onSkip);
    };
  }, [reduced, timeScale, glow]);

  return (
    <AnimatePresence>
      {!finished && (
        <motion.div
          key="preloader"
          aria-hidden
          className="preloader fixed inset-0 z-[120] overflow-hidden bg-void text-fg"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        >
          {/* The wall behind the sign, lit by it. Bled past the frame so its
              drift never shows an edge. */}
          <div ref={wallDrift} aria-hidden className="pointer-events-none absolute -inset-8">
            <motion.div
              className="absolute inset-0"
              style={{
                opacity: room,
                background:
                  "radial-gradient(ellipse 34% 52% at 50% 46%, rgba(255,150,52,0.26), rgba(255,106,26,0.08) 48%, rgba(5,6,13,0) 74%)",
              }}
            />
          </div>

          {/* The street catching the light: the glow horizon, in sodium.
              The box is nearly twice the frame's width and runs under its
              foot, so the arc is a long, almost flat horizon low in the frame
              (crown ≈ 92vh, just over the rule) — never a sphere, and no edge
              of the box is ever on screen. */}
          {horizon && (
            <div aria-hidden className="pointer-events-none absolute -inset-x-[45%] top-[77.5vh] -bottom-[20vh]">
              <GlowHorizon variant="bottom" palette="sodium" intensity={0.7} />
            </div>
          )}

          {/* Rain: invisible in the dark, showing where the sign lights it. */}
          <motion.div
            aria-hidden
            className="preloader-rain-light pointer-events-none absolute inset-0"
            style={{ opacity: rain }}
          >
            <div ref={rainDrift} className="absolute -inset-8">
              <div className="preloader-rain absolute inset-0" />
            </div>
          </motion.div>

          {/* The film's scanlines. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.28) 2px 3px)",
            }}
          />

          {/* The sign, and the name under it once the light is up. */}
          <motion.div
            className="absolute inset-x-0 top-[13vh] flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <LedSign
              text={c.profile.nameScript}
              lit={lit}
              glow={glow}
              timeScale={timeScale}
              skip={skip}
              className="h-[60vh] md:h-[64vh]"
            />
            <motion.span
              className="micro mt-[3vh] pl-[0.6em] tracking-[0.6em] text-[#ffd8a0]"
              initial={{ opacity: 0, y: 6 }}
              animate={bright ? { opacity: 0.9, y: 0 } : { opacity: 0, y: 6 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {c.profile.wordmark}
            </motion.span>
          </motion.div>

          {/* Corners: what this is, and whether it is ready. */}
          <div className="absolute inset-x-5 top-5 flex items-center justify-between md:inset-x-8 md:top-6">
            <span className="micro">{c.profile.kicker}</span>
            <span className="micro flex items-center gap-2 text-[var(--color-hazard)]">
              <span
                className={`h-1.5 w-1.5 rounded-full bg-[var(--color-hazard)] ${bright ? "" : "animate-blink"}`}
              />
              {bright ? t.preloader.ready : t.preloader.loading}
            </span>
          </div>

          {/* The rule fills with the diodes that are on. */}
          <div className="absolute inset-x-5 bottom-5 h-px bg-line md:inset-x-8 md:bottom-6">
            <motion.span
              className="absolute inset-0 origin-left"
              style={{
                scaleX: lit,
                backgroundImage:
                  "linear-gradient(90deg, #ff6a1a, var(--color-hazard) 55%, #fff1dc)",
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
