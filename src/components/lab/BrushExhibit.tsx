"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { INK_NAME, INK_PATH } from "@/lib/inkName";
import { brushAt } from "@/lib/inkPath";
import { loadInkImage } from "@/lib/lightBrush";
import { createLabBrush, fitTexture, type BrushMode } from "@/lib/labBrush";
import { ExhibitFrame, Readouts, Toggle } from "@/components/lab/ExhibitFrame";
import { cn } from "@/lib/utils";

/** The intro's writing time, s: the exhibit plays at the same pace. */
const WRITE_SECS = 7;
const HOLD_SECS = 1.4;

/* What the route says about the hand, read once from the bake. */
const STATS = (() => {
  const P = INK_PATH;
  let strokes = 0;
  let air = 0;
  for (let i = 0; i < P.length; i += 5) {
    const down = P[i + 3];
    const prevDown = i === 0 ? 0 : P[i - 2];
    if (down === 1 && prevDown === 0) strokes++;
    if (down === 0 && i + 5 < P.length) air += P[i + 5] - P[i];
  }
  const total = P.length ? P[P.length - 5] : 1;
  return { strokes, air: Math.round((air / total) * 100) };
})();

/**
 * Exhibit 01: the bake behind the intro's brush, scrubbable.
 *
 * WebGL draws the texture (lib/labBrush) in one of three views; a 2D canvas
 * over it draws the brush's route — solid where it is on the paper, dashed
 * where it travels in the air. The writing plays at the intro's own pace and
 * loops; the slider takes over the moment it is touched. Only alive while
 * the exhibit is on screen.
 */
export default function BrushExhibit({ live }: { live: boolean }) {
  const { t } = useI18n();
  const L = t.lab.brush;
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);

  const [mode, setMode] = useState<BrushMode>("arrival");
  const [route, setRoute] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [failed, setFailed] = useState(false);

  /* The loop reads these, so a toggle never rebuilds the renderer. */
  const state = useRef({ t: 1, mode, route, playing: playing && !reduced, dirty: true });
  useEffect(() => {
    state.current.mode = mode;
    state.current.route = route;
    state.current.playing = playing && !reduced;
    state.current.dirty = true;
  }, [mode, route, playing, reduced]);

  useEffect(() => {
    if (!live) return;
    const stage = stageRef.current;
    const layer = layerRef.current;
    const ovc = overlayRef.current;
    if (!stage || !layer || !ovc) return;
    /* A fresh canvas per run: a released context stays lost on its canvas. */
    const glc = document.createElement("canvas");
    glc.className = "absolute inset-0 h-full w-full";
    layer.appendChild(glc);
    let cancelled = false;
    let raf = 0;
    let renderer: ReturnType<typeof createLabBrush> = null;
    let ro: ResizeObserver | null = null;
    const octx = ovc.getContext("2d");
    let box = { x: 0, y: 0, w: 1, h: 1 };
    let dpr = 1;

    const resize = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      box = renderer ? renderer.resize(w, h) : fitTexture(w, h, INK_NAME);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      ovc.width = Math.round(w * dpr);
      ovc.height = Math.round(h * dpr);
      state.current.dirty = true;
    };

    const drawRoute = (tt: number) => {
      if (!octx) return;
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.clearRect(0, 0, ovc.width, ovc.height);
      if (!state.current.route) return;
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const holo = getComputedStyle(document.documentElement).getPropertyValue("--color-holo").trim() || "#7eeaff";
      const P = INK_PATH;
      const X = (i: number) => box.x + P[i + 1] * box.w;
      const Y = (i: number) => box.y + P[i + 2] * box.h;
      octx.lineCap = "round";
      octx.lineJoin = "round";
      for (let i = 0; i + 5 < P.length; i += 5) {
        if (P[i] > tt) break;
        const air = P[i + 3] === 0;
        const j = i + 5;
        const f = P[j] > tt ? (tt - P[i]) / Math.max(1e-6, P[j] - P[i]) : 1;
        octx.beginPath();
        octx.moveTo(X(i), Y(i));
        octx.lineTo(X(i) + (X(j) - X(i)) * f, Y(i) + (Y(j) - Y(i)) * f);
        octx.setLineDash(air ? [3, 4] : []);
        octx.strokeStyle = air ? "rgba(236,238,251,0.55)" : holo;
        octx.lineWidth = air ? 1 : 1.5;
        octx.stroke();
      }
      octx.setLineDash([]);
      if (tt > 0 && tt < 1) {
        const b = brushAt(tt);
        const x = box.x + b.x * box.w;
        const y = box.y + b.y * box.h;
        octx.beginPath();
        octx.arc(x, y, 5 + b.lift * 6, 0, Math.PI * 2);
        octx.strokeStyle = "#fff";
        octx.lineWidth = 1.5;
        octx.stroke();
      }
    };

    (async () => {
      const image = await loadInkImage(INK_NAME.src);
      if (cancelled) return;
      renderer = image ? createLabBrush(glc, image, INK_NAME) : null;
      if (!renderer) {
        setFailed(true);
        return;
      }
      resize();
      ro = new ResizeObserver(resize);
      ro.observe(stage);

      let last = 0;
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        const s = state.current;
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
        last = now;
        if (s.playing) {
          // Play, hold the finished name a moment, start again.
          const span = 1 + HOLD_SECS / WRITE_SECS;
          s.t = (s.t + dt / WRITE_SECS) % span;
          s.dirty = true;
        }
        if (!s.dirty) return;
        s.dirty = false;
        const tt = Math.min(1, s.t);
        renderer!.draw(tt, s.mode);
        drawRoute(tt);
        if (sliderRef.current) sliderRef.current.value = String(Math.round(tt * 1000));
        if (pctRef.current) pctRef.current.textContent = `${Math.round(tt * 100)}%`;
        if (tipRef.current) tipRef.current.textContent = tt <= 0 || tt >= 1 ? "—" : brushAt(tt).lift > 0 ? "↑" : "↓";
      };
      state.current.t = reduced ? 1 : 0;
      raf = requestAnimationFrame(frame);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      renderer?.dispose();
      glc.remove();
    };
  }, [live, reduced]);

  const views: { id: BrushMode; label: string }[] = [
    { id: "ink", label: L.ink },
    { id: "arrival", label: L.arrival },
    { id: "distance", label: L.distance },
  ];

  return (
    <ExhibitFrame
      index="01"
      title={L.title}
      body={L.body}
      stageRef={stageRef}
      stageLabel={
        <>
          t <span ref={pctRef}>0%</span> · {L.texture.toLowerCase()} {INK_NAME.width}×{INK_NAME.height}
        </>
      }
      controls={
        <>
          <div className="flex flex-col gap-2">
            <span id="lab-brush-views" className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted">
              {L.views}
            </span>
            <div role="group" aria-labelledby="lab-brush-views" className="flex flex-wrap gap-2">
              {views.map((v) => (
                <Toggle key={v.id} on={mode === v.id} onChange={() => setMode(v.id)} label={v.label} />
              ))}
            </div>
          </div>
          <Toggle on={route} onChange={setRoute} label={L.route} />
          <div className="flex items-center gap-3">
            {!reduced && (
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="min-h-11 shrink-0 border border-line px-4 font-mono text-xs uppercase tracking-[0.16em] text-fg hover:border-line-strong"
              >
                {playing ? t.lab.pause : t.lab.play}
              </button>
            )}
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted">{L.scrub}</span>
              <input
                ref={sliderRef}
                type="range"
                min={0}
                max={1000}
                defaultValue={reduced ? 1000 : 0}
                onChange={(e) => {
                  setPlaying(false);
                  state.current.playing = false;
                  state.current.t = Number(e.target.value) / 1000;
                  state.current.dirty = true;
                }}
                className="lab-range w-full"
              />
            </label>
          </div>
          <Readouts
            items={[
              { k: L.strokes, v: STATS.strokes },
              { k: L.air, v: `${STATS.air}%` },
              { k: L.tip, v: <span ref={tipRef}>—</span> },
            ]}
          />
        </>
      }
    >
      <div ref={layerRef} className={cn("absolute inset-0", failed && "hidden")} />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      {failed && (
        // No WebGL: the finished ink, as the static signs show it.
        <div
          className="absolute inset-6 bg-fg/80"
          style={{
            WebkitMaskImage: `url(${INK_NAME.mask})`,
            maskImage: `url(${INK_NAME.mask})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
      )}
    </ExhibitFrame>
  );
}
