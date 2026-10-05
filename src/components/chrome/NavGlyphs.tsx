"use client";

import { useEffect, useId, useRef } from "react";
/**
 * The brand mark. It lives here because the header, the mobile sheet and the
 * seal (ui/Seal) all draw it.
 */

/* ᠠ, the isolated Mongol-script a (U+1820), outlined from Mongolian Baiti in
   font units, centred on (639.5, 1018.5). MARK_T turns it upright and fits it
   to the 32-unit box — the same drawing as the favicon
   (public/icons/icon-v3.svg). The seal recuts it at its own scale. */
export const MARK_D =
  "M357 395Q337 444 318.5 508.0Q300 572 288.5 637.5Q277 703 277 755V909Q277 930 271.5 965.0Q266 1000 235 1000Q190 1000 166.0 983.5Q142 967 122.5 947.0Q103 927 69 917Q44 936 40 962Q70 994 112.0 1044.0Q154 1094 202.0 1133.5Q250 1173 296 1173Q339 1173 360.0 1143.0Q381 1113 388.0 1069.0Q395 1025 394.5 981.0Q394 937 394 909H628V796Q628 751 648.0 688.5Q668 626 698.0 567.5Q728 509 759 476Q756 494 756 513Q756 585 771.0 668.5Q786 752 809.5 834.5Q833 917 859 984Q878 1034 906.5 1102.5Q935 1171 963.5 1245.5Q992 1320 1011.0 1389.0Q1030 1458 1030 1507Q1030 1553 1016.0 1597.5Q1002 1642 1002 1688Q1002 1708 1005.5 1723.5Q1009 1739 1036 1739Q1046 1739 1067.0 1706.0Q1088 1673 1114.5 1623.5Q1141 1574 1167.0 1521.0Q1193 1468 1212.5 1426.0Q1232 1384 1239 1369Q1205 1315 1170.0 1261.5Q1135 1208 1103 1153Q986 953 922.5 741.0Q859 529 841 298Q772 335 709.5 405.5Q647 476 606.0 560.5Q565 645 558 723H431Q428 643 417.5 564.0Q407 485 394 405Z";
const MARK_T = "translate(16 16.4) rotate(90) scale(0.01735 -0.01735) translate(-639.5 -1018.5)";

/**
 * The brand mark: ᠠ, the first letter of Амар in the vertical script, filled
 * on the ramp over a soft glow of itself. Once every eight seconds a spark
 * runs the letter's outline.
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
  const glow = `mono-glow-${id}`;
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
        <linearGradient id={ramp} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--spectrum-1)" />
          <stop offset="0.5" stopColor="var(--spectrum-2)" />
          <stop offset="1" stopColor="var(--spectrum-3)" />
        </linearGradient>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="90" />
        </filter>
      </defs>
      <g transform={MARK_T}>
        <path d={MARK_D} fill={`url(#${ramp})`} filter={`url(#${glow})`} opacity={0.7} />
        <path d={MARK_D} fill={`url(#${ramp})`} />
        <path
          ref={sparkRef}
          className="monogram-spark"
          d={MARK_D}
          pathLength={100}
          stroke="#fff"
          strokeWidth="80"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
