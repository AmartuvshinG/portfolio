/**
 * Film grain and vignette — the last layer of the backdrop.
 *
 * The neural field is entirely smooth gradients over a near-black ground, which
 * is the exact worst case for 8-bit colour: on a cheap panel the falloff bands
 * into visible rings. A little noise on top dithers those away, and costs one
 * SVG filter that never repaints.
 *
 * `feTurbulence` rather than a tiled PNG: no request, no seams, and it scales
 * to any viewport. Static (no animation) — animated grain over a field that is
 * already moving reads as video compression artefacts.
 */
/**
 * The grain, as a small tiled data URI rather than a live filter.
 *
 * This was `filter: url(#svg-turbulence)` on a fullscreen element with
 * `mix-blend-mode: overlay`. Both halves were expensive: a blend mode on a
 * fixed, viewport-covering layer forces everything beneath it to be rasterised
 * into a separate surface and re-composited, and the filter made that surface
 * ineligible for a lot of caching. Baking the same turbulence into a 160px tile
 * gives an identical texture that the compositor uploads once.
 */
const GRAIN_TILE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">` +
      `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>` +
      `<feColorMatrix type="saturate" values="0"/></filter>` +
      `<rect width="160" height="160" filter="url(#g)" opacity="0.55"/></svg>`
  );

export function Grain() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `url("${GRAIN_TILE}")`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* Vignette. Holds the eye in the middle of the frame and keeps the
          field from running brightly into the viewport corners, where it
          collides with the chapter frame's gutter rules. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 45%, transparent 42%, color-mix(in srgb, var(--color-void) 72%, transparent) 100%)",
        }}
      />
    </>
  );
}
