"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { createFilmRenderer, type FilmFrame } from "@/lib/filmShader";
import { FILM } from "@/lib/film";
import { ExhibitFrame, Toggle } from "@/components/lab/ExhibitFrame";

/**
 * Exhibit 02: the page's film, raw against graded.
 *
 * The same renderer as the backdrop (lib/filmShader), on a small canvas of
 * its own, drawing the city reel twice per frame through a scissor: left of
 * the divider with the grade off, right of it with the grade on. The
 * divider is dragged, or moved with the arrow keys (it is a slider). Rain,
 * the grade and the halation can each be switched off on the graded side to
 * see what each one does.
 *
 * Its own <video>, playing the reel on a loop, only while the exhibit is on
 * screen; the GL context is released when it leaves.
 */
export default function FilmExhibit({ live }: { live: boolean }) {
  const { t } = useI18n();
  const L = t.lab.film;
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [split, setSplit] = useState(0.5);
  const [rain, setRain] = useState(true);
  const [grade, setGrade] = useState(true);
  const [bloom, setBloom] = useState(true);
  const [failed, setFailed] = useState(false);

  const state = useRef({ split, rain, grade, bloom, dirty: true });
  useEffect(() => {
    Object.assign(state.current, { split, rain, grade, bloom, dirty: true });
  }, [split, rain, grade, bloom]);

  useEffect(() => {
    if (!live) return;
    const stage = stageRef.current;
    const layer = layerRef.current;
    const video = videoRef.current;
    if (!stage || !layer || !video) return;
    /* A fresh canvas per run: a released context stays lost on its canvas. */
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 h-full w-full";
    layer.prepend(canvas);
    const phone = window.innerWidth < 768;
    video.src = phone ? FILM.phone.city : FILM.desktop.city;
    video.muted = true;
    video.loop = true;
    const p = video.play();
    if (p) p.catch(() => {});

    const renderer = createFilmRenderer(canvas, video, video);
    if (!renderer) {
      canvas.remove();
      setFailed(true);
      return;
    }
    const resize = () => {
      renderer.resize(stage.clientWidth, stage.clientHeight);
      state.current.dirty = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    const t0 = performance.now();
    let raf = 0;
    let last = 0;
    let version = 0;
    let lastTime = -1;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // 30 fps is the film's own rate on the page; under reduced motion it
      // holds one frame and redraws only when a control changes.
      if (now - last < 33) return;
      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        version++;
      }
      const s = state.current;
      if (reduced && !s.dirty) return;
      s.dirty = false;
      last = now;
      const base: FilmFrame = {
        time: ((now - t0) % 600000) / 1000,
        rain: 0,
        haze: 0,
        cityScale: 1.04,
        cityShift: 0,
        issScale: 1,
        issPosX: 0.5,
        iris: 0,
        tint: 0,
        speed: 0,
        cityOn: 1,
        issOn: 0,
        lookX: 0,
        lookY: 0,
        overscan: 1,
        cursorOn: 0,
        bloom: 0,
        grade: 0,
      };
      const w = renderer.width();
      const x = s.split * w;
      renderer.draw(base, version, 0, [0, x]);
      renderer.draw(
        {
          ...base,
          rain: s.rain ? 1 : 0,
          haze: s.grade ? 1 : 0,
          tint: s.grade ? 0.42 : 0,
          grade: s.grade ? 1 : 0,
          bloom: s.bloom ? 1 : 0,
        },
        version,
        0,
        [x, w]
      );
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      video.pause();
      renderer.dispose();
      canvas.getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [live, reduced]);

  /* Drag anywhere on the stage to move the divider. */
  const dragFrom = (e: React.PointerEvent) => {
    const el = stageRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent | React.PointerEvent) => {
      const r = el.getBoundingClientRect();
      setSplit(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)));
    };
    move(e);
    const onMove = (ev: PointerEvent) => move(ev);
    const onUp = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  };

  const pct = Math.round(split * 100);

  return (
    <ExhibitFrame
      index="02"
      title={L.title}
      body={L.body}
      stageRef={stageRef}
      stageClassName="cursor-ew-resize touch-pan-y select-none"
      stageLabel={`${L.raw} ${pct} · ${100 - pct} ${L.graded}`}
      controls={
        <div className="flex flex-wrap gap-2">
          <Toggle on={grade} onChange={setGrade} label={L.grade} />
          <Toggle on={rain} onChange={setRain} label={L.rain} />
          <Toggle on={bloom} onChange={setBloom} label={L.bloom} />
        </div>
      }
    >
      <div className="absolute inset-0" onPointerDown={dragFrom}>
        {/* Off screen, not display:none: some browsers stop decoding a hidden video. */}
        <video ref={videoRef} aria-hidden muted playsInline preload="auto" className="pointer-events-none absolute h-px w-px opacity-0" />
        <div ref={layerRef} className="absolute inset-0" />
        {failed && <div className="absolute inset-0 grid place-items-center font-mono text-xs uppercase tracking-[0.2em] text-muted">WebGL —</div>}
        <span className="pointer-events-none absolute left-3 top-3 font-mono text-[0.625rem] uppercase tracking-[0.22em] text-fg/80">{L.raw}</span>
        <span className="pointer-events-none absolute right-3 top-3 font-mono text-[0.625rem] uppercase tracking-[0.22em] text-[var(--color-holo)]">
          {L.graded}
        </span>
        {/* The divider: a hairline with a grip, and the slider's keyboard home. */}
        <div className="pointer-events-none absolute inset-y-0 w-px bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.6)]" style={{ left: `${pct}%` }}>
          <span
            role="slider"
            tabIndex={0}
            aria-label={L.divider}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-valuetext={`${L.raw} ${pct}%`}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 0.1 : 0.04;
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") setSplit((v) => Math.max(0, v - step));
              else if (e.key === "ArrowRight" || e.key === "ArrowUp") setSplit((v) => Math.min(1, v + step));
              else if (e.key === "Home") setSplit(0);
              else if (e.key === "End") setSplit(1);
              else return;
              e.preventDefault();
            }}
            className="pointer-events-auto absolute left-1/2 top-1/2 flex h-11 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-white/70 bg-[#05060d]/80 font-mono text-[0.625rem] text-fg"
          >
            ⇆
          </span>
        </div>
      </div>
    </ExhibitFrame>
  );
}
