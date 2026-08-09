"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * Assembles its children out of a grid of tiles.
 *
 * Ported from `animation.txt`. The technique there is worth having: an SVG
 * `clipPath` built from N rects, each scaled from 0 → 1 on an `expo.out` with a
 * *random* stagger, so the picture arrives as a shower of squares landing rather
 * than as a wipe. It is one clip-path on one element, whatever N is, which is
 * what makes it cheap.
 *
 * Three deliberate departures from the reference:
 *
 * 1. **It does not loop.** The reference runs `repeat: -1` with a 1s
 *    `repeatDelay` and an out-phase, so the image is *absent* for a third of
 *    the time and reassembles forever. That is a demo. Here it plays once when
 *    the element enters the viewport, and again on hover — an archive whose
 *    contents periodically dissolve is an archive you cannot look at, and a
 *    permanently live GSAP timeline per tile is the "gate off-screen effects"
 *    rule broken once per item.
 *
 * 2. **The grid is generated, not authored.** The reference hardcodes three
 *    `clipPath` blobs of hand-drawn rects. `rows × cols` from props means the
 *    density can follow the element's size instead of the other way round.
 *
 * 3. **The clip is dropped when it lands.** A `clip-path: url(#…)` reference is
 *    per element and permanent; leaving one on every archive tile means the
 *    compositor carries a clip for each of them for the rest of the session.
 *    Once the tiles are all at scale 1 the clip is doing nothing visible, so it
 *    is removed — and re-applied for the next play.
 *
 * `useId` for the clipPath id: two of these on one page with a shared id means
 * the second one's `url(#…)` resolves to the first one's rects, which looks
 * like the animation randomly targeting the wrong element.
 */
export function ClipReveal({
  children,
  rows = 4,
  cols = 4,
  /** Play once when this fraction of the box has entered the viewport. */
  threshold = 0.35,
  /** Replay on pointer enter. */
  replayOnHover = true,
  className,
}: {
  children: ReactNode;
  rows?: number;
  cols?: number;
  threshold?: number;
  replayOnHover?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const raw = useId();
  /* useId emits colons, which are not valid in a CSS url(#…) fragment. */
  const clipId = `clip-${raw.replace(/[^a-zA-Z0-9]/g, "")}`;

  const ref = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const [clipped, setClipped] = useState(!reduced);

  const play = () => {
    const el = ref.current;
    if (!el || reduced) return;
    tl.current?.kill();
    setClipped(true);

    const tiles = el.querySelectorAll(`#${clipId} rect`);
    if (!tiles.length) return;

    gsap.set(tiles, { scale: 0, transformOrigin: "50% 50%" });
    tl.current = gsap
      .timeline({
        /* Hand the clip back once every tile is home. */
        onComplete: () => setClipped(false),
      })
      .to(tiles, {
        scale: 1,
        duration: 0.8,
        stagger: { amount: 0.4, from: "random" },
        ease: "expo.out",
      });
  };

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    /* Prime the tiles closed before anything can be seen. Without this the
       rects render at their authored size — i.e. the full picture — for the
       frames between mount and the observer firing, so the item flashes in
       whole and *then* dissolves to reassemble. */
    gsap.set(el.querySelectorAll(`#${clipId} rect`), {
      scale: 0,
      transformOrigin: "50% 50%",
    });

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        play();
        io.disconnect();
      },
      { threshold }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      tl.current?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, threshold]);

  /* Reduced motion gets the picture, plainly. There is no static version of
     "assembles out of tiles" worth rendering. */
  if (reduced) return <div className={className}>{children}</div>;

  const cells = Array.from({ length: rows * cols }, (_, i) => ({
    x: (i % cols) / cols,
    y: Math.floor(i / cols) / rows,
  }));

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      onMouseEnter={replayOnHover ? play : undefined}
    >
      {/* objectBoundingBox units, so one clipPath fits any element size — the
          reference's userSpace rects are tied to its 500×500 viewBox and would
          have to be regenerated per item here. */}
      <svg aria-hidden width="0" height="0" className="absolute">
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            {cells.map((c, i) => (
              <rect
                key={i}
                x={c.x}
                y={c.y}
                width={1 / cols}
                height={1 / rows}
              />
            ))}
          </clipPath>
        </defs>
      </svg>

      <div
        className="h-full w-full"
        style={clipped ? { clipPath: `url(#${clipId})` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
