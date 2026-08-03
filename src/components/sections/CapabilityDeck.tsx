"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import type { Capability } from "@/lib/content";
import { accentColor } from "@/lib/content";
import { cn } from "@/lib/utils";

/** Horizontal offset between consecutive cards in the fan, px. */
const OVERLAP = 132;
/** How far cards to the right of the focused one are pushed away, px. */
const SPREAD = 104;
const CARD_W = 268;
const CARD_H = 420;
/** Card width still visible when the next card overlaps it. */
const STRIP = OVERLAP - 28;
/** Card width visible once neighbours have been pushed aside. */
const OPEN = OVERLAP + SPREAD - 28;

const spring = { type: "spring", stiffness: 260, damping: 30 } as const;

const ACCENTS = ["cyan", "purple", "red", "cyan", "purple", "red"] as const;

/**
 * Capability modules as a fanned deck.
 *
 * The cards overlap like a held hand; focusing one lifts it and pushes
 * everything to its right outward, so you can read a module without losing
 * your sense of the whole set. Entrance staggers from the back of the fan
 * forward, which is what makes it land as a deal rather than a grid fade-in.
 *
 * Wide viewports only — `Capabilities` renders its grid everywhere else, and
 * CSS swaps back to that grid under reduced motion, where a spring-loaded fan
 * that hides its copy until focus is the wrong answer.
 */
export function CapabilityDeck({ items }: { items: Capability[] }) {
  const [focused, setFocused] = useState<number | null>(null);

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, staggerDirection: -1 } },
  };

  const card: Variants = {
    hidden: (offset: number) => ({ x: offset, opacity: 0 }),
    visible: { x: 0, opacity: 1, transition: spring },
  };

  return (
    <motion.div
      className="relative mx-auto"
      style={{
        height: CARD_H + 40,
        width: OVERLAP * (items.length - 1) + CARD_W + SPREAD,
      }}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
      onMouseLeave={() => setFocused(null)}
    >
      {items.map((item, i) => {
        const isFocused = focused === i;
        const pushed = focused !== null && i > focused;
        const color = accentColor[ACCENTS[i % ACCENTS.length]];

        return (
          <motion.div
            key={item.code}
            className="absolute top-0"
            style={{ left: i * OVERLAP, zIndex: i }}
            variants={card}
            custom={-i * OVERLAP}
          >
            <motion.article
              animate={{
                x: pushed ? SPREAD : 0,
                y: isFocused ? -22 : 0,
                rotate: isFocused ? 0 : (i - (items.length - 1) / 2) * 1.1,
              }}
              transition={spring}
              onMouseEnter={() => setFocused(i)}
              onFocus={() => setFocused(i)}
              tabIndex={0}
              className={cn(
                "metal chamfer group relative flex flex-col justify-between overflow-hidden border p-5 outline-none transition-colors duration-300",
                isFocused ? "border-cyan/60" : "border-line"
              )}
              style={{ width: CARD_W, height: CARD_H }}
            >
              {/* Decoration only — these must not swallow pointer events, or
                  an overlapping neighbour's texture blocks hover on the card
                  underneath it. */}
              <div
                className="holo-grid pointer-events-none absolute inset-0 opacity-20"
                aria-hidden
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-1/4 top-1/3 h-2/3 w-2/3 rounded-full blur-3xl transition-opacity duration-500"
                style={{ background: color, opacity: isFocused ? 0.35 : 0.14 }}
              />
              <div
                className="scanlines pointer-events-none absolute inset-0 opacity-25"
                aria-hidden
              />

              {/* Header. Constrained to the strip that stays visible under the
                  next card, so the code never sits behind a neighbour. */}
              <div className="relative" style={{ width: STRIP }}>
                <span className="font-mono text-xs" style={{ color }}>
                  {item.code}
                </span>
              </div>

              {/* Oversized index watermark */}
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-6 -left-1 select-none font-display text-[7rem] font-black leading-none opacity-[0.09]"
                style={{ color }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Everything below is width-clamped to whatever strip of this
                  card is actually exposed: the narrow strip while a neighbour
                  overlaps it, the wider opening once that neighbour is pushed
                  aside. Without this the titles simply ran underneath the next
                  card and got sliced in half. */}
              <motion.div
                className="relative"
                animate={{ width: isFocused ? OPEN : STRIP }}
                transition={spring}
              >
                <h3 className="font-display text-lg font-bold uppercase leading-[1.05] text-fg">
                  {item.title}
                </h3>

                {/* Detail surfaces only for the focused card — the fan stays
                    readable instead of six paragraphs competing at once.
                    Collapsed to zero height rather than just faded: left in
                    flow it wraps to a different number of lines per card and
                    per width, which pushed every title to a different height. */}
                <motion.div
                  className="overflow-hidden"
                  animate={{
                    height: isFocused ? "auto" : 0,
                    opacity: isFocused ? 1 : 0,
                  }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="pt-3 text-xs leading-relaxed text-muted">
                    {item.description}
                  </p>
                </motion.div>

                <div className="mt-5">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="hud-label">PROF</span>
                    <span
                      className="font-mono text-[0.65rem] tabular"
                      style={{ color }}
                    >
                      {item.level}%
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden bg-surface-2">
                    <motion.div
                      className="h-full"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.level}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>

                {/* Tags are detail, not identity — they'd overflow the strip. */}
                <motion.div
                  className="overflow-hidden"
                  animate={{
                    height: isFocused ? "auto" : 0,
                    opacity: isFocused ? 1 : 0,
                  }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex flex-wrap gap-1.5 pt-4">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-line px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              {/* Corner ticks */}
              <span
                aria-hidden
                className="absolute left-2 top-2 h-3 w-3 border-l border-t transition-colors"
                style={{ borderColor: isFocused ? color : "var(--color-line)" }}
              />
              <span
                aria-hidden
                className="absolute bottom-2 right-2 h-3 w-3 border-b border-r transition-colors"
                style={{ borderColor: isFocused ? color : "var(--color-line)" }}
              />
            </motion.article>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
