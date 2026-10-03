"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildRain,
  buildWord,
  clamp01,
  counter,
  decode,
  drawRain,
  drawStrands,
  drawTear,
  drawWord,
  simulated,
  toRgb,
  wordWeight,
  type RainCol,
  type WordField,
  type WordPhase,
} from "@/lib/neonField";
import { cn } from "@/lib/utils";

/**
 * A word condensing out of dotted data-rain, grain by grain — the Neon
 * Katakana Preloader's title card (repo root, `cyberpunk neon preloaer.txt`),
 * as a component the site can give jobs to: the case-file gate (the
 * project's name while its images load) and the 404 (a word that keeps
 * arriving and falling apart).
 *
 * A dot-matrix label decodes above the word, the count runs below it, and at
 * 100% the word surges, a scan bar crosses it and the signal tears once
 * (lib/neonField's `drawTear` — once, never on a timer). Then:
 *
 *   - `loop`: it holds, drops away, and condenses again, forever;
 *   - otherwise it holds until the parent sets `opening`, when the grains
 *     fall out of frame and spread as the window opens (the parent owns the
 *     window — see NeonGateHost).
 *
 * `progress` (0–100) is the real load; without it the load is simulated
 * over `durationMs`. `rush` finishes it fast (a visitor in a hurry).
 */

/**
 * The display face as this locale has it (Michroma has no Cyrillic, so
 * Mongolian swaps it in globals.css), resolved once the faces are in: the
 * word is sampled from pixels, so it must be drawn in the face itself, not a
 * fallback. Null until then.
 */
export function useDisplayFont(): string | null {
  const [font, setFont] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => {
      if (live) setFont(getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "sans-serif");
    });
    return () => {
      live = false;
    };
  }, []);
  return font;
}

const LOCK_MS = 520;
const LOCK_LOOP_MS = 2600;
const RELEASE_MS = 1500;
const TEAR_MS = 280;

const GLOW = "#8fe9f0"; // --color-holo
const CORE = "#dcfbff";
const ACCENT = "#ff2742";

type Phase = WordPhase;

export function NeonWord({
  word,
  label,
  caption,
  font,
  weight = "900",
  progress,
  durationMs = 4200,
  rush = false,
  loop = false,
  opening = false,
  onLock,
  onLocked,
  className,
}: {
  word: string;
  /** Dot-matrix line above the word; decodes as the load runs. */
  label: string;
  /** Line below the word once loaded (the count shows until then). */
  caption: string;
  /** Face the word is sampled from — one the page already has loaded. */
  font: string;
  weight?: string;
  progress?: number;
  durationMs?: number;
  rush?: boolean;
  loop?: boolean;
  opening?: boolean;
  /** The word has fully condensed: the surge, the sweep, the tear begin. */
  onLock?: () => void;
  /** …and have finished: the parent may open the window. */
  onLocked?: () => void;
  className?: string;
}) {
  const [phase, setPhase] = useState<Phase>("boot");
  const [cycle, setCycle] = useState(0);
  const [pct, setPct] = useState(0);
  const [tick, setTick] = useState(0);
  const [reduced, setReduced] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>(phase);
  const phaseAtRef = useRef(0);
  const resetRef = useRef(true);
  const rushRef = useRef(rush);
  const tearRef = useRef({ at: -1e9, seed: 0 });
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const progressRef = useRef(progress);
  const onLockedRef = useRef(onLocked);
  const onLockRef = useRef(onLock);

  useEffect(() => {
    phaseRef.current = phase;
    progressRef.current = progress;
    onLockedRef.current = onLocked;
    onLockRef.current = onLock;
    rushRef.current = rush || rushRef.current;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* Every phase change is timestamped; entering boot starts a fresh load,
     entering lock tears the signal once. */
  useEffect(() => {
    const now = performance.now();
    phaseAtRef.current = now;
    if (phase === "boot") {
      resetRef.current = true;
      rushRef.current = rush;
    }
    if (phase === "lock") {
      tearRef.current = { at: now, seed: Math.floor(now) % 997 };
      onLockRef.current?.();
    }
    // `rush` is read at the moment of the change, not tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cycle]);

  /* The holds between phases. */
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (phase === "lock") {
      t = setTimeout(
        () => {
          if (loop) setPhase("release");
          else onLockedRef.current?.();
        },
        loop ? LOCK_LOOP_MS : LOCK_MS
      );
    }
    if (phase === "release") {
      t = setTimeout(() => {
        setPhase("boot");
        setCycle((c) => c + 1);
      }, RELEASE_MS);
    }
    return () => clearTimeout(t);
  }, [phase, loop]);

  useEffect(() => {
    // The parent opens the window: the grains fall away.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (opening && phase === "lock") setPhase("open");
  }, [opening, phase]);

  /* One frame loop for the life of the word. */
  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;

    const glow = toRgb(GLOW);
    const scratch = document.createElement("canvas");
    let field: WordField | null = null;
    let cols: RainCol[] = [];
    let W = 0;
    let H = 0;
    let dpr = 1;
    let shown = 0;
    let bootAt = performance.now();
    let last = performance.now();
    let raf = 0;
    let lastPct = -1;
    let lastTick = -1;
    let stopped = false;

    const build = () => {
      const r = root.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      W = r.width;
      H = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      field = buildWord(W, H, word, { font, weight });
      cols = reduced ? [] : buildRain(W, H, { weight: wordWeight(field, W) });
      // grains already revealed stay revealed across a rebuild
      const now = performance.now();
      for (let i = 0; i < field.n; i++) {
        if (phaseRef.current !== "boot" || field.rank[i] <= shown) field.act[i] = now - 5000;
      }
      const b = field.box;
      root.style.setProperty("--nw-bx", b.x + "px");
      root.style.setProperty("--nw-by", b.y + "px");
      root.style.setProperty("--nw-bw", b.w + "px");
      root.style.setProperty("--nw-bh", b.h + "px");
    };

    const frame = (now: number) => {
      if (stopped) return;
      const dt = Math.min(64, now - last);
      last = now;
      const ph = phaseRef.current;
      const f = field;

      if (resetRef.current) {
        resetRef.current = false;
        shown = 0;
        bootAt = now;
        if (f) f.act.fill(-1);
      }

      if (ph === "boot") {
        const external = progressRef.current;
        let target =
          external !== undefined ? clamp01(external / 100) : simulated((now - bootAt) / Math.max(600, durationMs));
        if (rushRef.current) target = 1;
        const rate = rushRef.current ? 0.14 : external !== undefined ? 0.12 : 1;
        shown += (target - shown) * Math.min(1, rate * (dt / 16.7));
        if (target - shown < 0.002) shown = target;
        const p = Math.round(shown * 100);
        if (p !== lastPct) {
          lastPct = p;
          setPct(p);
        }
        const tk = Math.floor(now / 85);
        if (tk !== lastTick) {
          lastTick = tk;
          setTick(tk);
        }
        if (shown >= 1) {
          phaseRef.current = "lock";
          setPhase("lock");
        }
      } else {
        shown = 1;
      }
      root.style.setProperty("--nw-p", shown.toFixed(4));

      if (!f) {
        raf = requestAnimationFrame(frame);
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const since = now - phaseAtRef.current;
      const releasing = ph === "release" || ph === "open";
      const pt = reduced ? null : pointerRef.current;

      if (cols.length) {
        const level = ph === "boot" ? 0.45 + 0.55 * shown : ph === "open" ? Math.max(0, 1 - since / 700) : 1;
        const px = pt?.x ?? -1e4;
        drawRain(ctx, cols, {
          now,
          dt,
          h: H,
          level,
          speed: releasing ? 1.6 : 1,
          near: (x) => (Math.abs(x - px) < 70 ? 1 - Math.abs(x - px) / 70 : 0),
          glow,
          core: CORE,
          dpr,
        });
        drawStrands(ctx, f.strands, { now, alpha: 0.24 * shown * level, glow });
      }

      drawWord(ctx, f, { now, phase: ph, reveal: shown, since, w: W, reduced, pointer: pt, glow: GLOW, core: CORE });

      if (!reduced) {
        const t = (now - tearRef.current.at) / TEAR_MS;
        drawTear(ctx, scratch, f, { t, seed: tearRef.current.seed, dpr, accent: ACCENT });
      }

      raf = requestAnimationFrame(frame);
    };

    build();
    const ro = new ResizeObserver(() => build());
    ro.observe(root);
    // a face that lands late changes the word's shape: sample it again
    document.fonts?.ready.then(() => {
      if (!stopped) build();
    });
    raf = requestAnimationFrame(frame);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [word, font, weight, reduced, durationMs]);

  const loading = phase === "boot";
  const top = loading ? decode(label, clamp01(pct / 70), tick) : label;
  const bottom = loading ? counter(pct) + "%" : caption;

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={cn("nw-root", className)}
      data-phase={phase}
      onPointerMove={(e) => {
        const r = rootRef.current?.getBoundingClientRect();
        if (r && e.pointerType !== "touch") pointerRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      }}
      onPointerLeave={() => (pointerRef.current = null)}
    >
      <div className="nw-halo" />
      <canvas ref={canvasRef} className="nw-canvas" />
      <div className="nw-sweep" />
      <div className="nw-label nw-label-top">
        <span className="nw-dots">{top}</span>
      </div>
      <div className="nw-label nw-label-bottom">
        <span className="nw-dots">{bottom}</span>
      </div>
    </div>
  );
}
