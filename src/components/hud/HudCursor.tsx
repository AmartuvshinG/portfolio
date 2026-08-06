"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * A single easing ring, and nothing else. The old reticle had a tracking dot,
 * a magenta hover state and a preference toggle in the console dock; all three
 * belonged to a HUD the site no longer has.
 *
 * Borders use `currentColor` inherited from `--color-fg`, so the ring inverts
 * on the dark act along with the rest of the fixed chrome.
 *
 * Fine pointers with motion allowed only — touch and reduced-motion users keep
 * the native cursor, which is the correct behaviour rather than a concession.
 */
export function HudCursor() {
  const reduced = useReducedMotion();
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const ring = ringRef.current;
    if (!ring) return;

    const root = document.documentElement;
    root.classList.add("hud-cursor");

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { ...mouse };
    let hovering = false;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      hovering = Boolean(
        (e.target as HTMLElement)?.closest(
          "a, button, [data-cursor], input, textarea"
        )
      );
    };

    const render = () => {
      pos.x += (mouse.x - pos.x) * 0.16;
      pos.y += (mouse.y - pos.y) * 0.16;
      ring.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${hovering ? 2.1 : 1})`;
      ring.style.opacity = hovering ? "1" : "0.5";
      raf = requestAnimationFrame(render);
    };

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      root.classList.remove("hud-cursor");
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] hidden text-fg md:block"
    >
      <div
        ref={ringRef}
        className="absolute left-0 top-0 h-7 w-7 rounded-full border border-current transition-[opacity,transform] duration-200 ease-out"
        style={{ willChange: "transform" }}
      />
    </div>
  );
}
