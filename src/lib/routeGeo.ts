/**
 * The Path's geography: where the cities are, the great circle between them,
 * and the view of the globe they are drawn on.
 *
 * **Why a globe and not a map.** Ulaanbaatar to Erie runs over the top of the
 * world — the great circle passes within four degrees of the pole. On a flat
 * map that route is a line squashed along the top edge; on an orthographic
 * globe seen from over the Bering Strait it is what it is, an arc over the
 * Arctic with Asia on one limb and North America on the other.
 *
 * The view (VIEW) was chosen by measuring, not by eye: centred at 20°N 190°E
 * the two cities sit level, 0.7 of a radius either side of centre, with the
 * pole about a quarter of a radius above them.
 */

export type StopKey = "ub" | "erie";
export type PlaceKey = StopKey | "khanbogd";

/** Degrees. Public geography, not personal data. */
export const PLACES: Record<PlaceKey, { lat: number; lon: number }> = {
  ub: { lat: 47.92, lon: 106.92 },
  erie: { lat: 42.13, lon: -80.09 },
  /** Oyu Tolgoi, by Khanbogd: the mine site the logistics role served. */
  khanbogd: { lat: 43.0, lon: 106.9 },
};

/** Where the globe is seen from: the point at the centre of the disc. */
export const VIEW = { lat: 20, lon: 190 };

const RAD = Math.PI / 180;
const EARTH_KM = 6371;

type Vec3 = [number, number, number];

function toVec(lat: number, lon: number): Vec3 {
  const p = lat * RAD;
  const l = lon * RAD;
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
}

function toLatLon([x, y, z]: Vec3): [number, number] {
  return [Math.asin(Math.max(-1, Math.min(1, z))) / RAD, Math.atan2(y, x) / RAD];
}

/** Central angle between two places, radians. */
function angle(a: Vec3, b: Vec3) {
  return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
}

/** Great-circle distance, km. */
export function distanceKm(a: PlaceKey, b: PlaceKey): number {
  const pa = PLACES[a];
  const pb = PLACES[b];
  return angle(toVec(pa.lat, pa.lon), toVec(pb.lat, pb.lon)) * EARTH_KM;
}

/** `n + 1` points along the great circle from a to b, as [lat, lon]. */
export function greatCircle(a: PlaceKey, b: PlaceKey, n: number): [number, number][] {
  const va = toVec(PLACES[a].lat, PLACES[a].lon);
  const vb = toVec(PLACES[b].lat, PLACES[b].lon);
  const d = angle(va, vb);
  const s = Math.sin(d) || 1;
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const k1 = Math.sin((1 - t) * d) / s;
    const k2 = Math.sin(t * d) / s;
    out.push(toLatLon([k1 * va[0] + k2 * vb[0], k1 * va[1] + k2 * vb[1], k1 * va[2] + k2 * vb[2]]));
  }
  return out;
}

/**
 * Orthographic projection onto the unit disc, y up. `front` is the cosine of
 * the angle from the view centre: > 0 on the visible hemisphere, and also a
 * natural limb shade (1 at the centre, 0 at the edge).
 */
export function project(lat: number, lon: number): { x: number; y: number; front: number } {
  const p = lat * RAD;
  const l = (lon - VIEW.lon) * RAD;
  const p0 = VIEW.lat * RAD;
  return {
    x: Math.cos(p) * Math.sin(l),
    y: Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l),
    front: Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l),
  };
}

/** The inverse: a point on the unit disc (y up) to [lat, lon], or null off the globe. */
export function unproject(x: number, y: number): [number, number] | null {
  const rho = Math.hypot(x, y);
  if (rho > 1) return null;
  const p0 = VIEW.lat * RAD;
  if (rho === 0) return [VIEW.lat, VIEW.lon];
  const c = Math.asin(rho);
  const lat = Math.asin(Math.cos(c) * Math.sin(p0) + (y * Math.sin(c) * Math.cos(p0)) / rho) / RAD;
  const lon =
    VIEW.lon +
    Math.atan2(x * Math.sin(c), rho * Math.cos(p0) * Math.cos(c) - y * Math.sin(p0) * Math.sin(c)) / RAD;
  return [lat, lon];
}

/**
 * How the globe sits in a box, in the box's own units: the radius and the
 * centre. Sized so the two cities span `spread` of the width, then lifted so
 * the globe's crown sits `crown` of the height below the top. The disc is
 * wider than a short box, and its sides and lower half fall off the edges —
 * the curve of the crown is what reads as a globe.
 */
export function globeFit(w: number, h: number, spread = 0.78, crown = 0.08) {
  const ub = project(PLACES.ub.lat, PLACES.ub.lon);
  const erie = project(PLACES.erie.lat, PLACES.erie.lon);
  /* The width sets the size, unless the box is too short for the cities to
     stay clear of the bottom (they sit ~0.33 r below the crown). */
  const byWidth = (spread * w) / (erie.x - ub.x);
  const byHeight = (h * 0.68) / (1 - Math.min(ub.y, erie.y));
  const r = Math.min(byWidth, byHeight);
  /* Centre the pair, not the disc: the cities are a touch off-centre. */
  const cx = w / 2 - ((ub.x + erie.x) / 2) * r;
  const cy = crown * h + r;
  return { r, cx, cy };
}

/** Disc coordinates (y up) to box coordinates (y down). */
export function toBox(fit: { r: number; cx: number; cy: number }, x: number, y: number) {
  return { x: fit.cx + x * fit.r, y: fit.cy - y * fit.r };
}
