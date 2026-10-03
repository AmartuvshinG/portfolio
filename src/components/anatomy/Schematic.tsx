"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import type { UiStrings } from "@/lib/ui";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   The schematic: Spotfixes' prediction path as one drawing, after the
   architecture and process-flow diagrams in the final report (§9).

   The report's flow, top to bottom: the Analysis tab posts a summary to
   FastAPI; the JWT is checked at the first trust boundary; the Tenant Guard
   scopes the request to the token's company; Supabase RLS enforces it again
   past the second boundary. Then two lanes run side by side (UC-2 runs
   "concurrent with UC-1"): TF-IDF → Random Forest → the keyword rule engine,
   and MiniLM → ChromaDB's three nearest reports. They meet at the result.

   Two packets travel it, driven straight from scroll: one down the trunk and
   the ML lane, one spawned at the database for the RAG lane. Each segment has
   a lit copy whose dash offset is the packet's progress along it. All of it is
   set imperatively from one motion-value listener — no React render and no
   animation loop per frame; a still page is a still drawing.
   ------------------------------------------------------------------------- */

export type NodeKey = "input" | "api" | "guard" | "db" | "tfidf" | "forest" | "rules" | "embed" | "chroma" | "result";

const VB = { w: 600, h: 680 };
const NW = 228;
const NH = 46;

const NODES: Record<NodeKey, { x: number; y: number }> = {
  input: { x: 300, y: 36 },
  api: { x: 300, y: 140 },
  guard: { x: 300, y: 214 },
  db: { x: 300, y: 306 },
  tfidf: { x: 160, y: 404 },
  forest: { x: 160, y: 484 },
  rules: { x: 160, y: 564 },
  embed: { x: 440, y: 404 },
  chroma: { x: 440, y: 484 },
  result: { x: 300, y: 644 },
};

const BOUNDARIES = [
  { y: 90, key: "boundary1", letters: ["S", "D"], beat: 1 },
  { y: 260, key: "boundary2", letters: ["T", "I", "E", "R"], beat: 2 },
] as const;

type SegKey = "t0" | "t1" | "t2" | "m0" | "m1" | "m2" | "m3" | "r0" | "r1" | "r2";

const SEGS: Record<SegKey, string> = {
  t0: "M300 59 V117",
  t1: "M300 163 V191",
  t2: "M300 237 V283",
  m0: "M300 329 V352 H160 V381",
  m1: "M160 427 V461",
  m2: "M160 507 V541",
  m3: "M160 587 V604 H300 V621",
  r0: "M300 329 V352 H440 V381",
  r1: "M440 427 V461",
  r2: "M440 507 V604 H300 V621",
};

/**
 * Each packet's route, as [the gap it moves in, segment]. Gap `i` is the
 * scroll between beat i and beat i + 1; segments in one gap run in turn.
 */
const ROUTES: [number, SegKey][][] = [
  [
    [0, "t0"],
    [1, "t1"],
    [1, "t2"],
    [2, "m0"],
    [2, "m1"],
    [3, "m2"],
    [5, "m3"],
  ],
  [
    [2, "r0"],
    [4, "r1"],
    [5, "r2"],
  ],
];

/** The beat at which each node has been reached, and the beats it is the subject of. */
const REACHED: Record<NodeKey, number> = {
  input: 0,
  api: 1,
  guard: 2,
  db: 2,
  tfidf: 3,
  forest: 3,
  embed: 3,
  rules: 4,
  chroma: 5,
  result: 6,
};
const FOCUS: NodeKey[][] = [
  ["input"],
  ["api"],
  ["guard", "db"],
  ["tfidf", "forest"],
  ["rules"],
  ["embed", "chroma"],
  ["result"],
  ["forest"],
  [],
  ["input", "result"],
  ["input", "result"],
  ["input", "result"],
];
/** The beats about his own work: the UI, at both ends of the line. */
export const MINE_BEATS: readonly number[] = [9, 10, 11];
/** From this beat the rule engine has fired, and stays the colour of it. */
const OVERRIDE_BEAT = 4;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** How far each segment is lit at `pos`, given the plateau half-width. */
function segFractions(pos: number, hold: number) {
  const out = {} as Record<SegKey, number>;
  for (const route of ROUTES) {
    for (const [gap, key] of route) {
      const inGap = route.filter(([g]) => g === gap);
      const j = inGap.findIndex(([, k]) => k === key);
      const g = clamp01((pos - gap - hold) / (1 - 2 * hold));
      out[key] = clamp01(g * inGap.length - j);
    }
  }
  return out;
}

export function Schematic({
  pos,
  hold = 0.26,
  beat,
  words,
  className,
}: {
  /** Scroll position in beats. Null draws the finished schematic, still. */
  pos: MotionValue<number> | null;
  hold?: number;
  /** The beat on screen (an integer); null when nothing is in focus. */
  beat: number | null;
  words: UiStrings["anatomy"];
  className?: string;
}) {
  const base = useRef<Partial<Record<SegKey, SVGPathElement | null>>>({});
  const lit = useRef<Partial<Record<SegKey, SVGPathElement | null>>>({});
  const packets = useRef<(SVGGElement | null)[]>([]);

  useEffect(() => {
    const paint = (p: number | null) => {
      const f = p === null ? null : segFractions(p, hold);
      (Object.keys(SEGS) as SegKey[]).forEach((k) => {
        lit.current[k]?.setAttribute("stroke-dashoffset", String(f ? 1 - f[k] : 0));
      });
      ROUTES.forEach((route, n) => {
        const g = packets.current[n];
        if (!g) return;
        if (!f || p === null) {
          g.style.opacity = "0";
          return;
        }
        /* The packet sits at the end of the last segment it has entered; it
           is not yet born before its first, and gone into the result after
           its last. */
        let at: SegKey | null = null;
        for (const [, k] of route) if (f[k] > 0) at = k;
        const first = route[0];
        const done = f[route[route.length - 1][1]] >= 1;
        if (done || (n === 1 && f[first[1]] <= 0)) {
          g.style.opacity = "0";
          return;
        }
        const seg = base.current[at ?? first[1]];
        if (!seg) return;
        const len = seg.getTotalLength();
        const pt = seg.getPointAtLength((at ? f[at] : 0) * len);
        g.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
        g.style.opacity = "1";
      });
    };
    paint(pos ? pos.get() : null);
    if (!pos) return;
    return pos.on("change", paint);
  }, [pos, hold]);

  const reached = (k: NodeKey) => beat === null || beat >= REACHED[k];
  const focus = beat === null ? [] : (FOCUS[beat] ?? []);
  const mine = beat !== null && MINE_BEATS.includes(beat);

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("block h-full w-full overflow-visible", className)}
    >
      {/* Trust boundaries: where the threat model sits. */}
      {BOUNDARIES.map((b) => {
        const on = beat === null || beat >= b.beat;
        const active = beat === b.beat;
        return (
          <g key={b.key}>
            <line
              x1={8}
              x2={VB.w - 8}
              y1={b.y}
              y2={b.y}
              strokeDasharray="5 7"
              strokeWidth={1}
              style={{
                stroke: active
                  ? "var(--color-holo)"
                  : on
                    ? "color-mix(in srgb, var(--color-holo) 40%, transparent)"
                    : "var(--color-line-strong)",
                transition: "stroke 400ms",
              }}
            />
            <text
              x={8}
              y={b.y - 9}
              className="font-mono uppercase"
              fontSize={13}
              letterSpacing="0.08em"
              style={{ fill: active ? "var(--color-holo)" : "var(--color-muted)", transition: "fill 400ms" }}
            >
              {words[b.key]}
            </text>
            {b.letters.map((l, i) => {
              const x = VB.w - 8 - (b.letters.length - i) * 26;
              return (
                <g key={l} transform={`translate(${x} ${b.y - 10})`}>
                  <rect
                    width={20}
                    height={20}
                    rx={2}
                    style={{
                      fill: active ? "color-mix(in srgb, var(--color-holo) 22%, var(--color-bg))" : "var(--color-bg)",
                      stroke: on ? "var(--color-holo)" : "var(--color-line-strong)",
                      transition: "fill 400ms, stroke 400ms",
                    }}
                  />
                  <text
                    x={10}
                    y={14.5}
                    textAnchor="middle"
                    className="font-mono"
                    fontSize={13}
                    fontWeight={700}
                    style={{ fill: on ? "var(--color-holo)" : "var(--color-faint)", transition: "fill 400ms" }}
                  >
                    {l}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* The wires: a faint base, and a lit copy drawn on by the packets. */}
      {(Object.keys(SEGS) as SegKey[]).map((k) => (
        <g key={k} fill="none" strokeLinejoin="round">
          <path
            ref={(el) => {
              base.current[k] = el;
            }}
            d={SEGS[k]}
            strokeWidth={1.5}
            style={{ stroke: "var(--color-line-strong)" }}
          />
          <path
            ref={(el) => {
              lit.current[k] = el;
            }}
            d={SEGS[k]}
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={pos ? 1 : 0}
            strokeWidth={2}
            style={{ stroke: "var(--color-holo)" }}
          />
        </g>
      ))}

      {(Object.keys(NODES) as NodeKey[]).map((k) => {
        const { x, y } = NODES[k];
        const on = reached(k);
        const isFocus = focus.includes(k);
        const hazard = (k === "rules" && beat !== null && beat >= OVERRIDE_BEAT) || (mine && isFocus);
        const tone = hazard ? "var(--color-hazard)" : "var(--color-holo)";
        return (
          <g key={k} transform={`translate(${x - NW / 2} ${y - NH / 2})`}>
            <rect
              width={NW}
              height={NH}
              rx={3}
              style={{
                fill: isFocus ? `color-mix(in srgb, ${tone} 14%, var(--color-bg))` : "var(--color-bg)",
                stroke: isFocus ? tone : on ? `color-mix(in srgb, ${tone} 55%, transparent)` : "var(--color-line-strong)",
                strokeWidth: isFocus ? 1.75 : 1,
                transition: "fill 400ms, stroke 400ms",
              }}
            />
            <text
              x={NW / 2}
              y={20.5}
              textAnchor="middle"
              className="font-mono uppercase"
              fontSize={15.5}
              fontWeight={600}
              letterSpacing="0.08em"
              style={{ fill: on ? "var(--color-fg)" : "var(--color-muted)", transition: "fill 400ms" }}
            >
              {words.nodes[k]}
            </text>
            <text
              x={NW / 2}
              y={38}
              textAnchor="middle"
              className="font-mono"
              fontSize={13}
              style={{ fill: isFocus ? tone : "var(--color-muted)", transition: "fill 400ms" }}
            >
              {words.nodeSubs[k]}
            </text>
            {mine && isFocus && (
              <text
                x={NW + 10}
                y={28}
                className="font-mono uppercase"
                fontSize={13}
                letterSpacing="0.08em"
                style={{ fill: "var(--color-hazard)" }}
              >
                ← {words.myPart}
              </text>
            )}
          </g>
        );
      })}

      {/* The packets: a halo and a core, no filters. */}
      {ROUTES.map((_, n) => (
        <g
          key={n}
          ref={(el) => {
            packets.current[n] = el;
          }}
          style={{ opacity: 0 }}
        >
          <circle r={11} style={{ fill: "color-mix(in srgb, var(--color-holo) 22%, transparent)" }} />
          <circle r={4.5} style={{ fill: "#eafcff" }} />
        </g>
      ))}
    </svg>
  );
}
