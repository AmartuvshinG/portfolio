"use client";

import { useEffect } from "react";
import { useSmoothScroll } from "@/components/layout/SmoothScroll";

/**
 * Freezes page scrolling while `active` is true, releasing on cleanup.
 *
 * Delegates to the reference-counted lock in SmoothScroll rather than poking
 * `body.overflow` directly, so nested overlays (boot poster, project dossier,
 * mobile menu) can hold locks simultaneously without one closing unfreezing
 * the page underneath another.
 */
export function useLockScroll(active: boolean) {
  const { stop, start } = useSmoothScroll();

  useEffect(() => {
    if (!active) return;
    stop();
    return start;
  }, [active, stop, start]);
}
