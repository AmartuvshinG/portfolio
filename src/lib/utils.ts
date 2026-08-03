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
 * scatter geometry (particles, skylines, glyph noise) so the server and client
 * render byte-identical markup — `Math.random()` would hydration-mismatch.
 */
export function srand(n: number) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
