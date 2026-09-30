"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * A sodium targeting reticle: four corners round a dot, which spring out to
 * frame a link or button when the pointer is over it — the same targeting
 * language as the active nav link, the Craft panel and the case file. It
 * replaced a spectrum ring (2026-09-30). The four faults below are from the
 * ring's history and the fixes still apply.
 *
 * This component was invisible for four separate reasons, all of which had to
 * go at once. Worth recording, because three of them are silent:
 *
 *  1. The ring used `border-current` off `--color-fg`, but an *unlayered*
 *     `* { border-color: var(--color-line) }` in globals.css outranked the
 *     utility layer and won. The border resolved to a 12%-alpha hairline and
 *     the ring's own 0.5 opacity halved it again — roughly 6% contrast. That
 *     rule now lives in `@layer base`, and the ring paints its own colour here
 *     rather than inheriting, so it cannot regress the same way twice.
 *  2. `cursor: none` was applied on `(pointer: fine)` alone while the element
 *     was `hidden md:block`. A mouse under 768px therefore got the native
 *     cursor hidden with nothing drawn in its place — no cursor at all. The two
 *     conditions are now the same condition, evaluated once, in JS.
 *  3. At z-100 the ring sat under the preloader (z-120) and the route wipe
 *     (z-110), so it vanished for the first ~2.6s of every entry. It is now the
 *     top layer of the site.
 *  4. A 200ms CSS transition on `transform` fought the per-frame rAF lerp, so
 *     the ring visibly trailed the pointer. Only `opacity` transitions now.
 *
 * Fine pointers with motion allowed only — touch and reduced-motion users keep
 * the native cursor, which is correct behaviour rather than a concession.
 */

/** Matches the `md` breakpoint. Below this the ring is not drawn at all. */
const MIN_WIDTH = 768;

/**
 * Both eligibility conditions as one query, so they can never drift apart —
 * which is fault 2 above. Read through `useSyncExternalStore` rather than
 * measured into state from an effect: this is external environment state, and
 * setting it from an effect commits a render with the wrong answer first.
 */
const QUERY = `(pointer: fine) and (min-width: ${MIN_WIDTH}px)`;

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** What the reticle locks onto. */
const LOCKABLE = "a, button, [role='button'], [data-cursor], input, textarea, select";
/** Half-size of the free reticle, px. */
const REST = 11;
/** Breathing room around a locked element, px. */
const PAD = 6;
/** Corner arm length, px. */
const ARM = 7;
/** Beyond this the element is a surface, not a target. */
const MAX_LOCK_W = 460;
const MAX_LOCK_H = 160;

export function HudCursor() {
  const reduced = useReducedMotion();
  const layerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const eligible = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
  const active = eligible && !reduced;

  useEffect(() => {
    if (!active) return;

    const root = document.documentElement;
    root.classList.add("hud-cursor");

    const layer = layerRef.current;
    const dot = dotRef.current;
    const corners = layer ? (Array.from(layer.querySelectorAll("[data-corner]")) as HTMLElement[]) : [];

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    /* The reticle's box: centre and half-size, eased toward a target. Free,
       the target is a small square on the pointer; locked, it is the element's
       padded rect. */
    const box = { x: mouse.x, y: mouse.y, w: REST, h: REST };
    const aim = { ...box };
    let lock: HTMLElement | null = null;
    let lockRect: DOMRect | null = null;
    let seen = false;
    let raf = 0;

    const retarget = () => {
      if (lock && lockRect) {
        aim.x = lockRect.left + lockRect.width / 2;
        aim.y = lockRect.top + lockRect.height / 2;
        aim.w = lockRect.width / 2 + PAD;
        aim.h = lockRect.height / 2 + PAD;
      } else {
        aim.x = mouse.x;
        aim.y = mouse.y;
        aim.w = REST;
        aim.h = REST;
      }
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      seen = true;
      const el = (e.target as HTMLElement)?.closest<HTMLElement>(LOCKABLE) ?? null;
      if (el !== lock) {
        /* Read the rect once per element, not per frame. Large surfaces (a
           whole Signal panel, the work monitor) are not locked onto: a
           reticle the size of a card is a border, not a target. */
        const r = el?.getBoundingClientRect() ?? null;
        const small = r && r.width <= MAX_LOCK_W && r.height <= MAX_LOCK_H;
        lock = small ? el : null;
        lockRect = small ? r : null;
      }
      retarget();
      kick();
    };

    /* The page scrolled under a locked element: its rect is stale. */
    const onScroll = () => {
      if (lock) {
        lockRect = lock.getBoundingClientRect();
        retarget();
        kick();
      }
    };

    const render = () => {
      raf = 0;
      const k = lock ? 0.28 : 0.24;
      box.x += (aim.x - box.x) * k;
      box.y += (aim.y - box.y) * k;
      box.w += (aim.w - box.w) * k;
      box.h += (aim.h - box.h) * k;
      const [tl, tr, bl, br] = corners;
      const L = box.x - box.w;
      const R = box.x + box.w;
      const T = box.y - box.h;
      const B = box.y + box.h;
      if (tl) tl.style.transform = `translate3d(${L}px, ${T}px, 0)`;
      if (tr) tr.style.transform = `translate3d(${R - ARM}px, ${T}px, 0)`;
      if (bl) bl.style.transform = `translate3d(${L}px, ${B - ARM}px, 0)`;
      if (br) br.style.transform = `translate3d(${R - ARM}px, ${B - ARM}px, 0)`;
      if (dot) dot.style.transform = `translate3d(${mouse.x - 2}px, ${mouse.y - 2}px, 0)`;
      // Hold hidden until the pointer actually moves, so nothing sits parked
      // in the middle of the screen on load.
      if (layer) layer.style.opacity = seen ? "1" : "0";
      /* Settled: stop. The old ring re-rendered at display rate forever, even
         with the mouse still — part of the site's idle rendering cost. */
      const moving =
        Math.abs(aim.x - box.x) + Math.abs(aim.y - box.y) + Math.abs(aim.w - box.w) + Math.abs(aim.h - box.h) > 0.2;
      if (moving) raf = requestAnimationFrame(render);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    kick();

    /* A window narrowed past the breakpoint hands the native cursor back for
       free now: the media query flips, `active` goes false, and this effect
       tears down — which is the whole reason eligibility moved out of state. */
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      root.classList.remove("hud-cursor");
    };
  }, [active]);

  if (!active) return null;

  const corner = (pos: string) => (
    <span
      data-corner
      className="absolute left-0 top-0"
      style={{
        width: ARM,
        height: ARM,
        borderColor: "var(--color-hazard)",
        borderStyle: "solid",
        borderWidth: pos,
        willChange: "transform",
      }}
    />
  );

  return (
    <div
      ref={layerRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[130] hidden transition-opacity duration-200 md:block"
      style={{ opacity: 0 }}
    >
      {/* Four sodium corners, each its own transform: the reticle resizes by
          moving corners, never by animating a box's width and height, which
          would be layout on every frame. Border colour is inline so no
          `border-*` rule can override it (fault 1 above). Order: TL TR BL BR. */}
      {corner("1.5px 0 0 1.5px")}
      {corner("1.5px 1.5px 0 0")}
      {corner("0 0 1.5px 1.5px")}
      {corner("0 1.5px 1.5px 0")}
      <span
        ref={dotRef}
        className="absolute left-0 top-0 h-1 w-1 rounded-full bg-fg"
        style={{ willChange: "transform" }}
      />
    </div>
  );
}
