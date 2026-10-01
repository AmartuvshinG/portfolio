"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

/* The brush and its stage are one chunk, fetched when the Studio is near:
   none of it is needed to read the page. */
const StudioCanvas = dynamic(() => import("@/components/studio/StudioCanvas"), {
  ssr: false,
  loading: () => <Placeholder />,
});

/**
 * Studio: the intro's brush, handed to the visitor.
 *
 * It replaced the LAB, three tabs of the site's machinery (the brush bake, the
 * film's grade, the diodes) that read as a developer's notebook rather than a
 * portfolio. This keeps the one piece of that machinery a visitor feels — the
 * calligraphy — and lets them hold it: write on the scroll, trace the name,
 * press the seal, keep the sheet.
 */
export function Studio() {
  const { t } = useI18n();
  const S = t.studio;
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id="studio"
      data-act="deck"
      data-chapter="STUDIO"
      className="relative overflow-x-clip py-24 md:py-36"
      aria-label={S.aria}
    >
      <ChapterSeam />

      <div className="relative mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeader index={sectionIndex("#studio")} label={S.eyebrow} title={S.title} />
          <Reveal>
            <p className="max-w-md text-lg leading-relaxed text-muted md:text-right">{S.lead}</p>
          </Reveal>
        </div>

        <div className="mt-12 md:mt-14">
          <StudioCanvas live={near} />
        </div>
      </div>
    </section>
  );
}

function Placeholder() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
      <div
        className={cn(
          "relative w-full overflow-hidden bg-[#07080d] ring-1 ring-inset ring-line",
          "aspect-[4/5] sm:aspect-[4/3] lg:aspect-[16/10]"
        )}
      />
    </div>
  );
}
