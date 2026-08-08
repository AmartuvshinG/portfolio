import { srand } from "@/lib/utils";

/**
 * Iridescent particulate field — the texture under every dark surface.
 *
 * Replaces the topographic contour field, which was the single most legible
 * borrowing from ref2 and the reason large areas read as "that other site".
 * This is ref3's register instead: a point cloud catching coloured rim light
 * out of a petrol-black ground, dense at the drift centres and thinning to
 * nothing at the edges.
 *
 * Colour comes from the spectrum ramp rather than `currentColor`, because the
 * whole point is that the accent lives in the atmosphere and never in the
 * chrome. Opacity is the only knob callers get.
 *
 * Generated as vector rather than raster so it stays crisp at any size and
 * costs nothing to ship. Deterministic (`srand`) so server and client emit
 * identical markup — `Math.random()` here would hydration-mismatch. Zero-JS
 * server component.
 */

/** Drift centres. Particles cluster around these and thin out with distance. */
interface Cluster {
  cx: number;
  cy: number;
  /** Cluster radius in viewBox units. */
  r: number;
  /** Which spectrum stop this cluster catches. */
  stop: 0 | 1 | 2;
  /** Per-cluster noise seed. */
  seed: number;
  count: number;
}

const CLUSTERS: Cluster[] = [
  { cx: 180, cy: 210, r: 300, stop: 0, seed: 11, count: 90 },
  { cx: 820, cy: 150, r: 260, stop: 2, seed: 37, count: 78 },
  { cx: 540, cy: 560, r: 330, stop: 1, seed: 59, count: 96 },
  { cx: 120, cy: 660, r: 220, stop: 2, seed: 83, count: 62 },
  { cx: 900, cy: 620, r: 250, stop: 0, seed: 107, count: 70 },
];

const STOPS = ["var(--spectrum-1)", "var(--spectrum-2)", "var(--spectrum-3)"];

/**
 * Particles for one cluster. Radius uses `sqrt` of the random so points spread
 * evenly across the disc — without it everything piles into the centre and the
 * cluster reads as a hard dot rather than as a haze.
 */
function particles(cluster: Cluster) {
  const out: { x: number; y: number; r: number; o: number }[] = [];

  for (let i = 0; i < cluster.count; i++) {
    const a = srand(cluster.seed + i * 3) * Math.PI * 2;
    const d = Math.sqrt(srand(cluster.seed + i * 7 + 1)) * cluster.r;
    const size = 0.5 + srand(cluster.seed + i * 11 + 2) * 1.9;
    // Fade with distance from the centre so the cluster has no visible edge.
    const falloff = 1 - d / cluster.r;

    out.push({
      x: cluster.cx + Math.cos(a) * d,
      y: cluster.cy + Math.sin(a) * d * 0.78, // slightly flattened, reads as depth
      r: size,
      o: 0.12 + falloff * falloff * 0.78,
    });
  }
  return out;
}

interface NebulaProps {
  /** Overall strength. Default sits just at the threshold of registering. */
  opacity?: number;
  className?: string;
}

export function Nebula({ opacity = 0.5, className }: NebulaProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 760"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ opacity }}
    >
      <defs>
        {/* One soft glow per stop. Keeping three separate filters rather than
            one shared filter is what preserves the hue separation — a single
            blur over mixed colours muddies straight to grey. */}
        {STOPS.map((_, i) => (
          <filter key={i} id={`neb-glow-${i}`} x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        ))}
      </defs>

      {CLUSTERS.map((cluster) => {
        const fill = STOPS[cluster.stop];
        return (
          <g key={cluster.seed}>
            {/* The bloom behind the points — this is what makes the field read
                as lit atmosphere rather than as scattered dust. */}
            <ellipse
              cx={cluster.cx}
              cy={cluster.cy}
              rx={cluster.r * 0.62}
              ry={cluster.r * 0.48}
              fill={fill}
              opacity={0.16}
              filter={`url(#neb-glow-${cluster.stop})`}
            />
            {particles(cluster).map((p, i) => (
              <circle
                key={i}
                cx={p.x.toFixed(1)}
                cy={p.y.toFixed(1)}
                r={p.r.toFixed(2)}
                fill={fill}
                opacity={p.o.toFixed(3)}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
