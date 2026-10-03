"use client";

import { motion } from "framer-motion";
import { getCourse } from "@/lib/content";
import { TechMark } from "@/components/ui/TechMarks";
import { EASE_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Transcript courses as chips: the course code in the mono face, the course
 * name, and a small mark for the tool it was taught in where there is one.
 * Names only — grades are never shown (the transcript is private; see
 * lib/content `courses`).
 *
 * They stamp in one after another when `play` turns on: each drops a few
 * pixels and lands, as a stamp does. Transform and opacity only, once.
 */
export function CourseChips({
  codes,
  max,
  more,
  play = true,
  instant = false,
  delay = 0,
  compact = false,
  className,
}: {
  codes: string[];
  /** Show only the first `max`, then a "+N" chip. */
  max?: number;
  /** The "+N" chip's text. */
  more?: (n: number) => string;
  play?: boolean;
  instant?: boolean;
  delay?: number;
  compact?: boolean;
  className?: string;
}) {
  const list = codes.map(getCourse).filter((c) => !!c);
  const shown = max ? list.slice(0, max) : list;
  const rest = list.length - shown.length;
  const anim = (i: number) =>
    instant
      ? { initial: false as const }
      : {
          initial: false as const,
          animate: play ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -6, scale: 1.04 },
          transition: play
            ? { duration: 0.32, delay: delay + i * 0.05, ease: EASE_EXPO }
            : { duration: 0 },
        };

  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {shown.map((c, i) => (
        <motion.li
          key={c.code}
          {...anim(i)}
          className={cn(
            "flex items-center gap-2 rounded-[6px] border border-line bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)] text-fg/90",
            compact ? "py-1 pl-1.5 pr-2.5 text-[0.875rem]" : "py-1.5 pl-2 pr-3 text-[0.9375rem]"
          )}
        >
          <span className="rounded-[4px] bg-[color-mix(in_srgb,var(--color-holo)_14%,transparent)] px-1.5 py-0.5 font-mono text-[0.8125rem] font-semibold tracking-[0.04em] text-[var(--color-holo)]">
            {c.code}
          </span>
          <span className="leading-tight">{c.title}</span>
          {c.tools?.map((t) => (
            <TechMark key={t} name={t} size={compact ? 13 : 14} className="text-fg/70" />
          ))}
        </motion.li>
      ))}
      {rest > 0 && more && (
        <motion.li
          {...anim(shown.length)}
          className={cn(
            "flex items-center rounded-[6px] border border-dashed border-line px-2.5 font-mono text-muted",
            compact ? "py-1 text-[0.875rem]" : "py-1.5 text-[0.9375rem]"
          )}
        >
          {more(rest)}
        </motion.li>
      )}
    </ul>
  );
}
