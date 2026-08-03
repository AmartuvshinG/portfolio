"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useLockScroll } from "@/hooks/useLockScroll";
import { profile } from "@/lib/content";
import { pad } from "@/lib/utils";
import { POSTER_LAYERS } from "./PosterLayers";

const BOOT_LINES = [
  "INITIALIZING KERNEL",
  "MOUNTING SHADER PIPELINE",
  "CALIBRATING MOTION SYSTEM",
  "LOADING INTERFACE MODULES",
  "ESTABLISHING UPLINK",
];

/** Total run before the poster wipes away, ms. */
const BOOT_MS = 2900;
/** Camera dolly length, seconds. */
const DOLLY_S = 2.6;
/** How far the camera starts pushed in. */
const CAMERA_SCALE = 1.16;
/** Fraction of the shorter viewport axis the square stage occupies. */
const FIT = 0.94;

/**
 * First-load boot poster.
 *
 * A square stage dollies out from a pushed-in camera while nine generated
 * depth layers resolve back-to-front, the wordmark wiping in last. The layered
 * dolly technique is borrowed from cinematic key-art reveals; every layer here
 * is drawn from scratch in `PosterLayers.tsx`, so nothing is fetched and
 * nothing is anyone else's artwork.
 *
 * Runs once per session, skips entirely under reduced motion, and can be
 * dismissed early by click or keypress — a boot sequence you can't skip is a
 * boot sequence people resent on the second visit.
 */
export function PosterReveal() {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [size, setSize] = useState(0);
  const [progress, setProgress] = useState(0);
  const [line, setLine] = useState(0);

  useLockScroll(visible);

  /* Square the stage to the shorter viewport axis. */
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const b = el.getBoundingClientRect();
      setSize(Math.min(b.width, b.height) * FIT);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [visible]);

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem("nexus-booted", "1");
    } catch {
      /* private mode — the poster simply replays next visit */
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    let alreadyBooted = false;
    try {
      alreadyBooted = sessionStorage.getItem("nexus-booted") === "1";
    } catch {
      /* ignore */
    }

    if (reduced || alreadyBooted) {
      const r = requestAnimationFrame(() => setVisible(false));
      return () => cancelAnimationFrame(r);
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / BOOT_MS);
      setProgress(Math.round(t * 100));
      setLine(Math.min(BOOT_LINES.length - 1, Math.floor(t * BOOT_LINES.length)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else dismiss();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, dismiss]);

  /* Skip on any interaction. */
  useEffect(() => {
    if (!visible) return;
    const skip = () => dismiss();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [visible, dismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="poster"
          role="status"
          aria-label="System boot sequence"
          className="fixed inset-0 z-[120] overflow-hidden bg-bg"
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Stage */}
          <div
            ref={stageRef}
            className="flex h-full w-full items-center justify-center"
            style={{
              background:
                "radial-gradient(circle at 50% 34%, #0a1a22 0%, #050505 68%)",
            }}
          >
            {size > 0 && (
              <motion.div
                className="relative [container-type:inline-size]"
                style={{
                  width: size,
                  height: size,
                  transformOrigin: "center",
                }}
                initial={{ scale: CAMERA_SCALE, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: DOLLY_S, ease: [0.33, 0, 0.2, 1] }}
              >
                {POSTER_LAYERS.map((layer, i) => (
                  <motion.div
                    key={layer.id}
                    className="pointer-events-none absolute inset-0"
                    style={{ zIndex: i, willChange: "transform, opacity, clip-path" }}
                    initial={{
                      opacity: 0,
                      scale: layer.initialScale,
                      ...layer.initial,
                    }}
                    animate={{ opacity: 1, scale: 1, ...layer.animate }}
                    transition={{
                      scale: { duration: DOLLY_S, ease: [0.16, 1, 0.3, 1] },
                      opacity: {
                        duration: 0.7,
                        delay: layer.revealDelay,
                        ease: "easeOut",
                      },
                      clipPath: {
                        type: "spring",
                        stiffness: 46,
                        damping: 13,
                        mass: 1,
                        delay: layer.revealDelay,
                      },
                    }}
                  >
                    {layer.node}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Scanline texture over the whole poster */}
          <div className="scanlines pointer-events-none absolute inset-0 opacity-40" aria-hidden />

          {/* Telemetry strip */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-6 md:px-8 md:pb-8">
            <div className="mx-auto w-full max-w-[1600px]">
              <div className="relative h-px w-full bg-surface-2">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-cyan"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between font-mono text-[0.6rem] uppercase tracking-[0.28em] text-muted">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-blink bg-cyan" />
                  {BOOT_LINES[line]}
                </span>
                <span className="hidden sm:inline">{profile.version}</span>
                <span className="tabular text-cyan">{pad(progress, 3)}%</span>
              </div>
            </div>
          </div>

          <span className="hud-label absolute right-5 top-6 text-faint md:right-8">
            PRESS ANY KEY TO SKIP
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
