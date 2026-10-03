import { srand } from "@/lib/utils";

/**
 * The art behind a Signal channel, drawn from what the channel *is*:
 *
 *   github    nothing but the ground: the panel now shows his real repos, and
 *             a seeded "contribution grid" beside real data would be a fake
 *   linkedin  a small network whose connections draw themselves in when lit
 *   live      stacked heartbeat traces that draw themselves in when lit — the
 *             service is up
 *
 * It replaced a static plate of concentric arcs that was identical in kind on
 * every panel. Nothing here is data: the grid levels and node positions
 * are seeded (`srand`), so they are stable across renders and hydration, and
 * they never claim to be anyone's real activity.
 *
 * Motion runs **only on a lit panel** (the `cf-lit` class gates every
 * keyframe in globals.css). On a pointer device that is the hovered one; on a
 * phone every panel is open, so Connect also unlights them all while the
 * section is off screen. SVG children are never composited, so these loops
 * cost a restyle and repaint per frame. It is opacity, transform and dash
 * offset only. The ground is translucent so the
 * aurora shows through the glass.
 *
 * This is always *under* the channel's mark. The marks are never tinted.
 */

export type ChannelKind = "github" | "linkedin" | "live";

const W = 300;
const H = 700;
const STOPS = ["var(--spectrum-1)", "var(--spectrum-2)", "var(--spectrum-3)"];

export function ChannelField({
  kind,
  seed,
  lit,
}: {
  kind: ChannelKind;
  seed: number;
  lit: boolean;
}) {
  const hue = STOPS[seed % 3];
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${lit ? "cf-lit" : ""}`}
      style={{ opacity: lit ? 1 : 0.7 }}
    >
      <rect width={W} height={H} fill="#0a1d22" fillOpacity="0.5" />
      {/* A low pool of the channel's light at the foot — kept faint: the
          panel is a terminal, not a lit slab. */}
      <ellipse cx={W / 2} cy={H * 0.86} rx={W * 0.8} ry={H * 0.42} fill={hue} opacity="0.09" />
      {kind === "linkedin" && <Network seed={seed} />}
      {kind === "live" && <Pulse seed={seed} />}
    </svg>
  );
}

/* --- LinkedIn: fourteen seeded nodes, each tied to its two nearest
   neighbours. Edges are drawn with a normalised dash, so a single offset
   transition draws every one of them in regardless of its length. */
function Network({ seed }: { seed: number }) {
  const nodes = Array.from({ length: 14 }, (_, i) => ({
    x: 30 + srand(seed * 409 + i * 2) * (W - 60),
    y: 40 + srand(seed * 409 + i * 2 + 1) * (H - 80),
  }));
  const edges: [number, number][] = [];
  nodes.forEach((a, i) => {
    nodes
      .map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2)
      .forEach(({ j }) => {
        if (!edges.some(([p, q]) => (p === j && q === i) || (p === i && q === j))) edges.push([i, j]);
      });
  });
  return (
    <g>
      <g fill="none" stroke="#e4f1f3" strokeOpacity="0.32" strokeWidth="1.2">
        {edges.map(([i, j], k) => (
          <line
            key={k}
            className="cf-edge"
            pathLength={1}
            x1={nodes[i].x.toFixed(1)}
            y1={nodes[i].y.toFixed(1)}
            x2={nodes[j].x.toFixed(1)}
            y2={nodes[j].y.toFixed(1)}
            style={{ transitionDelay: `${(k * 0.04).toFixed(2)}s` }}
          />
        ))}
      </g>
      {nodes.map((n, i) => (
        <circle
          key={i}
          className="cf-node"
          cx={n.x.toFixed(1)}
          cy={n.y.toFixed(1)}
          r={i % 4 === 0 ? 4.5 : 2.8}
          fill={STOPS[i % 3]}
          style={{ animationDelay: `${((i * 0.23) % 2.4).toFixed(2)}s` }}
        />
      ))}
    </g>
  );
}

/* --- Live site: heartbeat traces down the panel. Each is one path with a
   normalised dash (the same `cf-edge` draw-in as the network), plus a node
   pulsing at its spike. Seeded spike positions, never "real" uptime data. */
function Pulse({ seed }: { seed: number }) {
  const rows = 9;
  return (
    <g fill="none" strokeLinejoin="round" strokeLinecap="round">
      {Array.from({ length: rows }, (_, i) => {
        const y = 60 + i * ((H - 120) / (rows - 1));
        const spike = 60 + srand(seed * 131 + i) * (W - 120);
        const amp = 14 + srand(seed * 71 + i) * 26;
        const d = `M 20 ${y} L ${spike - 24} ${y} L ${spike - 12} ${y - amp * 0.4} L ${spike} ${y + amp} L ${spike + 10} ${y - amp} L ${spike + 22} ${y} L ${W - 20} ${y}`;
        return (
          <g key={i}>
            <path
              className="cf-edge"
              pathLength={1}
              d={d}
              stroke={STOPS[i % 3]}
              strokeOpacity={0.55}
              strokeWidth={1.6}
              style={{ transitionDelay: `${(i * 0.06).toFixed(2)}s` }}
            />
            <circle
              className="cf-node"
              cx={(spike + 10).toFixed(1)}
              cy={(y - amp).toFixed(1)}
              r={2.6}
              fill="#e4f1f3"
              style={{ animationDelay: `${((i * 0.27) % 2.4).toFixed(2)}s` }}
            />
          </g>
        );
      })}
    </g>
  );
}
