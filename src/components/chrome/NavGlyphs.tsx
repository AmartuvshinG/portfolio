"use client";

import { useEffect, useId, useRef } from "react";
/**
 * The brand mark. It lives here because the header, the mobile sheet and the
 * seal (ui/Seal) all draw it.
 */

/**
 * The brand mark: an "A" chevron cut into a hexagon, stroked on the ramp.
 * Once every eight seconds a spark runs the hexagon's perimeter.
 *
 * The spark is played on demand, not looped in CSS. As an 8s infinite CSS
 * animation it was idle for 77% of every cycle, but `stroke-dashoffset` is
 * not a compositor property, so the browser still recalculated style on every
 * frame of the whole cycle — the largest single piece of the site's idle
 * cost. Now it runs for 1.84s, then nothing runs until the next one.
 */
export function Monogram({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const ramp = `mono-ramp-${id}`;
  const sparkRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = sparkRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const play = () =>
      el.animate(
        [
          { strokeDashoffset: 100, opacity: 0, offset: 0 },
          { opacity: 1, offset: 0.087 },
          { strokeDashoffset: 0, opacity: 1, offset: 0.87 },
          { strokeDashoffset: 0, opacity: 0, offset: 1 },
        ],
        { duration: 1840, easing: "linear" }
      );
    const first = window.setTimeout(play, 1200);
    const every = window.setInterval(play, 8000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, []);
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      className={className}
      width={28}
      height={28}
      fill="none"
    >
      <defs>
        <linearGradient id={ramp} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--spectrum-1)" />
          <stop offset="0.5" stopColor="var(--spectrum-2)" />
          <stop offset="1" stopColor="var(--spectrum-3)" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25Z"
        stroke={`url(#${ramp})`}
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="rgba(5,6,13,0.55)"
      />
      <path
        ref={sparkRef}
        className="monogram-spark"
        d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25Z"
        pathLength={100}
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 22 16 9.5 21.5 22M12.8 17.4h6.4"
        stroke="var(--color-bone)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
