"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { Capability } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { caseHash, openCase } from "@/lib/caseFile";
import { ICONS } from "@/components/ui/CapabilityCard";
import { techLabel } from "@/components/ui/TechMarks";
import { LogoDock } from "@/components/ui/LogoDock";
import { CourseChips } from "@/components/ui/CourseChips";
import { cn, pad } from "@/lib/utils";

/*
 * Craft's card, shared by the phone stack. The wide-screen sideways track that
 * used to live here was replaced by CraftIndex (recoverable from git at
 * checkpoint/descent-film-2026-09-30).
 */

/**
 * The card's contents. The phone stack passes its own parallax values.
 */
export function CardBody({
  item,
  index,
  ghostX,
  iconX,
  stripX,
  ghostY,
}: {
  item: Capability;
  index: number;
  ghostX?: MotionValue<number>;
  iconX?: MotionValue<number>;
  stripX?: MotionValue<number>;
  ghostY?: MotionValue<number>;
}) {
  const { c, t } = useI18n();
  const Icon = ICONS[item.icon];
  const proof = item.proof ? c.projects.find((p) => p.slug === item.proof) : undefined;
  /* A tag that is already a tool mark would say the same thing twice. */
  const marks = new Set(item.stack.map((k) => techLabel(k, t.craft.tools).toLowerCase()));
  const tags = item.tags.filter((tag) => !marks.has(tag.toLowerCase()));

  return (
    <>
      <motion.span
        aria-hidden
        style={{ x: ghostX, y: ghostY }}
        className="outline-text pointer-events-none absolute -right-4 -top-8 font-display text-[clamp(9rem,16vw,15rem)] leading-none"
      >
        {pad(index + 1)}
      </motion.span>

      <motion.div style={{ x: iconX }} className="relative flex items-center gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-fg ring-1 ring-inset ring-line-strong"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--spectrum-1) 30%, transparent), color-mix(in srgb, var(--spectrum-3) 20%, transparent))",
          }}
        >
          <Icon size={26} strokeWidth={1.6} aria-hidden />
        </span>
        {/* Bone, not muted: on a phone the code sits over the card's own
            outlined numeral and the rain, where muted measured 4.3–4.6:1. */}
        <span className="micro tabular !text-fg/85">{pad(index + 1)}</span>
      </motion.div>

      <h3 className="relative mt-7 font-tech text-[clamp(1.875rem,3.2vw,3rem)] font-bold uppercase leading-[1.04] text-fg text-balance">
        {item.title}
      </h3>

      <p className="relative mt-5 text-lg leading-relaxed text-fg/85 md:text-xl">{item.description}</p>

      {tags.length > 0 && (
        <ul className="relative mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm uppercase tracking-wider text-muted">
          {tags.map((tag) => (
            <li key={tag}>
              <span aria-hidden className="text-fg/40">
                #
              </span>
              {tag}
            </li>
          ))}
        </ul>
      )}

      <motion.div style={{ x: stripX }} className="relative mt-auto pt-8">
        {item.courses && item.courses.length > 0 && (
          <div className="mb-5">
            <p className="micro mb-2">{t.craft.studied}</p>
            <CourseChips codes={item.courses} compact />
          </div>
        )}
        <p className="micro">{t.craft.stack}</p>
        <LogoDock keys={item.stack} labels={t.craft.tools} size="md" align="start" />
      </motion.div>

      {proof && (
        <a
          href={caseHash(proof.slug)}
          onClick={(e) => {
            e.preventDefault();
            openCase(proof.slug);
          }}
          className="group relative mt-7 flex items-center justify-between gap-4 border-t border-line pt-5"
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="micro">{t.craft.proven}</span>
            <span className="font-tech text-lg font-semibold uppercase leading-snug text-fg">
              {proof.title}
            </span>
          </span>
          <ArrowRight
            size={20}
            aria-hidden
            className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-fg"
          />
        </a>
      )}
    </>
  );
}

/**
 * Phones: no pin — sideways scroll-jacking under a thumb fights the gesture
 * the thumb is making. The cards stack, and each one's layers separate as it
 * rises into view.
 */
export function CraftStack({ items }: { items: Capability[] }) {
  return (
    <div className="mt-12 flex flex-col gap-6">
      {items.map((item, i) => (
        <StackCard key={item.code} item={item} index={i} />
      ))}
    </div>
  );
}

function StackCard({ item, index }: { item: Capability; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const y = useTransform(scrollYProgress, [0, 1], [48, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0.3, 1]);
  const focus = useTransform(scrollYProgress, [0.6, 1], [0, 1]);
  const ghostY = useTransform(scrollYProgress, [0, 1], [70, 0]);
  const iconX = useTransform(scrollYProgress, [0, 1], [-18, 0]);
  const stripX = useTransform(scrollYProgress, [0, 1], [28, 0]);
  /* The card stands up as it rises, the drum's turn on a phone. Pivoted at
     its foot with the top tipped away, so perspective only ever narrows it:
     tipped toward the reader, its foot would widen past a 390px screen. */
  const rotateX = useTransform(scrollYProgress, [0, 1], [24, 0]);

  return (
    <motion.article
      ref={ref}
      style={{ y, opacity, rotateX, transformPerspective: 1100, transformOrigin: "50% 100%", ["--live" as string]: focus }}
      className={cn("liquid-glass live-rim relative flex flex-col overflow-hidden rounded-[24px] p-6")}
    >
      <CardBody item={item} index={index} ghostY={ghostY} iconX={iconX} stripX={stripX} />
    </motion.article>
  );
}

/** Below `md`, the stack; the pin needs a row's width to be worth it. */
export function useWideCraft() {
  const [wide, setWide] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}
