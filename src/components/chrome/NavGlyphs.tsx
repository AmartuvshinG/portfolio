"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";
import {
  Cpu,
  Hexagon,
  Layers3,
  RadioTower,
  Route,
  ScanFace,
  Send,
  type LucideIcon,
} from "lucide-react";

/**
 * The nav's glyph set, the monogram and the droplet's paint. They live here
 * because the header, the mobile sheet and the language toggle all draw them.
 */

/** One glyph per section, keyed by anchor. Labels are always shown beside
    them: the icons are wayfinding, not a replacement for the words. */
export const NAV_ICONS: Record<string, LucideIcon> = {
  "#hero": Hexagon,
  "#about": ScanFace,
  "#connect": RadioTower,
  "#work": Layers3,
  "#capabilities": Cpu,
  "#timeline": Route,
  "#contact": Send,
};

/**
 * The glass droplet behind an active item: a clear capsule with a lit upper
 * lip, a cool lower rim and a spectrum glow pooling underneath it. It carries
 * no backdrop-filter, because it moves on every change of section and a
 * filtered layer in motion is exactly what the perf budget forbids.
 */
export const DROPLET_STYLE: CSSProperties = {
  background:
    "radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.2), rgba(255,255,255,0.04) 55%, transparent 80%)," +
    "linear-gradient(100deg, rgba(255,45,143,0.14), rgba(123,92,255,0.14), rgba(34,224,255,0.14))",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.4)," +
    "inset 0 -1px 0 rgba(34,224,255,0.28)," +
    "inset 0 0 0 1px rgba(236,238,251,0.12)," +
    "0 6px 18px -6px rgba(123,92,255,0.6)",
};

/**
 * The squash-and-settle a droplet does when it lands: it arrives stretched
 * along its travel and wobbles once back to round. Framer composes this scale
 * with the `layoutId` projection, so the droplet slides *and* deforms.
 */
export const DROPLET_LAND = {
  initial: { scaleX: 1.28, scaleY: 0.84 },
  animate: { scaleX: 1, scaleY: 1 },
  transition: {
    layout: { type: "spring", stiffness: 420, damping: 34 },
    scaleX: { type: "spring", stiffness: 520, damping: 13 },
    scaleY: { type: "spring", stiffness: 520, damping: 13 },
  },
} as const;

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
