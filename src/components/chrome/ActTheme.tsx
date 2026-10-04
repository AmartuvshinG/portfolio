"use client";

import { useEffect, useSyncExternalStore } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * The act system.
 *
 * Sections declare `data-act` on themselves and paint their own background from
 * `--color-bg`, which resolves differently inside each act's token block (see
 * globals.css). That handles the page body on its own, with no JS.
 *
 * What JS is for is the *fixed* chrome — navbar, chapter frame, cursor — which
 * lives outside every section and therefore has no act to inherit from. This
 * component mirrors whichever act currently sits under the navbar onto the
 * chrome's own box (`[data-chrome]` in the layout), so that chrome shifts as
 * boundaries pass beneath it. Not onto `<html>`: the act blocks redefine
 * inherited tokens, and a flip there restyled the whole document.
 *
 * The three acts are *depths of one dark theme*, not modes. The site used to
 * invert between a light and a dark palette here; that is what made it read as
 * two websites bolted together, and it is gone. What changes now is how far
 * down you are — void, deck, bloom — never whether the lights are on.
 *
 * The flip line is the navbar, not mid-viewport: switching at 50% would recolour
 * the logo while it still sits over the outgoing act.
 */

/** Distance from the top of the viewport where one act hands over to the next. */
const FLIP_LINE = 72;

export type Act = "void" | "deck" | "bloom";

/* --- Tiny store, so components that need the act as a *value* (rather than as
       a CSS variable) can subscribe without prop-drilling through the tree. */
let current: Act = "void";
const listeners = new Set<() => void>();

function setAct(act: Act) {
  if (act === current) return;
  current = act;
  const chrome = document.querySelector<HTMLElement>("[data-chrome]");
  if (chrome) chrome.dataset.act = act;
  listeners.forEach((l) => l());
}

/** Reads the act currently under the navbar. `"void"` during SSR. */
export function useAct(): Act {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => "void" as Act
  );
}

export function ActTheme() {
  useEffect(() => {
    const sections = gsap.utils.toArray<HTMLElement>("[data-act]");
    if (!sections.length) return;

    const triggers = sections.map((el) =>
      ScrollTrigger.create({
        trigger: el,
        // Contiguous windows: each act owns the scroll range during which it
        // spans the flip line, so exactly one is ever active and there is no
        // gap between them for the chrome to fall through.
        start: `top ${FLIP_LINE}px`,
        end: `bottom ${FLIP_LINE}px`,
        onToggle: (self) => {
          if (self.isActive) {
            setAct((el.dataset.act as Act) ?? "void");
          }
        },
      })
    );

    // The page can load already scrolled (refresh, back-navigation, #hash), in
    // which case no toggle fires and the chrome would keep the seeded act.
    ScrollTrigger.refresh();

    /* Every boundary above is a cached pixel offset, and this component mounts
       while the preloader still holds the scroll lock — so that first refresh
       measures a body with `overflow: hidden` and caches offsets for a document
       that is about to get thousands of pixels taller. Left alone, the dark act
       claimed the page several sections early and never handed back.

       Observing the body's height re-measures on the release, and also covers
       late-loading media and font swaps reflowing the page under us.

       Two guards on that observer, both about cost. `ScrollTrigger.refresh()`
       re-measures *every* trigger on the page and is one of the most expensive
       calls GSAP has — on this page it was showing up as ~250ms frames. It was
       previously debounced by a single animation frame, which is no debounce at
       all when the thing changing size is a sticky section reflowing during a
       scroll: the observer refired every frame, and each refresh reflowed the
       document, which refired the observer.

       So: a real trailing debounce, and a height threshold so sub-pixel and
       scrollbar-sized changes are ignored entirely. */
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastHeight = document.body.scrollHeight;

    const observer = new ResizeObserver(() => {
      const height = document.body.scrollHeight;
      if (Math.abs(height - lastHeight) < 4) return;
      lastHeight = height;
      clearTimeout(timer);
      timer = setTimeout(() => ScrollTrigger.refresh(), 250);
    });
    observer.observe(document.body);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      triggers.forEach((t) => t.kill());
    };
  }, []);

  return null;
}
