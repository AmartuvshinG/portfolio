"use client";

import type { Capability } from "@/lib/content";
import { motion } from "framer-motion";
import { scaleIn } from "@/lib/motion";
import { GlareCard } from "@/components/motion/GlareCard";
import { HoverBorderGradient } from "@/components/motion/HoverBorderGradient";

/**
 * A capability, as a notched card.
 *
 * The cut corners are the entire reason a plain grid of boxes reads as designed
 * here. They cost one clip-path and they are the difference between "cards" and
 * a card *system*, which is why it's a shared utility rather than local styling.
 *
 * There is no proficiency number or bar. A self-rated 0–100 score is not
 * information a reader can trust, and to a recruiter it reads as padding — the
 * description and tags carry what the card actually claims.
 */
export function CapabilityCard({ item }: { item: Capability }) {
  return (
    <motion.div variants={scaleIn} whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}>
      {/* The lift stays on an outer wrapper: GlareCard owns `transform` on its
          own root for the tilt, so a `y` animation on the same element would be
          overwritten every frame. */}
      <GlareCard
        as="article"
        tilt={8}
        className="notch-card flex h-full flex-col bg-surface p-6 ring-1 ring-inset ring-line"
      >
      <span className="micro tabular">{item.code}</span>

      <h3 className="mt-8 font-tech text-2xl font-bold uppercase leading-tight text-fg">
        {item.title}
      </h3>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
        {item.description}
      </p>

      <div className="mt-8 flex border-t border-line pt-5 flex-wrap items-center gap-x-4 gap-y-1">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="font-mono text-[0.65rem] uppercase tracking-wider text-faint"
          >
            {tag}
          </span>
        ))}
        {/* The one moving light on the card. It idles around the chip's edge and
            floods with the ramp on hover — enough to make the grid feel powered
            without putting a travelling border on all six cards at once, which
            would read as six things demanding attention rather than a system. */}
        <HoverBorderGradient
          as="span"
          containerClassName="ml-auto"
          className="px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted"
        >
          {item.code.split("/")[1]}
        </HoverBorderGradient>
      </div>
      </GlareCard>
    </motion.div>
  );
}
