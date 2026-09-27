"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

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
 *
 * **Names and numbers come from the nav, not from counting sections.** It used
 * to number chapters 1-based by DOM order and print each section's
 * `data-chapter` codename, so the gutter said "LEDGER 06" and "CONTACT 07"
 * while the navbar called the same sections "Path 05" and "Contact 06". One
 * source for both, and it translates with everything else.
 */
export function ChapterFrame() {
  const { c } = useI18n();
  /** Section ids, in page order. */
  const [chapters, setChapters] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const sections = gsap.utils.toArray<HTMLElement>("[data-chapter]");
    if (!sections.length) return;

    // One-shot measurement of what the page actually rendered — the sections
    // are the source of truth for the chapter list, so there is nothing to
    // derive this from during render. Runs once on mount and never cascades.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChapters(sections.map((el) => el.id));

    const triggers = sections.map((el, i) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top 50%",
        end: "bottom 50%",
        /* Nothing but the signage reads this. There used to be a
           `chapter-change` event dispatched here for the lens overlay to
           stutter on; it was the source of the horizontal cyan/magenta bars
           reported on every scroll. See the header of `Anamorphic.tsx` for why
           it is gone rather than tuned. */
        onToggle: (self) => {
          if (!self.isActive) return;
          setActive(i);
        },
      })
    );

    return () => triggers.forEach((t) => t.kill());
  }, []);

  if (!chapters.length) return null;

  const id = chapters[active];
  const name =
    c.navLinks.find((l) => l.href === `#${id}`)?.label ?? id;
  const code = sectionIndex(`#${id}`);
  const last = c.navLinks[c.navLinks.length - 1]?.code ?? "--";

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

      {/* --- Signage, right gutter.
              The chapter name as a lit sign hung off the edge of the frame,
              which is the one piece of Kowloon vocabulary the site was missing:
              in a neon city the type is not printed on things, it is *mounted*
              on them and it glows onto whatever is behind it.

              Cheap by construction. The glow is a blurred copy of the panel,
              and a blur that only ever re-rasterises when the chapter changes
              is nothing like a blur that re-rasterises per scroll frame — this
              is fixed chrome, so nothing underneath it invalidates it. The
              flicker is pure opacity. */}
      <div className="absolute right-5 top-1/2 -translate-y-1/2 translate-x-[0.55rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* The tube's spill. Sits behind the panel and is the only thing
                that makes it read as lit rather than printed. */}
            <span
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                backgroundImage: "var(--gradient-spectrum)",
                filter: "blur(13px)",
                opacity: 0.55,
              }}
            />
            <span
              className="chamfer-sm neon-sign flex items-center gap-3 border border-line-strong bg-void/80 px-2 py-4 font-mono text-[0.75rem] uppercase tracking-[0.34em] text-fg"
              style={{ writingMode: "vertical-rl" }}
            >
              <span className="spectrum-text font-semibold">{name}</span>
              <span className="tabular opacity-45">{code}</span>
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

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
          {code} / {last}
        </span>
        <span className="h-6 w-px bg-current opacity-30" />
        <span className="micro !text-current opacity-70">{name}</span>
      </div>
    </div>
  );
}
