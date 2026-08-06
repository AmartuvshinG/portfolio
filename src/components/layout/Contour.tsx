import { srand } from "@/lib/utils";

/**
 * Topographic contour field — the texture under every paper act.
 *
 * Lando's version is the reason its off-white reads as a *surface* and not as
 * an empty div: at rest you barely register it, but it gives parallax something
 * to bite on and stops large flat areas looking unfinished.
 *
 * Generated as vector paths rather than a raster so it stays crisp at any size
 * and costs nothing to ship. Deterministic (`srand`) so server and client emit
 * identical markup — `Math.random()` here would hydration-mismatch.
 *
 * Zero-JS server component. Colour comes from `currentColor`, so it inverts
 * with the act like everything else.
 */

/** Concentric rings per island. */
const RINGS = 7;
/** Points around each ring — more reads smoother, fewer reads more angular. */
const POINTS = 12;

interface Island {
  cx: number;
  cy: number;
  /** Radius of the innermost ring, in viewBox units. */
  r: number;
  /** Per-island noise seed. */
  seed: number;
}

const ISLANDS: Island[] = [
  { cx: 210, cy: 180, r: 26, seed: 3 },
  { cx: 760, cy: 120, r: 34, seed: 17 },
  { cx: 520, cy: 520, r: 30, seed: 41 },
  { cx: 120, cy: 640, r: 22, seed: 63 },
  { cx: 890, cy: 610, r: 28, seed: 88 },
];

/**
 * One closed ring as a cubic path. Each vertex is pushed out by a per-angle
 * noise offset that is *shared across rings of the same island*, which is what
 * makes the contours nest like real terrain instead of looking like concentric
 * blobs that happen to overlap.
 */
function ring(island: Island, step: number) {
  const radius = island.r + step * 15;
  const pts: [number, number][] = [];

  for (let i = 0; i < POINTS; i++) {
    const angle = (i / POINTS) * Math.PI * 2;
    const wobble = 0.72 + srand(island.seed + i * 7) * 0.56;
    // Outer rings smooth out, the way widely-spaced contours do on a real map.
    const damped = 1 + (wobble - 1) * (1 - step / (RINGS + 2));
    const r = radius * damped;
    pts.push([island.cx + Math.cos(angle) * r, island.cy + Math.sin(angle) * r]);
  }

  // Catmull-Rom through the points, emitted as cubic beziers for a closed loop.
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < POINTS; i++) {
    const p0 = pts[(i - 1 + POINTS) % POINTS];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % POINTS];
    const p3 = pts[(i + 2) % POINTS];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

interface ContourProps {
  /** Overall strength. Default is calibrated to sit just at the threshold. */
  opacity?: number;
  className?: string;
}

export function Contour({ opacity = 0.14, className }: ContourProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 760"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ opacity }}
    >
      <g fill="none" stroke="currentColor" strokeWidth="0.7">
        {ISLANDS.map((island) =>
          Array.from({ length: RINGS }, (_, step) => (
            <path
              key={`${island.seed}-${step}`}
              d={ring(island, step)}
              /* Inner rings sit slightly stronger, so each island reads as
                 having a peak rather than being uniformly flat. */
              strokeOpacity={1 - step / (RINGS + 1)}
            />
          ))
        )}
      </g>
    </svg>
  );
}
