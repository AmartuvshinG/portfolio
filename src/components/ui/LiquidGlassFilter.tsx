"use client";

import { useEffect } from "react";

/**
 * The refraction behind every `liquid-glass-live` surface (none at the moment:
 * the phone sheet moved to `glass-ios`, which reads better in WebKit).
 *
 * One hidden SVG filter for the whole document. It displaces whatever is
 * behind the glass through a soft noise map, three times at slightly different
 * strengths, one per colour channel, and screens the results back together.
 * The edges of shapes seen through it therefore bend and fringe very slightly,
 * the way they do through a thick lens, instead of just going soft.
 *
 * Only Chromium applies an SVG filter inside `backdrop-filter`. Elsewhere,
 * `url(#lg)` either invalidates the whole declaration or renders nothing, so
 * the refraction is opted into with `<html data-lg="svg">` and every other
 * browser keeps the plain blur from the utility. `userAgentData` is the
 * Chromium tell: Safari and Firefox do not implement it.
 */
export function LiquidGlassFilter() {
  useEffect(() => {
    const transparencyOff = window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
    if ("userAgentData" in navigator && !transparencyOff) {
      document.documentElement.dataset.lg = "svg";
    }
  }, []);

  return (
    <svg aria-hidden width="0" height="0" className="pointer-events-none absolute" focusable="false">
      <filter
        id="lg"
        x="0"
        y="0"
        width="100%"
        height="100%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence type="fractalNoise" baseFrequency="0.011 0.017" numOctaves="2" seed="7" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2.5" result="map" />

        <feDisplacementMap in="SourceGraphic" in2="map" scale="34" xChannelSelector="R" yChannelSelector="G" result="dR" />
        <feColorMatrix in="dR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />

        <feDisplacementMap in="SourceGraphic" in2="map" scale="29" xChannelSelector="R" yChannelSelector="G" result="dG" />
        <feColorMatrix in="dG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />

        <feDisplacementMap in="SourceGraphic" in2="map" scale="24" xChannelSelector="R" yChannelSelector="G" result="dB" />
        <feColorMatrix in="dB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />

        <feBlend in="r" in2="g" mode="screen" result="rg" />
        <feBlend in="rg" in2="b" mode="screen" />
      </filter>
    </svg>
  );
}
