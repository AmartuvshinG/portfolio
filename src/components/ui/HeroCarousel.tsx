"use client";

// A full-bleed editorial hero driven by a filmstrip.
//
// Every card shares one top edge. The focused card unfurls to full height while
// its neighbours stay clipped to half, so the strip reads as a row of cropped
// heads with one complete portrait standing in the middle of it. Changing the
// focus re-grades the whole background to that image.
//
// Geometry is measured, never hard-coded: one ResizeObserver reads the stage and
// every size below is a ratio of it, so the same component is pixel-identical in
// a 600px preview box and on a 4K display.
//
// Four things differ from the reference this was lifted from, and only four:
//
//   1. `useReducedMotion` is the project hook, which defaults to motion-off
//      during SSR rather than framer's, which defaults to motion-on.
//   2. `image` is optional and sits on top of an always-rendered `visual` node
//      — the ShotImage contract (components/work/ShotImage.tsx). A screenshot
//      that has not been dropped into public/ yet degrades to a designed panel
//      instead of a broken frame, with no layout shift.
//   3. Colours are semantic tokens; `accent` comes from the spectrum ramp.
//   4. The stage carries `data-lenis-prevent-wheel`. Lenis owns the wheel for
//      the whole document and would otherwise scroll the page underneath the
//      strip while the strip was also stepping — two readers of one gesture.
import * as React from "react";
import Image from "next/image";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
} from "framer-motion";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

export interface HeroCarouselItem {
  /** Stable key; falls back to the index. @default undefined */
  id?: string | number;
  /** Headline for the active slide. Newlines become separate reveal lines. */
  title: string;
  /**
   * Image URL, used both in the card and as the graded background. Optional:
   * when it is absent — or 404s / 500s — `visual` shows through instead.
   * @default undefined
   */
  image?: string;
  /**
   * Generated panel drawn underneath `image`, and the whole picture when there
   * is no image. Keeps the component network-free by default. @default undefined
   */
  visual?: React.ReactNode;
  /** Byline printed beside the headline, e.g. "BY AURELIA STUDIO." @default undefined */
  credit?: string;
  /** Right-aligned facts, e.g. ["SAT NOV 15", "5-10 PM", "MIAMI"]. @default undefined */
  meta?: string[];
  /**
   * CSS colour the background is graded to. The photo keeps its luminance and
   * takes this hue, which is what makes the backdrop swing on every change.
   * @default "var(--spectrum-2)"
   */
  accent?: string;
}

export interface HeroCarouselProps {
  /** Slides, in strip order. */
  items: HeroCarouselItem[];
  /** Focused slide when controlled. Leave unset for internal state. @default undefined */
  index?: number;
  /** Focused slide on mount when uncontrolled. @default 0 */
  defaultIndex?: number;
  /** Fires on every focus change, from any input. @default undefined */
  onIndexChange?: (index: number) => void;
  /** Wordmark in the middle of the top bar. @default undefined */
  brand?: React.ReactNode;
  /** Renders the "Back" control when provided. @default undefined */
  onBack?: () => void;
  /** Renders the "Menu" control when provided. @default undefined */
  onMenu?: () => void;
  /** Advance on a timer. Pauses on hover, drag and focus. @default false */
  autoplay?: boolean;
  /** Milliseconds between autoplay steps. @default 4000 */
  autoplayDelay?: number;
  /** Accessible name for the stage. @default "Featured looks" */
  label?: string;
  /**
   * Pixels to hold clear at the top of the stage. The top bar starts below it.
   * Set this to the height of any fixed chrome the stage renders under — a site
   * navigation bar, most often — or the two overlap. @default 0
   */
  topInset?: number;
  /** Extra classes for the stage. @default undefined */
  className?: string;
}

/* Ratios lifted from the reference layout, all relative to the stage box. */
const CARD_H = 0.264; // active card height ÷ stage height
const CARD_AR = 0.75; // active card is 3:4
const GAP = 0.038; // gap ÷ card width
const STRIP_TOP = 0.5; // strip's shared top edge, down the stage
const TITLE = 0.067; // headline cap size ÷ stage height
const LABEL = 0.0103; // small mono label ÷ stage height
const PAD = 0.017; // page gutter ÷ stage width
const RAIL = 0.2; // progress rail width ÷ stage width

/** How far the background plate is dimmed before it is re-hued. See its use. */
const PLATE_DIM = 0.2;

/** Wheel distance that commits to a step, and the lockout after one. */
const WHEEL_THRESHOLD = 60;
const WHEEL_COOLDOWN = 420;

/* Film grain, as a self-contained SVG so the component carries no assets. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

export function HeroCarousel({
  items,
  index: controlled,
  defaultIndex = 0,
  onIndexChange,
  brand,
  onBack,
  onMenu,
  autoplay = false,
  autoplayDelay = 4000,
  label: stageLabel = "Featured looks",
  topInset = 0,
  className,
}: HeroCarouselProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  const [uncontrolled, setUncontrolled] = React.useState(defaultIndex);
  const [dragging, setDragging] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const reduced = useReducedMotion();

  // Which `image` sources have failed to load, shared by the cards and the
  // background so a source that 500s stays retired for the whole session rather
  // than re-flashing every time its slide comes back into focus.
  const [broken, setBroken] = React.useState<ReadonlySet<string>>(
    () => new Set()
  );
  const retire = React.useCallback((src: string) => {
    setBroken((prev) => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  }, []);
  const shows = React.useCallback(
    (src?: string): src is string => !!src && !broken.has(src),
    [broken]
  );

  const last = items.length - 1;
  const index = clamp(controlled ?? uncontrolled, 0, Math.max(0, last));

  const go = React.useCallback(
    (next: number) => {
      const clamped = clamp(next, 0, Math.max(0, last));
      if (controlled === undefined) setUncontrolled(clamped);
      if (clamped !== index) onIndexChange?.(clamped);
    },
    [controlled, index, last, onIndexChange]
  );

  // One observer feeds every measurement below.
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const read = () => setBox({ w: stage.clientWidth, h: stage.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const fullH = clamp(box.h * CARD_H, 96, 360);
  const halfH = fullH / 2;
  const cardW = fullH * CARD_AR;
  const gap = Math.max(4, Math.round(cardW * GAP));
  const step = cardW + gap;
  const pad = Math.max(16, Math.round(box.w * PAD));
  const label = Math.max(9, Math.round(box.h * LABEL));

  // Centre the focused card: the track slides, the card never moves itself.
  const xFor = React.useCallback(
    (i: number) => box.w / 2 - (i * step + cardW / 2),
    [box.w, step, cardW]
  );
  const x = useMotionValue(0);
  const target = xFor(index);

  const swing = reduced
    ? { duration: 0 }
    : { duration: 0.7, ease: "easeOut" as const };
  const spring = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 260, damping: 34, mass: 0.9 };

  // The track is driven by a motion value rather than an `animate` prop so a
  // drag that starts mid-spring reads the real position, not where the spring
  // was headed - otherwise the release snaps a card off.
  React.useEffect(() => {
    if (dragging) return;
    const run = animate(x, target, spring);
    return () => run.stop();
    // `spring` is a literal, so `reduced` (all it derives from) stands in for it.
  }, [target, dragging, reduced, x]); // eslint-disable-line react-hooks/exhaustive-deps

  // Does the stage currently own the viewport?
  //
  // The wheel gate below depends on this, and the whole section is unusable
  // without it. A stage that captures the wheel the moment the cursor crosses it
  // can never be scrolled into frame: it absorbs every step while still half off
  // screen, so the composition stays cropped and the rail sits below the fold
  // with no gesture left that could bring it up. Capturing only once the stage
  // is actually filling the viewport lets the page scroll it into place first,
  // and hands the gesture over exactly when the strip is the thing on screen.
  const [filling, setFilling] = React.useState(false);
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const io = new IntersectionObserver(
      ([entry]) => setFilling(entry.intersectionRatio > 0.985),
      { threshold: [0, 0.985, 1] }
    );
    io.observe(stage);
    return () => io.disconnect();
  }, []);

  // Wheel and trackpad. Both axes step the strip.
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let acc = 0;
    let until = 0;

    const onWheel = (e: WheelEvent) => {
      if (!filling) {
        acc = 0;
        return;
      }
      // Trackpads report the dominant axis; take whichever is stronger.
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      // Scroll chaining: once the strip is against an end, hand the gesture
      // back to the page. Without this a full-height carousel is a scroll trap
      // with no way past it.
      const stuck = (delta > 0 && index === last) || (delta < 0 && index === 0);
      if (stuck) {
        acc = 0;
        return;
      }
      e.preventDefault();
      const now = e.timeStamp;
      if (now < until) return;
      acc += delta;
      if (Math.abs(acc) < WHEEL_THRESHOLD) return;
      go(index + Math.sign(acc));
      acc = 0;
      until = now + WHEEL_COOLDOWN;
    };

    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [go, index, last, filling]);

  React.useEffect(() => {
    if (!autoplay || paused || dragging || items.length < 2) return;
    const id = window.setTimeout(
      () => go(index === last ? 0 : index + 1),
      autoplayDelay
    );
    return () => window.clearTimeout(id);
  }, [autoplay, autoplayDelay, dragging, go, index, items.length, last, paused]);

  // A drag that ends over a card fires that card's click, which fights the
  // release landing and jumps the strip to whichever card the finger stopped on.
  const dragged = React.useRef(false);

  const active = items[index];
  if (!active) return null;

  const lines = active.title.split("\n");
  const accent = active.accent ?? "var(--spectrum-2)";

  return (
    <div
      ref={stageRef}
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label={stageLabel}
      // Toggled, not fixed. Lenis preventDefaults every wheel event it handles,
      // so leaving this on permanently would let Lenis keep scrolling the page
      // underneath a strip that was also stepping — and switching it off while
      // the stage is not yet in frame is what lets the page scroll it there.
      data-lenis-prevent-wheel={filling || undefined}
      onKeyDown={(e) => {
        const keys: Record<string, number> = {
          ArrowLeft: index - 1,
          ArrowRight: index + 1,
          Home: 0,
          End: last,
        };
        if (!(e.key in keys)) return;
        e.preventDefault();
        go(keys[e.key]!);
      }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "relative h-full min-h-[24rem] w-full select-none overflow-hidden bg-void text-fg",
        "focus-visible:ring-1! focus-visible:ring-signal! focus-visible:ring-inset!",
        className
      )}
    >
      {/* ── Background: the focused frame, blown up and re-hued to its accent ── */}
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={swing}
        >
          {/* The plate is dimmed *before* the grade, not after.
              `mix-blend-mode: color` keeps whatever luminance it is handed, so
              a bright photograph grades to a bright, fully saturated field —
              correct for the reference's dark editorial art, and a wall of neon
              pink here, on a site whose whole ground is petrol-black. Dimming
              the source instead moves the result into the site's register while
              leaving the swing intact: the hue still changes completely on every
              step, it just changes in the dark. */}
          <motion.div
            aria-hidden
            className="absolute inset-0"
            style={{ filter: `brightness(${PLATE_DIM}) saturate(0.9)` }}
            initial={{ scale: reduced ? 1.28 : 1.42 }}
            animate={{ scale: 1.28 }}
            transition={
              reduced ? { duration: 0 } : { duration: 6, ease: "linear" }
            }
          >
            {active.visual}
            {shows(active.image) && (
              <Image
                src={active.image}
                alt=""
                fill
                sizes="100vw"
                draggable={false}
                onError={() => retire(active.image!)}
                className="object-cover"
              />
            )}
          </motion.div>
          {/* Keep the frame's luminance, take the accent's hue. */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: accent, mixBlendMode: "color" }}
          />
          <div
            className="absolute inset-0 opacity-55"
            style={{ backgroundColor: accent, mixBlendMode: "multiply" }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Legibility wash + grain, above the swap so they never flicker.
          Weighted to the top and bottom thirds — where the headline, the meta
          row and the rail sit — and left open through the middle so the graded
          plate is still visible as a picture rather than as a flat field. */}
      <div className="absolute inset-0 bg-gradient-to-b from-void/85 via-void/25 to-void/90" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-overlay"
        style={{ backgroundImage: GRAIN, backgroundSize: "180px 180px" }}
      />

      {/* ── Top bar: a centred cluster, not edge-to-edge ── */}
      <div
        className="absolute inset-x-0 flex items-center justify-center"
        style={{
          top: topInset + Math.max(16, box.h * 0.029),
          gap: `${Math.max(20, box.w * 0.06)}px`,
        }}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="font-mono uppercase opacity-90 transition-opacity hover:opacity-100"
            style={{ fontSize: label * 1.15 }}
          >
            <span aria-hidden>↖</span> Back
          </button>
        ) : null}
        {brand ? (
          <div
            className="font-mono uppercase tracking-[0.22em]"
            style={{ fontSize: label * 1.35 }}
          >
            {brand}
          </div>
        ) : null}
        {onMenu ? (
          <button
            type="button"
            onClick={onMenu}
            className="font-mono uppercase opacity-90 transition-opacity hover:opacity-100"
            style={{ fontSize: label * 1.15 }}
          >
            Menu <span aria-hidden>☰</span>
          </button>
        ) : null}
      </div>

      {/* ── Headline block, sitting just above the strip's top edge ── */}
      <div
        className="absolute inset-x-0 top-0 flex flex-col justify-end"
        style={{
          height: `${STRIP_TOP * 100}%`,
          paddingLeft: pad,
          paddingRight: pad,
          paddingBottom: Math.round(box.h * 0.028),
        }}
      >
        <div className="flex w-full flex-wrap items-end gap-x-[6vw] gap-y-2">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.h2
              key={index}
              className="font-tech font-bold uppercase leading-[0.88] tracking-[-0.03em]"
              style={{ fontSize: Math.max(24, Math.round(box.h * TITLE)) }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
            >
              {lines.map((line, i) => (
                // Each line wipes up from behind its own edge.
                <span key={i} className="block overflow-hidden">
                  <motion.span
                    className="block"
                    initial={{ y: reduced ? 0 : "110%" }}
                    animate={{ y: 0 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : {
                            duration: 0.62,
                            delay: i * 0.07,
                            ease: [0.22, 1, 0.36, 1],
                          }
                    }
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </motion.h2>
          </AnimatePresence>

          {active.credit ? (
            <motion.p
              key={`credit-${index}`}
              className="font-mono uppercase tracking-[0.14em] opacity-80"
              style={{ fontSize: label }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={reduced ? { duration: 0 } : { duration: 0.5, delay: 0.1 }}
            >
              {active.credit}
            </motion.p>
          ) : null}

          {active.meta?.length ? (
            <div
              className="ml-auto flex items-end"
              style={{ gap: `${Math.max(16, box.w * 0.055)}px` }}
            >
              {active.meta.map((fact, i) => (
                <motion.span
                  key={`${index}-${fact}`}
                  className="whitespace-nowrap font-mono uppercase tracking-[0.14em] opacity-80"
                  style={{ fontSize: label }}
                  initial={{ opacity: 0, y: reduced ? 0 : 6 }}
                  animate={{ opacity: 0.8, y: 0 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 0.45, delay: 0.12 + i * 0.06 }
                  }
                >
                  {fact}
                </motion.span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── The strip: one shared top edge, the focused card twice as tall ── */}
      <div
        className="absolute inset-x-0"
        style={{ top: `${STRIP_TOP * 100}%`, height: fullH }}
      >
        <motion.div
          className="flex items-start"
          style={{ gap, x, cursor: dragging ? "grabbing" : "grab" }}
          drag="x"
          dragMomentum={false}
          dragElastic={0.08}
          dragConstraints={{ left: xFor(last), right: xFor(0) }}
          onDragStart={() => {
            dragged.current = true;
            setDragging(true);
          }}
          onDragEnd={(_, info) => {
            setDragging(false);
            // Land on whatever card the release sits nearest, nudged by throw
            // velocity so a flick clears more than one card.
            const thrown = x.get() + info.velocity.x * 0.12;
            go(Math.round((box.w / 2 - thrown - cardW / 2) / step));
          }}
        >
          {items.map((item, i) => (
            <motion.button
              key={item.id ?? i}
              type="button"
              aria-label={item.title.replace(/\n/g, " ")}
              aria-current={i === index}
              onClick={() => {
                // Swallow the click synthesised by the end of a drag.
                if (dragged.current) {
                  dragged.current = false;
                  return;
                }
                go(i);
              }}
              className="relative shrink-0 overflow-hidden rounded-none bg-surface"
              style={{ width: cardW }}
              animate={{ height: i === index ? fullH : halfH }}
              transition={spring}
            >
              {/* The focused card is exactly 3:4, so object-position does
                  nothing to it - it only picks which band of the frame the
                  half-height neighbours keep. Anchored just above centre so a
                  clipped card still shows a face, not a forehead. */}
              <span aria-hidden className="absolute inset-0">
                {item.visual}
              </span>
              {shows(item.image) && (
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 45vw, 22vw"
                  draggable={false}
                  onError={() => retire(item.image!)}
                  className="object-cover"
                  style={{ objectPosition: "50% 26%" }}
                />
              )}
              {/* Unfocused cards sit back a touch without going grey. */}
              <motion.span
                aria-hidden
                className="absolute inset-0 bg-void"
                animate={{ opacity: i === index ? 0 : 0.12 }}
                transition={spring}
              />
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* ── Position rail ── */}
      <div
        className="absolute"
        style={{
          left: pad,
          bottom: Math.max(14, box.h * 0.022),
          width: box.w * RAIL,
        }}
      >
        <div
          className="flex justify-between font-mono tabular-nums opacity-80"
          style={{ fontSize: label }}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span>{String(items.length).padStart(2, "0")}</span>
        </div>
        <div className="relative mt-2 h-px w-full bg-fg/25">
          <motion.div
            className="absolute inset-y-0 bg-fg"
            style={{ width: `${100 / items.length}%` }}
            animate={{ left: `${(index / items.length) * 100}%` }}
            transition={spring}
          />
        </div>
      </div>
    </div>
  );
}
