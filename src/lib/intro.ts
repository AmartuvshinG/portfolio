"use client";

import { useSyncExternalStore } from "react";

/**
 * Replaying the intro.
 *
 * The brush intro is the piece people come back for, and a repeat view in
 * the same tab only ever sees it at 0.55×. The footer and the ⌘K palette can
 * ask for it again: this bumps a counter, and the Preloader, keyed by it,
 * mounts a fresh curtain at full length over wherever the page is.
 *
 * The hero's entrance is not replayed (markBooted is once per page); the
 * neon signs are, once the curtain lifts again (lib/inkWriteQueue).
 */

let replays = 0;
const listeners = new Set<() => void>();

export function replayIntro() {
  replays++;
  for (const l of listeners) l();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** How many times the intro has been asked for again (0 on first load). */
export function useIntroReplays(): number {
  return useSyncExternalStore(
    subscribe,
    () => replays,
    () => 0
  );
}
