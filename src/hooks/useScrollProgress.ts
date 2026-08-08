"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Document scroll progress, 0–1, as a single shared listener.
 *
 * Three consumers need this — the backdrop shader (every frame), the navbar's
 * read-progress hairline, and the act veil — and before this each one attached
 * its own scroll listener and its own rAF throttle. One store instead: the
 * listener is attached once for the lifetime of the page, writes
 * `--scroll-progress` onto `<html>` so CSS can read it without JS, and hands
 * subscribers a ref for the animation-frame consumers who must not re-render.
 *
 * The ref and the store are deliberately separate reads:
 *
 *   useScrollProgressRef()  — mutable, updated every frame, never re-renders
 *   useScrollProgress()     — quantised to 1%, re-renders on change
 *
 * A component that renders on every scroll pixel is the exact cost this file
 * exists to avoid, so the store snapshot is rounded before it is published.
 */

const value = { current: 0 };
const listeners = new Set<() => void>();

/** Quantised snapshot — only changes at 1% granularity. */
let published = 0;
let started = false;
let frame = 0;

function measure() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  value.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

  /* This used to also write `--scroll-progress` onto <html> every frame.
     Setting a custom property on the root element invalidates style for the
     *entire document* — every element is a potential inheritor — so it forced a
     full style recalculation on every scroll frame, on a page with several
     thousand nodes. Nothing in the stylesheet ever read it. */

  const next = Math.round(value.current * 100) / 100;
  if (next !== published) {
    published = next;
    listeners.forEach((l) => l());
  }
}

function onScroll() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    measure();
  });
}

/**
 * Attached once and never torn down. The listener is passive and does nothing
 * but write a number; keeping it alive across unmounts is cheaper than the
 * subscribe/unsubscribe churn of doing it per consumer, and the page always has
 * at least one consumer anyway.
 */
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  measure();
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Live progress as a ref. For `requestAnimationFrame` consumers — shader
 * uniforms, camera dollies — which need the value every frame and must never
 * cause a render to get it.
 */
export function useScrollProgressRef(): { current: number } {
  useEffect(start, []);
  return value;
}

/** Progress as a rendering value, quantised to 1%. `0` during SSR. */
export function useScrollProgress(): number {
  return useSyncExternalStore(
    subscribe,
    () => published,
    () => 0
  );
}

/**
 * Progress through one element, 0–1, as a ref.
 *
 * `SelectedWork` measures its own pinned section this way. Kept here rather
 * than in that component because it shares the rAF above — a second scroll
 * listener for a second measurement is exactly what this file replaced.
 */
export function useElementProgress(
  ref: React.RefObject<HTMLElement | null>,
  enabled = true
): { current: number } {
  const progress = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;

    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      const travel = height - window.innerHeight;
      progress.current =
        travel > 0 ? Math.min(1, Math.max(0, -top / travel)) : 0;
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ref, enabled]);

  return progress;
}
