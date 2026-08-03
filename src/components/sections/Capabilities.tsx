import { capabilities } from "@/lib/content";
import { SectionHeader } from "./SectionHeader";
import { CapabilityCard } from "./CapabilityCard";
import { CapabilityDeck } from "./CapabilityDeck";
import { RevealStagger, Reveal } from "@/components/motion/Reveal";
import { StatusTicker } from "@/components/hud/StatusTicker";

const TICKER = [
  "SYSTEM ONLINE",
  "MOTION CORE ACTIVE",
  "SHADER PIPELINE NOMINAL",
  "60FPS LOCKED",
  "ACCESSIBILITY ENABLED",
  "REDUCED-MOTION SUPPORTED",
];

export function Capabilities() {
  return (
    <section
      id="capabilities"
      className="relative border-t border-line py-24 md:py-36"
    >
      <div className="mx-auto max-w-[1600px] px-5 md:px-8">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeader
            index="02"
            label="SYSTEMS ONLINE"
            title="Capabilities"
          />
          <Reveal>
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              A full-stack toolkit for building interfaces that are equal parts
              engineering and art direction.
            </p>
          </Reveal>
        </div>

        {/* Wide viewports get the fanned deck, everything narrower gets the
            grid, and reduced-motion gets the grid at every width. The swap is
            done entirely in CSS (see globals.css) so there's no first-paint
            flash from reading the preference in JS. */}
        <div data-capability-deck className="mt-16 hidden xl:block">
          <CapabilityDeck items={capabilities} />
        </div>

        <RevealStagger
          data-capability-grid
          className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:hidden"
        >
          {capabilities.map((item) => (
            <CapabilityCard key={item.code} item={item} />
          ))}
        </RevealStagger>
      </div>

      <div className="mt-20">
        <StatusTicker items={TICKER} />
      </div>
    </section>
  );
}
