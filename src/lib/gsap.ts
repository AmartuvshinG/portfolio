"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";

/**
 * Central GSAP setup. Registers plugins exactly once (guards against the
 * double-invocation of React Strict Mode / Fast Refresh).
 */
let registered = false;

export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, Flip);
  /* iOS resizes the window every time its toolbars collapse or return, which
     is most flings. A refresh there re-measures every trigger mid-scroll; the
     pinned frames are `svh` and do not change size, so there is nothing to
     re-measure. Width changes and orientation still refresh. */
  ScrollTrigger.config({ ignoreMobileResize: true });
  registered = true;
}

registerGsap();

export { gsap, ScrollTrigger, Flip };
