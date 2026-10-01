"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { INK_NAME } from "@/lib/inkName";
import { createStudio, type PointerSample, type StudioEngine } from "@/lib/studioBrush";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/** The stage's shape: a tall sheet on a phone, a room on a desk. */
export const STAGE_CLASS = "relative w-full overflow-hidden bg-[#07080d] aspect-[4/5] sm:aspect-[4/3] lg:aspect-[16/10]";

/**
 * The Studio's stage and its controls (see lib/studioBrush for the brush).
 *
 * **GL lives only while the section is near** (`live`), on a canvas made for
 * that run and removed after it: a context released with `loseContext()`
 * stays lost on its canvas, so reusing one after a rewrite or React's dev
 * double-run gives a dead context.
 *
 * **The loop runs only while something moves** — a stroke, ink drying, the
 * scroll unrolling, the brush writing — and stops itself (`engine.frame`
 * returns false). A still sheet costs nothing.
 *
 * **On a touch screen the paper does not take the page's scroll.** It starts
 * put down: the finger scrolls as everywhere else. "Pick up the brush" hands
 * the paper the finger (`touch-action: none`, and Lenis told to keep out)
 * until it is put down again.
 */
export default function StudioCanvas({ live }: { live: boolean }) {
  const { t } = useI18n();
  const S = t.studio;
  const reduced = useReducedMotion();
  const boxRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StudioEngine | null>(null);
  const kickRef = useRef<() => void>(() => {});
  const drawingRef = useRef<number | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [trace, setTrace] = useState(false);
  const [sealMode, setSealMode] = useState(false);
  const [writing, setWriting] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /* The engine's lifetime. */
  useEffect(() => {
    if (!live) return;
    const box = boxRef.current;
    if (!box) return;
    let disposed = false;
    const canvas = document.createElement("canvas");
    canvas.className = "pointer-events-none absolute inset-0 block h-full w-full";
    canvas.setAttribute("aria-hidden", "true");
    box.prepend(canvas);

    let engine: StudioEngine | null = null;
    let raf = 0;
    let size = { w: 0, h: 0 };
    const loop = (now: number) => {
      raf = 0;
      if (!engine || engine.lost()) return;
      if (engine.frame(now)) raf = requestAnimationFrame(loop);
      else setWriting(false);
    };
    kickRef.current = () => {
      if (!raf && engine) raf = requestAnimationFrame(loop);
    };
    const fit = () => {
      if (!engine) return;
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (!w || !h || (w === size.w && h === size.h)) return;
      size = { w, h };
      engine.resize(w, h);
      kickRef.current();
    };

    const img = new Image();
    img.src = INK_NAME.src;
    img
      .decode()
      .then(() => {
        if (disposed) return;
        engine = createStudio(canvas, img);
        if (!engine) {
          setStatus("fallback");
          return;
        }
        engineRef.current = engine;
        fit();
        engine.clear(!reduced);
        setStatus("ready");
        kickRef.current();
      })
      .catch(() => {
        if (!disposed) setStatus("fallback");
      });

    let debounce = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(debounce);
      debounce = window.setTimeout(fit, 120);
    });
    ro.observe(box);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(debounce);
      ro.disconnect();
      engineRef.current = null;
      kickRef.current = () => {};
      drawingRef.current = null;
      canvas.getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
      setStatus("loading");
      setWriting(false);
    };
  }, [live, reduced]);

  /* The trace follows its toggle (the engine fades it). */
  useEffect(() => {
    engineRef.current?.setTrace(trace);
    kickRef.current();
  }, [trace, status]);

  const sample = useCallback((e: PointerEvent): PointerSample => {
    const r = boxRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      t: e.timeStamp,
      pressure: e.pointerType === "pen" && e.pressure > 0 ? e.pressure : null,
    };
  }, []);

  const canDraw = status === "ready" && (!coarse || holding);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    if (!engine || status !== "ready") return;
    if (e.pointerType === "touch" && coarse && !holding) return;
    if (e.button > 0) return;
    const p = sample(e.nativeEvent);
    if (sealMode) {
      if (engine.stamp(p.x, p.y)) {
        setSealMode(false);
        kickRef.current();
      }
      return;
    }
    if (engine.writing()) return;
    if (engine.down(p)) {
      e.currentTarget.setPointerCapture(e.pointerId);
      drawingRef.current = e.pointerId;
      e.preventDefault();
      kickRef.current();
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawingRef.current !== e.pointerId) return;
    const native = e.nativeEvent;
    const list = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    engineRef.current?.move((list.length ? list : [native]).map(sample));
    kickRef.current();
  };
  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawingRef.current !== e.pointerId) return;
    drawingRef.current = null;
    engineRef.current?.up();
    kickRef.current();
  };

  const letItWrite = () => {
    const engine = engineRef.current;
    if (!engine) return;
    setSealMode(false);
    engine.clear(false);
    engine.write(reduced);
    setWriting(!reduced);
    kickRef.current();
  };
  const fresh = () => {
    const engine = engineRef.current;
    if (!engine) return;
    setSealMode(false);
    engine.clear(!reduced);
    setWriting(false);
    kickRef.current();
  };
  const save = async () => {
    const blob = await engineRef.current?.snapshot();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = S.file;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const ready = status === "ready";
  const hint = sealMode ? S.sealHint : coarse && !holding ? S.hintTouch : S.hint;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
      <div
        ref={boxRef}
        role="img"
        aria-label={S.canvas}
        data-cursor-label={ready ? hint : undefined}
        data-lenis-prevent={holding ? "" : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className={cn(STAGE_CLASS, "ring-1 ring-inset ring-line select-none", holding && "ring-[var(--color-hazard)]")}
        style={{ touchAction: canDraw ? "none" : "pan-y" }}
      >
        {status !== "ready" && <StaticScroll fallback={status === "fallback"} note={S.noGl} />}
      </div>

      <div className="flex flex-col gap-6">
        <p aria-live="polite" className="micro min-h-5 !text-fg">
          {writing ? S.writing : hint}
        </p>

        <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
          {coarse && (
            <Tool on={holding} disabled={!ready} onClick={() => setHolding((v) => !v)} primary>
              {holding ? S.putDown : S.pickUp}
            </Tool>
          )}
          <Tool disabled={!ready || writing} onClick={letItWrite}>
            {S.write}
          </Tool>
          <Tool on={trace} disabled={!ready} onClick={() => setTrace((v) => !v)}>
            {S.trace}
          </Tool>
          <Tool on={sealMode} disabled={!ready || writing} onClick={() => setSealMode((v) => !v)}>
            {S.seal}
          </Tool>
          <Tool disabled={!ready} onClick={fresh}>
            {S.clear}
          </Tool>
          <Tool disabled={!ready || writing} onClick={save}>
            {S.save}
          </Tool>
        </div>

        <dl className="hidden gap-4 border-t border-line pt-6 lg:grid">
          {S.notes.map((n) => (
            <div key={n.k}>
              <dt className="micro !text-[var(--color-hazard)]">{n.k}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">{n.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** A tool: a plain toggle or action button in the HUD's bracketed style. */
function Tool({
  on,
  disabled,
  onClick,
  primary,
  children,
}: {
  on?: boolean;
  disabled?: boolean;
  onClick: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on === undefined ? undefined : on}
      className={cn(
        "hud-brackets inline-flex min-h-11 items-center gap-2 px-4 font-mono text-xs uppercase tracking-[0.18em] transition-colors disabled:opacity-40",
        "[--hud-l:7px]",
        on || primary
          ? "text-fg [--hud-c:var(--color-hazard)] bg-[color-mix(in_srgb,var(--color-hazard)_10%,transparent)]"
          : "text-muted hover:text-fg [--hud-c:color-mix(in_srgb,var(--color-fg)_35%,transparent)]"
      )}
    >
      {on !== undefined && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 rotate-45 transition-colors"
          style={{ background: on ? "var(--color-hazard)" : "var(--color-line-strong)" }}
        />
      )}
      {children}
    </button>
  );
}

/**
 * Before the brush is ready, and instead of it without WebGL: the finished
 * scroll, in CSS — paper, and the name's ink as a mask.
 */
export function StaticScroll({ fallback, note }: { fallback?: boolean; note?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center">
      <div className="relative h-[84%] max-w-[74%] bg-[#d8cfbb] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]" style={{ aspectRatio: "0.62" }}>
        <div
          aria-hidden
          className="absolute left-1/2 top-[8%] h-[84%] -translate-x-1/2 bg-[#14151b]"
          style={{
            aspectRatio: `${INK_NAME.width} / ${INK_NAME.height}`,
            WebkitMaskImage: `url(${INK_NAME.mask})`,
            maskImage: `url(${INK_NAME.mask})`,
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
          }}
        />
      </div>
      {fallback && note && <p className="micro absolute inset-x-4 bottom-3 text-center">{note}</p>}
    </div>
  );
}
