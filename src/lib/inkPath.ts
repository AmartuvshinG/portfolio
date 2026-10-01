import { INK_PATH } from "@/lib/inkName";

/**
 * Where the brush is at a moment of the writing, read off the bake's route
 * (INK_PATH, five numbers a point: t, x, y, down, r).
 *
 * Between two points on the paper the brush slides; from a lift (down 0) to
 * the next landing it travels through the air, rising off the paper and
 * coming down at the end. `lift` is that height, 0 on the paper and 1 at the
 * top of the arc, so a shadow can slide away and soften with it.
 *
 * Before the writing starts the brush hovers over the first point; after it,
 * over the last. Both off the paper.
 */
export interface Brush {
  /** 0…1 of the bake's texture. */
  x: number;
  y: number;
  /** 0 on the paper … 1 at the top of a lift. */
  lift: number;
  /** Half-width of the stroke here, texture px. */
  r: number;
}

const P = INK_PATH;
const COUNT = P.length / 5;

export function brushAt(t: number): Brush {
  if (COUNT === 0) return { x: 0.5, y: 0, lift: 1, r: 8 };
  if (t <= P[0]) return { x: P[1], y: P[2], lift: 1, r: P[4] };
  const last = (COUNT - 1) * 5;
  if (t >= P[last]) return { x: P[last + 1], y: P[last + 2], lift: 1, r: P[last + 4] };

  // The last point at or before t.
  let lo = 0;
  let hi = COUNT - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (P[mid * 5] <= t) lo = mid;
    else hi = mid;
  }
  const a = lo * 5;
  const b = hi * 5;
  const span = P[b] - P[a];
  const f = span > 0 ? (t - P[a]) / span : 1;
  const x = P[a + 1] + (P[b + 1] - P[a + 1]) * f;
  const y = P[a + 2] + (P[b + 2] - P[a + 2]) * f;
  const r = P[a + 4] + (P[b + 4] - P[a + 4]) * f;
  // A lift: up, across, down — an arc over the travel.
  const lift = P[a + 3] === 0 ? Math.sin(Math.PI * f) : 0;
  return { x, y, lift, r };
}
