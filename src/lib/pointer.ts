/**
 * The cursor, as one eased value the whole site shares.
 *
 * Everything that drifts against the pointer — the hero name, the preloader's
 * sign, the film's camera — reads this, so there is one `mousemove` listener
 * and one easing curve, and every layer moves at the same weight. Layers then
 * differ only in *how far* they travel, and that difference is the parallax.
 *
 * The ease is frame-rate-independent, `1 - pow(k, dt)` rather than a flat
 * per-frame lerp, so a 60Hz panel and a 240Hz one track at the same speed. (A
 * bare `pos += (target - pos) * 0.1` is four times as fast at 240Hz, which is
 * how "subtle drift" becomes "snaps to the cursor" on a gaming monitor.)
 *
 * Fine pointers with motion allowed only: a touch screen has no hover
 * position, and a tap would jump every layer. Callers must check `pointerEnabled()`.
 *
 * No rAF of its own. Each consumer runs its own frame loop, calls
 * `stepPointer(now)` from it (idempotent per timestamp) and reads `look`. `settled`
 * tells a loop that only paints when dirty that it can stop.
 */

/** Normalised −1…1, +x right, +y down. */
export interface Look {
  x: number;
  y: number;
}

const target: Look = { x: 0, y: 0 };
const look: Look = { x: 0, y: 0 };
let last = -1;
let listening = 0;
const wakers = new Set<() => void>();
const onMove = (e: MouseEvent) => {
  target.x = (e.clientX / window.innerWidth) * 2 - 1;
  target.y = (e.clientY / window.innerHeight) * 2 - 1;
  for (const w of wakers) w();
};

/** Whether this device should drift at all. */
export function pointerEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Start listening; returns the matching release. Ref-counted. `wake` is
 * called on every move, so a loop that stopped when settled can restart.
 */
export function retainPointer(wake?: () => void): () => void {
  if (listening++ === 0) window.addEventListener("mousemove", onMove, { passive: true });
  if (wake) wakers.add(wake);
  return () => {
    if (wake) wakers.delete(wake);
    if (--listening === 0) window.removeEventListener("mousemove", onMove);
  };
}

/** Advance the ease to `now` (ms). Safe to call from several loops a frame. */
export function stepPointer(now: number): Look {
  if (now === last) return look;
  /* After a pause (every loop stopped while settled) the gap is not a frame;
     treat it as one, or the first move after a rest jumps half the way. */
  const gap = now - last;
  const dt = last < 0 || gap > 100 ? 1 / 60 : gap / 1000;
  last = now;
  const k = 1 - Math.pow(0.0015, dt);
  look.x += (target.x - look.x) * k;
  look.y += (target.y - look.y) * k;
  return look;
}

/** True once the eased value has caught the cursor (to ~0.1% of travel). */
export function pointerSettled(): boolean {
  return Math.abs(target.x - look.x) < 0.001 && Math.abs(target.y - look.y) < 0.001;
}
