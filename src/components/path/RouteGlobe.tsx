"use client";

import { useEffect, useRef, useState } from "react";
import type { MotionValue } from "framer-motion";
import { createGlobe, type Globe, type GlobeFrame } from "@/lib/globeShader";
import { greatCircle, PLACES, projectTo, type PlaceKey } from "@/lib/routeGeo";
import { cn } from "@/lib/utils";

const MASKS = { full: "/path/globe-mask.png", small: "/path/globe-mask-2k.png" } as const;

/* One decode per image for the page's life: the globe is torn down and
   rebuilt as the Path comes and goes, the mask need not be. */
const decoded = new Map<string, Promise<HTMLImageElement>>();
function loadMask(src: string) {
  let p = decoded.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    p.catch(() => decoded.delete(src));
    decoded.set(src, p);
  }
  return p;
}

/** The arc's crown, where the distance is read out. */
const APEX = greatCircle("ub", "erie", 2)[1];
const MARKS: PlaceKey[] = ["ub", "erie", "khanbogd"];

/**
 * The Path's globe: the shader (lib/globeShader) on a canvas, with the cities
 * as DOM over it — their names are text, and translate.
 *
 * **Lifecycle.** The GL context exists only while the globe is near the
 * screen, on a canvas made fresh each time and removed after (a canvas whose
 * context was lost cannot be trusted to hand back a new one). It draws when
 * `frame` changes — the Path drives that from scroll — and at no other time.
 * The cities move with it, positioned imperatively, so a frame costs no React
 * render; React hears only when a lamp lights.
 */
export function RouteGlobe({
  frame,
  here,
  labels,
  distance,
  mask = "full",
  pitch = 5,
  onUnavailable,
  className,
}: {
  frame: MotionValue<GlobeFrame>;
  /** The city of the entry on screen, lit brightest. */
  here: PlaceKey | null;
  labels: Record<PlaceKey, string>;
  /** The distance readout at the crown of the arc, already formatted. */
  distance: string;
  mask?: keyof typeof MASKS;
  /** Diode pitch, CSS px. */
  pitch?: number;
  /** No WebGL here: the caller shows the route as text instead. */
  onUnavailable?: () => void;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef<Partial<Record<PlaceKey | "apex", HTMLDivElement | null>>>({});
  const [lit, setLit] = useState({ erie: false, khanbogd: false, apex: false });
  const [near, setNear] = useState(false);
  /* Bumped when the GPU drops the context: the globe is rebuilt on a fresh
     canvas. A few times at most — a GPU that keeps failing gets the text. */
  const [generation, setGeneration] = useState(0);
  const failed = useRef(onUnavailable);
  useEffect(() => {
    failed.current = onUnavailable;
  });

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "60% 0px" });
    io.observe(box);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!near || !box) return;
    let globe: Globe | null = null;
    let stopped = false;
    let raf = 0;
    let size = { w: 0, h: 0 };
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "pointer-events-none absolute left-0 top-0 block";

    /** Place the cities and the readout for this frame. */
    const place = (fr: GlobeFrame) => {
      const at = (key: PlaceKey | "apex", lat: number, lon: number, hide = false) => {
        const el = markRefs.current[key];
        if (!el) return null;
        const p = projectTo(fr, size.w, size.h, lat, lon);
        const inside = p && p.x > -40 && p.x < size.w + 40 && p.y > -40 && p.y < size.h + 40;
        el.style.opacity = inside && !hide ? "" : "0";
        if (p) {
          el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
          /* The name sits beside the lamp, on the side away from the nearer
             edge; in a narrow frame, under it. */
          const label = key === "apex" ? null : (el.lastElementChild as HTMLElement | null);
          if (label) {
            const right = p.x > size.w / 2 && p.x > size.w - 180;
            const under = size.w < 640;
            label.style.left = right ? "auto" : under ? "-4px" : "14px";
            label.style.right = right ? (under ? "-4px" : "14px") : "auto";
            label.style.top = under ? "12px" : "4px";
          }
        }
        return p;
      };
      const ub = at("ub", PLACES.ub.lat, PLACES.ub.lon);
      at("erie", PLACES.erie.lat, PLACES.erie.lon);
      /* From far out the mine sits on top of the capital: one name, not two. */
      const kb = projectTo(fr, size.w, size.h, PLACES.khanbogd.lat, PLACES.khanbogd.lon);
      at("khanbogd", PLACES.khanbogd.lat, PLACES.khanbogd.lon, !!ub && !!kb && Math.hypot(ub.x - kb.x, ub.y - kb.y) < 36);
      at("apex", APEX[0], APEX[1]);
      setLit((s) => {
        const next = { erie: fr.out >= 1, khanbogd: fr.freight > 0, apex: fr.out >= 0.98 };
        return s.erie === next.erie && s.khanbogd === next.khanbogd && s.apex === next.apex ? s : next;
      });
    };

    const draw = () => {
      raf = 0;
      const fr = frame.get();
      globe?.draw(fr);
      place(fr);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const resize = () => {
      if (!globe) return;
      const s = globe.layout(box.clientWidth, box.clientHeight);
      size = { w: s.cssWidth, h: s.cssHeight };
      draw();
    };

    let debounce = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(debounce);
      debounce = window.setTimeout(resize, 120);
    });
    const off = frame.on("change", schedule);
    const onLost = (e: Event) => {
      e.preventDefault();
      globe = null;
      if (generation < 3) setGeneration((g) => g + 1);
      else failed.current?.();
    };
    canvas.addEventListener("webglcontextlost", onLost);

    loadMask(MASKS[mask])
      .then((img) => {
        if (stopped) return;
        globe = createGlobe(canvas, img, { pitch });
        if (!globe) {
          failed.current?.();
          return;
        }
        box.prepend(canvas);
        resize();
        ro.observe(box);
      })
      .catch(() => failed.current?.());

    return () => {
      stopped = true;
      off();
      cancelAnimationFrame(raf);
      clearTimeout(debounce);
      ro.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      globe?.dispose();
      canvas.remove();
    };
  }, [near, frame, mask, pitch, generation]);

  return (
    <div ref={boxRef} aria-hidden className={cn("relative overflow-hidden", className)}>
      {MARKS.map((k) => (
        <div
          key={k}
          ref={(el) => {
            markRefs.current[k] = el;
          }}
          className="absolute left-0 top-0 transition-opacity duration-300"
          style={{ opacity: 0 }}
        >
          <City
            label={labels[k]}
            on={k === "ub" || (k === "erie" ? lit.erie : lit.khanbogd)}
            here={here === k}
            small={k === "khanbogd"}
          />
        </div>
      ))}
      <div
        ref={(el) => {
          markRefs.current.apex = el;
        }}
        className="absolute left-0 top-0"
        style={{ opacity: 0 }}
      >
        <span
          className="micro tabular absolute -translate-x-1/2 -translate-y-[230%] whitespace-nowrap !text-[var(--color-holo)] transition-opacity duration-500"
          style={{ opacity: lit.apex ? 1 : 0 }}
        >
          {distance}
        </span>
      </div>
    </div>
  );
}

/** A city: a lamp on the globe and its name beside it. */
function City({ label, on, here, small }: { label: string; on: boolean; here: boolean; small?: boolean }) {
  const s = small ? 7 : 11;
  return (
    <>
      <span
        className="absolute rotate-45 border transition-[background-color,box-shadow,border-color] duration-500"
        style={{
          width: s,
          height: s,
          left: -s / 2,
          top: -s / 2,
          borderColor: on ? "transparent" : "var(--color-line-strong)",
          background: on ? "var(--color-hazard)" : "var(--color-bg)",
          boxShadow: here
            ? "0 0 0 4px color-mix(in srgb, var(--color-hazard) 22%, transparent), 0 0 18px 4px color-mix(in srgb, var(--color-hazard) 60%, transparent)"
            : "none",
        }}
      />
      <span
        className={cn(
          "absolute left-3.5 top-1 whitespace-nowrap font-mono text-xs uppercase tracking-[0.12em] transition-colors duration-500 [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]",
          here ? "text-fg" : on ? "text-fg/85" : "text-muted"
        )}
      >
        {label}
      </span>
    </>
  );
}
