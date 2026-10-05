"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * The action under the pointer, as a small sodium tag beside the cursor —
 * "VIEW" on a work monitor, "REWRITE" on the ink sign: whatever the nearest
 * `data-cursor-label` says. Nothing shows anywhere else.
 *
 * This is all that is left of the HudCursor reticle (four sodium corners
 * round a dot, 2026-09-30 → 2026-10-05). The cursor itself is now a native
 * CSS cursor set (globals.css, "Cursors"), so the label no longer rides a
 * drawn reticle: it sits at a fixed offset from the real pointer, written
 * straight to the node on mousemove, with no easing — an eased label would
 * trail the cursor it labels.
 *
 * Fine pointers only. Read through `useSyncExternalStore`, so a window that
 * gains or loses a mouse mounts or drops it without a wrong first render.
 */
const QUERY = "(pointer: fine)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Offset from the hotspot, px: clear of the arrow's body and the hand. */
const DX = 22;
const DY = 18;

export function CursorLabel() {
  const ref = useRef<HTMLSpanElement>(null);
  const fine = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );

  useEffect(() => {
    const label = ref.current;
    if (!fine || !label) return;
    let text = "";

    const onMove = (e: MouseEvent) => {
      const next =
        (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor-label]")?.dataset.cursorLabel ?? "";
      if (next !== text) {
        text = next;
        if (next) label.textContent = next;
        label.style.opacity = next ? "1" : "0";
      }
      // Off a labelled surface the tag is invisible; don't move it either.
      if (text) label.style.transform = `translate3d(${e.clientX + DX}px, ${e.clientY + DY}px, 0)`;
    };
    const onLeave = () => {
      text = "";
      label.style.opacity = "0";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [fine]);

  if (!fine) return null;

  /* Top layer of the site (--z-cursor), above the preloader and the route
     wipe. */
  return (
    <span
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[130] whitespace-nowrap bg-[rgba(6,19,23,0.78)] px-1.5 py-0.5 pl-[calc(0.375rem+0.24em)] font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-hazard)] transition-opacity duration-150"
      style={{ opacity: 0, willChange: "transform", textShadow: "0 0 8px rgba(255,106,61,0.55)" }}
    />
  );
}
