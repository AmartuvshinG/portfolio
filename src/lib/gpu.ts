"use client";

import { useSyncExternalStore } from "react";

/**
 * WebGL capability probe.
 *
 * `SceneBoundary` only catches errors thrown during React's render. When a
 * browser has WebGL disabled outright, three logs "Error creating WebGL
 * context" and returns a renderer that simply never draws — nothing throws, the
 * boundary never fires, and the visitor gets a full-viewport black section
 * where the work should be. Asking first is the only reliable signal.
 */

let cached: boolean | null = null;

function probe(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ??
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    // Release the context explicitly rather than waiting for GC: browsers cap
    // simultaneous contexts and the real scene needs one moments later.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    cached = Boolean(gl);
  } catch {
    cached = false;
  }
  return cached;
}

/** Never fires — support cannot change within a session. */
const subscribe = () => () => {};

/**
 * `false` on the server and during hydration, then the real answer.
 *
 * Deliberately `useSyncExternalStore` rather than a `useState` + `useEffect`
 * probe: this is external, non-reactive environment state, and the store form
 * gives an explicit server snapshot instead of committing a render with a
 * guessed value and immediately correcting it.
 */
export function useHasWebGL(): boolean {
  return useSyncExternalStore(subscribe, probe, () => false);
}
