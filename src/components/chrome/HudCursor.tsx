"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * A spectrum ring with a magenta core, and nothing else.
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

export function HudCursor() {
  const reduced = useReducedMotion();
  const ringRef = useRef<HTMLDivElement>(null);
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

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { ...mouse };
    let hovering = false;
    let seen = false;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      seen = true;
      hovering = Boolean(
        (e.target as HTMLElement)?.closest(
          "a, button, [data-cursor], input, textarea"
        )
      );
    };

    const render = () => {
      pos.x += (mouse.x - pos.x) * 0.2;
      pos.y += (mouse.y - pos.y) * 0.2;
      const ring = ringRef.current;
      if (ring) {
        ring.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${hovering ? 1.9 : 1})`;
        // Hold at zero until the pointer actually moves, so the ring does not
        // sit parked in the middle of the screen on load.
        ring.style.opacity = seen ? (hovering ? "1" : "0.85") : "0";
      }
      raf = requestAnimationFrame(render);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(render);

    /* A window narrowed past the breakpoint hands the native cursor back for
       free now: the media query flips, `active` goes false, and this effect
       tears down — which is the whole reason eligibility moved out of state. */
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      root.classList.remove("hud-cursor");
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[130] hidden md:block"
    >
      {/* The transform carrier. Ring and core are siblings under it: a mask set
          on the ring would clip anything nested inside it, core dot included. */}
      <div
        ref={ringRef}
        className="absolute left-0 top-0 h-8 w-8 transition-opacity duration-200 ease-out"
        style={{ opacity: 0, willChange: "transform" }}
      >
        {/* Painted as a masked conic ramp rather than as a border, so the ring
            carries the full spectrum instead of one flat stop — and so no
            `border-*` rule can ever override it the way one did before. */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, var(--spectrum-1), var(--spectrum-2), var(--spectrum-3), var(--spectrum-1))",
            mask: "radial-gradient(circle, transparent 0 42%, #000 44%)",
            WebkitMask: "radial-gradient(circle, transparent 0 42%, #000 44%)",
          }}
        />
        <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal" />
      </div>
    </div>
  );
}
