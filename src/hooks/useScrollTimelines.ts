"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether this browser runs CSS scroll-driven animations (`animation-timeline`).
 *
 * Safari 26 (every iPhone on iOS 26) and Chromium do. Where they do, a
 * scroll-linked transform or opacity runs on the compositor, in step with the
 * finger, and the main thread never touches it. framer's `useScroll` reads
 * the scroll in JS and writes styles a frame later, so on iOS, where
 * scrolling itself is off the main thread, it trails the page and stutters
 * whenever the main thread is busy (the ground's video, the rain, React).
 *
 * Components use the CSS path when this is true and keep framer as the
 * fallback. The server snapshot is false, so hydration renders the fallback
 * and the client switches on its first commit.
 */
const query = () => typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()");
const noop = () => () => {};

export function useScrollTimelines(): boolean {
  return useSyncExternalStore(noop, query, () => false);
}
