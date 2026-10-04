"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import { MotionConfig } from "framer-motion";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { noteScroll } from "@/lib/scrollPause";
import { noteVelocity } from "@/lib/groundBus";

interface LenisContextValue {
  /** `immediate` jumps without the 1.2s glide — for restoring a position, not
      for navigating to one. */
  scrollTo: (
    target: string | number | HTMLElement,
    offset?: number,
    immediate?: boolean
  ) => void;
  /** Freeze scrolling (Lenis + native fallback). Reference-counted. */
  stop: () => void;
  /** Release one freeze. Scrolling resumes when the count reaches zero. */
  start: () => void;
}

const LenisContext = createContext<LenisContextValue>({
  scrollTo: () => {},
  stop: () => {},
  start: () => {},
});

export const useSmoothScroll = () => useContext(LenisContext);

/**
 * Wraps the app in Lenis smooth scrolling and drives it from the GSAP ticker
 * so Lenis and ScrollTrigger share a single RAF loop (no scroll-jank / double
 * loops). Disabled entirely when the user prefers reduced motion — native
 * scrolling takes over and anchor links fall back to instant jumps.
 *
 * `stop`/`start` are reference-counted: overlays like the poster reveal and the
 * project dossier can both hold a lock without one closing releasing the other.
 * Setting `body.overflow` alone is not enough here — Lenis drives scroll from
 * its own RAF loop and ignores it — so both paths are covered.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const locks = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      lenisRef.current?.destroy();
      lenisRef.current = null;
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    lenisRef.current = lenis;

    // A lock taken before Lenis existed (e.g. the boot poster on first paint)
    // must still apply to the instance we just created.
    if (locks.current > 0) lenis.stop();

    /* `noteScroll` pauses the ground's idle loops for the length of the
       scroll — see lib/scrollPause.ts. It writes an attribute on start and on
       stop only. `noteVelocity` lets the rain feel the scroll (lib/groundBus):
       module state, read from the ground's own frame loop. */
    lenis.on("scroll", (l: Lenis) => {
      noteScroll();
      noteVelocity(l.velocity);
      ScrollTrigger.update();
    });

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced]);

  /* A glide asked for while the page is locked. A stopped Lenis drops a
     non-forced scrollTo, and an overlay's links (the phone menu, the palette)
     navigate first and close second, so the jump was lost and the page stayed
     put. It is replayed when the last lock is released instead. */
  const pending = useRef<{ target: string | number | HTMLElement; offset: number } | null>(null);

  const scrollTo = useCallback<LenisContextValue["scrollTo"]>(
    (target, offset = 0, immediate = false) => {
      if (locks.current > 0 && !immediate) {
        pending.current = { target, offset };
        return;
      }
      if (lenisRef.current) {
        lenisRef.current.scrollTo(
          target,
          immediate ? { offset, immediate: true, force: true } : { offset, duration: 1.2 }
        );
        return;
      }
      // Reduced-motion / no-Lenis fallback
      if (typeof target === "string") {
        const el = document.querySelector(target);
        el?.scrollIntoView({ behavior: "auto", block: "start" });
      } else if (typeof target === "number") {
        window.scrollTo({ top: target + offset });
      } else {
        target.scrollIntoView({ behavior: "auto", block: "start" });
      }
    },
    []
  );

  const stop = useCallback(() => {
    locks.current += 1;
    if (locks.current !== 1) return;
    lenisRef.current?.stop();
    document.body.style.overflow = "hidden";
  }, []);

  const start = useCallback(() => {
    locks.current = Math.max(0, locks.current - 1);
    if (locks.current !== 0) return;
    lenisRef.current?.start();
    document.body.style.overflow = "";
    const next = pending.current;
    pending.current = null;
    if (next) scrollTo(next.target, next.offset);
  }, [scrollTo]);

  const value = useMemo(
    () => ({ scrollTo, stop, start }),
    [scrollTo, stop, start]
  );

  return (
    <LenisContext.Provider value={value}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LenisContext.Provider>
  );
}
