import { srand } from "@/lib/utils";

/**
 * The hero's city, generated.
 *
 * Two rows of it, emitted at different densities and painted onto different
 * plates — the far row sits behind the wordmark, the mid row in front of it, and
 * the gap between them is where the type lives. That sandwich is the whole
 * mechanic the reference clips are built on: their wordmark is occluded by a
 * mountain ridge and a figure, ours by a skyline.
 *
 * Silhouettes only — **no sky**. The ground comes from the plate below, because
 * a plate that paints its own background is a plate that can never be layered.
 * This is the same rule the site backdrop established for sections.
 *
 * Deterministic via `srand` (the mulberry32 integer mixer, not the usual
 * `sin`-based hash) so server and client emit byte-identical markup — see the
 * note on `srand` in lib/utils.ts for why that distinction is load-bearing.
 */

const W = 1600;
const H = 900;

const STOPS = ["var(--spectrum-1)", "var(--spectrum-2)", "var(--spectrum-3)"];

interface Row {
  seed: number;
  count: number;
  /** Tallest tower as a fraction of H. */
  maxH: number;
  /** Baseline as a fraction of H. Past 1 the row runs off the bottom edge. */
  base: number;
  minW: number;
  spanW: number;
  opacity: number;
  /** Lit window grids, neon signage and aerials — the near row only. */
  detail: boolean;
}

const ROWS: Record<"far" | "mid", Row> = {
  /* Far: dense, low, hazed. Reads as distance because it is *busier* and
     dimmer, not because it is smaller — a sparse far row reads as a foreground
     that happens to be short. */
  far: {
    seed: 907,
    count: 46,
    maxH: 0.4,
    base: 0.82,
    minW: 12,
    spanW: 38,
    opacity: 0.5,
    detail: false,
  },
  /* Mid: the occluder, and the only plate whose height is load-bearing. Its
     crowns have to reach *into* the wordmark, not stop under it — at 0.74 the
     tallest tower topped out ~40px below the type and the whole depth read
     collapsed, because nothing was ever in front of the name. */
  mid: {
    seed: 431,
    count: 20,
    maxH: 0.92,
    base: 1.06,
    minW: 46,
    spanW: 104,
    opacity: 1,
    detail: true,
  },
};

interface Tower {
  x: number;
  y: number;
  w: number;
  h: number;
  hue: number;
  /** Aerial mast + lamp on the crown. */
  mast: boolean;
  /** A vertical neon sign down the face. */
  sign: boolean;
}

function towers(row: Row): Tower[] {
  const out: Tower[] = [];
  let x = -60;
  for (let i = 0; i < row.count; i++) {
    const w = row.minW + srand(row.seed + i * 3) * row.spanW;
    const h = (0.2 + srand(row.seed + i * 7 + 1) * 0.8) * row.maxH * H;
    const gap = 3 + srand(row.seed + i * 11 + 2) * (row.detail ? 34 : 20);
    out.push({
      x,
      y: row.base * H - h,
      w,
      h,
      hue: Math.floor(srand(row.seed + i * 17 + 4) * 3),
      mast: row.detail && srand(row.seed + i * 13 + 3) > 0.62,
      sign: row.detail && srand(row.seed + i * 19 + 5) > 0.68,
    });
    x += w + gap;
    if (x > W + 80) break;
  }
  return out;
}

export function Skyline({
  variant,
  className,
}: {
  variant: "far" | "mid";
  className?: string;
}) {
  const row = ROWS[variant];
  const list = towers(row);
  const uid = `sky-${variant}`;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      /* Anchored to the bottom edge: a skyline that re-centres on a short
         viewport floats, which instantly kills the depth read. */
      preserveAspectRatio="xMidYMax slice"
      className={className}
    >
      <defs>
        {/* Lit windows. One pattern in user space rather than per-tower grids,
            so every building shares a floor line — which is what makes a
            skyline read as a city instead of as a row of hatched rectangles. */}
        <pattern
          id={`${uid}-win`}
          width="6"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <rect width="2" height="3" fill="var(--spectrum-3)" opacity="0.42" />
          <rect x="3" y="4" width="1.5" height="2.5" fill="var(--color-hazard)" opacity="0.5" />
        </pattern>

        {/* Vertical fade so the towers dissolve into the haze at their base
            instead of terminating on a hard line. */}
        <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="62%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.12" />
        </linearGradient>
        <mask id={`${uid}-mask`}>
          <rect width={W} height={H} fill={`url(#${uid}-fade)`} />
        </mask>

        {/* No `feGaussianBlur` anywhere in here, deliberately.

            The obvious way to make a crown or a sign glow is `filter=url(#bloom)`
            — but a filter reference is applied *per element*, and with 20 towers
            that is ~26 offscreen surfaces in one SVG, on a plate that rescales
            every scroll frame. Measured at 6x CPU throttle that alone moved the
            hero's median frame from 117ms to ~180ms. Glow is faked below with
            stacked translucent rects instead: three paints, no surfaces, and at
            this scale the picture is the same. */}
      </defs>

      <g opacity={row.opacity} mask={`url(#${uid}-mask)`}>
        {list.map((t, i) => (
          <g key={i}>
            {/* The mass. Near-black rather than pure void so the silhouette
                still separates from the ground behind it. */}
            <rect
              x={t.x.toFixed(1)}
              y={t.y.toFixed(1)}
              width={t.w.toFixed(1)}
              height={(H - t.y).toFixed(1)}
              fill="#04050a"
            />

            {row.detail && (
              <rect
                x={t.x.toFixed(1)}
                y={t.y.toFixed(1)}
                width={t.w.toFixed(1)}
                height={(H - t.y).toFixed(1)}
                fill={`url(#${uid}-win)`}
                /* Low. A fully-lit grid reads as a Lite-Brite board; what sells
                   a tower is a face that is mostly dark with lights in it. */
                opacity="0.3"
              />
            )}

            {/* Rim light along the crown — the one place colour touches the
                silhouette, and what stops the row reading as a black bar.
                Glow is three stacked rects at falling opacity rather than a
                gaussian: the eye reads the gradient of alpha as a bloom. */}
            {row.detail && (
              <>
                <rect
                  x={(t.x - 6).toFixed(1)}
                  y={(t.y - 7).toFixed(1)}
                  width={(t.w + 12).toFixed(1)}
                  height="16"
                  fill={STOPS[t.hue]}
                  opacity="0.12"
                />
                <rect
                  x={(t.x - 2).toFixed(1)}
                  y={(t.y - 3).toFixed(1)}
                  width={(t.w + 4).toFixed(1)}
                  height="8"
                  fill={STOPS[t.hue]}
                  opacity="0.3"
                />
              </>
            )}
            <rect
              x={t.x.toFixed(1)}
              y={t.y.toFixed(1)}
              width={t.w.toFixed(1)}
              height={row.detail ? 2 : 1}
              fill={STOPS[t.hue]}
              opacity={row.detail ? 0.9 : 0.45}
            />

            {t.sign && (
              <>
                <rect
                  x={(t.x + t.w * 0.62 - 5).toFixed(1)}
                  y={(t.y + 29).toFixed(1)}
                  width="17"
                  height={(Math.min(150, (H - t.y) * 0.42) + 10).toFixed(1)}
                  fill={STOPS[(t.hue + 1) % 3]}
                  opacity="0.16"
                />
                <rect
                  x={(t.x + t.w * 0.62).toFixed(1)}
                  y={(t.y + 34).toFixed(1)}
                  width="7"
                  height={Math.min(150, (H - t.y) * 0.42).toFixed(1)}
                  fill={STOPS[(t.hue + 1) % 3]}
                  opacity="0.85"
                />
              </>
            )}

            {t.mast && (
              <>
                <rect
                  x={(t.x + t.w * 0.5).toFixed(1)}
                  y={(t.y - 46).toFixed(1)}
                  width="1.5"
                  height="46"
                  fill="var(--color-line-strong)"
                />
                {/* Aviation lamp. The one blinking thing in the plate, and it
                    animates opacity on a 3px dot — no layer, no repaint cost
                    worth measuring. */}
                <circle
                  cx={(t.x + t.w * 0.5).toFixed(1)}
                  cy={(t.y - 48).toFixed(1)}
                  r="3"
                  fill="var(--color-hazard)"
                  className="hero-lamp"
                  style={{ animationDelay: `${(srand(t.x | 0) * 4).toFixed(2)}s` }}
                />
              </>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}
