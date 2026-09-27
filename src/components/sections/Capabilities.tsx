"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CapabilityCard } from "@/components/ui/CapabilityCard";
import { RevealStagger, Reveal } from "@/components/motion/Reveal";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useHasWebGL } from "@/lib/gpu";

/* three.js is only ever downloaded by visitors who reach this section with
   WebGL and motion available. */
const LiquidGlassCarousel = dynamic(
  () => import("@/components/craft/LiquidGlassCarousel").then((m) => m.LiquidGlassCarousel),
  { ssr: false }
);

/**
 * Craft: the six capabilities as a liquid-glass carousel.
 *
 * The carousel (components/craft) is WebGL. It is mounted only once the section
 * is about to enter, so its rise-and-grow entrance plays where it can be seen
 * and three.js is fetched lazily. Without WebGL, under reduced motion, or if
 * the engine fails to start, the section falls back to the bento below:
 * full-stack and machine learning get the two wide cards, and the supporting
 * skills sit under them.
 */
export function Capabilities() {
  const { c, t } = useI18n();
  const reduced = useReducedMotion();
  const gpu = useHasWebGL();
  const [failed, setFailed] = useState(false);
  const [near, setNear] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const carousel = gpu && !reduced && !failed;

  useEffect(() => {
    const el = stageRef.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), {
      rootMargin: "0px 0px -15% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [near, carousel]);

  return (
    <section
      id="capabilities"
      data-act="deck"
      data-chapter="CRAFT"
      className="relative overflow-hidden py-24 md:py-36"
      aria-label={t.craft.aria}
    >
      <ChapterSeam />

      <div className="relative mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeader
            index={sectionIndex("#capabilities")}
            label={t.craft.eyebrow}
            title={t.craft.title}
          />
          <Reveal>
            <p className="max-w-sm text-base leading-relaxed text-muted md:text-right">
              {t.craft.lead}
            </p>
          </Reveal>
        </div>

        {carousel ? (
          <div ref={stageRef} className="mt-10 min-h-[min(72vh,640px)] sm:min-h-[min(86vh,820px)]">
            {near && <LiquidGlassCarousel onFail={() => setFailed(true)} />}
          </div>
        ) : (
          <RevealStagger className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
            {c.capabilities.map((item) => (
              <CapabilityCard key={item.code} item={item} />
            ))}
          </RevealStagger>
        )}
      </div>
    </section>
  );
}
