"use client";

import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { animate, useInView, useMotionValue } from "framer-motion";
import { PHOTOS, photoSrc, photoSrcSet, type PhotoCrop, type PhotoKey } from "@/lib/pathPhotos";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   A landing photo: one place on the Path, framed, with the reveal that fits
   what is in it (lib/pathPhotos).

   The plate draws nothing over time on its own. Its owner calls `apply` with
   how far the reveal is (`r`, 0–1), how far the slow drift after it is (`d`),
   and, for an entry that reuses the photo before it, how far the camera has
   walked to the new crop (`k`). The pinned Path drives that from scroll; the
   phone record from one short tween when the row is first seen. So it costs
   nothing while still, and every frame is only transforms, clip-paths,
   opacity and (once, for the diode reveal) a mask.
   --------------------------------------------------------------------------- */

export interface PlateState {
  r: number;
  d: number;
  crop?: PhotoCrop | null;
  k?: number;
}

export interface PlateControl {
  apply: (s: PlateState) => void;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);

/** The blade's angle for Victor's frame: his sword, about 60° off level. */
const BLADE = (60 * Math.PI) / 180;

/** The image's own camera: scale and offset, then the crop walked to. */
function camera(scale: number, tx: number, ty: number, crop: PhotoCrop | null | undefined, k: number) {
  let s = scale;
  let x = tx;
  let y = ty;
  if (crop && k > 0) {
    const e = smooth(k);
    s = lerp(scale, crop.scale, e);
    /* Bring the crop's point to the middle, never past the frame's edge. */
    const room = ((1 - 1 / s) / 2) * 100;
    const cx = Math.max(-room, Math.min(room, (0.5 - crop.x) * 100));
    const cy = Math.max(-room, Math.min(room, (0.5 - crop.y) * 100));
    x = lerp(tx, cx, e);
    y = lerp(ty, cy, e);
  }
  return `scale(${s.toFixed(4)}) translate(${x.toFixed(3)}%, ${y.toFixed(3)}%)`;
}

export function PhotoPlate({
  photo,
  caption,
  alt,
  sizes,
  control,
  className,
  style,
  frameClassName,
}: {
  photo: PhotoKey;
  caption: string;
  /** The picture described; empty when the plate is decoration. */
  alt: string;
  sizes: string;
  control: RefObject<PlateControl | null>;
  className?: string;
  style?: CSSProperties;
  frameClassName?: string;
}) {
  const meta = PHOTOS[photo];
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  const c = useRef<HTMLSpanElement>(null);
  const cap = useRef<HTMLElement>(null);

  useEffect(() => {
    const { x: fx, y: fy } = meta.focus;
    const aspect = meta.aspect;
    const setImgs = (t: string) => imgs.current.forEach((el) => el && (el.style.transform = t));

    const apply = ({ r, d, crop, k = 0 }: PlateState) => {
      const A = a.current;
      const B = b.current;
      const C = c.current;
      if (cap.current) cap.current.style.opacity = smooth((r - 0.55) / 0.45).toFixed(3);
      switch (meta.reveal) {
        /* The globe's diodes, lit one by one until they are the picture. */
        case "diode": {
          if (!A || !B) return;
          if (r >= 1) {
            A.style.maskImage = A.style.webkitMaskImage = "none";
          } else {
            const R = 3.7 * easeOut(r);
            const m = `radial-gradient(circle, #000 ${R.toFixed(2)}px, transparent ${(R + 0.6).toFixed(2)}px)`;
            A.style.maskImage = A.style.webkitMaskImage = m;
          }
          B.style.opacity = (0.8 * (1 - smooth(r))).toFixed(3);
          setImgs(camera(1.1, lerp(3.5, -3.5, d), 0, crop, k));
          return;
        }
        /* Out of the GANNON plaque, pulling back to the flags. */
        case "iris": {
          if (!A) return;
          A.style.clipPath = r >= 1 ? "none" : `circle(${(smooth(r) * 118).toFixed(2)}% at ${fx * 100}% ${fy * 100}%)`;
          setImgs(camera(lerp(1.2, 1, easeOut(r)) * lerp(1, 1.05, d), 0, 0, crop, k));
          return;
        }
        /* The building and the CAMPUS doors slide shut on the cow. */
        case "doors": {
          if (!A || !B || !C) return;
          const e = easeOut(r);
          const o = clamp01(r * 3).toFixed(3);
          A.style.transform = `translateX(${(-(1 - e) * 62).toFixed(2)}%)`;
          B.style.transform = `translateX(${((1 - e) * 62).toFixed(2)}%)`;
          A.style.opacity = B.style.opacity = o;
          C.style.opacity = (r < 1 ? smooth((r - 0.78) / 0.22) : 1 - smooth(d / 0.25)).toFixed(3);
          setImgs(camera(lerp(1, 1.06, d), 0, 0, crop, k));
          return;
        }
        /* A holo scan crosses the facade; the colour lands behind it. */
        case "scan": {
          if (!A || !C) return;
          const e = smooth(r);
          A.style.clipPath = r >= 1 ? "none" : `inset(0 ${((1 - e) * 100).toFixed(2)}% 0 0)`;
          C.style.left = `${(e * 100).toFixed(2)}%`;
          C.style.opacity = (r <= 0 ? 0 : r < 1 ? 1 : 1 - smooth(d / 0.2)).toFixed(3);
          setImgs(camera(1.12, lerp(3.5, -3.5, d), 0, crop, k));
          return;
        }
        /* The blade cuts the frame first; the two halves slide shut along it. */
        case "slash": {
          if (!A || !B || !C) return;
          const e = easeOut((r - 0.15) / 0.85);
          const run = 1 - e;
          const tx = 0.55 * Math.cos(BLADE) * 100 * run;
          const ty = -0.55 * Math.sin(BLADE) * aspect * 100 * run;
          A.style.transform = `translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%)`;
          B.style.transform = `translate(${(-tx).toFixed(2)}%, ${(-ty).toFixed(2)}%)`;
          A.style.opacity = B.style.opacity = clamp01((r - 0.1) * 4).toFixed(3);
          C.style.transform = `translate(-50%, -50%) rotate(${(-BLADE * 180) / Math.PI}deg) scaleX(${smooth(r / 0.35).toFixed(3)})`;
          C.style.opacity = (r < 1 ? 1 : 1 - smooth(d / 0.3)).toFixed(3);
          setImgs(camera(lerp(1, 1.04, d), 0, 0, crop, k));
          return;
        }
        /* The camera tilts up the tower: risen from the street, straightening. */
        case "tilt": {
          if (!A) return;
          const e = easeOut(r);
          A.style.clipPath = r >= 1 ? "none" : `inset(${((1 - e) * 100).toFixed(2)}% 0 0 0)`;
          A.style.transform = `perspective(900px) rotateX(${((1 - e) * 14).toFixed(2)}deg)`;
          setImgs(camera(lerp(1.12, 1.08, d), 0, lerp(-5, 0, e) + 4 * d, crop, k));
          return;
        }
      }
    };
    control.current = { apply };
    return () => {
      control.current = null;
    };
  }, [control, meta]);

  const img = (i: number, primary = false) => (
    // eslint-disable-next-line @next/next/no-img-element -- pre-baked widths with their own srcset; the reveals need the raw element
    <img
      ref={(el) => {
        imgs.current[i] = el;
      }}
      src={photoSrc(photo, meta.widths[0])}
      srcSet={photoSrcSet(photo)}
      sizes={sizes}
      alt={primary ? alt : ""}
      aria-hidden={primary && alt ? undefined : true}
      loading="lazy"
      decoding="async"
      draggable={false}
      className="absolute inset-0 h-full w-full object-cover will-change-transform"
    />
  );

  /* The split line for the blade, as polygon points either side of it. */
  const half = ((0.5 / meta.aspect) / Math.tan(BLADE)) * 100;
  const bladeLen = ((1 / meta.aspect) / Math.sin(BLADE)) * 100;

  return (
    <figure className={cn("m-0", className)} style={style}>
      <div
        className={cn("relative overflow-hidden border border-line-strong bg-[var(--color-deck)]", frameClassName)}
        style={{ aspectRatio: String(meta.aspect) }}
      >
        {meta.reveal === "diode" && (
          <>
            <div ref={a} className="absolute inset-0" style={{ maskSize: "5px 5px", WebkitMaskSize: "5px 5px" }}>
              {img(0, true)}
            </div>
            <div ref={b} aria-hidden className="absolute inset-0 bg-[var(--color-holo)] mix-blend-color" />
          </>
        )}
        {meta.reveal === "iris" && (
          <div ref={a} className="absolute inset-0">
            {img(0, true)}
          </div>
        )}
        {meta.reveal === "doors" && (
          <>
            <div ref={a} className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - meta.focus.x * 100}% 0 0)` }}>
              {img(0, true)}
            </div>
            <div ref={b} aria-hidden className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${meta.focus.x * 100}%)` }}>
              {img(1)}
            </div>
            <span
              ref={c}
              aria-hidden
              className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-[var(--color-hazard)] opacity-0"
              style={{ left: `${meta.focus.x * 100}%`, boxShadow: "0 0 14px 2px var(--color-hazard)" }}
            />
          </>
        )}
        {meta.reveal === "scan" && (
          <>
            {/* Ahead of the scan: the facade as a cold read. The filter is
                static; only the clip over it moves. */}
            <div aria-hidden className="absolute inset-0 [&_img]:brightness-[0.6] [&_img]:grayscale">
              {img(1)}
              <div className="absolute inset-0 bg-[var(--color-holo)] opacity-40 mix-blend-color" />
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, color-mix(in srgb, var(--color-holo) 40%, transparent) 0 1px, transparent 1px 4px)",
                }}
              />
            </div>
            <div ref={a} className="absolute inset-0">
              {img(0, true)}
            </div>
            <span
              ref={c}
              aria-hidden
              className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-[#dcfbff] opacity-0"
              style={{ boxShadow: "0 0 16px 3px var(--color-holo)" }}
            />
          </>
        )}
        {meta.reveal === "slash" && (
          <>
            <div
              ref={a}
              className="absolute inset-0"
              style={{ clipPath: `polygon(0 0, ${50 + half}% 0, ${50 - half}% 100%, 0 100%)` }}
            >
              {img(0, true)}
            </div>
            <div
              ref={b}
              aria-hidden
              className="absolute inset-0"
              style={{ clipPath: `polygon(${50 + half}% 0, 100% 0, 100% 100%, ${50 - half}% 100%)` }}
            >
              {img(1)}
            </div>
            <span
              ref={c}
              aria-hidden
              className="absolute left-1/2 top-1/2 h-[2px] bg-[#ffe3a3]"
              style={{ width: `${bladeLen}%`, boxShadow: "0 0 14px 2px #f5b83d" }}
            />
          </>
        )}
        {meta.reveal === "tilt" && (
          <div ref={a} className="absolute inset-0 origin-bottom">
            {img(0, true)}
          </div>
        )}
      </div>
      <figcaption ref={cap} className="tag mt-2 text-fg/85">
        {caption}
      </figcaption>
    </figure>
  );
}

const END = 1.35;

/**
 * The plate as the phone record shows it: the reveal plays once, the first
 * time the row is seen, then the photo simply stays. Under reduced motion it
 * is simply there.
 */
export function PhotoFigure({
  photo,
  caption,
  alt,
  crop,
  reduced,
  className,
}: {
  photo: PhotoKey;
  caption: string;
  alt: string;
  crop?: PhotoCrop;
  reduced: boolean;
  className?: string;
}) {
  const control = useRef<PlateControl | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const seen = useInView(box, { once: true, amount: 0.35 });
  /* The reveal, then a little of the drift: enough for the flashes (the
     doors' seam, the scan, the blade) to fade out after it. */
  const v = useMotionValue(reduced ? END : 0);

  useEffect(() => {
    const draw = (x: number) =>
      control.current?.apply({ r: Math.min(1, x), d: Math.max(0, x - 1), crop, k: crop ? smooth((x - 0.4) / 0.8) : 0 });
    draw(v.get());
    return v.on("change", draw);
  }, [v, crop]);

  useEffect(() => {
    if (reduced) {
      v.set(END);
      return;
    }
    if (!seen) return;
    const run = animate(v, END, { duration: crop ? 1.6 : 1.3, ease: "linear" });
    return () => run.stop();
  }, [seen, reduced, v, crop]);

  return (
    <div ref={box} className={className}>
      <PhotoPlate
        photo={photo}
        caption={caption}
        alt={alt}
        sizes="(min-width: 768px) 42rem, 100vw"
        control={control}
        style={{ maxWidth: PHOTOS[photo].maxCss * 1.2 }}
      />
    </div>
  );
}
