"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, type MotionValue } from "framer-motion";
import { createInkRenderer, inkLayout, type InkLayout } from "@/lib/inkShader";
import { INK_NAME } from "@/lib/inkName";
import { brushAt } from "@/lib/inkPath";
import { pointerEnabled, retainPointer, stepPointer } from "@/lib/pointer";
import { Seal } from "@/components/ui/Seal";

/**
 * The intro's scroll: his name in Mongol bichig, brushed onto paper in a dark
 * room (the scene is lib/inkShader; the brush is the bake's).
 *
 * This component is the scene's director. It owns the clock and every beat
 * that belongs to the room, in scene ms (× timeScale):
 *
 *      0   dark
 *    150   the lamp catches: two stutters, then it warms up to full
 *    200   the scroll unrolls; the roller drops and settles
 *    300   the neon in the window comes up
 *    900   the brush's shadow comes over the paper
 *   1000   the brush lands at the crown and writes down the stem, one
 *          stroke at a time: each tooth and tail as it reaches it, a lift
 *          and a beat in the air back to the stem, on (the bake's route)
 *   3120   a spinner passes outside; its light crosses the wall
 *   3960   the neon stutters once
 *   5500   the last stroke; the brush leaves; the seal stamps — the paper
 *          dips, the lamp jolts
 *   6250   done: the preloader racks focus and lifts
 *
 * The preloader owns the story around it (the letterbox, the slate, when to
 * lift, `markBooted`). It hands in `skip` and `focus`, and hears back through
 * `progress` (how much is written, for the slate's rule) and `onDone`.
 *
 * The clock does not start until the brush texture has decoded — the room
 * stays dark rather than playing an unrolling with nothing to write. If it
 * has not decoded in 1.5 s, or there is no WebGL, the DOM fallback writes the
 * finished ink down a plain paper panel instead.
 */

const LAMP_AT = 150;
const UNROLL_AT = 200;
const UNROLL_MS = 800;
const NEON_AT = 300;
const WRITE_AT = 1000;
/** A sure hand: ~19 strokes, a quarter of it in the air. Was 7000 — watchable,
    but long enough that visitors waited on it. */
const WRITE_MS = 4500;
/* The spinner and the flicker are beats *inside* the writing, so they are
   placed as fractions of it and move with it. */
const SWEEP_AT = WRITE_AT + 0.471 * WRITE_MS;
const SWEEP_MS = 1100;
const FLICKER_AT = WRITE_AT + 0.657 * WRITE_MS;
const WRITTEN = WRITE_AT + WRITE_MS;
/** The seal lands this long after the last stroke… */
const STAMP_DELAY = 120;
/** …and the scene is done this long after it lands. */
const HOLD_MS = 630;
const DONE_AT = WRITTEN + STAMP_DELAY + HOLD_MS;
/** A skip finishes the writing in this much real time. */
const SKIP_MS = 260;
const IMAGE_TIMEOUT = 1500;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const easeOut = (x: number) => 1 - (1 - x) * (1 - x) * (1 - x);
/** The roller drops, overshoots a hair and settles. */
const settle = (x: number) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const s = 1.3;
  const y = x - 1;
  return 1 + y * y * ((s + 1) * y + s);
};

/** The lamp: two stutters, then a warm ramp. 0…1 */
function lampAt(t: number): number {
  const u = t - LAMP_AT;
  if (u < 0) return 0;
  if (u < 60) return 0.35;
  if (u < 150) return 0.04;
  if (u < 210) return 0.6;
  if (u < 270) return 0.18;
  return 0.55 + 0.45 * easeOut(clamp01((u - 270) / 420));
}
function neonAt(t: number): number {
  const u = t - NEON_AT;
  if (u < 0) return 0;
  const f = t - FLICKER_AT;
  const base = easeOut(clamp01(u / 800));
  if (f > 0 && f < 60) return base * 0.15;
  if (f > 100 && f < 140) return base * 0.3;
  return base;
}

export function InkScroll({
  timeScale = 1,
  skip = false,
  focus,
  progress,
  onDone,
}: {
  timeScale?: number;
  /** Finish everything still to come, now. */
  skip?: boolean;
  /** 0…1 rack focus past the scroll, driven by the preloader as it lifts. */
  focus: MotionValue<number>;
  /** Written: how much of the name is down, 0…1. */
  progress: MotionValue<number>;
  onDone: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<InkLayout | null>(null);
  const [fallback, setFallback] = useState(false);
  const [stamped, setStamped] = useState(false);
  const skipRef = useRef(skip);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    skipRef.current = skip;
  }, [skip]);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    /* Under reduced motion the curtain is display:none but still hydrates;
       a 0px box must not build a renderer. */
    if (box.clientWidth < 8 || box.clientHeight < 8) return;

    let cancelled = false;
    let raf = 0;
    let releasePointer = () => {};
    let renderer: Awaited<ReturnType<typeof createInkRenderer>> = null;

    const image = new Image();
    image.decoding = "async";
    image.src = INK_NAME.src;
    const timeout = new Promise<"late">((r) => setTimeout(() => r("late"), IMAGE_TIMEOUT));

    const goFallback = () => {
      if (cancelled) return;
      setLayout(inkLayout(box.clientWidth, box.clientHeight, INK_NAME));
      setFallback(true);
    };

    Promise.race([image.decode().then(() => "ok" as const), timeout])
      .then(async (r) => {
        if (cancelled) return;
        if (r !== "ok") return goFallback();
        renderer = await createInkRenderer(canvas, image, INK_NAME);
        if (cancelled) return;
        if (!renderer) return goFallback();
        start();
      })
      .catch(goFallback);

    function start() {
      const r = renderer!;
      const resize = () => setLayout(r.resize(box!.clientWidth, box!.clientHeight));
      resize();
      window.addEventListener("resize", resize);

      const look = pointerEnabled();
      if (look) releasePointer = retainPointer();

      const t0 = performance.now();
      /* Scene time, bent once if the visitor skips: from then on it runs
         fast enough that the writing finishes in SKIP_MS of real time. */
      let skippedAt = -1;
      let sceneAtSkip = 0;
      let rate = 1;
      const scene = (now: number) => {
        const base = (now - t0) / timeScale;
        if (skipRef.current && skippedAt < 0) {
          skippedAt = now;
          sceneAtSkip = base;
          rate = Math.max(1 / timeScale, (WRITTEN - base) / SKIP_MS);
        }
        return skippedAt < 0 ? base : sceneAtSkip + ((now - skippedAt) * rate);
      };

      let stampAt = -1; // real ms
      let doneSent = false;
      const frame = (now: number) => {
        if (cancelled) return;
        const t = scene(now);

        if (t >= WRITTEN + STAMP_DELAY && stampAt < 0) {
          stampAt = now;
          setStamped(true);
        }
        /* The thud, in real time: a 260 ms dip and back, and the lamp jolts. */
        const dt = stampAt < 0 ? -1 : now - stampAt - 140;
        const thud = dt > 0 && dt < 260 ? Math.sin((dt / 260) * Math.PI) : 0;

        const writeT = (t - WRITE_AT) / WRITE_MS;
        progress.set(clamp01(writeT));
        const lookNow = look ? stepPointer(now) : { x: 0, y: 0 };
        const f = focus.get();
        const brush = brushAt(writeT);
        r.draw({
          time: ((now - t0) % 600000) / 1000,
          t: Math.max(-0.1, writeT),
          writeSecs: (WRITE_MS * timeScale) / 1000,
          lamp: lampAt(t) * (1 + 0.22 * thud),
          neon: neonAt(t),
          focus: f,
          zoom: 1 + 0.03 * easeOut(clamp01(t / DONE_AT)) + 0.07 * f,
          dip: 1.6 * thud,
          sweep: t > SWEEP_AT && t < SWEEP_AT + SWEEP_MS ? (t - SWEEP_AT) / SWEEP_MS : -1,
          unroll: settle(clamp01((t - UNROLL_AT) / UNROLL_MS)),
          lookX: lookNow.x,
          lookY: lookNow.y,
          tipX: brush.x,
          tipY: brush.y,
          tipLift: brush.lift,
          tipR: brush.r,
          // The hand comes over the paper just before the first stroke and
          // leaves after the last.
          tipVis: smooth(-0.03, -0.004, writeT) * (1 - smooth(1.0, 1.05, writeT)),
        });
        if (sealRef.current) {
          // The seal is printed on the paper: it follows the scroll's look and
          // dip, and defocuses with it.
          const s = sealRef.current.style;
          s.transform = `translate3d(${lookNow.x * 16}px, ${lookNow.y * 16 + 1.6 * thud}px, 0)`;
          // A small element, blurred only for the one-second rack focus.
          s.filter = f > 0.01 ? `blur(${(f * 7).toFixed(2)}px)` : "";
        }

        const realDone = stampAt >= 0 && now - stampAt > HOLD_MS * (skippedAt < 0 ? timeScale : 0.6);
        if (realDone && !doneSent) {
          doneSent = true;
          doneRef.current();
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      cleanupResize = () => window.removeEventListener("resize", resize);
    }
    let cleanupResize = () => {};

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      cleanupResize();
      releasePointer();
    };
  }, [timeScale, focus, progress]);

  /* The fallback writes the finished ink down a plain paper panel. */
  useEffect(() => {
    if (!fallback) return;
    const ms = skip ? SKIP_MS : WRITE_MS * timeScale;
    const run = animate(progress, 1, { duration: ms / 1000, ease: "linear" });
    const stamp = setTimeout(() => setStamped(true), ms + STAMP_DELAY);
    const done = setTimeout(() => doneRef.current(), ms + STAMP_DELAY + HOLD_MS);
    return () => {
      run.stop();
      clearTimeout(stamp);
      clearTimeout(done);
    };
  }, [fallback, skip, timeScale, progress]);

  return (
    <div ref={boxRef} aria-hidden className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {fallback && layout && (
        <>
          <div
            className="absolute"
            style={{
              left: layout.paper.x0,
              top: 0,
              width: layout.paper.x1 - layout.paper.x0,
              height: layout.paper.y1,
              background: "linear-gradient(180deg, #b9a98a, var(--color-paper) 30%, #d9cdb2)",
              boxShadow: "0 0 0 18px #2a1d16, 24px 30px 60px rgba(0,0,0,0.7)",
            }}
          />
          <motion.div
            className="absolute"
            style={{
              left: layout.ink.x,
              top: layout.ink.y,
              width: layout.ink.w,
              height: layout.ink.h,
              backgroundColor: "var(--color-ink)",
              WebkitMaskImage: `url(${INK_NAME.mask})`,
              maskImage: `url(${INK_NAME.mask})`,
              WebkitMaskSize: "100% 100%",
              maskSize: "100% 100%",
              clipPath: "inset(0 0 100% 0)",
            }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            transition={{ duration: (skip ? SKIP_MS : WRITE_MS * timeScale) / 1000, ease: "linear" }}
          />
        </>
      )}

      {layout && (
        <div
          ref={sealRef}
          className="absolute"
          style={{ left: layout.seal.x, top: layout.seal.y, width: layout.seal.size, height: layout.seal.size }}
        >
          <motion.div
            className="h-full w-full"
            style={{ mixBlendMode: "multiply" }}
            initial={{ opacity: 0, scale: 1.14 }}
            animate={stamped ? { opacity: 0.92, scale: 1 } : { opacity: 0, scale: 1.14 }}
            transition={{ duration: 0.16, ease: [0.55, 0, 0.9, 0.4] }}
          >
            <Seal className="h-full w-full" />
          </motion.div>
        </div>
      )}
    </div>
  );
}
