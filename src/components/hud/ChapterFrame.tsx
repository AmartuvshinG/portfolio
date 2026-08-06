"use client";

import { useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { pad } from "@/lib/utils";

/**
 * The entire surviving HUD budget: a corner crosshair, two hairline gutter
 * rules, and chapter numbering. Everything else from the old NEXUS overlay —
 * scanlines, telemetry, tickers, the console dock — is gone.
 *
 * This is KPR's chrome, and the restraint is the point. Micro-type at the edges
 * reads as instrumentation only while it stays sparse; once it's competing with
 * itself it just reads as decoration.
 *
 * Colours come entirely from `--color-fg` / `--color-line`, so the whole frame
 * inverts for free when ActTheme switches `<html data-act>`.
 */
export function ChapterFrame() {
  const [chapters, setChapters] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const sections = gsap.utils.toArray<HTMLElement>("[data-chapter]");
    if (!sections.length) return;

    // One-shot measurement of what the page actually rendered — the sections
    // are the source of truth for the chapter list, so there is nothing to
    // derive this from during render. Runs once on mount and never cascades.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChapters(sections.map((el) => el.dataset.chapter ?? ""));

    const triggers = sections.map((el, i) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top 50%",
        end: "bottom 50%",
        onToggle: (self) => {
          if (self.isActive) setActive(i);
        },
      })
    );

    return () => triggers.forEach((t) => t.kill());
  }, []);

  if (!chapters.length) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[70] hidden text-fg transition-colors duration-[620ms] lg:block"
    >
      {/* Hairline gutter rules. Inset rather than full-bleed so they read as
          registration marks on a print sheet, not as a layout grid. */}
      <span className="absolute inset-y-[14vh] left-5 w-px bg-current opacity-[0.12]" />
      <span className="absolute inset-y-[14vh] right-5 w-px bg-current opacity-[0.12]" />

      {/* Crosshair, left gutter, mid-height */}
      <span className="absolute left-5 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 bg-current opacity-60" />
        <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-current opacity-60" />
      </span>

      {/* Chapter numbering, set vertically in the left gutter.
          It reads bottom-to-top up the rule rather than sitting horizontally in
          the bottom-left corner, where it collided with the closing row of
          every section — the gutter is empty by construction, so nothing the
          page lays out can ever run into it. */}
      <div
        className="absolute bottom-[14vh] left-5 flex origin-bottom-left translate-x-[0.6rem] items-center gap-3"
        style={{ writingMode: "vertical-rl", rotate: "180deg" }}
      >
        <span className="micro tabular !text-current opacity-70">
          {pad(active + 1, 3)} / {pad(chapters.length, 3)}
        </span>
        <span className="h-6 w-px bg-current opacity-30" />
        <span className="micro !text-current opacity-70">
          {chapters[active]}
        </span>
      </div>
    </div>
  );
}
