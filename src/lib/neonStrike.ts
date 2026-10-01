/**
 * A neon tube striking: dark, a hard flash, a stutter, then steady. Opacity
 * only, one short burst, no loop — it reads as the sign coming on, not as a
 * fault, because it happens once and settles.
 *
 * Shared by the Path's date stamps and the chapter headers' script labels.
 */
export const STRIKE = { opacity: [0, 1, 0.15, 0.85, 0.35, 1], times: [0, 0.12, 0.26, 0.44, 0.6, 1] };

/** Framer props for one strike: dark until `play`, at once when `instant`. */
export function strike(play: boolean, instant: boolean, delay: number, duration: number) {
  if (instant) return { animate: { opacity: 1 }, transition: { duration: 0 } };
  if (!play) return { animate: { opacity: 0 }, transition: { duration: 0 } };
  return {
    animate: { opacity: STRIKE.opacity },
    transition: { duration, times: STRIKE.times, delay, ease: "linear" as const },
  };
}
