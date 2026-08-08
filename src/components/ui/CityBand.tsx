import { srand } from "@/lib/utils";

/**
 * A neo-Tokyo skyline, generated.
 *
 * This replaces the stock photograph the band wipe used to open onto — a
 * picsum cherry-blossom shot that had nothing to do with anything on this site
 * and was the single most off-theme pixel on the page. The band's *mechanic* is
 * good (two enormous words split by a full-bleed image growing between them);
 * only its content was wrong.
 *
 * Built as inline SVG rather than an image: no request, no 404, crisp at any
 * width, and it inherits the spectrum ramp so it can never drift out of palette
 * the way a photograph does.
 *
 * Deterministic (`srand`, the same helper the nebula uses) so server and client
 * emit identical markup — `Math.random()` here would hydration-mismatch.
 */

/** Skyline rows, back to front: further back is dimmer, shorter and denser. */
const ROWS = [
  { seed: 7, count: 42, maxH: 0.34, y: 0.62, opacity: 0.22, hue: 2 },
  { seed: 23, count: 30, maxH: 0.48, y: 0.7, opacity: 0.38, hue: 1 },
  { seed: 61, count: 20, maxH: 0.66, y: 0.8, opacity: 0.62, hue: 0 },
] as const;

const STOPS = ["var(--spectrum-1)", "var(--spectrum-2)", "var(--spectrum-3)"];

const W = 1600;
const H = 800;

function towers(row: (typeof ROWS)[number]) {
  const out: { x: number; y: number; w: number; h: number; lit: boolean }[] = [];
  let x = -40;
  for (let i = 0; i < row.count; i++) {
    const w = 14 + srand(row.seed + i * 3) * 46;
    const h = (0.16 + srand(row.seed + i * 7 + 1) * 0.84) * row.maxH * H;
    const gap = 4 + srand(row.seed + i * 11 + 2) * 26;
    out.push({
      x,
      y: row.y * H - h,
      w,
      h,
      // A minority carry a lit crown; more than this and it reads as a bar chart.
      lit: srand(row.seed + i * 13 + 3) > 0.72,
    });
    x += w + gap;
    if (x > W + 60) break;
  }
  return out;
}

export function CityBand({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      <defs>
        {/* Sky: the ramp, lying down. Darkest at the top so the horizon reads as
            the light source rather than as a gradient that happens to be there. */}
        <linearGradient id="cb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#05060d" />
          <stop offset="48%" stopColor="#140b2a" />
          <stop offset="72%" stopColor="var(--spectrum-2)" stopOpacity="0.5" />
          <stop offset="86%" stopColor="var(--spectrum-1)" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#05060d" />
        </linearGradient>

        {/* Ground haze — the glow the city sits in. */}
        <radialGradient id="cb-haze" cx="0.5" cy="0.82" r="0.6">
          <stop offset="0%" stopColor="var(--spectrum-3)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--spectrum-3)" stopOpacity="0" />
        </radialGradient>

        {/* The perspective floor grid, as a pattern that compresses toward the
            horizon. Drawn once and reused rather than emitting 40 lines. */}
        <linearGradient id="cb-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--spectrum-3)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--spectrum-3)" stopOpacity="0.55" />
        </linearGradient>

        <filter id="cb-bloom" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      <rect width={W} height={H} fill="url(#cb-sky)" />
      <rect width={W} height={H} fill="url(#cb-haze)" />

      {/* Scan lines. One rect with a repeating gradient would band; explicit
          hairlines stay exactly 1px at every scale. */}
      <g opacity="0.16">
        {Array.from({ length: Math.floor(H / 4) }).map((_, i) => (
          <rect key={i} x="0" y={i * 4} width={W} height="1" fill="#eceefb" />
        ))}
      </g>

      {ROWS.map((row) => (
        <g key={row.seed} opacity={row.opacity}>
          {towers(row).map((t, i) => (
            <g key={i}>
              <rect
                x={t.x.toFixed(1)}
                y={t.y.toFixed(1)}
                width={t.w.toFixed(1)}
                height={t.h.toFixed(1)}
                fill="#05060d"
                stroke={STOPS[row.hue]}
                strokeOpacity="0.55"
                strokeWidth="1"
              />
              {t.lit && (
                <rect
                  x={t.x.toFixed(1)}
                  y={t.y.toFixed(1)}
                  width={t.w.toFixed(1)}
                  height="3"
                  fill={STOPS[row.hue]}
                  filter="url(#cb-bloom)"
                />
              )}
            </g>
          ))}
        </g>
      ))}

      {/* Perspective floor. Verticals converge on the vanishing point; the
          horizontals space geometrically so the ground reads as receding. */}
      <g stroke="url(#cb-floor)" strokeWidth="1" opacity="0.5">
        {Array.from({ length: 25 }).map((_, i) => {
          const t = (i / 24) * 2 - 0.5;
          return (
            <line
              key={`v${i}`}
              x1={W / 2}
              y1={H * 0.8}
              x2={t * W * 2.2}
              y2={H}
            />
          );
        })}
        {Array.from({ length: 9 }).map((_, i) => {
          const y = H * 0.8 + Math.pow(i / 8, 2.2) * H * 0.2;
          return <line key={`h${i}`} x1="0" y1={y} x2={W} y2={y} />;
        })}
      </g>
    </svg>
  );
}
