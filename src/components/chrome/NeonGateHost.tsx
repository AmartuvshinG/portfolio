"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getImageProps } from "next/image";
import { useI18n } from "@/lib/i18n";
import { registerNeonGate, type GateRequest } from "@/lib/neonGate";
import { simulated } from "@/lib/neonField";
import { useLockScroll } from "@/hooks/useLockScroll";
import { NeonWord, useDisplayFont } from "@/components/ui/NeonWord";

/**
 * The gate a case file opens through (lib/neonGate).
 *
 * The project's name condenses out of the rain while the file's screenshots
 * load: the count is the share of them that have actually decoded, preloaded
 * at the same sizes the file will ask for (next/image's own srcset), so the
 * file opens onto pictures that are already there. A dot-matrix
 * "CASE FILE 01" decodes above the name; the letterbox bars (the Onyx
 * preloader's) carry the status, a tick per image and the count.
 *
 * Never less than a beat — the name has to be seen forming — and never more
 * than a ceiling, so a slow network cannot hold the visitor at the door. A
 * file already opened this visit forms faster. Any key, click, wheel or
 * touch rushes it.
 *
 * At 100% the name surges, a scan bar crosses it, the signal tears once and
 * a flash blooms at the centre. Then the file is mounted underneath, and a
 * slit of light tears across the screen and opens onto it.
 */

/** The name forms for at least this long (ms)… */
const MIN_MS = 900;
const MIN_WARM_MS = 420;
/** …and the load is called complete at this point regardless. */
const CEILING_MS = 2600;
/** The window's opening, as in globals.css (`gate-open`). */
const OPEN_MS = 850;

/** The sizes the case file renders its pictures at (work/CaseFile). */
const HERO_SIZES = "(max-width: 1280px) 100vw, 1280px";
const GALLERY_SIZES = "(max-width: 768px) 100vw, 620px";

export function NeonGateHost() {
  const [req, setReq] = useState<GateRequest | null>(null);
  useEffect(() => registerNeonGate(setReq), []);
  if (!req) return null;
  return <Gate key={req.id} req={req} onDone={() => setReq(null)} />;
}

type Phase = "boot" | "lock" | "open";

const noSubscribe = () => () => {};

function Gate({ req, onDone }: { req: GateRequest; onDone: () => void }) {
  const { c, t, locale } = useI18n();
  const project = c.projects.find((p) => p.slug === req.slug);
  const [phase, setPhase] = useState<Phase>("boot");
  const [loaded, setLoaded] = useState(0);
  const [progress, setProgress] = useState(0);
  const [rush, setRush] = useState(false);
  const font = useDisplayFont();
  const touch = useSyncExternalStore(
    noSubscribe,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false
  );
  const reqRef = useRef(req);
  useLockScroll(true);

  /* The pictures the file is about to show, at the sizes it will show them. */
  const images = project
    ? [
        ...(project.shot ? [{ src: project.shot, fill: true, sizes: HERO_SIZES }] : []),
        ...(project.gallery ?? []).map((g) => ({ src: g.src, fill: false, sizes: GALLERY_SIZES })),
      ]
    : [];
  const total = images.length;

  /* No such file: nothing to gate. */
  useEffect(() => {
    if (project) return;
    reqRef.current.onCovered();
    reqRef.current.resolve();
    onDone();
  }, [project, onDone]);

  /* Preload. Each picture counts once it has decoded — or failed: a missing
     screenshot falls back to the generated panel, and must not hold the door. */
  useEffect(() => {
    let live = true;
    for (const im of images) {
      const { props } = getImageProps(
        im.fill
          ? { src: im.src, alt: "", fill: true, sizes: im.sizes }
          : { src: im.src, alt: "", width: 2000, height: 1250, sizes: im.sizes }
      );
      const img = new Image();
      if (props.sizes) img.sizes = props.sizes;
      if (props.srcSet) img.srcset = props.srcSet;
      img.src = props.src;
      img
        .decode()
        .catch(() => {})
        .finally(() => {
          if (live) setLoaded((n) => n + 1);
        });
    }
    return () => {
      live = false;
    };
    // The file's pictures are fixed for the life of this gate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* What the count shows: the real share, held back by the beat the name
     needs to form, pushed to the end by the ceiling. */
  const loadedRef = useRef(0);
  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);
  useEffect(() => {
    const t0 = performance.now();
    const floor = req.warm ? MIN_WARM_MS : MIN_MS;
    let raf = 0;
    const tick = (now: number) => {
      const el = now - t0;
      const real = total ? loadedRef.current / total : 1;
      const p = el >= CEILING_MS ? 1 : Math.min(real, simulated(el / floor));
      setProgress(Math.round(p * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [req.warm, total]);

  /* Any input rushes it. A key behind the gate is only ever a rush: taken in
     the capture phase, so it cannot also reach the page or the file. */
  useEffect(() => {
    if (phase !== "boot") return;
    const go = () => setRush(true);
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      go();
    };
    const EVENTS = ["pointerdown", "wheel", "touchstart"] as const;
    for (const ev of EVENTS) window.addEventListener(ev, go, { passive: true });
    window.addEventListener("keydown", onKey, true);
    return () => {
      for (const ev of EVENTS) window.removeEventListener(ev, go);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [phase]);

  /* Locked: mount the file under the gate, give it a frame to paint, open. */
  const open = () => {
    reqRef.current.onCovered();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setPhase("open");
        window.setTimeout(() => {
          reqRef.current.resolve();
          onDone();
        }, OPEN_MS);
      })
    );
  };

  if (!project) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const status = phase === "boot" ? t.preloader.loading : t.preloader.ready;

  return (
    <div className="gate" data-phase={phase} aria-hidden>
      <div className="gate-face">
        <div className="ground-haze absolute inset-0" />
        <div className="ground-scan absolute inset-0" />
        <div className="gate-flash" />
        {font && (
          <NeonWord
            word={project.title}
            label={`${t.caseFile.label} ${project.index}`}
            caption={t.preloader.ready}
            font={font}
            weight={locale === "mn" ? "800" : "400"}
            progress={progress}
            rush={rush}
            opening={phase === "open"}
            onLock={() => setPhase((p) => (p === "boot" ? "lock" : p))}
            onLocked={open}
          />
        )}

        <div className="gate-bar gate-bar-top">
          <span className="flex items-center gap-2.5 text-[var(--color-holo)]">
            <span className={`h-1.5 w-1.5 rounded-full bg-[var(--color-holo)] ${phase === "boot" ? "animate-blink" : ""}`} />
            {status}
          </span>
          <span className="hidden text-fg/70 sm:inline">{project.category}</span>
        </div>
        <div className="gate-bar gate-bar-bot">
          <span className="tabular">
            {pad(Math.min(loaded, total))} / {pad(total)}
          </span>
          <span className="gate-track">
            <span className="gate-fill" style={{ transform: `scaleX(${progress / 100})` }} />
            <span className="gate-ticks">
              {Array.from({ length: total + 1 }, (_, i) => (
                <i key={i} />
              ))}
            </span>
          </span>
          <span className="hidden md:inline">{touch ? t.preloader.skipTap : t.preloader.skipKey}</span>
        </div>
      </div>
      {phase === "open" && <div className="gate-frame" />}
    </div>
  );
}
