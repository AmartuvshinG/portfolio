"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { CityBand } from "@/components/ui/CityBand";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";

/**
 * The band wipe.
 *
 * Two enormous words sit centred; as you scroll, a full-bleed band grows out of
 * the middle of the line and swallows them. The type is never fully readable at
 * the same moment the band is fully open, and that tension is the whole trick —
 * it costs one section and one height transform.
 *
 * The band used to open onto a stock photograph of cherry blossom, which was the
 * most off-theme thing on the site by a wide margin. It now opens onto a
 * generated neo-Tokyo skyline (`CityBand`) — same mechanic, no network request,
 * and it cannot drift out of palette because it is drawn from the ramp.
 *
 * Reduced motion gets the band already open with the words above it, which
 * keeps both pieces of content without animating anything.
 */
interface BandWipeProps {
  /** Two words. The band opens between them. */
  words: [string, string];
  /** Describes the band for assistive tech; the visual itself is decorative. */
  label: string;
  caption?: string;
}

export function BandWipe({ words, label, caption }: BandWipeProps) {
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
        data-act="deck"
        className="relative py-20"
        aria-label={label}
      >
        <div className="mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
          <h2 className="display-caps text-[clamp(1.6rem,6vw,5rem)] text-fg">
            {words[0]} {words[1]}
          </h2>
          <div className="relative mt-8 aspect-[21/9] w-full overflow-hidden">
            <CityBand className="absolute inset-0 h-full w-full" />
          </div>
          {caption && <p className="micro mt-4">{caption}</p>}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      data-act="deck"
      className="relative flex min-h-[110vh] flex-col items-center justify-center overflow-hidden py-24"
      aria-label={label}
    >
      <ChapterSeam />

      <motion.h2
        style={{ scale: textScale }}
        className="pointer-events-none relative z-10 select-none text-center font-tech text-[clamp(2.5rem,10vw,9rem)] font-bold uppercase leading-[0.95] tracking-tight text-fg"
      >
        <span className="block text-center">{words[0]}</span>
      </motion.h2>

      {/* The band. Full-bleed by design — breaking the page gutter is what
          makes it read as a cut rather than as another image block. */}
      <motion.div
        style={{ height }}
        className="relative z-10 w-screen shrink-0 overflow-hidden"
      >
        <CityBand className="absolute inset-0 h-full w-full" />
        {caption && (
          <span className="micro absolute bottom-4 left-5 !text-fg/70 md:left-8">
            {caption}
          </span>
        )}
      </motion.div>

      <motion.h2
        style={{ scale: textScale }}
        className="pointer-events-none relative z-10 select-none text-center font-tech text-[clamp(2.5rem,10vw,9rem)] font-bold uppercase leading-[0.95] tracking-tight text-fg"
      >
        <span className="block text-center">{words[1]}</span>
      </motion.h2>
    </section>
  );
}
