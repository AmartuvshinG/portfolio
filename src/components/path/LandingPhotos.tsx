"use client";

import { createRef, useEffect, useMemo, useRef, type RefObject } from "react";
import type { MotionValue } from "framer-motion";
import type { TimelineEntry } from "@/lib/content";
import type { GlobeFrame } from "@/lib/globeShader";
import { PHOTOS, type PhotoKey } from "@/lib/pathPhotos";
import { PLACES, projectTo } from "@/lib/routeGeo";
import type { PathWords } from "@/components/path/NeonStamp";
import { PhotoPlate, type PlateControl } from "@/components/path/PhotoPlate";

/* ---------------------------------------------------------------------------
   The landings: while the camera holds over a city, the place itself comes
   out of the city's lamp — a photo on a plate, tethered to the lamp — and
   when the next flight starts it folds back into it. The globe is the air;
   the plates are the ground.

   Each entry has a window along the stage. Its first REVEAL of it unfolds
   the plate (each photo in its own way, path/PhotoPlate), the middle drifts,
   the last FOLD folds it into the lamp. An entry that shares the photo before
   it (two jobs in one building) skips both: the plate stays up and the camera
   walks to the entry's crop.

   One listener on the frame does all of it, imperatively: the stage costs
   nothing while the scroll is still.
   --------------------------------------------------------------------------- */

/** In entry units. */
const REVEAL = 0.42;
const FOLD = 0.22;
const WALK = 0.5;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

interface Landing {
  i: number;
  photo: PhotoKey;
  a: number;
  b: number;
  /** Shares its plate with the entry before / after. */
  held: boolean;
  holds: boolean;
}

export function LandingPhotos({
  entries,
  windows,
  pos,
  frame,
  words,
  tether,
}: {
  entries: TimelineEntry[];
  /** Each entry's stretch of the stage, in entry units; null where none. */
  windows: [number, number][];
  pos: MotionValue<number>;
  frame: MotionValue<GlobeFrame>;
  words: PathWords;
  /** Off when there is no globe to tie the plates to. */
  tether: boolean;
}) {
  const landings = useMemo<Landing[]>(
    () =>
      entries.flatMap((e, i) => {
        if (!e.photo) return [];
        const [a, b] = windows[i];
        const prev = entries[i - 1];
        const next = entries[i + 1];
        /* Adjacent windows with no flight between them touch. */
        const held = !!prev && prev.photo === e.photo && windows[i - 1][1] === a;
        const holds = !!next && next.photo === e.photo && windows[i + 1][0] === b;
        return [{ i, photo: e.photo, a, b, held, holds }];
      }),
    [entries, windows]
  );
  const keys = useMemo(() => [...new Set(landings.map((l) => l.photo))], [landings]);

  const rootRef = useRef<HTMLDivElement>(null);
  const figs = useRef<Partial<Record<PhotoKey, HTMLDivElement | null>>>({});
  const controls = useMemo(
    () => Object.fromEntries(keys.map((k) => [k, createRef<PlateControl | null>()])) as Record<PhotoKey, RefObject<PlateControl | null>>,
    [keys]
  );
  const scrimRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const tipRef = useRef<SVGRectElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    let shown: PhotoKey | null = null;
    /* Plate boxes in stage px, read on resize only (offsets ignore the
       transforms the fold writes). */
    let rects: Partial<Record<PhotoKey, { l: number; t: number; w: number; h: number }>> = {};
    let size = { w: 0, h: 0 };
    const measure = () => {
      size = { w: root.clientWidth, h: root.clientHeight };
      rects = {};
      for (const k of keys) {
        const el = figs.current[k];
        const frameEl = el?.firstElementChild?.firstElementChild as HTMLElement | null | undefined;
        if (!el || !frameEl) continue;
        const parent = el.offsetParent as HTMLElement | null;
        const l = el.offsetLeft + (parent?.offsetLeft ?? 0);
        const t = el.offsetTop + (parent?.offsetTop ?? 0);
        rects[k] = { l, t, w: frameEl.offsetWidth, h: frameEl.offsetHeight };
      }
    };

    const show = (k: PhotoKey | null) => {
      if (k === shown) return;
      if (shown) figs.current[shown]!.style.visibility = "hidden";
      if (k) figs.current[k]!.style.visibility = "visible";
      shown = k;
    };

    const draw = () => {
      raf = 0;
      const p = pos.get();
      const L = landings.find((l) => p >= l.a && p < l.b) ?? (p >= landings[landings.length - 1]?.b ? landings[landings.length - 1] : undefined);
      const line = lineRef.current;
      const ring = ringRef.current;
      const tip = tipRef.current;
      if (!L) {
        show(null);
        if (scrimRef.current) scrimRef.current.style.opacity = "0";
        line?.setAttribute("opacity", "0");
        ring?.setAttribute("opacity", "0");
        tip?.setAttribute("opacity", "0");
        return;
      }
      const isLast = L === landings[landings.length - 1];
      const r = L.held ? 1 : clamp01((p - L.a) / REVEAL);
      const fold = L.holds || isLast ? 0 : clamp01((p - (L.b - FOLD)) / FOLD);
      const driftFrom = L.held ? L.a : L.a + REVEAL;
      const driftTo = L.holds || isLast ? L.b : L.b - FOLD;
      const d = clamp01((p - driftFrom) / Math.max(0.01, driftTo - driftFrom));
      const entry = entries[L.i];
      /* The walk to a crop, and back out of it if the next entry has none. */
      const prev = L.held ? entries[L.i - 1] : null;
      const crop = entry.crop ?? prev?.crop ?? null;
      const k = entry.crop ? smooth((p - L.a) / WALK) : prev?.crop ? 1 - smooth((p - L.a) / WALK) : 0;

      show(L.photo);
      /* The plate opens after the tether reaches it. */
      controls[L.photo].current?.apply({ r: clamp01((r - 0.22) / 0.78), d, crop, k });

      const fig = figs.current[L.photo]!;
      const box = rects[L.photo];
      const fr = frame.get();
      const place = PLACES[entry.stop];
      const lamp = tether && size.w ? projectTo(fr, size.w, size.h, place.lat, place.lon) : null;

      /* Folding: the plate shrinks into the lamp. */
      if (fold > 0 && box) {
        const ox = lamp ? lamp.x - box.l : 0;
        const oy = lamp ? lamp.y - box.t : 0;
        const e = fold * fold;
        fig.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`;
        fig.style.transform = `scale(${(1 - 0.94 * e).toFixed(4)})`;
        fig.style.opacity = (1 - smooth((fold - 0.45) / 0.55)).toFixed(3);
      } else if (fig.style.transform) {
        fig.style.transform = "";
        fig.style.opacity = "";
      }
      const vis = Math.min(smooth(r / 0.5), 1 - fold);
      if (scrimRef.current) scrimRef.current.style.opacity = vis.toFixed(3);

      if (!line || !ring || !tip) return;
      if (!lamp || !box) {
        line.setAttribute("opacity", "0");
        ring.setAttribute("opacity", "0");
        tip.setAttribute("opacity", "0");
        return;
      }
      /* The tether runs from the lamp to the nearest point of the plate. */
      const ex = Math.max(box.l, Math.min(box.l + box.w, lamp.x));
      const ey = Math.max(box.t, Math.min(box.t + box.h, lamp.y));
      const inside = ex === lamp.x && ey === lamp.y;
      const reach = Math.min(smooth(r / 0.32), 1 - smooth(fold / 0.6));
      const tx = lamp.x + (ex - lamp.x) * reach;
      const ty = lamp.y + (ey - lamp.y) * reach;
      line.setAttribute("x1", lamp.x.toFixed(1));
      line.setAttribute("y1", lamp.y.toFixed(1));
      line.setAttribute("x2", tx.toFixed(1));
      line.setAttribute("y2", ty.toFixed(1));
      line.setAttribute("opacity", inside || reach <= 0 ? "0" : "0.85");
      tip.setAttribute("x", (tx - 3).toFixed(1));
      tip.setAttribute("y", (ty - 3).toFixed(1));
      tip.setAttribute("transform", `rotate(45 ${tx.toFixed(1)} ${ty.toFixed(1)})`);
      tip.setAttribute("opacity", inside ? "0" : reach.toFixed(3));
      /* The landing ring: the lamp answers as the plate comes out of it. */
      const pulse = L.held ? 1 : smooth(r / 0.7);
      ring.setAttribute("cx", lamp.x.toFixed(1));
      ring.setAttribute("cy", lamp.y.toFixed(1));
      ring.setAttribute("r", (7 + 26 * pulse).toFixed(1));
      ring.setAttribute("opacity", ((1 - pulse) * 0.9).toFixed(3));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    measure();
    draw();
    const ro = new ResizeObserver(() => {
      measure();
      schedule();
    });
    ro.observe(root);
    const off = frame.on("change", schedule);
    return () => {
      off();
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [landings, keys, controls, entries, frame, pos, tether]);

  return (
    <div ref={rootRef} aria-hidden className="pointer-events-none absolute inset-0">
      {/* The globe falls back behind the plate while one is up. */}
      <div
        ref={scrimRef}
        className="absolute bottom-0 left-0 h-[78%] w-[min(60%,1100px)] opacity-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 62% at 26% 78%, color-mix(in srgb, var(--color-bg) 72%, transparent) 30%, transparent 72%)",
        }}
      />
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <circle ref={ringRef} fill="none" stroke="var(--color-holo)" strokeWidth={1.5} opacity={0} />
        <line
          ref={lineRef}
          stroke="var(--color-holo)"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0}
          style={{ filter: "drop-shadow(0 0 3px var(--color-holo))" }}
        />
        <rect ref={tipRef} width={6} height={6} fill="var(--color-holo)" opacity={0} />
      </svg>
      <div className="absolute bottom-[6dvh] left-5 md:left-8 lg:left-[max(4rem,calc(50%-900px+4rem))]">
        {keys.map((k) => {
          const meta = PHOTOS[k];
          return (
            <div
              key={k}
              ref={(el) => {
                figs.current[k] = el;
              }}
              className="absolute bottom-0 left-0 w-[min(30vw,var(--max),calc(40dvh*var(--a)))] [@media(max-height:820px)]:w-[min(30vw,var(--max),calc(34dvh*var(--a)))]"
              style={{ visibility: "hidden", ["--a" as string]: meta.aspect, ["--max" as string]: `${meta.maxCss}px` }}
            >
              <PhotoPlate
                photo={k}
                caption={words.photos[k].caption}
                alt=""
                sizes="30vw"
                control={controls[k]}
                frameClassName="shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
