"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import type { GalleryImage } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";

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
 */
export function ScatterGallery({ items }: { items: GalleryImage[] }) {
  const reduced = useReducedMotion();

  if (reduced) return <StaticGrid items={items} />;

  // Tallest item bottom + a viewport of run-out.
  const height = Math.max(...items.map((i) => i.y)) + 1.6;

  return (
    <div
      className="relative w-full"
      style={{ height: `${height * 100}vh` }}
    >
      {items.map((item) => (
        <ScatterItem key={item.src} item={item} />
      ))}
    </div>
  );
}

function ScatterItem({ item }: { item: GalleryImage }) {
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
      <div
        className="relative w-full overflow-hidden bg-surface"
        style={{ aspectRatio: `${item.width} / ${item.height}` }}
      >
        <Image
          src={item.src}
          alt={item.alt}
          fill
          sizes={`${Math.round(item.w * 100)}vw`}
          className="object-cover"
        />
      </div>
      {item.caption && (
        <figcaption className="micro mt-2 block">{item.caption}</figcaption>
      )}
    </motion.figure>
  );
}

/**
 * Reduced-motion fallback. A plain responsive grid — the scatter's whole
 * premise is differential motion, so there is nothing to preserve by faking
 * the positions without it.
 */
function StaticGrid({ items }: { items: GalleryImage[] }) {
  return (
    <div className="mx-auto grid max-w-[1800px] grid-cols-2 gap-4 px-5 md:grid-cols-3 md:px-8">
      {items.map((item) => (
        <figure key={item.src}>
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface">
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
            />
          </div>
          {item.caption && (
            <figcaption className="micro mt-2 block">{item.caption}</figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
