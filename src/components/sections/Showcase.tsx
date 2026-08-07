import { gallery } from "@/lib/content";
import { ScatterGallery } from "./ScatterGallery";
import { SectionHeader } from "./SectionHeader";
import { Nebula } from "@/components/layout/Nebula";

/**
 * The archive. Deliberately the loosest section on the page — after the
 * enclosed dark work world, a sprawling, unaligned spread is the release.
 */
export function Showcase() {
  return (
    <section
      id="gallery"
      data-act="deck"
      data-chapter="ARCHIVE"
      className="relative overflow-hidden bg-bg pt-24 md:pt-36"
      aria-label="Archive"
    >
      <Nebula
        className="pointer-events-none absolute inset-0 h-full w-full"
        opacity={0.32}
      />

      <div className="relative mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <SectionHeader
          index="04"
          label="Selected fragments"
          title="Archive"
          voice="serif"
          description="Process shots, shader studies and interface work that never made it into a case file."
        />
      </div>

      <div className="relative mt-16">
        <ScatterGallery items={gallery} />
      </div>
    </section>
  );
}
