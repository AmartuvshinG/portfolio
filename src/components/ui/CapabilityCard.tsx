"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Braces,
  BrainCircuit,
  Layers,
  ListChecks,
  PenTool,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { Capability } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { caseHash, openCase } from "@/lib/caseFile";
import { scaleIn } from "@/lib/motion";
import { GlareCard } from "@/components/motion/GlareCard";
import { cn } from "@/lib/utils";

export const ICONS: Record<Capability["icon"], LucideIcon> = {
  layers: Layers,
  brain: BrainCircuit,
  braces: Braces,
  pen: PenTool,
  checks: ListChecks,
  shield: ShieldCheck,
};

/**
 * A capability, as a notched card.
 *
 * The cut corners are the entire reason a grid of boxes reads as designed here:
 * one clip-path, and the difference between "cards" and a card *system*.
 *
 * What changed, and why:
 * - The title wraps. It used to be one uppercase line that longer titles
 *   ("Java & core programming") ran right to the edge of; it is the one thing
 *   on the card nobody should have to squint at.
 * - Tags are pills, not a run of spaced-out mono words that read as one string.
 * - The "01" chip that repeated the card's own SYS/01 code is gone; in its place
 *   is the link a recruiter actually wants — the case file where this skill was
 *   used. It opens over the page, like every case file.
 * - No self-rated proficiency number or bar. A 0–100 score is not information.
 * - Feature cards keep the glare tilt. On six cards at once it was six things
 *   moving under the pointer; on two it is emphasis.
 */
export function CapabilityCard({ item }: { item: Capability }) {
  const { c, t } = useI18n();
  const Icon = ICONS[item.icon];
  const proof = item.proof ? c.projects.find((p) => p.slug === item.proof) : undefined;

  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span
          className="chamfer-sm flex h-12 w-12 shrink-0 items-center justify-center text-fg ring-1 ring-inset ring-line-strong"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--spectrum-1) 22%, transparent), color-mix(in srgb, var(--spectrum-3) 14%, transparent))",
          }}
        >
          <Icon size={22} strokeWidth={1.6} aria-hidden />
        </span>
        <span className="micro tabular">{item.code}</span>
      </div>

      <h3
        className={cn(
          "mt-7 font-tech font-bold uppercase leading-[1.08] text-fg text-balance",
          item.feature ? "text-3xl md:text-4xl" : "text-2xl"
        )}
      >
        {item.title}
      </h3>

      <p className={cn("mt-4 flex-1 leading-relaxed text-muted", item.feature ? "text-base md:text-lg" : "text-base")}>
        {item.description}
      </p>

      <ul className="mt-6 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full border border-line px-3 py-1 font-mono text-[0.8125rem] tracking-wide text-fg/85"
          >
            {tag}
          </li>
        ))}
      </ul>

      {proof && (
        <a
          href={caseHash(proof.slug)}
          onClick={(e) => {
            e.preventDefault();
            openCase(proof.slug);
          }}
          className="group mt-6 flex items-center justify-between gap-4 border-t border-line pt-5"
        >
          {/* Stacked, not side by side: on the compact cards the label and a
              long title together overran the row and the title truncated —
              in Mongolian, where the label is longer, on every card. */}
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="micro">{t.craft.proven}</span>
            <span className="font-tech text-base font-semibold uppercase leading-snug text-fg">
              {proof.title}
            </span>
          </span>
          <ArrowRight
            size={18}
            aria-hidden
            className="shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-fg"
          />
        </a>
      )}
    </>
  );

  const shell = "notch-card flex h-full flex-col bg-surface p-6 ring-1 ring-inset ring-line md:p-8";

  return (
    <motion.div
      variants={scaleIn}
      className={cn(item.feature ? "md:col-span-2 lg:col-span-6" : "lg:col-span-3")}
    >
      {item.feature ? (
        <GlareCard as="article" tilt={5} className={shell}>
          {body}
        </GlareCard>
      ) : (
        <article className={cn(shell, "transition-colors duration-300 hover:ring-line-strong")}>
          {body}
        </article>
      )}
    </motion.div>
  );
}
