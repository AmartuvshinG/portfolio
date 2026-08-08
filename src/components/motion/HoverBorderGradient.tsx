"use client";

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type PropsWithChildren,
} from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * A border with a light travelling around it, brightening into the ramp on
 * hover.
 *
 * The mechanism is one gradient sitting behind the content and an opaque inset
 * covering all but a hairline of it — so the "border" is a window onto a moving
 * light rather than a border that is being animated. That is what lets it cross
 * corners smoothly, which no `border-image` approach manages.
 *
 * Recoloured from the reference's white-and-blue to the spectrum ramp, and cut
 * with the site's chamfer instead of a pill so it belongs to the same object
 * family as the cards and the navbar console.
 */

type Direction = "TOP" | "RIGHT" | "BOTTOM" | "LEFT";

const ORDER: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];

/** Where the light sits at rest, per edge. */
const RESTING: Record<Direction, string> = {
  TOP: "radial-gradient(20.7% 50% at 50% 0%, rgba(236,238,251,0.9) 0%, rgba(236,238,251,0) 100%)",
  LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, rgba(236,238,251,0.9) 0%, rgba(236,238,251,0) 100%)",
  BOTTOM:
    "radial-gradient(20.7% 50% at 50% 100%, rgba(236,238,251,0.9) 0%, rgba(236,238,251,0) 100%)",
  RIGHT:
    "radial-gradient(16.2% 41.2% at 100% 50%, rgba(236,238,251,0.9) 0%, rgba(236,238,251,0) 100%)",
};

/** Hover: the whole frame floods with the ramp. */
const FLOOD =
  "radial-gradient(90% 180% at 50% 50%, var(--spectrum-2) 0%, var(--spectrum-1) 38%, rgba(34,224,255,0) 78%)";

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  duration = 1.4,
  clockwise = true,
  ...props
}: PropsWithChildren<
  {
    as?: ElementType;
    containerClassName?: string;
    className?: string;
    /** Seconds per edge while idling. */
    duration?: number;
    clockwise?: boolean;
  } & React.HTMLAttributes<HTMLElement>
>) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [direction, setDirection] = useState<Direction>("TOP");

  /* `ElementType` is a union over every intrinsic and component type, so TS
     intersects their prop types down to `never` and rejects every attribute.
     Narrowing to one concrete tag for the JSX call is the standard escape; the
     public `as` prop stays fully typed for callers. */
  const Root = Tag as "button";

  /* The idle rotation only runs while the element is on screen.
     This component is instanced six times in the capability grid, and each
     instance ticking a timer that animates a `background` on a blurred layer is
     six repaints a second, permanently, for elements that are usually nowhere
     near the viewport. Gating on visibility makes the whole thing free when it
     is not being looked at.

     It also stops while hovered — the flood has taken over and rotating
     underneath it just fights the transition — and under reduced motion, where
     the frame holds one static edge light. */
  /* Typed to match `Root`'s narrowing above rather than to `HTMLElement`: the
     `as` prop makes the real element unknowable to TS, and only the observer
     uses this ref, which needs nothing beyond `Element`. */
  const rootRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (hovered || reduced || !visible) return;
    const id = setInterval(() => {
      setDirection((prev) => {
        const i = ORDER.indexOf(prev);
        return ORDER[(i + (clockwise ? -1 : 1) + ORDER.length) % ORDER.length];
      });
    }, duration * 1000);
    return () => clearInterval(id);
  }, [hovered, reduced, visible, duration, clockwise]);

  return (
    <Root
      ref={rootRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "chamfer-sm relative flex w-fit items-center justify-center overflow-visible p-px transition-colors duration-500",
        containerClassName
      )}
      {...props}
    >
      {/* The light. Blurred so the hairline it shows through reads as a glow
          rather than as a hard gradient stop. */}
      <motion.span
        aria-hidden
        className="chamfer-sm absolute inset-0 z-0"
        style={{ filter: "blur(2px)" }}
        initial={{ background: RESTING[direction] }}
        animate={{ background: hovered ? FLOOD : RESTING[direction] }}
        transition={{ ease: "linear", duration: reduced ? 0 : duration }}
      />
      {/* The mask. Opaque, inset by the border width — everything outside this
          is the visible hairline. */}
      <span
        aria-hidden
        className="chamfer-sm absolute inset-px z-[1] bg-void"
      />
      <span className={cn("relative z-10 block", className)}>{children}</span>
    </Root>
  );
}
