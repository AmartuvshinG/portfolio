"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The band wipe.
 *
 * Two enormous serif words sit centred on paper; as you scroll, a full-bleed
 * image band grows out of the middle of the line and swallows them. The type is
 * never fully readable at the same moment the image is fully open, and that
 * tension is the whole trick — it's the single best frame in the Lando capture
 * and it costs one pinned section and one height transform.
 *
 * Reduced motion gets the band already open with the words above it, which
 * keeps both pieces of content without animating anything.
 */
interface BandWipeProps {
  /** Two words. The band opens between them. */
  words: [string, string];
  src: string;
  alt: string;
  caption?: string;
}

export function BandWipe({ words, src, alt, caption }: BandWipeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Opens through the first half of the pass and holds, so the band is fully
  // open while the section is centred rather than only at the very end.
  const height = useTransform(scrollYProgress, [0.1, 0.55], ["0vh", "78vh"]);
  const textScale = useTransform(scrollYProgress, [0.1, 0.55], [1, 1.12]);

  if (reduced) {
    return (
      // Ref still attached: `useScroll` above runs unconditionally (hooks
      // can't be skipped), and it warns if its target never hydrates.
      <section
        ref={ref}
        data-act="paper"
        className="relative bg-bg py-20"
        aria-label={alt}
      >
        <div className="mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
          <h2 className="font-editorial text-[clamp(3rem,12vw,10rem)] leading-[0.95] text-fg">
            {words[0]} {words[1]}
          </h2>
          <div className="relative mt-8 aspect-[21/9] w-full overflow-hidden">
            <Image
              src={src}
              alt={alt}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
          {caption && <p className="micro mt-4">{caption}</p>}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      data-act="paper"
      className="relative flex min-h-[110vh] flex-col items-center justify-center overflow-hidden bg-bg py-24"
      aria-label={alt}
    >
      <motion.h2
        style={{ scale: textScale }}
        className="pointer-events-none select-none font-editorial text-[clamp(3rem,13vw,12rem)] leading-[0.9] text-fg"
      >
        <span className="block text-center">{words[0]}</span>
      </motion.h2>

      {/* The band. Full-bleed by design — breaking the page gutter is what
          makes it read as a cut rather than as another image block. */}
      <motion.div
        style={{ height }}
        className="relative w-screen shrink-0 overflow-hidden"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          className="object-cover"
        />
        {caption && (
          <span className="micro absolute bottom-4 left-5 !text-white/70 md:left-8">
            {caption}
          </span>
        )}
      </motion.div>

      <motion.h2
        style={{ scale: textScale }}
        className="pointer-events-none select-none font-editorial text-[clamp(3rem,13vw,12rem)] leading-[0.9] text-fg"
      >
        <span className="block text-center">{words[1]}</span>
      </motion.h2>
    </section>
  );
}
