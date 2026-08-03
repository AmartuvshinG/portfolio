"use client";

import { motion } from "framer-motion";
import type { Capability } from "@/lib/content";
import { scaleIn } from "@/lib/motion";

/**
 * A single "system module" card. Hovering runs a scan sweep, brightens the
 * frame and surfaces the technical detail (tags + proficiency). The
 * proficiency bar fills once the card scrolls into view.
 */
export function CapabilityCard({ item }: { item: Capability }) {
  return (
    <motion.article
      variants={scaleIn}
      className="group relative flex flex-col overflow-hidden border border-line bg-surface/40 p-6 transition-colors duration-300 hover:border-line-strong"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      {/* Hover scan sweep */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-y-full bg-[linear-gradient(180deg,transparent,rgba(0,229,255,0.08),transparent)] transition-transform duration-700 ease-out group-hover:translate-y-full"
      />
      {/* Corner brackets brighten on hover */}
      <span className="absolute right-0 top-0 h-4 w-4 border-r border-t border-cyan/30 transition-colors group-hover:border-cyan" />
      <span className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-cyan/30 transition-colors group-hover:border-cyan" />

      <div className="relative flex items-center justify-between">
        <span className="font-mono text-xs text-cyan">{item.code}</span>
        <span className="hud-label text-faint">MODULE</span>
      </div>

      <h3 className="relative mt-6 font-display text-2xl font-bold uppercase text-fg">
        {item.title}
      </h3>

      <p className="relative mt-3 flex-1 text-sm leading-relaxed text-muted">
        {item.description}
      </p>

      {/* Proficiency */}
      <div className="relative mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="hud-label">PROFICIENCY</span>
          <span className="font-mono text-xs tabular text-cyan">
            {item.level}%
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden bg-surface-2">
          <motion.div
            className="h-full bg-cyan"
            initial={{ width: 0 }}
            whileInView={{ width: `${item.level}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* Tags */}
      <div className="relative mt-5 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="border border-line px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted"
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.article>
  );
}
