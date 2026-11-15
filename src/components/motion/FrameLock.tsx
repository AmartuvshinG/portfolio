"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollTimelines } from "@/hooks/useScrollTimelines";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * Frame lock: how every card on the page arrives.
 *
 * One motion language so the site reads as one system. As a card comes into
 * view its four corner brackets fly in from outside and lock onto the
 * corners, the ramp rim draws round the edge clockwise (top, right, bottom,
 * left: four hairlines on scaleX/scaleY, transform only), one flash of light
 * runs inside the rim, and the children marked `.fl-in` rise into place one
 * after another (`--i` sets the order).
 *
 * Three ways to drive it:
 *   - **scroll** (default where the browser has scroll timelines): every beat
 *     is scrubbed on the card's own view timeline, so it plays with the scroll
 *     and runs on the compositor.
 *   - **once**: a settle-once on entry (IntersectionObserver), for browsers
 *     without scroll timelines, or when the caller passes `on`.
 *   - **still**: reduced motion. Drawn at rest.
 *
 * A pinned stage hands in its own clock with `on` (its card never moves
 * through the viewport, so a view timeline would never advance).
 */
export function FrameLock({
  as: Tag = "div",
  on,
  className,
  children,
  corners = true,
  style,
  ...rest
}: {
  as?: "div" | "article" | "section" | "li";
  /** Caller-owned trigger. Overrides the scroll timeline. */
  on?: boolean;
  className?: string;
  children: React.ReactNode;
  /** Bracket corners (off for cards that already cut their own). */
  corners?: boolean;
  style?: React.CSSProperties;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "style" | "children">) {
  const css = useScrollTimelines();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  /* Armed a frame after mount, so a card that mounts already `on` (a step
     swapped in) still plays its lock rather than appearing locked. */
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const mode = reduced ? "still" : on !== undefined ? "once" : css ? "scroll" : "once";
  const lit = armed && (on ?? seen);

  useEffect(() => {
    if (mode !== "once" || on !== undefined) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode, on]);

  const Comp = Tag as React.ElementType;
  return (
    <Comp
      ref={ref}
      className={cn("fl", className)}
      data-fl={mode}
      data-on={mode === "once" ? (lit ? "true" : "false") : undefined}
      style={style}
      {...rest}
    >
      <span aria-hidden className="fl-deco">
        <span className="fl-edge fl-edge--t" />
        <span className="fl-edge fl-edge--r" />
        <span className="fl-edge fl-edge--b" />
        <span className="fl-edge fl-edge--l" />
        {corners && (
          <>
            <span className="fl-corner fl-corner--tl" />
            <span className="fl-corner fl-corner--tr" />
            <span className="fl-corner fl-corner--br" />
            <span className="fl-corner fl-corner--bl" />
          </>
        )}
        <span className="fl-flash" />
      </span>
      {children}
    </Comp>
  );
}
