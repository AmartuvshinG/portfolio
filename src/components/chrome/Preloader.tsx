"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLockScroll } from "@/hooks/useLockScroll";
import { markBooted } from "@/hooks/useBootReady";
import { useI18n } from "@/lib/i18n";
import { useIntroReplays } from "@/lib/intro";
import { MARK_D, MARK_T } from "@/components/chrome/NavGlyphs";
import { meanderRing } from "@/lib/meander";
import { createHalftone } from "@/lib/halftone";

/**
 * SIGNAL: the first-load curtain.
 *
 * Built from scratch on 2026-11-14, replacing the brushed ink scroll. Three
 * beats, all of them the load itself rather than a film played over it:
 *
 *   1. **The mark.** ᠠ (the first letter of his name in the vertical script)
 *      is traced by a line of light on the ramp. Round it a hairline ring
 *      turns, and on the ring a meander key (the *alkhan khee* border every
 *      Mongolian ger door and deel hem carries) draws itself on.
 *   2. **The name.** The wordmark stands in hairline outline and fills from
 *      the bottom with the ramp as the load climbs (crimson at the floor,
 *      web-blue at the top), with a mono counter and ratio at the foot.
 *   3. **The tear.** At 100 a halftone front opens from the mark (lib/halftone):
 *      the ground's dots shrink away with ramp-lit rims, uncovering the city.
 *      `markBooted` fires as it starts, so the hero's entrance plays through
 *      the opening rather than behind a wall.
 *
 * The progress is honest at the end: it is simulated up to 92%, then waits
 * for the fonts and the city's first frame before it can reach 100. Any key,
 * click, wheel or touch rushes it. A repeat view in the tab, or Save-Data,
 * runs about three times faster. A ceiling timer lifts it regardless.
 *
 * **First paint is the curtain.** Reduced motion is read with
 * useSyncExternalStore and a server snapshot of "motion allowed", so it is in
 * the server HTML. Visitors who prefer reduced motion, or have no JavaScript,
 * never see it: CSS hides `.preloader` for them (globals.css, and a
 * <noscript> style in the layout).
 */

const SEEN_KEY = "signal-intro-seen";
const CEILING_MS = 9000;
const OPEN_MS = 1150;

const QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const noSubscribe = () => () => {};

/** Load length in ms: 2400 on a first view, 800 on a repeat or Save-Data. */
function loadLength(replay: boolean): number {
  if (replay || typeof window === "undefined") return 2400;
  let seen = false;
  try {
    seen = sessionStorage.getItem(SEEN_KEY) === "1";
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* Storage blocked: every view is a first view. */
  }
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return seen || saveData ? 800 : 2400;
}

/** A load that surges and stalls, never backwards: 0–1 in, 0–1 out. */
const CURVE = [
  [0, 0], [0.12, 0.16], [0.28, 0.22], [0.42, 0.55], [0.52, 0.6], [0.74, 0.86], [0.84, 0.9], [1, 1],
];
function simulated(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  for (let i = 1; i < CURVE.length; i++) {
    const [t0, p0] = CURVE[i - 1];
    const [t1, p1] = CURVE[i];
    if (t <= t1) {
      const u = (t - t0) / (t1 - t0);
      return p0 + (p1 - p0) * u * u * (3 - 2 * u);
    }
  }
  return 1;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function Preloader() {
  /* Keyed by the replay count: a replay is a fresh curtain with fresh state. */
  const replays = useIntroReplays();
  return <Curtain key={replays} replay={replays > 0} />;
}

const RING = meanderRing(200, 200, 176, 20, 36);

function Curtain({ replay }: { replay: boolean }) {
  const { c, t } = useI18n();
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(QUERY).matches, () => false);
  const touch = useSyncExternalStore(noSubscribe, () => window.matchMedia("(pointer: coarse)").matches, () => false);
  const [length] = useState(() => loadLength(replay));
  const [opening, setOpening] = useState(false);
  const [done, setDone] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const ratioRef = useRef<HTMLSpanElement>(null);
  const rushRef = useRef(false);
  const liftedRef = useRef(false);

  const finished = reduced || done;
  useLockScroll(!finished);

  /* Reduced motion: no curtain at all, so the hero is released at once. */
  useEffect(() => {
    if (reduced) markBooted();
  }, [reduced]);

  /* The tear: halftone open from the mark, then the curtain is gone. */
  const open = useCallback(() => {
    if (liftedRef.current) return;
    liftedRef.current = true;
    setOpening(true);
    markBooted();
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const ht = canvas ? createHalftone(canvas) : null;
    if (!ht || !root) {
      // No WebGL: the curtain simply dissolves (AnimatePresence exit).
      setDone(true);
      return;
    }
    const mark = markRef.current?.getBoundingClientRect();
    const cx = mark ? mark.left + mark.width / 2 : window.innerWidth / 2;
    const cy = mark ? mark.top + mark.height / 2 : window.innerHeight / 2;
    const reach = ht.reach(cx, cy) + Math.min(window.innerWidth, window.innerHeight) * 0.36;
    ht.draw(cx, cy, 0);
    // The canvas now holds the ground; the curtain itself can let go of it.
    root.style.background = "transparent";
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / OPEN_MS);
      ht.draw(cx, cy, easeOut(k) * reach);
      if (k < 1) requestAnimationFrame(step);
      else {
        ht.dispose();
        setDone(true);
      }
    };
    requestAnimationFrame(step);
  }, []);

  /* The load: one frame loop writing straight to the DOM, no re-renders. */
  useEffect(() => {
    if (reduced || done) return;
    let ready = false;
    const poster = new Image();
    const posterReady = new Promise<void>((res) => {
      poster.onload = poster.onerror = () => res();
      poster.src = "/ground/city-poster.jpg";
    });
    Promise.all([document.fonts?.ready ?? Promise.resolve(), posterReady]).then(() => {
      ready = true;
    });
    const root = rootRef.current;
    const start = performance.now();
    let shown = 0;
    let last = start;
    let raf = 0;
    let lastInt = -1;
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const elapsed = now - start;
      let target = simulated(elapsed / length);
      if (!ready) target = Math.min(target, 0.92);
      if (rushRef.current) target = ready ? 1 : Math.max(target, 0.92);
      const k = 1 - Math.exp(-dt / (rushRef.current ? 70 : 150));
      shown = Math.max(shown, shown + (target - shown) * k);
      if (target >= 1 && shown > 0.995) shown = 1;
      root?.style.setProperty("--load", shown.toFixed(4));
      /* The fill rises by transforms only: the clip moves up, its contents
         move down by the same amount, so the letters hold still. */
      const fill = fillRef.current;
      if (fill) {
        const off = ((1 - shown) * 100).toFixed(2);
        fill.style.transform = `translateY(${off}%)`;
        (fill.firstElementChild as HTMLElement | null)?.style.setProperty("transform", `translateY(-${off}%)`);
      }
      const n = Math.round(shown * 100);
      if (n !== lastInt) {
        lastInt = n;
        if (countRef.current) countRef.current.textContent = String(n).padStart(3, "0");
        if (ratioRef.current) ratioRef.current.textContent = shown.toFixed(4);
      }
      if (shown >= 1) {
        // A beat on the full mark before it tears.
        window.setTimeout(open, rushRef.current ? 120 : 320);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, done, length, open]);

  /* Skips and the ceiling. */
  useEffect(() => {
    if (reduced || done) return;
    const ceiling = setTimeout(open, CEILING_MS);
    const onSkip = () => {
      rushRef.current = true;
    };
    const SKIP_EVENTS = ["pointerdown", "wheel", "touchstart"] as const;
    for (const ev of SKIP_EVENTS) window.addEventListener(ev, onSkip, { passive: true });
    /* A key behind the curtain is only ever a skip: a deep-linked case file
       opens under it with focus on Close, and Space/Esc must not reach it. */
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      onSkip();
    };
    const swallow = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", swallow, true);
    return () => {
      clearTimeout(ceiling);
      for (const ev of SKIP_EVENTS) window.removeEventListener(ev, onSkip);
      window.removeEventListener("keydown", onKey, true);
      window.setTimeout(() => window.removeEventListener("keyup", swallow, true), 400);
    };
  }, [reduced, done, open]);

  return (
    <AnimatePresence>
      {!finished && (
        <motion.div
          key="preloader"
          ref={rootRef}
          aria-hidden
          className="preloader signal fixed inset-0 z-[120] overflow-hidden text-fg"
          style={{ background: "var(--color-void)" }}
          initial={replay ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: opening ? 0.2 : 0.5 }}
        >
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

          <div className={`signal-scene ${opening ? "signal-scene--out" : ""}`}>
            <div className="signal-top">
              <span className="micro text-fg/80">{t.preloader.reel}</span>
              <span className="micro text-fg/80">{c.profile.kicker}</span>
            </div>

            <div ref={markRef} className="signal-mark">
              <svg className="signal-ring" viewBox="0 0 400 400">
                <circle cx="200" cy="200" r="198" />
                <circle cx="200" cy="200" r="150" />
                <path className="signal-key" d={RING} pathLength={1} />
              </svg>
              <svg className="signal-glyph" viewBox="0 0 32 32">
                <defs>
                  <linearGradient id="signal-ramp" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0" stopColor="#ff1f3d" />
                    <stop offset="0.38" stopColor="#e81cc8" />
                    <stop offset="0.7" stopColor="#8a3dff" />
                    <stop offset="1" stopColor="#5664ff" />
                  </linearGradient>
                </defs>
                <path className="signal-glyph-fill" d={MARK_D} transform={MARK_T} fill="url(#signal-ramp)" />
                <path
                  className="signal-glyph-line"
                  d={MARK_D}
                  transform={MARK_T}
                  pathLength={1}
                  stroke="url(#signal-ramp)"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            <div className="signal-word display-caps">
              <span className="signal-word-outline">{c.profile.wordmark}</span>
              <span ref={fillRef} className="signal-word-fill">
                <span>{c.profile.wordmark}</span>
              </span>
            </div>

            <div className="signal-foot">
              <span className="micro flex items-center gap-2 text-fg/80">
                <span className={`signal-lamp ${opening ? "" : "animate-blink"}`} />
                {opening ? t.preloader.ready : t.preloader.loading}
              </span>
              <span className="micro hidden text-fg/80 md:block">{touch ? t.preloader.skipTap : t.preloader.skipKey}</span>
              <span className="flex items-baseline gap-3">
                <span className="micro tabular text-fg/80" ref={ratioRef}>0.0000</span>
                <span className="signal-count display-caps tabular" ref={countRef}>000</span>
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
