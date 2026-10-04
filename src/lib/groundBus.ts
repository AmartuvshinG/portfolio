/**
 * What the page tells its ground.
 *
 * The ground (VideoGround: the sakura cliff, then the tunnel, with the
 * NeonGround rain in the tunnel half) is fixed behind every section, so it
 * cannot see the page. These are the few
 * things the page says to it, as plain module state the ground reads from its
 * own frame loop — never a custom property on `<html>`, which would invalidate
 * style for the whole document every scroll frame (perf budget, item 4).
 *
 *   - **velocity** — from Lenis's own scroll event. The rain falls faster and
 *     pulls into streaks while you scroll down, slows while you scroll up. It
 *     never reverses: rain falling upward reads as a fault, not as motion.
 *   - **surge** — a chapter seam crossing the middle of the screen. The floor
 *     haze swells and settles, so a crossing is felt in the room, not only
 *     seen on a hairline.
 *   - **focus** — a chapter's title card arriving. The rain over the heading
 *     comes down hard for a moment, like a burst of signal behind the
 *     masthead. Once per chapter.
 *   - **strike** — the hero name's tube has caught. Its light spills over the
 *     footage: a stutter in step with the tube, then a low warm cast.
 *   - **cover** — something opaque fills the screen (the Path's pinned globe,
 *     an open case file, the intro). The ground stops drawing until it is
 *     uncovered: nothing behind an opaque surface needs a frame.
 */

let velocity = 0;
let velocityAt = 0;

/** Lenis's velocity (px per frame, + down). Written from SmoothScroll. */
export function noteVelocity(v: number) {
  velocity = v;
  velocityAt = performance.now();
}

/** The scroll velocity now, decaying to 0 once the scroll events stop. */
export function readVelocity(now: number) {
  const age = now - velocityAt;
  if (age > 400) return 0;
  return velocity * (age < 120 ? 1 : 1 - (age - 120) / 280);
}

type Listener = () => void;
const surgeListeners = new Set<Listener>();
let lastSurge = 0;

/** A seam has crossed mid-screen. Throttled: two seams at once is one swell. */
export function groundSurge() {
  const now = performance.now();
  if (now - lastSurge < 900) return;
  lastSurge = now;
  for (const l of surgeListeners) l();
}

export function onSurge(l: Listener) {
  surgeListeners.add(l);
  return () => {
    surgeListeners.delete(l);
  };
}

export interface Focus {
  /** Viewport x range, CSS px. */
  left: number;
  right: number;
  at: number;
}

/** How long a downpour lasts, ms. */
export const FOCUS_MS = 700;
const focuses: Focus[] = [];
const focusListeners = new Set<Listener>();

/** A heading has arrived at this x range: bring the rain down over it. */
export function groundFocus(rect: { left: number; right: number }) {
  focuses.push({ left: rect.left, right: rect.right, at: performance.now() });
  if (focuses.length > 4) focuses.shift();
  for (const l of focusListeners) l();
}

/** The downpours still running at `now`. */
export function readFocuses(now: number): Focus[] {
  while (focuses.length && now - focuses[0].at > FOCUS_MS) focuses.shift();
  return focuses;
}

export function onFocus(l: Listener) {
  focusListeners.add(l);
  return () => {
    focusListeners.delete(l);
  };
}

const covers = new Set<string>();
const coverListeners = new Set<Listener>();

/** Mark the screen as covered (or not) by an opaque surface, by name. */
export function setGroundCovered(key: string, covered: boolean) {
  const had = covers.has(key);
  if (covered === had) return;
  if (covered) covers.add(key);
  else covers.delete(key);
  for (const l of coverListeners) l();
}

export function groundCovered() {
  return covers.size > 0;
}

export function onCover(l: Listener) {
  coverListeners.add(l);
  return () => {
    coverListeners.delete(l);
  };
}

/* --- The dive: how far the ground has gone from the sakura cliff into the
   tunnel, 0–1. Written by VideoGround from scroll (a pure function of where
   the page is); read by the rain, which only lives in the tunnel half. */
let dive = 0;
const diveListeners = new Set<Listener>();

export function setDive(p: number) {
  if (Math.abs(p - dive) < 0.001) return;
  dive = p;
  for (const l of diveListeners) l();
}

export function readDive() {
  return dive;
}

export function onDive(l: Listener) {
  diveListeners.add(l);
  return () => {
    diveListeners.delete(l);
  };
}

/* --- The strike: the hero's neon name has just caught. The ground answers
   with the sign's light spilling over the cliff and the moon, stuttering in
   step with the tube, then holding as a low warm cast. Once per page load. */
let struck = false;
const strikeListeners = new Set<Listener>();

export function groundStrike() {
  if (struck) return;
  struck = true;
  for (const l of strikeListeners) l();
}

export function onStrike(l: Listener) {
  strikeListeners.add(l);
  return () => {
    strikeListeners.delete(l);
  };
}

/* --- Low power. -------------------------------------------------------------
   iOS in Low Power Mode refuses to autoplay video (`play()` rejects with
   NotAllowedError even muted and inline) and halves requestAnimationFrame to
   30fps. There is no API that says so; the refused play is the tell. Once it
   is seen, the ground holds its posters, the rain stops drawing, and
   useQuality drops to `lite`: a phone saving its battery should not be asked
   for weather. One-way for the session: the mode rarely flips mid-visit, and
   a flapping ground would be worse than a still one. */
let lowPower = false;
const lowPowerListeners = new Set<Listener>();

export function markLowPower() {
  if (lowPower) return;
  lowPower = true;
  for (const l of lowPowerListeners) l();
}

export function isLowPower() {
  return lowPower;
}

export function onLowPower(l: Listener) {
  lowPowerListeners.add(l);
  return () => {
    lowPowerListeners.delete(l);
  };
}
