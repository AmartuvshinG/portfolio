"use client";

import { useEffect, useRef } from "react";
import { useBootReady } from "@/hooks/useBootReady";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { registerScrollPause } from "@/lib/scrollPause";
import { pointerEnabled, retainPointer, stepPointer } from "@/lib/pointer";
import { FOCUS_MS, groundCovered, onCover, onSurge, readFocuses, readVelocity } from "@/lib/groundBus";
import { buildRain, drawRain, hash, type RainCol } from "@/lib/neonField";

/**
 * The site's ground: a black room with a red haze rising off the floor and
 * dotted data-rain falling through it. The background of the Neon Katakana
 * Preloader (repo root, `cyberpunk neon preloaer.txt`), behind every section.
 *
 * It replaced the film (the city → station reels), and kept the film's one
 * rule: it is the *only* ground, fixed at z-0, and no section paints its own.
 *
 * Layers, back to front (the base gradient and the grain are SiteBackdrop's):
 *
 *   haze       static radial gradients, no blur. A seam crossing swells it
 *              (`data-surge`, a CSS transition — never a per-frame write).
 *   rain       one 2D canvas: dotted columns with Cyrillic or dot heads in
 *              holo, faint hanging strands, and a slow roll band. Densest in
 *              the gutters and thin over the middle, where the text is.
 *   scanlines  a static repeating gradient, painted once.
 *
 * The rain listens to the page through lib/groundBus: scrolling down drives it
 * into streaks, the cursor stirs the columns it passes, a chapter's title card
 * brings it down hard over the heading.
 *
 * **Budget.** 24 fps (rain reads as rain well below display rate), a device-pixel
 * ceiling instead of a DPR cap, and no frames at all while the tab is hidden,
 * while the intro curtain is up, or while something opaque covers the screen.
 * Under reduced motion it draws one still frame and stops.
 */

const FPS = 24;
/** Device pixels the canvas may have, whatever the screen. */
const MAX_PIXELS = 2_000_000;
const GLOW: [number, number, number] = [126, 234, 255]; // --color-holo
const CORE = "#dcfbff";
/** Overall strength of the rain behind the page (the gate runs at 1). */
const LEVEL = 0.75;
/** A roll band crosses the screen this often, ms. */
const ROLL_MS = 7000;

/** Thick in the gutters, thin over the reading column. */
const gutterWeight = (xn: number) => {
  const d = (xn - 0.5) / 0.26;
  return 1 - 0.68 * Math.exp(-d * d);
};

/* A phone has no gutters: its text runs edge to edge, so the rain is thin
   everywhere rather than thick at the sides. */
const phoneWeight = () => 0.34;

export function NeonGround() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const booted = useBootReady();
  const reduced = useReducedMotion();

  /* The seam's swell: on, then off after the rise, so the CSS transition
     carries it up fast and lets it down slowly. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const unpause = registerScrollPause(root);
    let off: ReturnType<typeof setTimeout> | undefined;
    const unsub = onSurge(() => {
      root.setAttribute("data-surge", "");
      clearTimeout(off);
      off = setTimeout(() => root.removeAttribute("data-surge"), 320);
    });
    return () => {
      unpause();
      unsub();
      clearTimeout(off);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !root || !ctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let cols: RainCol[] = [];
    /* The strands and the roll band never change shape, so each is drawn
       once into its own sprite; a frame only places them (see drawRain's
       note on sprites — per-frame dashes and gradients were the idle cost). */
    const strandLayer = document.createElement("canvas");
    let hasStrands = false;
    const band = document.createElement("canvas");
    let raf = 0;
    let last = 0;
    let drawnAt = 0;
    let surgeAt = -1e9;
    let stopped = false;
    const fine = pointerEnabled();

    const build = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = Math.min(1.25, window.devicePixelRatio || 1, Math.sqrt(MAX_PIXELS / Math.max(1, W * H)));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      /* Fewer, wider-spaced columns on a phone: the same picture at the
         scale of a thumb, not a curtain. */
      cols = buildRain(W, H, { gap: W < 768 ? 16 : 13, weight: W < 768 ? phoneWeight : gutterWeight });
      /* No strands on a phone: they hang still, and over edge-to-edge text a
         still line is a permanent mark under a label, not weather. */
      const count = W < 768 ? 0 : Math.round(6 + W / 110);
      strandLayer.width = canvas.width;
      strandLayer.height = canvas.height;
      const sl = strandLayer.getContext("2d")!;
      sl.scale(dpr, dpr);
      sl.lineWidth = 1;
      sl.setLineDash([1.2, 3.6]);
      sl.strokeStyle = `rgb(${GLOW[0]},${GLOW[1]},${GLOW[2]})`;
      hasStrands = false;
      for (let i = 0; i < count; i++) {
        const s = hash(i + 41.3);
        const xn = hash(i + 17.9);
        if (gutterWeight(xn) < 0.5 && s < 0.7) continue; // keep the middle clear
        const x = Math.round(xn * W) + 0.5;
        sl.beginPath();
        sl.moveTo(x, H * (0.05 + 0.5 * hash(i + 3.3)));
        sl.lineTo(x, H * (0.55 + 0.5 * hash(i + 9.1)));
        sl.stroke();
        hasStrands = true;
      }
      // the roll band, one pixel wide: stretched across the screen per frame
      band.width = 1;
      band.height = Math.max(2, Math.round(H * 0.18 * dpr));
      const bc = band.getContext("2d")!;
      const g = bc.createLinearGradient(0, 0, 0, band.height);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(255,255,255,0.022)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      bc.fillStyle = g;
      bc.fillRect(0, 0, 1, band.height);
    };

    const near = (now: number) => {
      const look = fine ? stepPointer(now) : null;
      const px = look ? ((look.x + 1) / 2) * W : -1e4;
      const focuses = readFocuses(now);
      return (x: number) => {
        let n = 0;
        const d = Math.abs(x - px);
        if (d < 70) n = 1 - d / 70;
        for (const f of focuses) {
          if (x < f.left - 24 || x > f.right + 24) continue;
          const t = (now - f.at) / FOCUS_MS;
          n = Math.max(n, Math.sin(Math.PI * Math.min(1, t)) * 1.2);
        }
        return n;
      };
    };

    const paint = (now: number, dt: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const v = readVelocity(now);
      const speed = v >= 0 ? 1 + Math.min(3, v * 0.14) : Math.max(0.3, 1 + v * 0.08);
      const stretch = v > 0 ? Math.min(150, v * 7) : 0;
      const swell = Math.max(0, 1 - (now - surgeAt) / 1400);

      // the threads hanging through the room, breathing
      if (hasStrands) {
        ctx.globalAlpha = 0.085 + 0.035 * Math.sin(now * 0.0016);
        ctx.drawImage(strandLayer, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      drawRain(ctx, cols, {
        now,
        dt,
        h: H,
        level: LEVEL * (1 + 0.35 * swell),
        speed,
        stretch,
        near: near(now),
        glow: GLOW,
        core: CORE,
        halo: true,
        dpr,
      });

      // the roll band: a soft bar of light drifting down the glass
      const y = ((now % ROLL_MS) / ROLL_MS) * (H * 1.36) - H * 0.18;
      ctx.drawImage(band, 0, y - H * 0.09, W, H * 0.18);
    };

    const running = () =>
      !stopped && !reduced && booted && document.visibilityState === "visible" && !groundCovered();

    /* What the diagnostics panel reads (` key): written on change only. */
    let reported = "";
    const report = () => {
      const state = reduced ? "still" : running() ? `${FPS} fps` : "paused";
      const text = `${cols.length} columns · ${state}`;
      if (text === reported) return;
      reported = text;
      root.dataset.ground = text;
    };

    const frame = (now: number) => {
      raf = 0;
      if (!running()) {
        report();
        return;
      }
      if (now - drawnAt >= 1000 / FPS - 2) {
        const dt = last ? Math.min(100, now - last) : 0;
        last = now;
        drawnAt = now;
        paint(now, dt);
      }
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      report();
      if (raf || !running()) return;
      last = 0; // a pause is not a frame: the rain resumes where it was
      raf = requestAnimationFrame(frame);
    };

    build();
    // A still frame first: what reduced motion keeps, and what shows before
    // the loop starts.
    paint(performance.now(), 0);

    const onResize = () => {
      build();
      if (!running()) paint(performance.now(), 0);
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", wake);
    const unCover = onCover(wake);
    const unSurge = onSurge(() => {
      surgeAt = performance.now();
    });
    const release = fine ? retainPointer() : () => {};
    wake();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", wake);
      unCover();
      unSurge();
      release();
    };
  }, [booted, reduced]);

  return (
    <div ref={rootRef} className="neon-ground absolute inset-0" data-ground-renderer="2D canvas">
      <div className="ground-haze absolute inset-0" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="ground-scan absolute inset-0" />
    </div>
  );
}
