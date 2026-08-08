"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { GalleryImage } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useLockScroll } from "@/hooks/useLockScroll";
import { EASE_EXPO } from "@/lib/motion";

/**
 * ESPER — the archive's enhance.
 *
 * Click an archive fragment and it is *resolved* rather than opened: a dot
 * matrix sweeps down the plate, the frame pushes in, and a readout counts while
 * it works. Blade Runner's most-quoted scene, and the right interaction for a
 * section whose whole premise is fragments worth a second look.
 *
 * **Why this is CSS and not the WebGL depth scan.** `work/depthScan.ts` is the
 * same idea and was the obvious thing to reuse — but it is a three.js
 * `ShaderMaterial`, so it needs an R3F scene mounted per item, and it needs the
 * image as a GL texture. The archive is served from picsum and unsplash, and a
 * cross-origin image taints the canvas: `texImage2D` throws and the effect dies
 * on exactly the images it exists for. A masked dot grid gets the same picture
 * with no GL context, no texture upload and no origin policy.
 *
 * If real screenshots ever land in `public/work/`, the shader path becomes
 * available and is worth revisiting — its band sweeps through the image's own
 * luminance, so it follows the composition, which this cannot do.
 *
 * The whole overlay unmounts on close, so it costs nothing while the archive is
 * merely being scrolled past.
 */

/** Sweep duration, ms. Long enough to read as work being done. */
const SCAN_MS = 2200;

export function Esper({
  item,
  onClose,
}: {
  item: GalleryImage | null;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const close = useCallback(() => onClose(), [onClose]);

  useLockScroll(Boolean(item));

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, close]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Enhance — ${item.alt}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-void/92 p-5 md:p-10"
          onClick={close}
        >
          {/* Keyed on the source so opening a second fragment remounts the plate
              and the sweep restarts from zero by itself — rather than being
              reset by an effect, which is both a lint error and one committed
              frame showing the previous image already resolved. */}
          <Plate key={item.src} item={item} reduced={reduced} onClose={close} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Plate({
  item,
  reduced,
  onClose,
}: {
  item: GalleryImage;
  reduced: boolean;
  onClose: () => void;
}) {
  /* Starts resolved under reduced motion — there is no sweep to watch, and a
     plate that sits at 0 would show an unscanned image with a stuck readout. */
  const [scan, setScan] = useState(reduced ? 1 : 0);
  const raf = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SCAN_MS);
      setScan(t);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    // One-shot: the chain ends when it lands, so nothing keeps ticking after.
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [reduced]);

  const pct = scan * 100;
  const band = `linear-gradient(180deg, transparent ${pct - 16}%, #000 ${pct - 4}%, #000 ${pct}%, transparent ${pct + 3}%)`;

  return (
    <motion.figure
      initial={reduced ? false : { scale: 0.94, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.97, opacity: 0 }}
      transition={{ duration: 0.5, ease: EASE_EXPO }}
      className="notch-card relative max-h-full w-full max-w-5xl overflow-hidden bg-surface ring-1 ring-inset ring-line-strong"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden">
        {/* The push-in tracks the sweep, so the frame settles at the moment the
            scan completes rather than on a timer of its own. */}
        <div
          className="absolute inset-0"
          style={{ transform: `scale(${1 + scan * 0.08})` }}
        >
          <Image
            src={item.src}
            alt={item.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
            priority
          />
        </div>

        {/* The dot matrix, revealed by a band travelling down the plate: the
            grid supplies the texture, the mask supplies the position. */}
        {!reduced && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, var(--spectrum-3) 0.9px, transparent 1.1px)",
              backgroundSize: "6px 6px",
              mixBlendMode: "screen",
              opacity: 0.85,
              maskImage: band,
              WebkitMaskImage: band,
            }}
          />
        )}

        {/* Scanlines fade in behind the band, so the sweep leaves a trace rather
            than passing without effect. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(236,238,251,0.5) 0 1px, transparent 1px 4px)",
            opacity: 0.14 * scan,
          }}
        />

        <div aria-hidden className="pointer-events-none absolute inset-0">
          <span className="absolute left-6 top-6 h-6 w-6 border-l border-t border-line-strong" />
          <span className="absolute right-6 top-6 h-6 w-6 border-r border-t border-line-strong" />
          <span className="absolute bottom-6 left-6 h-6 w-6 border-b border-l border-line-strong" />
          <span className="absolute bottom-6 right-6 h-6 w-6 border-b border-r border-line-strong" />
        </div>
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4">
        <span className="micro">{item.caption ?? "Archive fragment"}</span>
        {/* A readout that reports the sweep, rather than scrolling random
            digits at the viewer. */}
        <span className="micro tabular">
          {scan < 1
            ? `ENHANCING — ${String(Math.round(pct)).padStart(3, "0")}%`
            : "RESOLVED"}
        </span>
      </figcaption>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="focus-ring absolute right-4 top-4 flex h-10 w-10 items-center justify-center border border-line bg-void/70 text-fg transition-colors hover:border-line-strong"
      >
        <X size={16} />
      </button>
    </motion.figure>
  );
}
