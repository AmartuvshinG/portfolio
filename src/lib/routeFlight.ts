import type { Shot } from "@/lib/routeGeo";

/**
 * Where the Path's camera is at each point of the scroll.
 *
 * Four places and two flights:
 *
 *   UB      close over Mongolia: Ulaanbaatar and Khanbogd, the Gobi below.
 *   → out   the camera climbs and pans east along the latitudes, over the
 *           Bering Strait, high enough to see the whole arc cross the top of
 *           the world as it lights; then comes down on the Great Lakes.
 *   Erie    the Great Lakes, Lake Erie readable. Across the stay (five
 *           entries) the camera drifts south-east and closes on Erie, so the
 *           map moves through the long stretch where the route itself is still.
 *   ← back  the same climb in reverse, west over the Strait.
 *   Gobi    down between Ulaanbaatar and the mine, closer each step, for the
 *           freight runs.
 *
 * North stays up throughout (see lib/routeGeo for why the camera never flies
 * over the pole itself). Every number below was set by eye on the stage.
 */

type Spot = Pick<Shot, "lat" | "lon" | "h">;

const UB: [Spot, Spot] = [
  { lat: 47.0, lon: 103.0, h: 1.05 },
  { lat: 46.4, lon: 104.8, h: 0.9 },
];
const ERIE: [Spot, Spot] = [
  { lat: 44.6, lon: -84.8, h: 0.62 },
  { lat: 42.8, lon: -81.2, h: 0.38 },
];
const GOBI: [Spot, Spot] = [
  { lat: 46.0, lon: 106.2, h: 0.5 },
  { lat: 45.5, lon: 106.8, h: 0.36 },
];
/** How far the camera climbs mid-flight, Earth radii, and how far north it bows. */
const CLIMB = 2.9;
const BOW = 14;
/** How far the subject slides left mid-flight, so the far city clears the board. */
const SLIDE = 0.07;

export interface FlightPlan {
  /** The first `pos`, and the last. */
  from: number;
  to: number;
  /** The two flights, in `pos`. */
  out: { start: number; end: number };
  back: { start: number; end: number };
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const span = (pos: number, a: number, b: number) => (b > a ? clamp01((pos - a) / (b - a)) : 1);

function hold([a, b]: [Spot, Spot], t: number): Spot {
  const e = smooth(t);
  return { lat: lerp(a.lat, b.lat, e), lon: lerp(a.lon, b.lon, e), h: lerp(a.h, b.h, e) };
}

/** A flight from `a` to `b`, `dir` +1 east or −1 west, at `t` 0…1. */
function fly(a: Spot, b: Spot, dir: 1 | -1, t: number): Spot {
  const e = smooth(t);
  /* Unwrap the longitude in the direction of travel. */
  let to = b.lon;
  if (dir > 0) while (to < a.lon) to += 360;
  else while (to > a.lon) to -= 360;
  const lift = Math.sin(Math.PI * e);
  return {
    lat: lerp(a.lat, b.lat, e) + BOW * lift,
    lon: lerp(a.lon, to, e),
    h: lerp(a.h, b.h, e) + CLIMB * Math.pow(lift, 0.85),
  };
}

/** How far into the air the camera is at `pos`: 0 on the ground over a
    city, 1 at the top of a flight. */
export function airAt(pos: number, { out, back }: FlightPlan): number {
  if (pos >= out.start && pos < out.end) return Math.sin(Math.PI * smooth(span(pos, out.start, out.end)));
  if (pos >= back.start && pos < back.end) return Math.sin(Math.PI * smooth(span(pos, back.start, back.end)));
  return 0;
}

/** The shot at `pos`, framed with the subject at (fx, fy). */
export function shotAt(pos: number, plan: FlightPlan, fx: number, fy: number): Shot {
  const { out, back } = plan;
  let s: Spot;
  if (pos < out.start) s = hold(UB, span(pos, plan.from, out.start));
  else if (pos < out.end) s = fly(UB[1], ERIE[0], 1, span(pos, out.start, out.end));
  else if (pos < back.start) s = hold(ERIE, span(pos, out.end, back.start));
  else if (pos < back.end) s = fly(ERIE[1], GOBI[0], -1, span(pos, back.start, back.end));
  else s = hold(GOBI, span(pos, back.end, plan.to));
  return { ...s, fx: fx - SLIDE * airAt(pos, plan), fy };
}

/** The still shot for phones and reduced motion: the whole route at once. */
export const WHOLE_ROUTE: Spot = { lat: 58, lon: 191, h: 2.5 };
