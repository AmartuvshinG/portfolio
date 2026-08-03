/**
 * Fixed, non-interactive overlay that gives the whole viewport its "alive"
 * texture: fine scanlines, a subtle animated horizontal sweep, film grain and
 * a vignette. Pure CSS — renders as a server component with zero JS cost.
 * Motion is paused automatically by the global reduced-motion rule.
 *
 * Visibility is driven by `<html data-ambient>` (written by the preference
 * store) rather than React state, so the console dock can switch the texture
 * off without this needing to become a client component.
 */
export function AmbientOverlay() {
  return (
    <div
      aria-hidden
      data-ambient-overlay
      className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
      style={{ mixBlendMode: "screen" }}
    >
      {/* Static scanlines */}
      <div className="scanlines absolute inset-0 opacity-[0.5]" />

      {/* Slow horizontal scan sweep */}
      <div
        className="absolute inset-x-0 h-[38vh] opacity-[0.06]"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(0,229,255,0.5), transparent)",
          animation: "scan-y 7s linear infinite",
        }}
      />

      {/* Film grain (inline SVG turbulence, no network request) */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "140px 140px",
        }}
      />

      {/* Vignette (multiply so edges deepen rather than lighten) */}
      <div
        className="absolute inset-0"
        style={{
          mixBlendMode: "multiply",
          background:
            "radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
