"use client";

import Image from "next/image";
import { useState } from "react";
import { srand } from "@/lib/utils";
import { PORTRAIT } from "@/lib/content";

/**
 * The operator portrait, with a generated plate permanently underneath.
 *
 * The slot used to hold a stock photograph of a spider web — a picsum
 * placeholder that read as "someone forgot to swap this out", which is exactly
 * what it was. The plate below is drawn from the site's own vocabulary: a
 * contour-scanned silhouette over a hairline grid, lit by the ramp.
 *
 * Same contract as `ShotImage`: the real file goes on top and removes itself if
 * it isn't there, so dropping `public/portrait.png` is the only step needed and
 * a missing file degrades to a designed panel rather than a broken frame
 * (next/image answers a missing local file with a 500, not a 404).
 */

/** Horizontal scan lines across the bust. Density is the whole texture. */
const SCANS = 46;

export function PortraitPlate({ alt }: { alt: string }) {
  const [missing, setMissing] = useState(false);

  return (
    <>
      <svg
        aria-hidden
        viewBox="0 0 500 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="pp-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0b0d1a" />
            <stop offset="100%" stopColor="#05060d" />
          </linearGradient>
          <linearGradient id="pp-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--spectrum-1)" />
            <stop offset="55%" stopColor="var(--spectrum-2)" />
            <stop offset="100%" stopColor="var(--spectrum-3)" />
          </linearGradient>
          {/* The bust silhouette, used as a clip so the scan lines stop at the
              shoulders. A stroked outline alone reads as an icon; the lines
              terminating on the form are what make it read as a scan. */}
          <clipPath id="pp-bust">
            <path d="M250 150 C300 150 320 190 320 235 C320 275 300 305 250 305 C200 305 180 275 180 235 C180 190 200 150 250 150 Z M250 320 C340 320 400 380 415 470 L415 600 L85 600 L85 470 C100 380 160 320 250 320 Z" />
          </clipPath>
        </defs>

        <rect width="500" height="600" fill="url(#pp-bg)" />

        {/* Hairline grid — the same 48px rhythm as `holo-grid`. */}
        <g stroke="#eceefb" strokeOpacity="0.06" strokeWidth="1">
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 48} y1="0" x2={i * 48} y2="600" />
          ))}
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 48} x2="500" y2={i * 48} />
          ))}
        </g>

        {/* Ramp wash behind the figure. */}
        <ellipse
          cx="250"
          cy="300"
          rx="230"
          ry="260"
          fill="url(#pp-rim)"
          opacity="0.16"
        />

        <g clipPath="url(#pp-bust)">
          <rect width="500" height="600" fill="#05060d" opacity="0.55" />
          {Array.from({ length: SCANS }).map((_, i) => {
            const y = 140 + (i / SCANS) * 470;
            // Jitter the line ends so the scan reads as data, not as ruling.
            const inset = Number((srand(i * 5 + 3) * 26).toFixed(2));
            return (
              <line
                key={i}
                x1={60 + inset}
                y1={y}
                x2={440 - inset}
                y2={y}
                stroke="url(#pp-rim)"
                strokeOpacity={(0.2 + srand(i * 9 + 1) * 0.55).toFixed(3)}
                strokeWidth={srand(i * 13 + 7) > 0.85 ? 2 : 1}
              />
            );
          })}
        </g>

        {/* Rim light down the silhouette's edge. */}
        <path
          d="M250 150 C300 150 320 190 320 235 C320 275 300 305 250 305 C200 305 180 275 180 235 C180 190 200 150 250 150 Z M250 320 C340 320 400 380 415 470 L415 600 L85 600 L85 470 C100 380 160 320 250 320 Z"
          fill="none"
          stroke="url(#pp-rim)"
          strokeOpacity="0.85"
          strokeWidth="1.5"
        />
      </svg>

      {!missing && (
        <Image
          src={PORTRAIT}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 40vw"
          className="object-cover"
          onError={() => setMissing(true)}
        />
      )}
    </>
  );
}
