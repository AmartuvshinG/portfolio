import { capabilities } from "@/lib/content";
import { SectionHeader } from "./SectionHeader";
import { CapabilityCard } from "./CapabilityCard";
import { RevealStagger, Reveal } from "@/components/motion/Reveal";
import { Nebula } from "@/components/layout/Nebula";

/**
 * Lifted onto the deck after the bloom. The fanned deck that used to live
 * here has moved to the closing block, where a splayed arc of cards is what the
 * references actually use it for — running the same trick twice on one
 * page spends the surprise for nothing.
 */
export function Capabilities() {
  return (
    <section
      id="capabilities"
      data-act="deck"
      data-chapter="CRAFT"
      className="relative overflow-hidden bg-bg py-24 md:py-36"
      aria-label="Capabilities"
    >
      <Nebula
        className="pointer-events-none absolute inset-0 h-full w-full"
        opacity={0.38}
      />

      <div className="relative mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeader index="02" label="What I do" title="Craft" />
          <Reveal>
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              A full-stack toolkit for building interfaces that are equal parts
              engineering and art direction.
            </p>
          </Reveal>
        </div>

        <RevealStagger className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item) => (
            <CapabilityCard key={item.code} item={item} />
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
