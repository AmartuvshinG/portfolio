/**
 * The backdrop bus.
 *
 * A handful of things that are not the backdrop need to push it around — a
 * section seam wants the field to ripple as you cross it, and the pinned work
 * world wants it out of the way while it owns the frame. Routing those through
 * React state would re-render the tree at scroll frequency to change a number
 * the renderer reads directly, so they are plain mutable values instead.
 *
 * Read every frame by `NeuralNoise`; written by `ChapterSeam` and
 * `SelectedWork`. Nothing subscribes — if you need to *render* off backdrop
 * state, you want the act store in `ActTheme` instead.
 */

export const backdrop = {
  /** Decaying 0–1 pulse. Rippled outward by the shader, damped in its loop. */
  burst: 0,
  /**
   * Multiplier on the field's strength, 0–1. Dropped while another surface owns
   * the viewport (the pinned work world, the zoom-parallax run) so two
   * full-screen visuals never compete.
   */
  intensity: 1,
  /**
   * How hard the page is currently being scrolled, 0–1, signed away.
   *
   * Written by `SmoothScroll` off Lenis's own velocity; read by `NeuralNoise`
   * (field gain) and `Anamorphic` (edge fringing). It is what makes a hard
   * flick *feel* like one — the frame smears with you and settles when you
   * stop, which is the difference between a page that animates and a page that
   * has weight.
   *
   * Deliberately read in only two places, and deliberately not exposed as a CSS
   * custom property on `<html>`: writing a variable to the root element every
   * scroll frame invalidates style for the entire document, which is one of the
   * four things that made this site laggy the first time.
   */
  velocity: 0,
};

/** Clamp of the raw Lenis velocity, px/frame, mapped to `velocity` 0–1. */
const VELOCITY_FULL = 55;

/** Write the current scroll speed. Called from the Lenis scroll handler. */
export function setScrollVelocity(raw: number) {
  backdrop.velocity = Math.min(1, Math.abs(raw) / VELOCITY_FULL);
}

/** Kick the field. Called at section boundaries. */
export function pulseBackdrop(strength = 1) {
  backdrop.burst = Math.min(1, backdrop.burst + strength);
}

/** Fade the field down while something else owns the frame. `1` restores it. */
export function setBackdropIntensity(value: number) {
  backdrop.intensity = Math.min(1, Math.max(0, value));
}
