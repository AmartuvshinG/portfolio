import { gallery } from "@/lib/content";
import { ScatterGallery } from "@/components/ui/ScatterGallery";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";

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
      className="relative overflow-hidden pt-24 md:pt-36"
      aria-label="Archive"
    >
      <ChapterSeam />

      <div className="relative mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <SectionHeader
          index="06"
          label="Selected fragments"
          title="Archive"
          voice="tech"
          description="Process shots, shader studies and interface work that never made it into a case file."
        />
      </div>

      <div className="relative mt-16">
        <ScatterGallery items={gallery} />
      </div>
    </section>
  );
}
