"use client";

import {
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * A card that tilts toward the cursor and catches the light while it does.
 *
 * Ported from `docs/reference/glare-card.txt`, which has the right idea and
 * three bugs that must not be carried across:
 *
 * 1. **`useMotionTemplate` with `.get()` is dead.** The reference writes
 *    `` useMotionTemplate`... ${springX.get() * 100}% ...` ``. `.get()` reads the
 *    value once, during render, and hands the template a plain number — so the
 *    glare is baked at the position the card had when it mounted and never
 *    moves again. The MotionValue itself has to go into the template, which
 *    means the arithmetic has to happen in `useTransform` first.
 * 2. **`perspective` on the transformed element does nothing.** CSS
 *    `perspective` applies to an element's *children*, not to its own
 *    transform, so the reference's tilt is an orthographic shear rather than a
 *    rotation. Framer's `transformPerspective` is the property that applies to
 *    the element itself.
 * 3. **`backdrop-blur-xl` on every card.** That is a backdrop-filter per card,
 *    on a page that scrolls — exactly the cost this site removed from the
 *    navbar. There is no filter anywhere in this component.
 *
 * What it costs: nothing at rest. All three light layers sit at `opacity: 0`,
 * the pointer listener is bound on enter and removed on leave, and the springs
 * settle to zero. On a touch device or under reduced motion it renders a plain
 * static card and binds no listeners at all.
 *
 * `focus-visible` parks the glare at centre and shows the ring, because a
 * hover-only affordance is invisible to a keyboard.
 */

const SPRING = { damping: 24, stiffness: 170, mass: 0.55 };

/**
 * The tags this card can be.
 *
 * Built once at module scope rather than from an `as` component prop, because
 * `motion.create()` returns a new component *type* on every call: doing it
 * during render remounts the card and its whole subtree each time, and
 * memoising it only hides the hazard from the reader. A fixed map keeps the
 * polymorphism the call sites need — the work grid needs to *be* a `Link`, the
 * social fan an `<a>`, the lab tile a `<button>` — with none of that risk.
 */
const ROOTS = {
  div: motion.div,
  article: motion.article,
  a: motion.a,
  button: motion.button,
  li: motion.li,
  link: motion.create(Link),
} as const;

export type GlareRoot = keyof typeof ROOTS;

export interface GlareCardProps {
  as?: GlareRoot;
  /* The per-root attributes the call sites actually need. Spelled out rather
     than made generic over `as`: a fully polymorphic prop type here costs a
     great deal of type machinery to express five attributes. */
  /** `as="link" | "a"` */
  href?: string;
  /** `as="a"` */
  target?: string;
  rel?: string;
  /** `as="button"` — without it React defaults to submit inside a form. */
  type?: "button" | "submit" | "reset";
  className?: string;
  /** Degrees of rotation at full deflection. `flat` ignores this. */
  tilt?: number;
  /**
   * `tilt` rotates the card; `flat` keeps the glare and the sheen but no
   * rotation — for cards that already live inside somebody else's transform
   * (the fan, the isometric lab plane, the scroll-driven archive), where a
   * second rotation fights the first.
   */
  mode?: "tilt" | "flat";
}

export function GlareCard({
  children,
  as: Tag = "div",
  className,
  tilt = 9,
  mode = "tilt",
  ...props
}: PropsWithChildren<
  GlareCardProps &
    /* Framer redefines the drag and animation handlers with its own
       signatures, so the DOM versions have to come off or every spread is a
       type error. Nothing here wants them. */
    Omit<
      React.HTMLAttributes<HTMLElement>,
      | "onDrag"
      | "onDragStart"
      | "onDragEnd"
      | "onAnimationStart"
      | "onAnimationEnd"
      | "onAnimationIteration"
    >
>) {
  const reduced = useReducedMotion();
  const [interactive, setInteractive] = useState(false);

  /* Only bind anything on a device that can actually hover. Phones would pay
     for listeners that can only ever fire on tap. */
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setInteractive(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const lift = useMotionValue(0);

  const sx = useSpring(px, SPRING);
  const sy = useSpring(py, SPRING);
  const sLift = useSpring(lift, SPRING);

  /* The arithmetic lives here, in MotionValue space, so the templates below can
     interpolate live values rather than a number frozen at render time. */
  const rotateX = useTransform(sy, (v) => -v * tilt);
  const rotateY = useTransform(sx, (v) => v * tilt);
  const glareX = useTransform(sx, (v) => `${50 + v * 42}%`);
  const glareY = useTransform(sy, (v) => `${50 + v * 42}%`);
  const sheenX = useTransform(sx, (v) => `${v * -22}%`);

  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(236,238,251,0.30), transparent 62%)`;
  const edge = useMotionTemplate`radial-gradient(120% 90% at ${glareX} ${glareY}, color-mix(in srgb, var(--spectrum-2) 55%, transparent), transparent 68%)`;

  const onEnter = useCallback(() => {
    lift.set(1);
  }, [lift]);

  const onLeave = useCallback(() => {
    px.set(0);
    py.set(0);
    lift.set(0);
  }, [px, py, lift]);

  /* Measured off `currentTarget` rather than a ref: the handler is bound to the
     root, so currentTarget *is* the root — and a single ref cannot be typed
     against six different element types without a cast that lies. */
  const onMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      px.set((e.clientX - (r.left + r.width / 2)) / (r.width / 2));
      py.set((e.clientY - (r.top + r.height / 2)) / (r.height / 2));
    },
    [px, py]
  );

  const Root = ROOTS[Tag];
  const live = interactive && !reduced;

  /* Hoisted out of the JSX. Calling useTransform inside a conditional
     `style={...}` expression is a conditional hook, and it breaks the moment
     `live` or `mode` changes. */
  const contentZ = useTransform(sLift, (v) => v * 26);

  return (
    <Root
      onPointerEnter={live ? onEnter : undefined}
      onPointerMove={live ? onMove : undefined}
      onPointerLeave={live ? onLeave : undefined}
      onFocus={live ? onEnter : undefined}
      onBlur={live ? onLeave : undefined}
      className={cn(
        "focus-ring group relative isolate overflow-hidden",
        className
      )}
      style={
        live
          ? {
              ...(mode === "tilt" && {
                rotateX,
                rotateY,
                transformPerspective: 900,
              }),
              transformStyle: "preserve-3d",
            }
          : undefined
      }
      {...props}
    >
      {live && (
        <>
          {/* The glare. Soft-light so it can lift the surface without washing
              out whatever the card is actually showing. */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
            style={{ background: glare, mixBlendMode: "soft-light" }}
          />
          {/* The ramp catching the edge the light is coming from. */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-40 group-focus-visible:opacity-40"
            style={{ background: edge }}
          />
          {/* A single specular streak, sliding against the tilt. */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -inset-y-1/2 inset-x-[-40%] z-0 rotate-[18deg] opacity-0 transition-opacity duration-700 group-hover:opacity-[0.07] group-focus-visible:opacity-[0.07]"
            style={{
              x: sheenX,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
            }}
          />
        </>
      )}

      {/* Content is lifted out of the card plane so the tilt has parallax
          rather than reading as the whole surface pivoting flat. */}
      <motion.div
        className="relative z-30 h-full w-full"
        style={live && mode === "tilt" ? { z: contentZ } : undefined}
      >
        {children}
      </motion.div>
    </Root>
  );
}
