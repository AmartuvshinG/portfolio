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

      {/* The close.
          A scatter that simply stops reads as running out of material, and
          this one used to stop into a screen and a half of empty canvas. An
          index closes the chapter instead: it says how much there is, over
          what span, and hands off deliberately rather than fading out. */}
      <div className="relative mx-auto max-w-[1800px] px-5 pb-16 md:px-8 lg:px-16">
        <div className="flex flex-wrap items-end justify-between gap-6 border-t border-line pt-8">
          <div>
            <span className="micro">Archive index</span>
            <p className="mt-3 font-tech text-2xl font-bold uppercase leading-none text-fg md:text-3xl">
              {gallery.length} fragments
            </p>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Process shots, shader studies and interface work spanning 2022–2026.
            Select any frame to enhance it.
          </p>
          <span className="micro tabular">
            2022 — 2026
          </span>
        </div>
      </div>
    </section>
  );
}
