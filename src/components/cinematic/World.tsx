"use client";

import { useEffect, useRef } from "react";
import { useBootReady } from "@/hooks/useBootReady";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { onLowPower, isLowPower, groundCovered, onCover } from "@/lib/groundBus";
import { MARK_D, MARK_T } from "@/components/chrome/NavGlyphs";

export function World() {
  const wrap = useRef<HTMLDivElement>(null);
  const ready = useBootReady();
  const reduced = useReducedMotion();
  useEffect(() => {
    const host = wrap.current;
    if (!host || reduced || !ready) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    let starting = false;
    const start = async () => {
      if (cancelled || starting || dispose || isLowPower() || document.documentElement.dataset.power === "low") return;
      starting = true;
      try {
        const { createWorld } = await import("./worldRenderer");
        if (!cancelled && !isLowPower() && document.documentElement.dataset.power !== "low") dispose = createWorld(host, MARK_D, MARK_T, () => !groundCovered());
      } catch {
        // The vector poster remains visible if WebGL or its module is unavailable.
      } finally { starting = false; }
    };
    const update = () => {
      if (isLowPower() || document.documentElement.dataset.power === "low") { dispose?.(); dispose = undefined; }
      else void start();
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-power"] });
    const unLow = onLowPower(update);
    const unCover = onCover(() => window.dispatchEvent(new Event("cinematic-cover")));
    void start();
    return () => { cancelled = true; dispose?.(); observer.disconnect(); unLow(); unCover(); };
  }, [ready, reduced]);
  return <div className="cin-world" ref={wrap} aria-hidden>
    {/* The exact vector mark is also the no-JS, low-power and WebGL fallback. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="cin-world-poster" src="/cinematic/chamber-poster.svg" alt="" />
    <div className="cin-world-veil" />
  </div>;
}
