"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INK_NAME } from "@/lib/inkName";
import { brushAt } from "@/lib/inkPath";
import { createLightBrush, loadInkImage, LIGHT_PAD } from "@/lib/lightBrush";
import { enqueueWrite, onRewrite } from "@/lib/inkWriteQueue";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The intro's calligraphy, as a sign: the brushed name from the bake
 * (`ink-name-mask.png`, dry-brush streaks and all) used as a mask, so it can
 * be filled with anything — sodium neon in the hero, ink on a plate, a ghost
 * in the margin.
 *
 * It replaces the name set in Noto Sans Mongolian wherever it hangs as art.
 * The font is monoline; the intro had just shown the visitor a hand writing
 * it, and then every later sign was type. Now the hero's sign *is* that
 * writing, turned into the city's neon.
 *
 * Tones:
 *   neon   sodium tube: a hot core and a static glow (a drop-shadow on the
 *          wrapper — filters apply before masks, so the glow cannot sit on
 *          the masked element itself). `idle` adds a rare dip, opacity only.
 *   ink    sumi, for a paper-coloured ground.
 *   ghost  the name barely there, for margins.
 *
 * Lighting (`lit`):
 *   true / false   on or unlit glass.
 *   "view"         strikes on, with a stutter, the first time it is seen.
 *   "write"        the intro's brush again, in light: when it is on screen
 *                  the dark tube lights along the brush's own route, stroke
 *                  by stroke, with a spark at the front (lib/lightBrush). Then
 *                  the static sign takes over and the context is released.
 *                  One sign writes at a time (lib/inkWriteQueue). With
 *                  `rewritable`, a click writes it again; so does the
 *                  palette's "Rewrite signs". Without WebGL it strikes on.
 *                  With `written`, it starts already written: a sign whose
 *                  light was handed to it (the hero's signature lands on it)
 *                  lights with no stutter and can still be rewritten.
 *
 * Decorative: always aria-hidden. Height comes from `className`; the width
 * follows the bake's aspect ratio.
 */

/** How long a sign takes to write, s, and how long the fresh light cools. */
const WRITE_SECS = 3.4;
const SETTLE_SECS = 0.7;
const LEAD_SECS = 0.25;

type Phase = "dark" | "writing" | "lit" | "struck";

export function InkSign({
  tone = "neon",
  lit = true,
  idle = false,
  rewritable = false,
  written = false,
  onWritten,
  className,
  style,
}: {
  tone?: "neon" | "ink" | "ghost";
  lit?: boolean | "view" | "write";
  idle?: boolean;
  /** Click to write it again (a `lit="write"` sign only). */
  rewritable?: boolean;
  /** Start as already written (see above). Read on mount only. */
  written?: boolean;
  /** Called once a write has run to its end and the light has settled. */
  onWritten?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  const [inView, setInView] = useState(false);
  const [phase, setPhaseState] = useState<Phase>(written ? "lit" : "dark");
  /* The effect below must not re-run on the phases it sets itself — that
     would cancel the write the moment it started — so it reads this. */
  const phaseRef = useRef<Phase>(written ? "lit" : "dark");
  const onWrittenRef = useRef(onWritten);
  useEffect(() => {
    onWrittenRef.current = onWritten;
  });
  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);
  const [run, setRun] = useState(0);
  const write = lit === "write" && !reduced;

  useEffect(() => {
    if (lit !== "view" && lit !== "write") return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting);
        if (e.isIntersecting) setSeen(true);
      },
      { rootMargin: "0px 0px -15% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lit]);

  /* The write: queued, then a few seconds of light, then handed to CSS. */
  useEffect(() => {
    if (!write || !inView || phaseRef.current !== "dark") return;
    const box = ref.current;
    let cancelled = false;
    let raf = 0;
    let finish: (complete?: boolean) => void = () => {};
    const cancel = enqueueWrite(async (done) => {
      const image = await loadInkImage(INK_NAME.src);
      if (cancelled || !box) return done();
      /* The layout box, not getBoundingClientRect: a sign laid on its side
         (the hero's signature) has a rotated bounding box with w and h
         swapped, and the light would be drawn squashed across it. */
      const w = box.offsetWidth;
      const h = box.offsetHeight;
      /* A fresh canvas for every write. A context released with
         loseContext stays lost on its canvas, so a rewrite (or React's
         dev double-run) on the same element would get a dead one. */
      const canvas = document.createElement("canvas");
      canvas.className = "pointer-events-none absolute";
      Object.assign(canvas.style, {
        left: `${-LIGHT_PAD}px`,
        top: `${-LIGHT_PAD}px`,
        width: `calc(100% + ${LIGHT_PAD * 2}px)`,
        height: `calc(100% + ${LIGHT_PAD * 2}px)`,
        transition: "opacity 450ms",
      });
      const renderer = image && w > 4 ? createLightBrush(canvas, image, INK_NAME, w, h) : null;
      if (!renderer) {
        setPhase("struck");
        onWrittenRef.current?.();
        return done();
      }
      box.appendChild(canvas);
      setPhase("writing");
      const t0 = performance.now();
      let ended = false;
      finish = (complete = false) => {
        if (ended) return;
        ended = true;
        cancelAnimationFrame(raf);
        if (complete) onWrittenRef.current?.();
        // Also on leaving mid-write: come back to a finished sign.
        setPhase("lit");
        // Let the canvas fade over the static sign before the context goes.
        canvas.style.opacity = "0";
        window.setTimeout(() => {
          renderer.dispose();
          canvas.remove();
          done();
        }, 450);
      };
      const frame = (now: number) => {
        const s = (now - t0) / 1000 - LEAD_SECS;
        const wt = s / WRITE_SECS;
        const b = brushAt(wt);
        renderer.draw({
          t: wt,
          secs: WRITE_SECS,
          tipX: b.x,
          tipY: b.y,
          tipLift: b.lift,
          tipVis: Math.min(1, Math.max(0, (wt + 0.04) / 0.04)) * Math.max(0, 1 - Math.max(0, wt - 1) / 0.05),
        });
        if (s > WRITE_SECS + SETTLE_SECS) return finish(true);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });
    return () => {
      cancelled = true;
      cancel();
      finish();
    };
    // `run` restarts it after a rewrite has set the phase back to dark.
  }, [write, inView, run, setPhase]);

  const rewrite = useCallback(() => {
    if (!write) return;
    if (phaseRef.current !== "lit" && phaseRef.current !== "struck") return;
    setPhase("dark");
    setRun((n) => n + 1);
  }, [write, setPhase]);

  useEffect(() => {
    if (!write) return;
    return onRewrite(() => {
      if (inView) rewrite();
    });
  }, [write, inView, rewrite]);

  const on =
    lit === "write"
      ? reduced || phase === "lit" || phase === "struck"
      : lit === "view"
        ? seen
        : lit;

  return (
    <span
      ref={ref}
      aria-hidden
      className={cn("relative block", rewritable && write && "pointer-events-auto cursor-pointer", className)}
      style={{ aspectRatio: `${INK_NAME.width} / ${INK_NAME.height}`, ...style }}
      onClick={rewritable ? rewrite : undefined}
      data-cursor-label={rewritable && write ? t.common.rewrite : undefined}
    >
      <span
        data-tone={tone}
        data-lit={on ? "" : undefined}
        data-idle={idle ? "" : undefined}
        // Written, not struck: the light already ran through it, so no stutter.
        data-written={phase === "lit" ? "" : undefined}
        className="ink-sign absolute inset-0 block"
      >
        <span
          className="ink-sign-fill block h-full w-full"
          style={{
            WebkitMaskImage: `url(${INK_NAME.mask})`,
            maskImage: `url(${INK_NAME.mask})`,
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
          }}
        />
      </span>
      {/* While writing, the light's canvas is appended here (see above). */}
    </span>
  );
}
