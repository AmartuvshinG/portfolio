"use client";

import { useEffect, useRef } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { srand } from "@/lib/utils";

/**
 * The centrepiece — a deformed sphere drawn as dotted latitude rings, rotating.
 *
 * Deliberately a 2D canvas and **not** a second WebGL context. The backdrop
 * already owns one; a second would double the GL state the compositor has to
 * juggle, and it would buy nothing, because the reference object is literally
 * dotted contour lines. A canvas draws ~900 arcs a frame without noticing.
 *
 * Latitude rings rather than an even point distribution is the entire trick. An
 * evenly-scattered sphere reads as static or as noise; points marching along
 * rings read as *contours*, and contours are what make a lumpy shape legible as
 * a solid. Same reason a topographic map works.
 *
 * It is painted above the wordmark, so it occludes the middle of the headline —
 * which is what the reference does, and which is the same depth-sandwich idea
 * the surrounding plate stack is built on, stated once at object scale.
 *
 * Budget, per the site's scroll rules:
 *   · 30fps, not display rate
 *   · hard pixel ceiling on the backing buffer, CSS upscales
 *   · the loop stops entirely when the hero is off screen
 *   · reduced motion draws exactly one frame and never starts a loop
 */

/* Density is the whole battle. At ~900 points over a 40vmin sphere the thing
   reads as a spray of dust, not as an object — the contours only close up and
   become a surface once neighbouring dots nearly touch. Doubling the count and
   shrinking the sphere fixes it far better than making the dots bigger, which
   just produces a blurry ball. */
const RINGS = 38;
const PER_RING = 34;

/** Backing-buffer ceiling. Cost is per pixel, so this — not DPR — is the knob. */
const MAX_PIXELS = 420_000;

const FRAME_MS = 1000 / 30;

interface Point {
  x: number;
  y: number;
  z: number;
  /** Ring index, 0–1. Drives dot size so the contours read front to back. */
  t: number;
}

/**
 * The shape. Three harmonics over the sphere: one lobed, one banded, one fine.
 * Summed they give the reference's metaball-with-crevices silhouette, and being
 * pure trig it is identical on every engine — no PRNG in the geometry, only in
 * the per-point jitter that stops the rings looking machined.
 */
function build(): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < RINGS; i++) {
    const v = (i + 0.5) / RINGS;
    const phi = v * Math.PI;
    for (let j = 0; j < PER_RING; j++) {
      const u = j / PER_RING;
      const theta = u * Math.PI * 2;

      const r =
        1 +
        0.3 * Math.sin(3 * theta) * Math.cos(2 * phi) +
        0.17 * Math.sin(5 * phi + 1.3) +
        0.08 * Math.cos(7 * theta + 2.1) +
        (srand(i * 131 + j) - 0.5) * 0.03;

      pts.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.cos(phi),
        z: r * Math.sin(phi) * Math.sin(theta),
        t: v,
      });
    }
  }
  return pts;
}

export function PointCloud({
  progress,
  active,
}: {
  /** Hero scroll progress, 0–1. Swells the bloom and opens the floor strip. */
  progress: MotionValue<number>;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  /* The bloom and the floor strip are DOM, not canvas: both are single
     gradients, and driving them off the same MotionValue as the plates keeps
     them on the compositor instead of costing a canvas redraw. */
  const bloomScale = useTransform(progress, [0, 1], [1, 2.1]);
  const bloomOpacity = useTransform(progress, [0, 0.55, 1], [0.55, 1, 0.35]);
  const stripScale = useTransform(progress, [0, 1], [0.7, 1.5]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const points = build();
    let raf = 0;
    let last = 0;
    let start = 0;
    let rot = 0;
    let running = false;

    const size = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const want = rect.width * rect.height * dpr * dpr;
      const k = want > MAX_PIXELS ? Math.sqrt(MAX_PIXELS / want) : 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr * k));
      canvas.height = Math.max(1, Math.round(rect.height * dpr * k));
      return true;
    };

    const draw = (now: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      /* Entrance dolly: the object arrives small and settles. Expo-out, and it
         is over in 2.6s — after that `k` is pinned at 1 and the only thing
         changing per frame is the rotation. */
      const age = start ? (now - start) / 1000 : 0;
      const intro = Math.min(1, age / 2.6);
      const eased = 1 - Math.pow(1 - intro, 4);

      /* The deformation pushes the radius to ~1.55, so the projected sphere is
         3.1 units across. Dividing the canvas by 3.6 leaves a margin; dividing
         by 2.55 (as this first did) draws a sphere wider than its own canvas and
         clips everything but a vertical strip through the middle — which reads
         as a smear of dust rather than as an object. */
      const k = (0.72 + 0.28 * eased) * (h / 3.6);

      ctx.clearRect(0, 0, w, h);

      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      /* A fixed tilt so the rings are seen obliquely — dead-on, latitude rings
         collapse into concentric circles and the shape reads flat. */
      const tiltC = Math.cos(-0.42);
      const tiltS = Math.sin(-0.42);

      // Painter's algorithm: far points first, so near dots overlap them.
      const projected: { x: number; y: number; d: number; t: number }[] = [];
      for (const p of points) {
        const x1 = p.x * cos - p.z * sin;
        const z1 = p.x * sin + p.z * cos;
        const y2 = p.y * tiltC - z1 * tiltS;
        const z2 = p.y * tiltS + z1 * tiltC;

        // Weak perspective. Strong perspective on a shape this round just
        // reads as a wobble.
        const persp = 3.1 / (3.1 + z2);
        projected.push({
          x: cx + x1 * k * persp,
          y: cy + y2 * k * persp,
          d: z2,
          t: p.t,
        });
      }
      projected.sort((a, b) => a.d - b.d);

      for (const p of projected) {
        // Depth → brightness and size. This is what turns a flat scatter of
        // dots into something with a front and a back.
        const depth = (p.d + 1.4) / 2.8;
        const alpha = 0.16 + Math.max(0, Math.min(1, depth)) * 0.84;
        const r = (0.85 + depth * 1.35) * (h / 250);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.t > 0.5 ? "#eceefb" : "#cfd3ea";
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.4, r), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!start) start = now;
      rot += dt * 0.22;
      draw(now);
    };

    const startLoop = () => {
      if (running || reduced) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    if (!size()) return;

    if (reduced) {
      // One frame, mid-rotation, and no loop is ever created.
      start = performance.now() - 3000;
      rot = 0.9;
      draw(performance.now());
      return;
    }

    // Only run while the hero is actually on screen.
    let onScreen = false;
    const io = new IntersectionObserver(
      ([e]) => {
        onScreen = e.isIntersecting;
        if (onScreen) startLoop();
        else stopLoop();
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    /* And **not** while the page is being scrolled.
       This is the same on-demand bargain the navbar's glass makes. Redrawing
       ~1300 arcs is the most expensive thing in the hero on a slow CPU, and
       during a scroll it is also the least visible: the object is already
       sweeping across the frame on its plate, so a 30fps rotation underneath
       that motion is imperceptible. Suspending the loop hands those frames
       straight back to the compositor, and it resumes 140ms after the scroll
       stops — which is when somebody is actually looking at it. */
    let idle: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      stopLoop();
      clearTimeout(idle);
      idle = setTimeout(() => {
        if (onScreen) startLoop();
      }, 140);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onResize = () => {
      if (size()) draw(performance.now());
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      io.disconnect();
      stopLoop();
      clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [reduced]);

  return (
    <div aria-hidden className="absolute inset-0 flex items-center justify-center">
      {/* The bloom. One radial gradient behind the object — violet core into a
          magenta rim, which is the ramp's answer to the reference's red. */}
      <motion.div
        className="absolute h-[50vmin] w-[50vmin] rounded-full"
        style={{
          scale: bloomScale,
          opacity: bloomOpacity,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--spectrum-2) 62%, transparent) 0%, color-mix(in srgb, var(--spectrum-1) 34%, transparent) 34%, transparent 68%)",
          willChange: active ? "transform, opacity" : "auto",
        }}
      />

      <canvas
        ref={canvasRef}
        className="relative h-[34vmin] w-[34vmin]"
      />

      {/* The dashed strip on the floor beneath it. Present in the reference and
          easy to dismiss, but it is the only thing establishing a ground plane —
          without it the object floats in an undefined space. */}
      <motion.div
        className="absolute top-[calc(50%+17vmin)] h-[2px] w-[38vmin]"
        style={{
          scaleX: stripScale,
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--spectrum-1) 0 8px, transparent 8px 22px)",
          maskImage: "linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent)",
          opacity: 0.8,
          willChange: active ? "transform" : "auto",
        }}
      />
    </div>
  );
}
