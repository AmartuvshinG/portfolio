"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePref } from "@/hooks/usePrefs";

/**
 * Custom HUD reticle cursor. A precise inner dot tracks the pointer exactly
 * while an outer ring eases behind it and expands over interactive elements.
 * Only activates on fine pointers (mouse) with motion allowed — touch and
 * reduced-motion users keep the native cursor, and it can be switched off
 * entirely from the console dock.
 */
export function HudCursor() {
  const reduced = useReducedMotion();
  const enabled = usePref("cursor");
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced || !enabled) return;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (!finePointer) return;

    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    const root = document.documentElement;
    root.classList.add("hud-cursor");

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...mouse };
    let hovering = false;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      const interactive = (e.target as HTMLElement)?.closest(
        "a, button, [data-cursor], input, textarea"
      );
      hovering = Boolean(interactive);
    };

    const render = () => {
      ringPos.x += (mouse.x - ringPos.x) * 0.18;
      ringPos.y += (mouse.y - ringPos.y) * 0.18;
      const scale = hovering ? 1.8 : 1;
      ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%, -50%) scale(${scale})`;
      ring.style.borderColor = hovering
        ? "rgba(0,229,255,0.9)"
        : "rgba(0,229,255,0.35)";
      raf = requestAnimationFrame(render);
    };

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      root.classList.remove("hud-cursor");
    };
  }, [reduced, enabled]);

  if (reduced || !enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] hidden md:block">
      <div
        ref={ringRef}
        className="absolute left-0 top-0 h-8 w-8 rounded-full border transition-[border-color] duration-200"
        style={{ willChange: "transform" }}
      />
      <div
        ref={dotRef}
        className="absolute left-0 top-0 -ml-[2px] -mt-[2px] h-1 w-1 rounded-full bg-cyan"
        style={{ willChange: "transform" }}
      />
    </div>
  );
}
