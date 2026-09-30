/**
 * The site's sound: synthesized, opt-in, off by default.
 *
 * Nothing here is a file — every sound is built from oscillators and a noise
 * buffer, so there is nothing to download and nothing to license.
 *
 *   tick(i)     a short filtered blip; pitch steps with `i`. Craft's index,
 *               nav hover.
 *   sweep()     a band-passed noise rise. A chapter card crossing the join.
 *   drone       two detuned saws under a low-pass. The cutoff opens with the
 *               film's speed and the pitch lifts an octave through the iris,
 *               so the hum follows the picture. Skipped under reduced motion.
 *
 * Browsers only let audio start from a user gesture, so the AudioContext is
 * created on the toggle click — or, if the visitor turned sound on last time,
 * on their first click or key press this visit.
 *
 * Everything is a no-op until enabled, so callers never need to check.
 */

const KEY = "sound";
const TICK_GAP_MS = 60;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let drone: { filter: BiquadFilterNode; oscs: OscillatorNode[]; gain: GainNode } | null = null;
let noise: AudioBuffer | null = null;
let enabled = false;
let lastTick = 0;
let armed = false;
const listeners = new Set<(on: boolean) => void>();

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else if (enabled) void ctx.resume();
  });
  return ctx;
}

function startDrone() {
  if (!ctx || !master || drone || reducedMotion()) return;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setTargetAtTime(0.05, ctx.currentTime, 1.2);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 180;
  filter.Q.value = 6;
  filter.connect(gain);
  gain.connect(master);
  const oscs = [55, 55.35, 110.2].map((f, i) => {
    const o = ctx!.createOscillator();
    o.type = i === 2 ? "triangle" : "sawtooth";
    o.frequency.value = f;
    o.connect(filter);
    o.start();
    return o;
  });
  drone = { filter, oscs, gain };
}

function stopDrone() {
  if (!ctx || !drone) return;
  const d = drone;
  drone = null;
  d.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  setTimeout(() => d.oscs.forEach((o) => o.stop()), 900);
}

function activate() {
  const c = ensureContext();
  if (!c) return;
  void c.resume();
  startDrone();
}

/** Current setting. */
export function soundOn() {
  return enabled;
}

export function subscribeSound(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Call from a click handler: that gesture is what unlocks audio. */
export function setSound(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
  if (on) activate();
  else {
    stopDrone();
    if (ctx) void ctx.suspend();
  }
  listeners.forEach((fn) => fn(on));
}

/** Restore last visit's choice. Audio itself waits for the first gesture. */
export function restoreSound() {
  let stored = false;
  try {
    stored = localStorage.getItem(KEY) === "1";
  } catch {}
  if (!stored || armed) return stored;
  armed = true;
  enabled = true;
  const unlock = () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    if (enabled) activate();
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  listeners.forEach((fn) => fn(true));
  return true;
}

/** A short blip. `i` steps the pitch along a pentatonic ladder. */
export function tick(i = 0) {
  if (!enabled || !ctx || !master || ctx.state !== "running") return;
  const now = performance.now();
  if (now - lastTick < TICK_GAP_MS) return;
  lastTick = now;
  const ladder = [0, 3, 5, 7, 10, 12, 15];
  const freq = 660 * Math.pow(2, ladder[((i % 7) + 7) % 7] / 12);
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.05);
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq * 1.5;
  f.Q.value = 4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.connect(f).connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.08);
}

/** A band-passed noise rise, ~0.35 s. */
export function sweep() {
  if (!enabled || !ctx || !master || ctx.state !== "running") return;
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noise.getChannelData(0);
    // A fixed LCG, not Math.random: the texture is the same every time.
    let s = 1;
    for (let i = 0; i < data.length; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      data[i] = s / 2147483648 - 1;
    }
  }
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 3;
  f.frequency.setValueAtTime(400, t);
  f.frequency.exponentialRampToValueAtTime(3200, t + 0.32);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.06, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + 0.4);
}

/** Feed the drone the film's state: `speed` 0…1, `iris` 0…1. Cheap to call
 *  every frame; it only schedules parameter targets. */
export function droneFollow(speed: number, iris: number) {
  if (!drone || !ctx) return;
  const t = ctx.currentTime;
  drone.filter.frequency.setTargetAtTime(180 + Math.min(1, speed) * 1600, t, 0.08);
  const lift = 1 + Math.min(1, Math.max(0, iris));
  drone.oscs[0].frequency.setTargetAtTime(55 * lift, t, 0.3);
  drone.oscs[1].frequency.setTargetAtTime(55.35 * lift, t, 0.3);
}
