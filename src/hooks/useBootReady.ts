"use client";

import { useSyncExternalStore } from "react";

/**
 * Has the first-load curtain started lifting?
 *
 * The hero's arrival is a six-beat sequence running from 0.35s to 2.9s. The
 * preloader holds an opaque `z-[120]` curtain for 1.7s and then takes another
 * 0.9s to slide it off. Started on mount, the entire entrance therefore played
 * *underneath* the curtain and the visitor's first sight of the page was its
 * resting state — the bloom, the collapse, the name rising and the words
 * arriving all happened behind a wall.
 *
 * This was invisible to the build, to the typechecker and to any screenshot
 * taken after the page settled. It only shows up if you capture at 600ms.
 *
 * So the hero waits for this. It flips the moment the curtain *begins* to
 * lift, not when it finishes, which is deliberate: the curtain takes 0.9s to
 * clear and the arc's bloom peaks inside that window, so the reveal happens
 * over an entrance already in progress. That is the hand-off the preloader's
 * own comment describes — one continuous arrival rather than two animations
 * played back to back.
 *
 * A module flag plus `useSyncExternalStore` rather than context: this is read
 * by one subtree, written once, and never again for the life of the page.
 * `getServerSnapshot` returns false, so SSR and first hydration agree.
 */

let booted = false;
const listeners = new Set<() => void>();

/** Called by the Preloader as the curtain starts to lift. Idempotent. */
export function markBooted() {
  if (booted) return;
  booted = true;
  for (const l of listeners) l();
  listeners.clear();
}

function subscribe(onChange: () => void) {
  if (booted) return () => {};
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function useBootReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => booted,
    () => false
  );
}
