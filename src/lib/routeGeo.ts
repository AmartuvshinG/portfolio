/**
 * The Path's geography: where the cities are, the great circle between them,
 * and the camera the globe is seen through.
 *
 * Ulaanbaatar to Erie runs over the top of the world — the great circle
 * passes within four degrees of the pole — so the Path flies it on a globe
 * rather than a flat map, where that line would be squashed along the top
 * edge.
 *
 * **The camera** sits above a point on the surface, `h` Earth radii up,
 * looking at the centre of the Earth, north up. Its screen is a pinhole with
 * the subject placed at `fx, fy` of the frame (so the globe can sit left of
 * the board on the Path's stage). The shader (lib/globeShader) casts a ray per
 * diode through exactly this camera, and the DOM city labels are placed with
 * `projectTo` from the same numbers, so they cannot drift apart.
 *
 * Why north-up and never over the pole: a north-up camera above the pole has
 * no "up", and the frame would spin. The flight (lib/routeFlight) pans east
 * along the latitudes instead, high enough to see the whole arc cross over.
 */

export type StopKey = "ub" | "erie";
export type PlaceKey = StopKey;

/** Degrees. Public geography, not personal data. */
export const PLACES: Record<PlaceKey, { lat: number; lon: number }> = {
  ub: { lat: 47.92, lon: 106.92 },
  erie: { lat: 42.13, lon: -80.09 },
};

const RAD = Math.PI / 180;
const EARTH_KM = 6371;

export type Vec3 = [number, number, number];

export function toVec(lat: number, lon: number): Vec3 {
  const p = lat * RAD;
  const l = lon * RAD;
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
}

function toLatLon([x, y, z]: Vec3): [number, number] {
  return [Math.asin(Math.max(-1, Math.min(1, z))) / RAD, Math.atan2(y, x) / RAD];
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const normalize = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Central angle between two places, radians. */
export function arcAngle(a: PlaceKey, b: PlaceKey) {
  const va = toVec(PLACES[a].lat, PLACES[a].lon);
  const vb = toVec(PLACES[b].lat, PLACES[b].lon);
  return Math.acos(Math.max(-1, Math.min(1, dot(va, vb))));
}

/** Great-circle distance, km. */
export function distanceKm(a: PlaceKey, b: PlaceKey): number {
  return arcAngle(a, b) * EARTH_KM;
}

/** `n + 1` points along the great circle from a to b, as [lat, lon]. */
export function greatCircle(a: PlaceKey, b: PlaceKey, n: number): [number, number][] {
  const va = toVec(PLACES[a].lat, PLACES[a].lon);
  const vb = toVec(PLACES[b].lat, PLACES[b].lon);
  const d = arcAngle(a, b);
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

/** Where the camera is: above (lat, lon), `h` Earth radii up, the subject at (fx, fy) of the frame. */
export interface Shot {
  lat: number;
  lon: number;
  h: number;
  fx: number;
  fy: number;
}

/** Vertical field of view, radians. */
export const FOV_Y = 34 * RAD;

export interface CameraBasis {
  /** Position, in Earth radii from the centre. */
  c: Vec3;
  /** Forward, right and up, unit vectors. */
  f: Vec3;
  r: Vec3;
  u: Vec3;
}

/** The camera for a shot. North is up; right is east. */
export function cameraBasis(s: Pick<Shot, "lat" | "lon" | "h">): CameraBasis {
  const t = toVec(s.lat, s.lon);
  const c: Vec3 = [t[0] * (1 + s.h), t[1] * (1 + s.h), t[2] * (1 + s.h)];
  const f: Vec3 = [-t[0], -t[1], -t[2]];
  const z: Vec3 = [0, 0, 1];
  const k = dot(z, f);
  const u = normalize([z[0] - k * f[0], z[1] - k * f[1], z[2] - k * f[2]]);
  return { c, f, r: cross(f, u), u };
}

/**
 * A place on the screen of a `w × h` frame (any unit, y down), or null when
 * it is on the far side of the Earth.
 */
export function projectTo(shot: Shot, w: number, h: number, lat: number, lon: number) {
  const { c, f, r, u } = cameraBasis(shot);
  const p = toVec(lat, lon);
  /* Facing the camera: the surface normal points at it. */
  if (dot(p, [c[0] - p[0], c[1] - p[1], c[2] - p[2]]) <= 0) return null;
  const v: Vec3 = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  const z = dot(v, f);
  const focal = h / 2 / Math.tan(FOV_Y / 2);
  return { x: shot.fx * w + (dot(v, r) / z) * focal, y: shot.fy * h - (dot(v, u) / z) * focal };
}
