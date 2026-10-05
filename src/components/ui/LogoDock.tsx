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

   **Magnification.** The pointer drives every tile at once: the nearer a
   tile, the more it grows, lifts and straightens, and its neighbours slide
   apart. Each of those is a spring on the one pointer value — no React
   render per frame. The biggest tile gets its name in a dark pill above it.

   **Alignment.** Distances are measured from each tile's *rest* centre —
   `offsetLeft/Top`, which ignore transforms — in the list's own box (the
   list is `relative`, so it is every tile's offsetParent, the same origin
   the pointer is measured in). Neighbours part by transform, never by
   padding, so the layout the centres come from never moves under the
   pointer. Only tiles on the pointer's row respond, and the name follows
   the nearest centre, so the pill is always on the tile that grew.

   **Arrival.** The first time the row is seen the tiles deal out of a
   stacked deck at its centre and fan into place, left to right. Once.

   Touch: a pointer that cannot hover never sees this row at all — it gets
   ToolChips, every tile with its name printed beside it. (Tapped, the
   overlapped tiles were hard to tell apart and a long press raised iOS's
   Copy / Look Up callout over the hidden names.) A tap on a hybrid laptop's
   screen still lifts a tile and names it. Reduced motion: a still, straight row. The names are
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
  play,
}: {
  keys: TechKey[];
  labels?: Partial<Record<GlyphKey, string>>;
  size?: keyof typeof SIZES;
  /** A small heading over the dock: "Tech stack". */
  title?: string;
  className?: string;
  align?: "center" | "start";
  /** When given, the deal-in follows this instead of first sight: true deals
   *  the tiles in, false gathers them back (a drum face coming and going). */
  play?: boolean;
}) {
  const reduced = useReducedMotion();
  const px = SIZES[size];
  const listRef = useRef<HTMLUListElement>(null);
  const sighted = useInView(listRef, { once: true, amount: 0.4 });
  const seen = play ?? sighted;
  /** Pointer x within the row; far away when the pointer is elsewhere. */
  const mx = useMotionValue(Number.POSITIVE_INFINITY);
  const my = useMotionValue(Number.POSITIVE_INFINITY);
  const [named, setNamed] = useState<number | null>(null);
  const [fine, setFine] = useState(true);

  return (
    <div className={cn("flex flex-col", align === "center" ? "items-center" : "items-start", className)}>
      {title && <p className="micro mb-4 !text-fg/85">{title}</p>}
      {/* A thumb gets every name printed; the fanned, magnifying row needs a
          pointer that hovers (globals.css `.dock-touch` / `.dock-fine`). */}
      <ToolChips keys={keys} labels={labels} title={title} align={align} size={size === "lg" ? "md" : "sm"} className="dock-touch" />
      <div className="dock-fine">
        <ul
          ref={listRef}
          aria-label={title}
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse") return;
            const list = listRef.current;
            if (!list) return;
            setFine(true);
            const r = list.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            if (!reduced) {
              mx.set(x);
              my.set(y);
            }
            /* Name the nearest tile on the pointer's row. */
            let best: number | null = null;
            let bestD = px * 0.75;
            Array.from(list.children).forEach((el, j) => {
              const li = el as HTMLElement;
              if (!onRow(li, y, px)) return;
              const d = Math.abs(x - (li.offsetLeft + li.offsetWidth / 2));
              if (d < bestD) {
                bestD = d;
                best = j;
              }
            });
            setNamed(best);
          }}
          onPointerLeave={() => {
            mx.set(Number.POSITIVE_INFINITY);
            my.set(Number.POSITIVE_INFINITY);
            setNamed(null);
          }}
          className={cn(
            "relative flex flex-wrap items-end",
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
              my={my}
              label={techLabel(k, labels)}
              named={named === i}
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
    </div>
  );
}

/**
 * The tools as labelled chips: each brand tile with its name beside it, so
 * nobody has to know a logo to read the list. Not buttons — there is nothing
 * to do with a tool name — and not selectable, so a long press on iOS does
 * not raise the Copy / Look Up callout over it.
 */
export function ToolChips({
  keys,
  labels,
  title,
  align = "start",
  size = "md",
  className,
}: {
  keys: TechKey[];
  labels?: Partial<Record<GlyphKey, string>>;
  title?: string;
  align?: "center" | "start";
  size?: "md" | "sm";
  className?: string;
}) {
  const tile = size === "md" ? 30 : 26;
  return (
    <ul
      aria-label={title}
      className={cn(
        "flex select-none flex-wrap gap-2 [-webkit-touch-callout:none]",
        align === "center" ? "justify-center" : "justify-start",
        className
      )}
    >
      {keys.map((k) => {
        const { tile: bg, ink } = brandTile(k);
        return (
          <li
            key={k}
            className="flex items-center gap-2 rounded-full border border-line bg-[rgba(6,19,23,0.55)] py-1 pl-1 pr-3"
          >
            <span
              aria-hidden
              className="flex shrink-0 items-center justify-center rounded-full"
              style={{
                width: tile,
                height: tile,
                background: `linear-gradient(160deg, color-mix(in srgb, ${bg} 86%, white), ${bg} 55%)`,
                color: ink,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
              }}
            >
              <TechMark name={k} size={Math.round(tile * 0.56)} />
            </span>
            <span className={cn("font-sans font-medium text-fg/90", size === "md" ? "text-[0.9375rem]" : "text-sm")}>
              {techLabel(k, labels)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Tile({
  k,
  i,
  n,
  px,
  mx,
  my,
  label,
  named,
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
  my: MotionValue<number>;
  label: string;
  named: boolean;
  onTouch: () => void;
  fine: boolean;
  reduced: boolean;
  seen: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const tilt = reduced ? 0 : tiltOf(i);
  const { tile, ink } = brandTile(k);

  /* 0 far away … 1 under the pointer, from the tile's rest centre (its
     offset, not its transformed box, so the springs don't chase themselves),
     and only on the pointer's own row. */
  const near = useTransform([mx, my], ([x, y]: number[]) => {
    const el = ref.current;
    if (!el || !Number.isFinite(x) || !onRow(el, y, px)) return 0;
    const c = el.offsetLeft + el.offsetWidth / 2;
    const d = Math.abs(x - c) / (px * 2.6);
    return d >= 1 ? 0 : Math.cos((d * Math.PI) / 2) ** 2;
  });
  /* Signed: neighbours part away from the pointer. A smooth step, so the
     tiles far off all move the same amount and keep their spacing. */
  const side = useTransform([mx, my], ([x, y]: number[]) => {
    const el = ref.current;
    if (!el || !Number.isFinite(x) || !onRow(el, y, px)) return 0;
    const c = el.offsetLeft + el.offsetWidth / 2;
    return Math.tanh((c - x) / (px * 0.9));
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
  const part = useSpring(side, spring);
  const shift = useTransform(part, (v) => v * px * 0.3);
  const z = useTransform(p, (v) => Math.round(v * 100) + 1);

  /* Dealt from the middle of the row. */
  const fromX = (n / 2 - i) * px * 0.62;

  return (
    <motion.li
      ref={ref}
      className="relative"
      style={{
        marginLeft: i === 0 ? 0 : -px * 0.2,
        zIndex: z,
      }}
      initial={reduced ? false : { x: fromX, opacity: 0, rotate: tilt * 3 }}
      animate={
        reduced || seen ? { x: 0, opacity: 1, rotate: 0 } : { x: fromX, opacity: 0, rotate: tilt * 3 }
      }
      transition={{ duration: 0.75, delay: 0.05 + i * 0.028, ease: EASE_EXPO }}
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
          x: reduced ? 0 : shift,
          y: reduced ? 0 : y,
          rotate: reduced ? 0 : rotate,
          transformOrigin: "50% 100%",
        }}
      >
        <TechMark name={k} size={Math.round(px * 0.54)} />
      </motion.span>
      <span className="sr-only">{label}</span>
      {/* The pill rides the tile's sideways shift, so it stays centred on it. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-full z-[200]"
        style={{ x: reduced ? 0 : shift }}
      >
        <AnimatePresence>
          {named && (
            <motion.span
              className="dock-tip absolute bottom-0 left-1/2 mb-[calc(var(--lift)+10px)] whitespace-nowrap rounded-md border border-white/10 bg-[#202329] px-2.5 py-1 font-sans text-[0.8125rem] font-medium text-white shadow-lg"
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
      </motion.span>
    </motion.li>
  );
}

/** Is a pointer at list-y `y` on this tile's row? Generous above (the tile
    lifts and grows upward), tight below. */
function onRow(el: HTMLElement, y: number, px: number): boolean {
  if (!Number.isFinite(y)) return false;
  const dy = y - (el.offsetTop + el.offsetHeight / 2);
  return dy > -px * 1.25 && dy < px * 0.75;
}
