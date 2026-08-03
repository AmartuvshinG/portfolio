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
  registered = true;
}

registerGsap();

export { gsap, ScrollTrigger, Flip };
