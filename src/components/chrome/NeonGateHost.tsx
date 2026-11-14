"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { registerNeonGate, type GateRequest } from "@/lib/neonGate";
import { useLockScroll } from "@/hooks/useLockScroll";
import { createHalftone } from "@/lib/halftone";

/**
 * The gate a case file opens through (lib/neonGate), in the site's one
 * transition language: the halftone front (lib/halftone).
 *
 *   close  the dot screen grows in from the edges to the centre, covering the
 *          page, while the file's pictures decode (never less than a beat,
 *          never more than a ceiling)
 *   hold   the project's index and title stand on the ground
 *   open   the file is mounted underneath; the front tears open from the
 *          centre onto it
 *
 * Without WebGL, or under reduced motion, it's a plain short fade.
 */

const CLOSE_MS = 520;
const OPEN_MS = 760;
const MIN_HOLD = 380;
const CEILING_MS = 2400;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function NeonGateHost() {
  const [req, setReq] = useState<GateRequest | null>(null);
  useEffect(() => registerNeonGate(setReq), []);
  if (!req) return null;
  return <Gate key={req.id} req={req} onDone={() => setReq(null)} />;
}

function Gate({ req, onDone }: { req: GateRequest; onDone: () => void }) {
  const { c } = useI18n();
  const project = c.projects.find((p) => p.slug === req.slug);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [title, setTitle] = useState(false);
  const [fade, setFade] = useState(false);
  const request = useRef(req);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useLockScroll(true);

  useEffect(() => {
    let live = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const urls = [project?.shot, ...(project?.gallery?.map((g) => g.src) ?? [])].filter((u): u is string => !!u);
    const decoded = Promise.all(
      urls.map((u) => {
        const img = new Image();
        img.src = u;
        return img.decode().catch(() => {});
      })
    );
    const ready = Promise.race([
      Promise.all([decoded, new Promise((r) => timers.push(setTimeout(r, MIN_HOLD + CLOSE_MS)))]),
      new Promise((r) => timers.push(setTimeout(r, CEILING_MS))),
    ]);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    const ht = !reduced && canvas ? createHalftone(canvas) : null;
    if (!ht) {
      setFade(true);
      ready.then(() => {
        if (!live) return;
        request.current.onCovered();
        timers.push(
          setTimeout(() => {
            request.current.resolve();
            done.current();
          }, 200)
        );
      });
      return () => {
        live = false;
        timers.forEach(clearTimeout);
      };
    }

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const reach = ht.reach(cx, cy) + Math.min(window.innerWidth, window.innerHeight) * 0.36;
    let raf = 0;
    const run = (ms: number, from: number, to: number, ease: (t: number) => number, then: () => void) => {
      const t0 = performance.now();
      const step = (now: number) => {
        if (!live) return;
        const k = Math.min(1, (now - t0) / ms);
        ht.draw(cx, cy, from + (to - from) * ease(k));
        if (k < 1) raf = requestAnimationFrame(step);
        else then();
      };
      raf = requestAnimationFrame(step);
    };
    run(CLOSE_MS, reach, 0, easeInOut, () => {
      setTitle(true);
      ready.then(() => {
        if (!live) return;
        request.current.onCovered();
        setTitle(false);
        run(OPEN_MS, 0, reach, easeOut, () => {
          ht.dispose();
          request.current.resolve();
          done.current();
        });
      });
    });
    return () => {
      live = false;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      ht.dispose();
    };
    // A request's project is fixed until the gate unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div aria-hidden className="pointer-events-auto fixed inset-0 z-[95]">
      <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full ${fade ? "bg-void transition-opacity" : ""}`} />
      {project && (
        <div
          className={`absolute inset-0 grid place-content-center justify-items-center gap-3 text-center transition-opacity duration-300 ${
            title ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="micro text-fg/80">{project.index} / {project.category}</span>
          <span className="display-caps spectrum-text text-[clamp(2.6rem,9vw,7rem)]">{project.title}</span>
        </div>
      )}
    </div>
  );
}
