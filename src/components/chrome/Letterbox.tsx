"use client";

import { useEffect, useRef } from "react";

/**
 * The matte. Two black bars, top and bottom, that close in a little while a
 * chapter boundary crosses the middle of the screen and open again as the
 * next section settles — the frame tightening for a cut, then breathing out.
 *
 * The intro opens at a full 2.39:1 (the preloader draws its own bars); here,
 * at rest, the page is full frame. A crossing peaks at BAR_VH per bar.
 *
 * Desktop with a fine pointer only (a phone's frame is too small to give
 * any of it up), and never under reduced motion. Transform-only: the bars
 * are full-height-of-their-peak slabs scaled on Y from their outer edge, so a
 * scroll frame writes two transforms and nothing else. Boundaries are
 * measured on resize and when the page's height changes, never per frame.
 */

/** Each bar at its peak, vh. */
const BAR_VH = 4.5;
/** How far (in viewports) from a boundary the matte starts closing. */
const REACH = 0.42;

export function Letterbox() {
  const topRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let edges: number[] = [];
    let raf = 0;
    let last = -1;

    const measure = () => {
      const y = window.scrollY;
      edges = [...document.querySelectorAll<HTMLElement>("main [data-chapter]")]
        .slice(1) // the hero's top edge is the top of the page, not a cut
        .map((el) => el.getBoundingClientRect().top + y);
      last = -1;
      schedule();
    };

    const paint = () => {
      raf = 0;
      const top = topRef.current;
      const bot = botRef.current;
      if (!top || !bot) return;
      if (!mq.matches) {
        top.style.transform = bot.style.transform = "scaleY(0)";
        return;
      }
      const vh = window.innerHeight;
      const mid = window.scrollY + vh * 0.5;
      let k = 0;
      for (const e of edges) {
        const d = Math.abs(mid - e) / (vh * REACH);
        if (d < 1) {
          // A smooth bell: closed at the boundary, open by REACH.
          const b = 1 - d * d;
          k = Math.max(k, b * b);
        }
      }
      if (Math.abs(k - last) < 0.002) return;
      last = k;
      top.style.transform = `scaleY(${k.toFixed(4)})`;
      bot.style.transform = `scaleY(${k.toFixed(4)})`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    mq.addEventListener("change", measure);
    let t: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(measure, 250);
    });
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      mq.removeEventListener("change", measure);
    };
  }, []);

  const bar = "pointer-events-none fixed inset-x-0 z-[55] bg-[#020306] will-change-transform";
  return (
    <div aria-hidden>
      <div
        ref={topRef}
        className={`${bar} top-0 origin-top border-b border-[color-mix(in_srgb,var(--color-hazard)_14%,transparent)]`}
        style={{ height: `${BAR_VH}vh`, transform: "scaleY(0)" }}
      />
      <div
        ref={botRef}
        className={`${bar} bottom-0 origin-bottom border-t border-[color-mix(in_srgb,var(--color-hazard)_14%,transparent)]`}
        style={{ height: `${BAR_VH}vh`, transform: "scaleY(0)" }}
      />
    </div>
  );
}
