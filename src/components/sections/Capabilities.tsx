"use client";

import { education, sectionIndex, techStack } from "@/lib/content";
import { LogoDock } from "@/components/ui/LogoDock";
import { useI18n } from "@/lib/i18n";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CapabilityCard } from "@/components/ui/CapabilityCard";
import { RevealStagger, Reveal } from "@/components/motion/Reveal";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { CraftStack, useWideCraft } from "@/components/craft/CraftTrack";
import { CraftIndex } from "@/components/craft/CraftIndex";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Skills (was Craft): the tech-stack dock, then the six capabilities, each
 * with the transcript courses behind it.
 *
 * On a wide screen the section pins into an index (CraftIndex): six titles
 * whose letters roll over as the scroll — or the pointer — reaches them, and
 * one evidence panel that wipes to match. On a phone the cards stack, each
 * separating into its layers as it rises. Under reduced motion it is the
 * static bento: full-stack and machine learning on the two wide cards, the
 * supporting skills under them.
 *
 * The section is `overflow-x-clip`, not `overflow-hidden`: hidden would make it
 * a scroll container, and a sticky child pins to its nearest scroll container —
 * the pin would silently stop working.
 */
export function Capabilities() {
  const { c, t } = useI18n();
  const reduced = useReducedMotion();
  const wide = useWideCraft();

  return (
    <section
      id="capabilities"
      data-act="deck"
      data-chapter="SKILLS"
      className="relative overflow-x-clip pt-24 md:pt-36"
      aria-label={t.craft.aria}
    >
      <ChapterSeam wipe />

      <div className="relative mx-auto max-w-[112.5rem] px-5 md:px-8 lg:px-16">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeader
            index={sectionIndex("#capabilities")}
            label={t.craft.eyebrow}
            title={t.craft.title}
            chapter="#capabilities"
          />
          <Reveal>
            <p className="max-w-md text-lg leading-relaxed text-muted md:text-right">
              {t.craft.lead}
            </p>
          </Reveal>
        </div>

        <LogoDock keys={techStack} labels={t.craft.tools} title={t.craft.dock} className="mt-12 md:mt-16" />
        <p className="tag mt-6 text-center text-muted">
          {t.craft.degree(education.credits, education.deansList)}
        </p>

        {(reduced || wide === null) && (
          <RevealStagger className="mt-14 grid gap-4 pb-24 md:grid-cols-2 md:pb-36 lg:grid-cols-12">
            {c.capabilities.map((item) => (
              <CapabilityCard key={item.code} item={item} />
            ))}
          </RevealStagger>
        )}
        {!reduced && wide === false && (
          <div className="pb-24">
            <CraftStack items={c.capabilities} />
          </div>
        )}
      </div>

      {!reduced && wide && <CraftIndex items={c.capabilities} />}
    </section>
  );
}
