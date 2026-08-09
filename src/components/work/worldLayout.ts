/**
 * The work world's depth layout — the three numbers, and the one derivation
 * that turns a card index back into a scroll position.
 *
 * These lived in `WorkWorld.tsx`, which is `dynamic(…, { ssr: false })`
 * precisely so that three.js never reaches the server bundle. `SelectedWork`
 * needs the geometry to drive the camera from its case-file roster and cannot
 * import it from there without dragging the whole renderer along. Plain
 * constants, no imports — safe from anywhere.
 */

/** Z-gap between consecutive cards. */
export const SPACING = 9;

/** How far past the last card the dolly runs out. */
export const RUNOUT = 4;

/**
 * Where the camera starts, in front of the first card. Sized so a 6.4-wide card
 * fills roughly a third of the frame: closer than this and the opening shot is
 * inside the first card rather than looking at it.
 */
export const START_Z = 14;

/** Total dolly distance for `count` cards. Mirrors `Rig`. */
export function travelFor(count: number) {
  return (count - 1) * SPACING + RUNOUT;
}

/**
 * Scroll progress (0–1) at which card `i` sits where card 0 sits at progress 0
 * — i.e. `START_Z` in front of the camera, framed exactly as the opening shot.
 *
 * Read straight off `Rig`: it sets `camera.z = START_Z - progress * travel`, and
 * card `i` is at `z = -i * SPACING`, so the camera is the right distance in
 * front of it when `progress * travel === i * SPACING`.
 *
 * Never reaches 1 — `RUNOUT` is the tail past the last card, and stopping the
 * dolly short of it is the point.
 */
export function cardProgress(i: number, count: number) {
  const travel = travelFor(count);
  return travel > 0 ? Math.min(1, (i * SPACING) / travel) : 0;
}
