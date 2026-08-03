import type { ReactNode } from "react";
import type { TargetAndTransition } from "framer-motion";
import { profile } from "@/lib/content";
import { srand } from "@/lib/utils";

/**
 * ============================================================================
 * Depth stack for the boot poster.
 *
 * Every layer is authored here as inline SVG/CSS — no image requests, nothing
 * fetched from a third party, and the whole thing is themeable from the design
 * tokens. Layers are ordered back-to-front; the parent scales each one from
 * `initialScale` down to 1 while fading it in on `revealDelay`, which is what
 * produces the parallax dolly-out (near layers travel further than far ones).
 *
 * All scatter geometry uses `srand()` so markup is deterministic across
 * server and client.
 * ============================================================================
 */

const VIEW = 1000;

export interface PosterLayer {
  id: string;
  /** Human name — also the layer's alt semantics in the debug readout. */
  name: string;
  /** Scale at t=0. Larger = closer to camera = travels further. */
  initialScale: number;
  /** Seconds before this layer starts fading in. */
  revealDelay: number;
  node: ReactNode;
  initial?: TargetAndTransition;
  animate?: TargetAndTransition;
}

/* -------------------------------------------------------------------------- */
/*  00 — Volumetric fog                                                       */
/* -------------------------------------------------------------------------- */

function FogPlate() {
  return (
    <div className="absolute inset-0">
      <div
        className="animate-fog absolute inset-[-15%]"
        style={{
          background:
            "radial-gradient(45% 38% at 50% 30%, rgba(0,229,255,0.20), transparent 70%)," +
            "radial-gradient(55% 45% at 22% 72%, rgba(139,92,246,0.20), transparent 72%)," +
            "radial-gradient(40% 34% at 82% 64%, rgba(255,42,61,0.10), transparent 70%)",
          filter: "blur(28px)",
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  01 — Distant skyline                                                      */
/* -------------------------------------------------------------------------- */

function Skyline() {
  // Deterministic tower run across the lower third.
  const towers = Array.from({ length: 26 }, (_, i) => {
    const w = 22 + srand(i * 7) * 44;
    const h = 90 + srand(i * 7 + 1) * 260;
    return { w, h, lit: srand(i * 7 + 2) > 0.55 };
  });

  let x = -40;
  const placed = towers.map((t, i) => {
    const item = { ...t, x };
    x += t.w + 4 + srand(i * 3) * 16;
    return item;
  });

  const baseY = VIEW * 0.82;

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="poster-tower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d1a20" />
          <stop offset="100%" stopColor="#050505" />
        </linearGradient>
      </defs>

      {placed.map((t, i) => (
        <g key={i}>
          <rect
            x={t.x}
            y={baseY - t.h}
            width={t.w}
            height={t.h}
            fill="url(#poster-tower)"
          />
          {/* Rim light on the roofline */}
          <rect
            x={t.x}
            y={baseY - t.h}
            width={t.w}
            height={1.5}
            fill={t.lit ? "#00e5ff" : "#8b5cf6"}
            opacity={t.lit ? 0.55 : 0.3}
          />
          {/* Window grid */}
          {t.lit &&
            Array.from({ length: Math.floor(t.h / 26) }, (_, r) => (
              <rect
                key={r}
                x={t.x + 5}
                y={baseY - t.h + 12 + r * 26}
                width={t.w - 10}
                height={3}
                fill="#00e5ff"
                opacity={0.06 + srand(i * 31 + r) * 0.14}
              />
            ))}
          {/* Antenna */}
          {srand(i * 11) > 0.72 && (
            <line
              x1={t.x + t.w / 2}
              y1={baseY - t.h}
              x2={t.x + t.w / 2}
              y2={baseY - t.h - 40 - srand(i) * 50}
              stroke="#00e5ff"
              strokeWidth="1"
              opacity="0.3"
            />
          )}
        </g>
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  02 — Holographic ground plane                                             */
/* -------------------------------------------------------------------------- */

function GroundPlane() {
  return (
    <div
      className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden"
      style={{ perspective: "520px" }}
    >
      <div
        className="absolute inset-x-[-60%] bottom-[-30%] top-0 origin-bottom"
        style={{
          transform: "rotateX(74deg)",
          backgroundImage:
            "linear-gradient(rgba(0,229,255,0.30) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(0,229,255,0.30) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "linear-gradient(to top, black 5%, rgba(0,0,0,0.35) 45%, transparent 85%)",
          WebkitMaskImage:
            "linear-gradient(to top, black 5%, rgba(0,0,0,0.35) 45%, transparent 85%)",
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  03 — Orbital rings                                                        */
/* -------------------------------------------------------------------------- */

function OrbitalRings() {
  const c = VIEW / 2;
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <g
        style={{
          transformOrigin: "center",
          animation: "orbit 64s linear infinite",
        }}
      >
        <ellipse
          cx={c}
          cy={c}
          rx={330}
          ry={112}
          fill="none"
          stroke="#00e5ff"
          strokeWidth="1"
          opacity="0.35"
        />
        <ellipse
          cx={c}
          cy={c}
          rx={330}
          ry={112}
          fill="none"
          stroke="#00e5ff"
          strokeWidth="1"
          opacity="0.5"
          strokeDasharray="3 14"
          transform={`rotate(58 ${c} ${c})`}
        />
      </g>
      <g
        style={{
          transformOrigin: "center",
          animation: "orbit 96s linear infinite reverse",
        }}
      >
        <ellipse
          cx={c}
          cy={c}
          rx={400}
          ry={148}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="1"
          opacity="0.4"
          transform={`rotate(-34 ${c} ${c})`}
        />
      </g>
      {/* Node markers riding the outer ring */}
      {[0, 90, 180, 270].map((deg) => (
        <rect
          key={deg}
          x={c - 3}
          y={c - 151}
          width="6"
          height="6"
          fill="#00e5ff"
          opacity="0.7"
          transform={`rotate(${deg} ${c} ${c})`}
        />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  04 / 05 — HUD glyph plates                                                */
/* -------------------------------------------------------------------------- */

const LEFT_GLYPHS = [
  ["PWR", "98.4%"],
  ["THRM", "41.2C"],
  ["CLK", "4.80GHz"],
  ["MEM", "62%"],
];

const RIGHT_GLYPHS = [
  ["SHDR", "COMPILED"],
  ["GEOM", "1.2M TRI"],
  ["FRAME", "16.6MS"],
  ["NET", "LOCKED"],
];

function GlyphPlate({
  rows,
  side,
}: {
  rows: string[][];
  side: "left" | "right";
}) {
  const isLeft = side === "left";
  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 ${
        isLeft ? "left-[4%] items-start" : "right-[4%] items-end"
      } flex flex-col gap-3`}
    >
      <span
        className={`h-px w-16 bg-cyan/50 ${isLeft ? "" : "self-end"}`}
        aria-hidden
      />
      {rows.map(([k, v]) => (
        <div
          key={k}
          className={`flex items-baseline gap-3 ${
            isLeft ? "" : "flex-row-reverse"
          }`}
        >
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.3em] text-faint">
            {k}
          </span>
          <span className="tabular font-mono text-[0.7rem] tracking-widest text-cyan/80">
            {v}
          </span>
        </div>
      ))}
      {/* Tick ladder */}
      <div className={`flex gap-1 ${isLeft ? "" : "flex-row-reverse"}`}>
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className="w-px bg-cyan"
            style={{ height: 4 + srand(i * 5) * 12, opacity: 0.2 + srand(i) * 0.5 }}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  06 — Particle sheet                                                       */
/* -------------------------------------------------------------------------- */

function ParticleSheet() {
  const dots = Array.from({ length: 110 }, (_, i) => ({
    cx: srand(i * 3) * VIEW,
    cy: srand(i * 3 + 1) * VIEW,
    r: 0.8 + srand(i * 3 + 2) * 2.2,
    o: 0.15 + srand(i * 7) * 0.6,
    purple: srand(i * 13) > 0.78,
  }));

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill={d.purple ? "#a855f7" : "#00e5ff"}
          opacity={d.o}
        />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  07 — Core artifact                                                        */
/* -------------------------------------------------------------------------- */

function polygon(cx: number, cy: number, r: number, sides: number, rot = 0) {
  return Array.from({ length: sides }, (_, i) => {
    const a = (i / sides) * Math.PI * 2 + rot;
    return `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`;
  }).join(" ");
}

function CoreArtifact() {
  const c = VIEW / 2;
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="poster-core">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#0891a3" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={c} cy={c} r={175} fill="url(#poster-core)" />

      {/* Nested wireframe hull */}
      <polygon
        points={polygon(c, c, 150, 6)}
        fill="none"
        stroke="#00e5ff"
        strokeWidth="1.25"
        opacity="0.8"
      />
      <polygon
        points={polygon(c, c, 150, 6, Math.PI / 6)}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="1"
        opacity="0.5"
      />
      <polygon
        points={polygon(c, c, 96, 3, -Math.PI / 2)}
        fill="none"
        stroke="#00e5ff"
        strokeWidth="1"
        opacity="0.45"
      />
      <polygon
        points={polygon(c, c, 96, 3, Math.PI / 2)}
        fill="none"
        stroke="#00e5ff"
        strokeWidth="1"
        opacity="0.45"
      />

      {/* Spokes */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={c}
            y1={c}
            x2={c + Math.cos(a) * 150}
            y2={c + Math.sin(a) * 150}
            stroke="#00e5ff"
            strokeWidth="0.75"
            opacity="0.25"
          />
        );
      })}

      <circle cx={c} cy={c} r={18} fill="#00e5ff" opacity="0.9" />
      <circle
        cx={c}
        cy={c}
        r={34}
        fill="none"
        stroke="#00e5ff"
        strokeWidth="1"
        opacity="0.5"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  08 — Wordmark                                                             */
/* -------------------------------------------------------------------------- */

function Wordmark() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span
        className="font-display font-black uppercase leading-none text-fg"
        style={{
          fontSize: "clamp(3rem, 15cqw, 11rem)",
          letterSpacing: "-0.02em",
          textShadow: "0 0 30px rgba(0,229,255,0.45), 0 0 90px rgba(0,229,255,0.2)",
        }}
      >
        {profile.wordmark}
      </span>
      <span className="mt-3 flex items-center gap-3">
        <span className="h-px w-8 bg-cyan" />
        <span className="hud-label text-cyan">{profile.role}</span>
        <span className="h-px w-8 bg-cyan" />
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export const POSTER_LAYERS: PosterLayer[] = [
  { id: "00", name: "Atmosphere", initialScale: 1.05, revealDelay: 0.1, node: <FogPlate /> },
  { id: "01", name: "Skyline", initialScale: 1.24, revealDelay: 0.28, node: <Skyline /> },
  { id: "02", name: "Ground plane", initialScale: 1.4, revealDelay: 0.4, node: <GroundPlane /> },
  { id: "03", name: "Orbital rings", initialScale: 1.62, revealDelay: 0.52, node: <OrbitalRings /> },
  {
    id: "04",
    name: "Telemetry L",
    initialScale: 1.86,
    revealDelay: 0.64,
    node: <GlyphPlate rows={LEFT_GLYPHS} side="left" />,
  },
  {
    id: "05",
    name: "Telemetry R",
    initialScale: 2.1,
    revealDelay: 0.74,
    node: <GlyphPlate rows={RIGHT_GLYPHS} side="right" />,
  },
  { id: "06", name: "Particulate", initialScale: 2.34, revealDelay: 0.86, node: <ParticleSheet /> },
  { id: "07", name: "Core artifact", initialScale: 2.6, revealDelay: 1.0, node: <CoreArtifact /> },
  {
    id: "08",
    name: "Wordmark",
    initialScale: 3.1,
    revealDelay: 1.2,
    node: <Wordmark />,
    // The wordmark doesn't fade — it wipes up into frame, the way the poster
    // technique resolves its logo last.
    initial: { opacity: 1, clipPath: "inset(0% 0% 100% 0%)" },
    animate: { clipPath: "inset(0% 0% 0% 0%)" },
  },
];
