"use client";

import { motion } from "framer-motion";
import type { Capability } from "@/lib/content";
import { scaleIn } from "@/lib/motion";

/**
 * A capability, as a notched card — Lando's helmet-grid silhouette.
 *
 * The cut corner is the entire reason a plain grid of boxes reads as designed
 * here. It costs one clip-path and it is the difference between "cards" and a
 * card *system*, which is why it's a shared utility rather than local styling.
 *
 * The old version had a scan sweep, corner brackets and a magenta proficiency
 * bar. The proficiency number stays — it's real information — but as a hairline
 * rule, because a chunky progress bar on paper reads as a dashboard widget.
 */
export function CapabilityCard({ item }: { item: Capability }) {
  return (
    <motion.article
      variants={scaleIn}
      className="notch-card group relative flex flex-col bg-paper p-6 ring-1 ring-inset ring-ink/10 transition-shadow duration-300"
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      <div className="flex items-center justify-between">
        <span className="micro tabular">{item.code}</span>
        <span className="tabular font-mono text-[0.65rem] text-ink-faint">
          {item.level}
        </span>
      </div>

      <h3 className="mt-8 font-display text-2xl font-bold uppercase leading-tight text-ink">
        {item.title}
      </h3>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
        {item.description}
      </p>

      {/* Proficiency, as a rule rather than a bar. Lime is a fill here, never
          text — at 1.4:1 on paper it would be unreadable as a label. */}
      <div className="mt-8 h-px w-full bg-ink/10">
        <motion.div
          className="h-full bg-signal"
          initial={{ width: 0 }}
          whileInView={{ width: `${item.level}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="font-mono text-[0.65rem] uppercase tracking-wider text-ink-faint"
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.article>
  );
}
