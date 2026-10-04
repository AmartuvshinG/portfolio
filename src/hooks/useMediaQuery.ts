"use client";

import { useEffect, useState } from "react";

/**
 * Tracks a media query reactively. `false` during SSR and the first paint, so
 * anything gated on it mounts only once the screen is known: use it to add
 * work on larger screens, never to take layout away (that belongs in CSS).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}
