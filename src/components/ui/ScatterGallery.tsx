"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import type { GalleryImage } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Esper } from "@/components/work/Esper";
import { GlareCard } from "@/components/motion/GlareCard";
import { ClipReveal } from "@/components/motion/ClipReveal";

/**
 * The scattered archive.
 *
 * Items are absolutely placed across a canvas several viewports tall at wildly
 * different scales, each drifting at its own rate. What separates this from a
 * masonry grid is that nothing aligns: no shared baseline, no consistent
 * column, no repeated width. The eye reads it as a spread being flipped through
 * rather than as a list, and the differential drift is what sells the depth.
 *
 * Placement is authored in `content.ts` rather than generated — random scatter
 * reliably produces clumps and dead zones, and the rhythm of the gaps is the
 * only thing holding the composition together.
 *
 * Every fragment is a button: clicking one runs the ESPER enhance over it.
 */

/** Fallback viewport aspect for the first paint, before the real one is known.
 *  Has to be a constant so the server and the client agree. */
const SSR_ASPECT = 16 / 9;

export function ScatterGallery({ items }: { items: GalleryImage[] }) {
  const reduced = useReducedMotion();
  const [enhancing, setEnhancing] = useState<GalleryImage | null>(null);

  /* Item widths are in vw and their positions in vh, so the height an item
     actually occupies depends on the viewport's aspect ratio — which is not
     knowable during render. Seeded to 16/9 so hydration matches, then corrected. */
  const [aspect, setAspect] = useState(SSR_ASPECT);

  useEffect(() => {
    const measure = () => setAspect(window.innerWidth / window.innerHeight);
    measure();
    window.addEventListener("resize", measure, { passive: true });
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* Canvas height = the real bottom edge of the lowest item, plus a quarter
     viewport of run-out.

     This used to be `max(item.y) + 1.6`, which is a fixed viewport and a half
     of empty canvas bolted onto the end regardless of where the last item
     actually finished. With the lowest item at y 3.5 that left over a full
     screen of nothing between the archive and the section after it — the "gap
     before Contact". Measuring the real bottom removes it without hand-tuning
     a constant every time the scatter is re-authored. */
  const bottom = Math.max(
    ...items.map((i) => i.y + i.w * (i.height / i.width) * aspect)
  );
  const height = bottom + 0.25;

  return (
    <>
      {/* The overlay is mounted outside the branch on purpose: it renders null
          until something is being enhanced, and returning early for reduced
          motion left the static grid with buttons that opened nothing. */}
      {reduced ? (
        <StaticGrid items={items} onEnhance={setEnhancing} />
      ) : (
        <div className="relative w-full" style={{ height: `${height * 100}vh` }}>
          {items.map((item) => (
            <ScatterItem key={item.src} item={item} onEnhance={setEnhancing} />
          ))}
        </div>
      )}

      <Esper item={enhancing} onClose={() => setEnhancing(null)} />
    </>
  );
}

function ScatterItem({
  item,
  onEnhance,
}: {
  item: GalleryImage;
  onEnhance: (i: GalleryImage) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Negative so deeper items travel *up* relative to the page — they lag the
  // scroll, which is what reads as distance.
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`${item.depth * 22}vh`, `${item.depth * -22}vh`]
  );

  return (
    <motion.figure
      ref={ref}
      style={{
        left: `${item.x * 100}%`,
        top: `${item.y * 100}vh`,
        width: `${item.w * 100}vw`,
        y,
      }}
      className="absolute"
    >
      {/* `flat`: the figure already carries a scroll-driven `y`. */}
      <GlareCard
        as="button"
        mode="flat"
        type="button"
        onClick={() => onEnhance(item)}
        aria-label={`Enhance — ${item.alt}`}
        className="block w-full bg-surface"
        style={{ aspectRatio: `${item.width} / ${item.height}` }}
      >
        {/* The fragment assembles out of tiles as it comes into view, and
            re-assembles on hover — the archive's items are *fragments*, and
            having them arrive in pieces is the one place on the page where the
            idea and the animation are the same thing.

            Wrapped around the image alone, never the whole card: the clip would
            otherwise take the ENHANCE affordance and the focus ring with it. */}
        <ClipReveal rows={4} cols={4} className="absolute inset-0">
          <Image
            src={item.src}
            alt={item.alt}
            fill
            sizes={`${Math.round(item.w * 100)}vw`}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </ClipReveal>
        {/* The affordance. Archive items never looked clickable, and an enhance
            nobody discovers is an enhance that does not exist. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-end justify-end p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{
            background:
              "linear-gradient(0deg, color-mix(in srgb, var(--color-void) 78%, transparent), transparent 46%)",
          }}
        >
          <span className="micro !text-fg">ENHANCE</span>
        </span>
      </GlareCard>
      {item.caption && (
        <figcaption className="micro mt-2 block">{item.caption}</figcaption>
      )}
    </motion.figure>
  );
}

/**
 * Reduced-motion fallback. A plain responsive grid — the scatter's whole
 * premise is differential motion, so there is nothing to preserve by faking
 * the positions without it. The enhance still works.
 */
function StaticGrid({
  items,
  onEnhance,
}: {
  items: GalleryImage[];
  onEnhance: (i: GalleryImage) => void;
}) {
  return (
    <div className="mx-auto grid max-w-[1800px] grid-cols-2 gap-4 px-5 md:grid-cols-3 md:px-8">
      {items.map((item) => (
        <figure key={item.src}>
          <button
            type="button"
            onClick={() => onEnhance(item)}
            aria-label={`Enhance — ${item.alt}`}
            className="relative block aspect-[4/5] w-full overflow-hidden bg-surface"
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
            />
          </button>
          {item.caption && (
            <figcaption className="micro mt-2 block">{item.caption}</figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
