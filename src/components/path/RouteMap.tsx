"use client";

import { useEffect, useRef, useState } from "react";
import type { MotionValue } from "framer-motion";
import { drawCore, drawHalo, makeDiodes, type DiodeKit } from "@/lib/ledSign";
import { isLand } from "@/lib/landDots";
import { globeFit, greatCircle, PLACES, project, toBox, unproject, type PlaceKey } from "@/lib/routeGeo";
import { cn } from "@/lib/utils";

/** Diode pitch in CSS px. */
const PITCH_CSS = { phone: 3, wide: 5 };
/** Diodes behind the head of the outbound line that are still cooling. */
const TRAIL = 16;
/** Half-length of the packet that runs home, in diodes. */
const PACKET = 5;
/** Round trips the freight shuttle makes over its beat. */
const FREIGHT_TRIPS = 2;

export interface RouteProgress {
  /** The outbound line, UB → Erie, drawn 0…1. */
  out: MotionValue<number>;
  /** The way home: a packet running Erie → UB along the lit line, 0…1. */
  back: MotionValue<number>;
  /** The freight runs, UB ⇄ Khanbogd, 0…1. */
  freight: MotionValue<number>;
}

type Labels = Record<PlaceKey, string>;

/**
 * The Path's globe: the footer ticker's diodes, laid over the top of the world.
 *
 * **The panel is painted once per size.** Every diode on the disc is unprojected
 * to a latitude and longitude and looked up in the baked land mask
 * (lib/landDots): land a warm unlit lens, sea a cold one, both shaded toward
 * the limb, and a faint holo rim at the crown so the disc reads as a sphere.
 * That is rasterised into an offscreen canvas.
 *
 * **Per draw:** one copy of the panel, then two sprite blits per lit diode —
 * the same budget as the ticker. And it draws only when the route moves: the
 * three progress values are scroll-driven, so a still page is a still canvas.
 * There is no animation loop to stop.
 *
 * The cities are DOM, not diodes: their names are text (and translate), and
 * their lamps carry the neon of the moment the visitor is on.
 */
export function RouteMap({
  progress,
  here,
  labels,
  distance,
  className,
}: {
  progress: RouteProgress;
  /** The city of the entry on screen, lit brightest. */
  here: PlaceKey | null;
  labels: Labels;
  /** The distance readout at the crown of the arc, already formatted. */
  distance: string;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** City and apex positions in CSS px, set by layout. */
  const [marks, setMarks] = useState<{ places: Record<PlaceKey, { x: number; y: number }>; apex: { x: number; y: number } } | null>(null);
  const [lit, setLit] = useState({ erie: false, khanbogd: false, apex: false });
  /* On a narrow globe the cities sit near the edges, so their names go under
     the lamps, aligned inward, rather than beside them and off the screen. */
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let kit: DiodeKit | null = null;
    let panel: HTMLCanvasElement | null = null;
    let cols = 0;
    let outCells: [number, number][] = [];
    let freightCells: [number, number][] = [];

    /** Great-circle points → the diodes they pass through, in order, once each. */
    const cellsOf = (pts: [number, number][], fit: ReturnType<typeof globeFit>, pitch: number) => {
      const cells: [number, number][] = [];
      for (const [lat, lon] of pts) {
        const p = project(lat, lon);
        const b = toBox(fit, p.x, p.y);
        const c = Math.floor(b.x / pitch);
        const r = Math.floor(b.y / pitch);
        const last = cells[cells.length - 1];
        if (!last || last[0] !== c || last[1] !== r) cells.push([c, r]);
      }
      return cells;
    };

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const wCss = box.clientWidth;
      const hCss = box.clientHeight;
      if (!wCss || !hCss) return;
      const pitch = Math.max(3, Math.round((wCss < 768 ? PITCH_CSS.phone : PITCH_CSS.wide) * dpr));
      cols = Math.ceil((wCss * dpr) / pitch);
      const rows = Math.ceil((hCss * dpr) / pitch);
      canvas.width = cols * pitch;
      canvas.height = rows * pitch;
      canvas.style.width = `${canvas.width / dpr}px`;
      canvas.style.height = `${canvas.height / dpr}px`;
      kit = makeDiodes(pitch);

      const W = canvas.width;
      const H = canvas.height;
      const isNarrow = wCss < 640;
      setNarrow(isNarrow);
      const fit = globeFit(W, H, isNarrow ? 0.74 : 0.78);

      /* The unlit globe. */
      panel = document.createElement("canvas");
      panel.width = W;
      panel.height = H;
      const p = panel.getContext("2d")!;
      const rad = Math.max(1, pitch * 0.39);
      const dot = (fill: string) => {
        const s = document.createElement("canvas");
        s.width = s.height = pitch;
        const g = s.getContext("2d")!;
        g.beginPath();
        g.arc(pitch / 2, pitch / 2, rad, 0, Math.PI * 2);
        g.fillStyle = fill;
        g.fill();
        return s;
      };
      const landDot = dot("rgb(128,92,60)");
      const seaDot = dot("rgb(34,40,56)");
      const rimDot = dot("rgb(126,234,255)");
      /* A dark disc behind the diodes, so the film behind the page does not
         show between them and muddy the coastlines: the globe is an object. */
      const back = p.createRadialGradient(fit.cx, fit.cy, fit.r * 0.6, fit.cx, fit.cy, fit.r);
      back.addColorStop(0, "rgba(4,5,10,0.78)");
      back.addColorStop(1, "rgba(4,5,10,0.55)");
      p.fillStyle = back;
      p.beginPath();
      p.arc(fit.cx, fit.cy, fit.r, 0, Math.PI * 2);
      p.fill();
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++) {
          const x = (col * pitch + pitch / 2 - fit.cx) / fit.r;
          const y = (fit.cy - (row * pitch + pitch / 2)) / fit.r;
          const ll = unproject(x, y);
          if (!ll) continue;
          const rho = Math.hypot(x, y);
          /* cos of the angle from the view centre: 1 mid-disc, 0 at the limb. */
          const shade = Math.sqrt(Math.max(0, 1 - rho * rho));
          const land = isLand(ll[0], ll[1]);
          p.globalAlpha = land ? 0.45 + 0.55 * shade : 0.3 + 0.45 * shade;
          p.drawImage(land ? landDot : seaDot, col * pitch, row * pitch);
          /* The rim: the outermost ring of diodes, lit faintly holo. */
          if (rho > 1 - (pitch * 1.6) / fit.r) {
            p.globalAlpha = 0.28;
            p.drawImage(rimDot, col * pitch, row * pitch);
          }
        }
      p.globalAlpha = 1;

      outCells = cellsOf(greatCircle("ub", "erie", 900), fit, pitch);
      freightCells = cellsOf(greatCircle("ub", "khanbogd", 60), fit, pitch);

      /* Where the DOM marks go, in CSS px. */
      const css = (lat: number, lon: number) => {
        const q = project(lat, lon);
        const b = toBox(fit, q.x, q.y);
        return { x: b.x / dpr, y: b.y / dpr };
      };
      const mid = greatCircle("ub", "erie", 2)[1];
      setMarks({
        places: {
          ub: css(PLACES.ub.lat, PLACES.ub.lon),
          erie: css(PLACES.erie.lat, PLACES.erie.lon),
          khanbogd: css(PLACES.khanbogd.lat, PLACES.khanbogd.lon),
        },
        apex: css(mid[0], mid[1]),
      });
    };

    const draw = () => {
      if (!panel || !kit) return;
      const out = progress.out.get();
      const back = progress.back.get();
      const freight = progress.freight.get();
      const k = kit;

      /* Every lit diode and its drive, then two passes: halos, then cores. */
      const lights: [number, number, number][] = [];
      const n = outCells.length;
      const head = out * n;
      const home = back > 0;
      for (let i = 0; i < n && i < head; i++) {
        const d = head - i;
        // Cooling behind the head: white-hot at the front, sodium behind.
        let b = d < TRAIL && out < 1 ? 1.25 - (d / TRAIL) * 0.5 : 0.75;
        if (home) b = back < 1 ? 0.62 : 0.55;
        lights.push([outCells[i][0], outCells[i][1], b]);
      }
      if (home && back < 1) {
        const q = (1 - back) * (n - 1);
        for (let i = Math.max(0, Math.floor(q - PACKET)); i <= Math.min(n - 1, Math.ceil(q + PACKET)); i++) {
          const b = 1.25 - (Math.abs(i - q) / PACKET) * 0.6;
          if (b > 0.62) lights.push([outCells[i][0], outCells[i][1], b]);
        }
      }
      if (freight > 0) {
        const m = freightCells.length;
        for (const [c, r] of freightCells) lights.push([c, r, 0.6]);
        if (freight < 1) {
          // A triangle wave: out to the mine and back, FREIGHT_TRIPS times.
          const w = (freight * FREIGHT_TRIPS) % 1;
          const at = (w < 0.5 ? w * 2 : 2 - w * 2) * (m - 1);
          const i = Math.round(at);
          lights.push([freightCells[i][0], freightCells[i][1], 1.25]);
        }
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(panel, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      for (const [c, r, b] of lights) drawHalo(ctx, k, c, r, b * 0.5);
      ctx.globalCompositeOperation = "source-over";
      for (const [c, r, b] of lights) drawCore(ctx, k, c, r, b);
      ctx.globalAlpha = 1;

      setLit((s) => {
        const next = { erie: out >= 1, khanbogd: freight > 0, apex: out >= 0.98 };
        return s.erie === next.erie && s.khanbogd === next.khanbogd && s.apex === next.apex ? s : next;
      });
    };

    /* Draw at most once a frame, and only when something moved. */
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        draw();
      });
    };

    layout();
    draw();
    const offs = [progress.out.on("change", schedule), progress.back.on("change", schedule), progress.freight.on("change", schedule)];

    let debounce = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        layout();
        draw();
      }, 120);
    });
    ro.observe(box);

    return () => {
      offs.forEach((off) => off());
      cancelAnimationFrame(raf);
      clearTimeout(debounce);
      ro.disconnect();
    };
  }, [progress]);

  return (
    <div ref={boxRef} aria-hidden className={cn("relative overflow-hidden", className)}>
      {/* The globe's lower half falls away into the page: a mask, not a
          gradient in a colour, because sections never paint a ground. */}
      <canvas
        ref={canvasRef}
        className="absolute left-0 top-0 block [mask-image:linear-gradient(to_bottom,black_62%,transparent_96%)]"
      />
      {marks && (
        <>
          <City at={marks.places.ub} label={labels.ub} on here={here === "ub"} side={narrow ? "under-start" : "left"} />
          <City
            at={marks.places.erie}
            label={labels.erie}
            on={lit.erie}
            here={here === "erie"}
            side={narrow ? "under-end" : "right"}
          />
          <City
            at={marks.places.khanbogd}
            label={labels.khanbogd}
            on={lit.khanbogd}
            here={false}
            side={narrow ? "under-start" : "below"}
            small
            drop={narrow}
          />
          <span
            className="micro tabular absolute -translate-x-1/2 -translate-y-[230%] whitespace-nowrap !text-[var(--color-holo)] transition-opacity duration-500"
            style={{ left: marks.apex.x, top: marks.apex.y, opacity: lit.apex ? 1 : 0 }}
          >
            {distance}
          </span>
        </>
      )}
    </div>
  );
}

/** A city: a lamp on the globe and its name beside it. */
function City({
  at,
  label,
  on,
  here,
  side,
  small,
  drop,
}: {
  at: { x: number; y: number };
  label: string;
  on: boolean;
  here: boolean;
  side: "left" | "right" | "below" | "under-start" | "under-end";
  small?: boolean;
  /** Set the label one line lower, clear of a neighbour's. */
  drop?: boolean;
}) {
  const s = small ? 7 : 11;
  return (
    <div className="absolute" style={{ left: at.x, top: at.y }}>
      <span
        className="absolute rotate-45 border transition-[background-color,box-shadow,border-color] duration-500"
        style={{
          width: s,
          height: s,
          left: -s / 2,
          top: -s / 2,
          borderColor: on ? "transparent" : "var(--color-line-strong)",
          background: on ? "var(--color-hazard)" : "var(--color-bg)",
          boxShadow: here ? "0 0 0 4px color-mix(in srgb, var(--color-hazard) 22%, transparent), 0 0 18px 4px color-mix(in srgb, var(--color-hazard) 60%, transparent)" : "none",
        }}
      />
      <span
        className={cn(
          "absolute whitespace-nowrap font-mono uppercase tracking-[0.2em] transition-colors duration-500",
          small ? "text-[0.625rem]" : "text-xs",
          here ? "text-fg" : on ? "text-fg/70" : "text-faint",
          side === "left" && "right-4 top-2",
          side === "right" && "left-4 top-2",
          side === "below" && "right-3 top-1",
          side === "under-start" && (drop ? "-left-1 top-6" : "-left-1 top-2.5"),
          side === "under-end" && "-right-1 top-2.5"
        )}
      >
        {label}
      </span>
    </div>
  );
}
