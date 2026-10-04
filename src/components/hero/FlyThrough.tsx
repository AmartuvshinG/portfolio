"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { MotionValue } from "framer-motion";

/**
 * The hero's exit: the name becomes a window, and the camera flies through it.
 *
 * A void plate with the name cut out of it fades in over the footage, so the
 * letters turn into a window onto the moon (the tube fades at the same time:
 * the light becomes the hole it was lit on). Then the window scales up about
 * the left stem of the last letter (N, or Н in Mongolian) until the stem is
 * the whole screen, and you are through the letter onto the full footage as
 * About's statement arrives. The plate reaches 0 opacity exactly as the
 * window covers the frame, so there is no cut and no closing veil.
 *
 *   p 0.25 → 0.45   the plate fades in
 *   p 0.45 → 1      the window opens through the stem; the plate fades as
 *                   the stem reaches the screen's far edge
 *
 * `p` is the hero's pin progress: 0 at the top, 1 when the sticky frame is
 * about to scroll away.
 *
 * **Why an SVG text mask, zoomed by its own `transform` attribute.** A CSS
 * transform on a promoted layer rasterises the letters once and blurs them at
 * 200×; an attribute transform on the masked <text> is re-rasterised as
 * vector every frame, so the stem's edge stays sharp all the way in.
 *
 * Lives inside the name's plane (the scroll transform and the drift), so the
 * window rides the name exactly. Hidden (`display:none`) outside its range;
 * writes nothing at idle. Decorative: aria-hidden. The h1 is the name.
 */

const IN_FROM = 0.25;
const IN_TO = 0.45;
/** The plate starts to go when the uncovered strip is this share of the width. */
const OUT_SPAN = 0.6;
/** Where in the zoom the stem has covered the frame. */
const COVER_AT = 0.85;

const clamp = (v: number) => Math.min(1, Math.max(0, v));

export function FlyThrough({
  progress,
  text,
  textRef,
  active,
}: {
  progress: MotionValue<number>;
  /** The name, as set in the h1. */
  text: string;
  /** The element that sets the name's glyphs (the neon tube). */
  textRef: RefObject<HTMLElement | null>;
  /** The hero is on screen. */
  active: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const textElRef = useRef<SVGTextElement>(null);
  const rectRef = useRef<SVGRectElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const tx = textElRef.current;
    const plate = rectRef.current;
    if (!svg || !tx || !plate) return;

    /* Measured lazily, the first frame the layer is needed, and again after
       a resize or a font swap: the name has finished arriving by then. */
    let geo: { ox: number; oy: number; cover: number; oxs: number; half: number; vw: number } | null = null;

    const measure = () => {
      const src = textRef.current;
      const host = svg.parentElement;
      if (!src || !host) return null;
      const hostRect = host.getBoundingClientRect();
      const k = host.offsetWidth ? hostRect.width / host.offsetWidth : 1;
      const r = src.getBoundingClientRect();
      const cs = getComputedStyle(src);
      const fs = parseFloat(cs.fontSize);
      Object.assign(tx.style, {
        fontFamily: cs.fontFamily,
        fontWeight: cs.fontWeight,
        fontSize: cs.fontSize,
        letterSpacing: cs.letterSpacing,
        textTransform: cs.textTransform,
      });
      tx.removeAttribute("transform");
      const x = (r.left - hostRect.left) / k;
      // Baseline: the SVG text's box is the same ascent + descent as the
      // inline box's, so align their tops.
      tx.setAttribute("x", String(x));
      tx.setAttribute("y", "0");
      const bb = tx.getBBox();
      const top = (r.top - hostRect.top) / k;
      const base = top - bb.y;
      tx.setAttribute("y", String(base));

      const n = tx.getNumberOfChars();
      if (!n) return null;
      const last = tx.getExtentOfChar(n - 1);
      const glyph = Array.from(text).at(-1) ?? "";
      const stem = findStem(glyph, cs, fs);
      const ox = last.x + stem.x;
      const oy = base - stem.y;
      /* How far the stem has to grow: from its half-width to the farthest
         corner of the screen, in this plane's units. */
      const vw = window.innerWidth / k;
      const vh = window.innerHeight / k;
      const oxs = ox + hostRect.left / k;
      const oys = oy + hostRect.top / k;
      const reach = Math.hypot(Math.max(oxs, vw - oxs), Math.max(oys, vh - oys));
      return { ox, oy, cover: reach / Math.max(1, stem.half), oxs, half: stem.half, vw };
    };

    const draw = (p: number) => {
      const on = active && p > IN_FROM && p < 0.999;
      svg.style.display = on ? "" : "none";
      if (!on) return;
      if (!geo) geo = measure();
      if (!geo) return;
      const fadeIn = clamp((p - IN_FROM) / (IN_TO - IN_FROM));
      const z = clamp((p - IN_TO) / (1 - IN_TO));
      /* Exponential, easing in: a camera gathering speed, not a zoom. The
         stem covers the frame at z = COVER_AT and the flight carries on past
         it, so the last stretch of the runway is open footage. */
      const s = Math.pow(geo.cover, Math.pow(z, 1.6) / Math.pow(COVER_AT, 1.6));
      /* The plate goes as the window covers the frame, not on a clock: the
         stem can sit near either edge, and the far side is covered last.
         `open` is the widest strip of screen the stem has not reached yet;
         the plate is gone exactly when that strip is. */
      const left = geo.oxs - geo.half * s;
      const right = geo.oxs + geo.half * s;
      const open = Math.max(0, left, geo.vw - right) / geo.vw;
      const out = clamp(open / OUT_SPAN);
      if (out <= 0) {
        // Through: nothing left to paint.
        svg.style.display = "none";
        return;
      }
      plate.style.opacity = String(fadeIn * out * out * (3 - 2 * out));
      tx.setAttribute(
        "transform",
        `translate(${geo.ox} ${geo.oy}) scale(${s}) translate(${-geo.ox} ${-geo.oy})`
      );
    };

    const remeasure = () => {
      geo = null;
      draw(progress.get());
    };

    draw(progress.get());
    const off = progress.on("change", draw);
    window.addEventListener("resize", remeasure);
    document.fonts?.ready.then(remeasure).catch(() => {});
    return () => {
      off();
      window.removeEventListener("resize", remeasure);
    };
  }, [progress, textRef, active, text]);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-visible"
      style={{ display: "none" }}
    >
      <defs>
        <mask id="hero-fly-mask" maskUnits="userSpaceOnUse" x={-20000} y={-20000} width={40000} height={40000}>
          <rect x={-20000} y={-20000} width={40000} height={40000} fill="#fff" />
          <text ref={textElRef} fill="#000">
            {text}
          </text>
        </mask>
      </defs>
      <rect
        ref={rectRef}
        x={-20000}
        y={-20000}
        width={40000}
        height={40000}
        mask="url(#hero-fly-mask)"
        style={{ opacity: 0, fill: "var(--color-void)" }}
      />
    </svg>
  );
}

/**
 * The left stem of a glyph, found rather than guessed: the glyph is drawn
 * once on a scratch canvas in the name's own font, and a row a quarter of the
 * way up the caps (below any crossbar or diagonal joint) is scanned for its
 * first run of ink. Returns the run's centre from the pen position, its
 * height above the baseline, and its half-width, all in CSS px.
 */
function findStem(glyph: string, cs: CSSStyleDeclaration, fs: number) {
  const fallback = { x: 0.1 * fs, y: 0.2 * fs, half: 0.04 * fs };
  const w = Math.ceil(fs * 1.6);
  const h = Math.ceil(fs * 1.4);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || !glyph) return fallback;
  ctx.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
  const base = Math.round(fs * 1.1);
  ctx.fillText(cs.textTransform === "uppercase" ? glyph.toUpperCase() : glyph, 0, base);
  const m = ctx.measureText("H");
  const cap = m.actualBoundingBoxAscent || 0.7 * fs;
  const row = Math.round(base - cap * 0.25);
  const data = ctx.getImageData(0, row, w, 1).data;
  let start = -1;
  for (let x = 0; x < w; x++) {
    const ink = data[x * 4 + 3] > 128;
    if (ink && start < 0) start = x;
    if (!ink && start >= 0) return { x: (start + x) / 2, y: cap * 0.25, half: (x - start) / 2 };
  }
  return fallback;
}
