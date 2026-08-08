import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Clamp a number to a range. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Zero-pad a number to a fixed width, e.g. pad(7) → "07". */
export function pad(value: number, width = 2) {
  return String(value).padStart(width, "0");
}

/**
 * Deterministic pseudo-random in [0, 1) from an integer seed. Used anywhere we
 * scatter geometry — particles, skylines, scan lines, glyph noise — so that the
 * server and the client render byte-identical markup. `Math.random()` here
 * would hydration-mismatch on sight.
 *
 * Integer hash, NOT the usual `fract(sin(n * 12.9898) * 43758.5453)`.
 *
 * `Math.sin` is only required by ECMAScript to be *approximately* correct — its
 * precision is explicitly implementation-defined — and Node and V8-in-Chrome do
 * not agree in the last few bits. The sine version therefore produced values
 * that matched to about ten decimal places and then diverged, which is
 * invisible in a `toFixed(1)` coordinate and a guaranteed hydration error the
 * moment any caller emits the raw number. That is exactly what happened when
 * the portrait plate and the channel plates started writing full-precision
 * opacities into their markup.
 *
 * Everything below is integer arithmetic through `Math.imul` and unsigned
 * shifts, so it is bit-exact on every engine. (This is the mulberry32 mixer.)
 */
export function srand(n: number) {
  let h = (n | 0) + 0x6d2b79f5;
  h = Math.imul(h ^ (h >>> 15), h | 1);
  h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
  return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
}
