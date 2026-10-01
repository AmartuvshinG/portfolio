"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { DUR, EASE_DEVELOP, inView } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  index: string;
  label: string;
  title: string;
  description?: string;
  className?: string;
  align?: "left" | "center";
  /**
   * `caps` sets the title in the wide display face, `tech` in the chamfered
   * working face. Alternating between them across the page is what gives the
   * acts distinct voices — a single treatment everywhere flattens them back
   * out. `tech` also exists for titles too long to survive Michroma's width.
   */
  voice?: "caps" | "tech";
}

/**
 * Section masthead, as a film's title card. When it first scrolls in:
 *
 *   1. the index decodes (ScrambleText) and the rule draws out from it;
 *   2. the title develops top to bottom (the site's one entrance) while its
 *      tracking closes from slightly wide to set — a title settling, not
 *      sliding;
 *   3. one anamorphic streak crosses it, the way a lens catches a light
 *      passing the frame. Once, never on a loop.
 *
 * The tracking runs as a CSS transition on a data attribute (`.title-card`
 * in globals.css), so it lands on whatever the face's own tracking is rather
 * than a number copied here.
 */
export function SectionHeader({
  index,
  label,
  title,
  description,
  className,
  align = "left",
  voice = "caps",
}: SectionHeaderProps) {
  const [on, setOn] = useState(false);
  const ease = EASE_DEVELOP;

  return (
    <motion.div
      className={cn(
        "title-card flex flex-col gap-5",
        align === "center" && "items-center text-center",
        className
      )}
      data-on={on ? "" : undefined}
      initial="hidden"
      whileInView="show"
      viewport={inView}
      onViewportEnter={() => setOn(true)}
    >
      <div className="flex items-center gap-4">
        {on ? (
          <ScrambleText text={index} className="eyebrow tabular" />
        ) : (
          <span className="eyebrow tabular opacity-0">{index}</span>
        )}
        <motion.span
          className="h-px w-12 origin-left bg-current opacity-25"
          variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: DUR.medium, ease, delay: 0.15 } } }}
        />
        <motion.span
          className="eyebrow"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: DUR.short, delay: 0.3 } } }}
        >
          {label}
        </motion.span>
      </div>

      <div className="relative">
        <motion.h2
          className={cn(
            "title-card-title",
            voice === "caps" ? "display-caps text-fg" : "font-tech font-semibold leading-[1.04] text-fg"
          )}
          style={{ fontSize: voice === "caps" ? "clamp(1.6rem, 4.4vw, 4.25rem)" : "clamp(2.25rem, 5.5vw, 5rem)" }}
          variants={{
            hidden: { opacity: 0, clipPath: "inset(0% -10% 100% -10%)" },
            show: {
              opacity: 1,
              clipPath: "inset(-20% -10% -20% -10%)",
              transition: { duration: DUR.cinematic * 0.75, ease, delay: 0.1 },
              transitionEnd: { clipPath: "none" },
            },
          }}
        >
          {title}
        </motion.h2>
        {/* The streak: a hairline of light with a wide soft flare, sliding
            across once (transform and opacity only). */}
        <motion.span
          aria-hidden
          className="title-streak"
          variants={{
            hidden: { x: "-40%", opacity: 0 },
            show: {
              x: "120%",
              opacity: [0, 1, 1, 0],
              transition: { duration: DUR.cinematic, ease: [0.45, 0, 0.25, 1], delay: 0.35, opacity: { duration: DUR.cinematic, delay: 0.35, times: [0, 0.2, 0.7, 1] } },
            },
          }}
        />
      </div>

      {description && (
        <motion.p
          className={cn(
            "max-w-xl text-base leading-relaxed text-muted",
            align === "center" && "mx-auto"
          )}
          variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: DUR.medium, ease, delay: 0.45 } } }}
        >
          {description}
        </motion.p>
      )}
    </motion.div>
  );
}
