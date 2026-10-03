"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { brandTile, techLabel, TechMark, type GlyphKey, type TechKey } from "@/components/ui/TechMarks";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { EASE_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   The logo dock: the tools as a fanned row of app icons (the reference clip,
   docs/reference/video/ref4-tech-stack-dock.mp4).

   Each tool is a rounded tile in its brand colour — the one place the site
   lets brand colour in, so a logo is known at a glance — overlapping its
   neighbour and set at a small tilt of its own, like cards dealt onto a
   table. The tilt is seeded by position, never random, so the row looks the
   same on every visit.

   **Magnification.** The pointer's x along the row drives every tile at
   once: the nearer a tile, the more it grows, lifts and straightens, and
   the more room it pushes out around itself, so its neighbours part. Each of
   those is a spring on the one pointer value — no React render per frame.
   The tile under the pointer gets its name in a dark pill above it.

   **Arrival.** The first time the row is seen the tiles deal out of a
   stacked deck at its centre and fan into place, left to right. Once.

   Touch: a tap lifts a tile and names it; there is no magnification on a
   coarse pointer. Reduced motion: a still, straight row. The names are
   always in the DOM as text (visually hidden), so the dock is a list a
   screen reader can read; the pill is decoration.
   --------------------------------------------------------------------------- */

const SIZES = { lg: 52, md: 40, sm: 32 } as const;

/** −6…6°, seeded by position. */
const tiltOf = (i: number) => (((i * 37 + 11) % 13) - 6) * 0.9;

export function LogoDock({
  keys,
  labels,
  size = "lg",
  title,
  className,
  align = "center",
}: {
  keys: TechKey[];
  labels?: Partial<Record<GlyphKey, string>>;
  size?: keyof typeof SIZES;
  /** A small heading over the dock: "Tech stack". */
  title?: string;
  className?: string;
  align?: "center" | "start";
}) {
  const reduced = useReducedMotion();
  const px = SIZES[size];
  const listRef = useRef<HTMLUListElement>(null);
  const seen = useInView(listRef, { once: true, amount: 0.4 });
  /** Pointer x within the row; far away when the pointer is elsewhere. */
  const mx = useMotionValue(Number.POSITIVE_INFINITY);
  const [named, setNamed] = useState<number | null>(null);
  const [fine, setFine] = useState(true);

  return (
    <div className={cn("flex flex-col", align === "center" ? "items-center" : "items-start", className)}>
      {title && <p className="micro mb-4 !text-fg/85">{title}</p>}
      <ul
        ref={listRef}
        aria-label={title}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse" || reduced) return;
          setFine(true);
          const r = listRef.current?.getBoundingClientRect();
          if (r) mx.set(e.clientX - r.left);
        }}
        onPointerLeave={() => {
          mx.set(Number.POSITIVE_INFINITY);
          setNamed(null);
        }}
        className={cn(
          "flex flex-wrap items-end",
          align === "center" ? "justify-center" : "justify-start",
          /* Room for the lift and the pill above the row. */
          size === "lg" ? "pt-10" : "pt-8"
        )}
        style={{ paddingLeft: px * 0.2, rowGap: px * 0.35 }}
      >
        {keys.map((k, i) => (
          <Tile
            key={k}
            k={k}
            i={i}
            n={keys.length}
            px={px}
            mx={mx}
            label={techLabel(k, labels)}
            named={named === i}
            onName={(on) => setNamed(on ? i : (cur) => (cur === i ? null : cur))}
            onTouch={() => {
              setFine(false);
              setNamed(i);
            }}
            fine={fine}
            reduced={reduced}
            seen={seen}
          />
        ))}
      </ul>
    </div>
  );
}

function Tile({
  k,
  i,
  n,
  px,
  mx,
  label,
  named,
  onName,
  onTouch,
  fine,
  reduced,
  seen,
}: {
  k: TechKey;
  i: number;
  n: number;
  px: number;
  mx: MotionValue<number>;
  label: string;
  named: boolean;
  onName: (on: boolean) => void;
  onTouch: () => void;
  fine: boolean;
  reduced: boolean;
  seen: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const tilt = reduced ? 0 : tiltOf(i);
  const { tile, ink } = brandTile(k);

  /* 0 far away … 1 under the pointer, from the tile's laid-out centre (its
     offset, not its transformed box, so the springs don't chase themselves). */
  const near = useTransform(mx, (x) => {
    const el = ref.current;
    if (!el || !Number.isFinite(x)) return 0;
    const c = el.offsetLeft + el.offsetWidth / 2;
    const d = Math.abs(x - c) / (px * 2.6);
    return d >= 1 ? 0 : Math.cos((d * Math.PI) / 2) ** 2;
  });
  const spring = { stiffness: 420, damping: 30, mass: 0.6 };
  const p = useSpring(near, spring);
  /* A tapped tile lifts as if the pointer were on it. */
  const tap = useSpring(0, spring);
  useEffect(() => tap.set(!fine && named ? 1 : 0), [fine, named, tap]);
  const lift = useTransform([p, tap], ([v, t]: number[]) => Math.max(v, t));
  const scale = useTransform(lift, (v) => 1 + v * 0.42);
  const y = useTransform(lift, (v) => -v * px * 0.32);
  const rotate = useTransform(lift, (v) => tilt * (1 - v));
  const spread = useTransform(p, (v) => px * 0.16 * v);
  const z = useTransform(p, (v) => Math.round(v * 100) + 1);

  /* Dealt from the middle of the row. */
  const fromX = (n / 2 - i) * px * 0.62;

  return (
    <motion.li
      ref={ref}
      className="relative"
      style={{
        marginLeft: i === 0 ? 0 : -px * 0.2,
        paddingInline: reduced ? 0 : spread,
        zIndex: z,
      }}
      initial={reduced ? false : { x: fromX, opacity: 0, rotate: tilt * 3 }}
      animate={reduced || seen ? { x: 0, opacity: 1, rotate: 0 } : undefined}
      transition={{ duration: 0.75, delay: 0.05 + i * 0.028, ease: EASE_EXPO }}
      onPointerEnter={(e) => e.pointerType === "mouse" && onName(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && onName(false)}
      onPointerDown={(e) => e.pointerType !== "mouse" && onTouch()}
    >
      <motion.span
        aria-hidden
        className="flex items-center justify-center rounded-[24%] will-change-transform"
        style={{
          width: px,
          height: px,
          background: `linear-gradient(160deg, color-mix(in srgb, ${tile} 86%, white), ${tile} 55%)`,
          color: ink,
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.08), 0 8px 18px -8px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.5)",
          scale: reduced ? 1 : scale,
          y: reduced ? 0 : y,
          rotate: reduced ? 0 : rotate,
          transformOrigin: "50% 100%",
        }}
      >
        <TechMark name={k} size={Math.round(px * 0.54)} />
      </motion.span>
      <span className="sr-only">{label}</span>
      <AnimatePresence>
        {named && (
          <motion.span
            aria-hidden
            className="dock-tip pointer-events-none absolute bottom-full left-1/2 z-[200] mb-[calc(var(--lift)+10px)] whitespace-nowrap rounded-md border border-white/10 bg-[#202329] px-2.5 py-1 font-sans text-[0.8125rem] font-medium text-white shadow-lg"
            style={{ ["--lift" as string]: `${Math.round(px * 0.5)}px`, x: "-50%" }}
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
