"use client";

import { useEffect, type RefObject } from "react";

/**
 * Fires `handler` when a pointer press lands outside `ref`. Listens on
 * `mousedown`/`touchstart` (not `click`) so the dismissal happens on press —
 * this avoids the case where the element under the pointer unmounts before
 * `click` fires and the event never reaches us.
 *
 * Pass `enabled: false` to detach the listeners entirely while a surface is
 * closed, rather than paying for global listeners the whole session.
 */
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const onPress = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      handler(event);
    };

    document.addEventListener("mousedown", onPress);
    document.addEventListener("touchstart", onPress, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPress);
      document.removeEventListener("touchstart", onPress);
    };
  }, [ref, handler, enabled]);
}
