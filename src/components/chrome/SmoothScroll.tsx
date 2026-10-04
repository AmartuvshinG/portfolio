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
  /** Go to a chapter. A near one glides; a far one on a phone is a cut —
      see `goTo` below. Section-internal steps use `scrollTo`. */
  goTo: (target: string | number | HTMLElement) => void;
  /** Freeze scrolling (Lenis + native fallback). Reference-counted. */
  stop: () => void;
  /** Release one freeze. Scrolling resumes when the count reaches zero. */
  start: () => void;
}

const LenisContext = createContext<LenisContextValue>({
  scrollTo: () => {},
  goTo: () => {},
  stop: () => {},
  start: () => {},
});

export const useSmoothScroll = () => useContext(LenisContext);

/** A soft start and a soft landing. The instance's expo-out covers half the
    distance in the first tenth of the time, which on a long trip is a burst
    of every chapter in between. */
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Past this many viewports, a phone cuts instead of gliding. */
const FAR_VH = 1.6;
/** How much of the trip is left to glide after the cut, in viewports. */
const LANDING_VH = 0.9;
/** Where the cut applies. A phone's frame is small and its GPU is too: a long
    glide there renders every pinned chapter in a burst. */
const CUT_QUERY = "(max-width: 1023px), (pointer: coarse)";

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

function resolveY(target: string | number | HTMLElement): number | null {
  if (typeof target === "number") return target;
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  return el ? el.getBoundingClientRect().top + window.scrollY : null;
}

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
  const pending = useRef<{ target: string | number | HTMLElement; offset: number; chapter?: boolean } | null>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  /* Bumped by every new chapter jump, so a tap mid-cut abandons the last one. */
  const jump = useRef(0);

  const fadeVeil = useCallback((to: number, ms: number) => {
    const v = veilRef.current;
    if (!v) return Promise.resolve();
    const from = getComputedStyle(v).opacity;
    v.getAnimations().forEach((a) => a.cancel());
    v.style.opacity = String(to);
    const anim = v.animate([{ opacity: from }, { opacity: to }], { duration: ms, easing: "ease-out" });
    return anim.finished.then(() => undefined, () => undefined);
  }, []);

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

  /* Chapter navigation. The page is long — Work, Craft, Anatomy and the
     Timeline are all pinned tracks — so a fixed-length glide from the hero to
     Contact crossed every one of them in under a second.

     - Near (within FAR_VH screens): a glide whose length follows the
       distance, on an in-out curve. No burst.
     - Far, on a phone: a cut. The veil dips to black, the page jumps silently
       to just short of the chapter, two frames let ScrollTrigger and the
       ground repaint there, and the veil lifts while the last screen glides
       in. Nothing in between is ever rendered.
     - Far, on a desktop: the same in-out glide, just longer. */
  const goTo = useCallback<LenisContextValue["goTo"]>(
    (target) => {
      if (locks.current > 0) {
        pending.current = { target, offset: 0, chapter: true };
        return;
      }
      const lenis = lenisRef.current;
      const y = resolveY(target);
      if (!lenis || y === null) {
        scrollTo(target);
        return;
      }
      const id = ++jump.current;
      const vh = window.innerHeight;
      const d = y - window.scrollY;
      const far = Math.abs(d) > FAR_VH * vh;
      const glide = (to: number, duration: number) =>
        lenis.scrollTo(to, { duration, easing: easeInOutCubic, force: true });

      if (!far || !window.matchMedia(CUT_QUERY).matches) {
        glide(y, Math.min(far ? 1.6 : 1.2, 0.6 + (Math.abs(d) / vh) * 0.35));
        void fadeVeil(0, 160);
        return;
      }

      void (async () => {
        await fadeVeil(1, 180);
        if (id !== jump.current) return;
        // Land a screen short, on the side the trip came from.
        lenis.scrollTo(y - Math.sign(d) * LANDING_VH * vh, { immediate: true, force: true });
        await nextFrame();
        await nextFrame();
        if (id !== jump.current) return;
        glide(y, 0.9);
        void fadeVeil(0, 260);
      })();
    },
    [scrollTo, fadeVeil]
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
    if (next?.chapter) goTo(next.target);
    else if (next) scrollTo(next.target, next.offset);
  }, [scrollTo, goTo]);

  const value = useMemo(
    () => ({ scrollTo, goTo, stop, start }),
    [scrollTo, goTo, stop, start]
  );

  return (
    <LenisContext.Provider value={value}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      {/* The cut. Under the HUD (z-60), so the index stays put through it. */}
      <div
        ref={veilRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[58] bg-[#020a0c]"
        style={{ opacity: 0 }}
      />
    </LenisContext.Provider>
  );
}
