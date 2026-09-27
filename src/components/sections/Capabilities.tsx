"use client";

import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CapabilityCard } from "@/components/ui/CapabilityCard";
import { RevealStagger, Reveal } from "@/components/motion/Reveal";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";

/**
 * Craft, as a bento rather than six equal boxes.
 *
 * Six identical cards say six things are equally important, and to a
 * recruiter they are not: full-stack and machine learning are what the
 * headline project is made of, so they get the two wide cards and the
 * supporting skills sit under them. Every card points at the case file that
 * shows the skill in practice — a claim with a link is worth more than a claim.
 *
 * 12 columns on large screens so the two rows divide cleanly (6+6, then
 * 3+3+3+3); two columns on tablets; one on phones.
 */
export function Capabilities() {
  const { c, t } = useI18n();

  return (
    <section
      id="capabilities"
      data-act="deck"
      data-chapter="CRAFT"
      className="relative overflow-hidden py-24 md:py-36"
      aria-label={t.craft.aria}
    >
      <ChapterSeam />

      <div className="relative mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeader
            index={sectionIndex("#capabilities")}
            label={t.craft.eyebrow}
            title={t.craft.title}
          />
          <Reveal>
            <p className="max-w-sm text-base leading-relaxed text-muted md:text-right">
              {t.craft.lead}
            </p>
          </Reveal>
        </div>

        <RevealStagger className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          {c.capabilities.map((item) => (
            <CapabilityCard key={item.code} item={item} />
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
