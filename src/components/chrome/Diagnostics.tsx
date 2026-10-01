"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useQuality } from "@/hooks/useQuality";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { isTextEntry, modalOpen } from "@/lib/keys";
import { setDiagnostics, toggleDiagnostics, useDiagnosticsOpen } from "@/lib/diagnostics";
import { LED_NAME } from "@/lib/ledName";

/**
 * The backquote key: a small readout of what this page is actually doing.
 *
 * An easter egg for the curious, and the one place the site's machinery is
 * shown on purpose. Every number on it is measured or read, never written for
 * effect: the frame rate is counted while the panel is open, the reel and
 * timecode are read from the film's own readout, the renderer from the
 * backdrop, the quality tier from the same hook the site uses to decide what
 * to draw. A HUD that invented figures would be exactly the "fake futuristic
 * terminology" the brief rules out.
 *
 * `` ` `` or `~` toggles it (never from a text field, never over a dialog),
 * Esc closes it, and the ⌘K palette has the same toggle. It is a non-modal
 * `aside`: nothing behind it stops working. While closed it renders nothing
 * and measures nothing.
 */
export function Diagnostics() {
  const open = useDiagnosticsOpen();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        setDiagnostics(false);
        return;
      }
      if (e.code !== "Backquote" && e.key !== "`" && e.key !== "~") return;
      if (e.repeat || modalOpen() || isTextEntry(document.activeElement)) return;
      e.preventDefault();
      toggleDiagnostics();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return open ? <Panel /> : null;
}

function Panel() {
  const { t, locale } = useI18n();
  const d = t.diagnostics;
  const quality = useQuality();
  const reduced = useReducedMotion();
  const fpsRef = useRef<HTMLSpanElement>(null);
  const reelRef = useRef<HTMLSpanElement>(null);
  const [env, setEnv] = useState({ dpr: 1, w: 0, h: 0, renderer: "—" });

  /* Frame rate, counted over half-second windows, and the film's readout,
     both written straight to their nodes: the panel itself never re-renders
     at frame rate. */
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let since = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - since >= 500) {
        if (fpsRef.current) fpsRef.current.textContent = String(Math.round((frames * 1000) / (now - since)));
        frames = 0;
        since = now;
        const hud = document.querySelector("[data-film-hud]")?.textContent?.trim();
        if (reelRef.current) reelRef.current.textContent = hud || d.none;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const read = () => {
      const film = document.querySelector<HTMLElement>("[data-film-renderer]");
      setEnv({
        dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
        w: window.innerWidth,
        h: window.innerHeight,
        renderer: film?.dataset.filmRenderer ?? d.none,
      });
    };
    read();
    window.addEventListener("resize", read);
    const poll = window.setInterval(read, 2000);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", read);
      window.clearInterval(poll);
    };
  }, [d.none]);

  const lit = LED_NAME.cells.join("").replace(/\./g, "").length;
  const rows: [string, React.ReactNode][] = [
    [d.fps, <span key="fps" ref={fpsRef}>—</span>],
    [d.reel, <span key="reel" ref={reelRef}>—</span>],
    [d.renderer, env.renderer],
    [d.quality, quality.toUpperCase()],
    [d.dpr, `${env.dpr}×`],
    [d.viewport, `${env.w}×${env.h}`],
    [d.locale, locale.toUpperCase()],
    [d.motion, reduced ? d.reduced : d.full],
    [d.leds, `${lit} · ${LED_NAME.cols}×${LED_NAME.rows}`],
  ];

  return (
    <aside
      aria-label={d.title}
      className="script-sign fixed bottom-16 left-12 z-[125] w-[23rem] max-w-[calc(100vw-4rem)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-fg/85"
      /* Opaque: page copy showing through a readout reads as a fault. */
      style={{ background: "#05060d" }}
    >
      <div className="mb-2 flex items-center justify-between text-[var(--color-hazard)]">
        <span>{d.title}</span>
        <span className="text-faint">` · esc</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="tabular whitespace-nowrap text-right text-fg">{v}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
