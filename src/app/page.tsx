import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Connect } from "@/components/sections/Connect";
import { Capabilities } from "@/components/sections/Capabilities";
import { SelectedWork } from "@/components/sections/SelectedWork";
import { ZoomParallax } from "@/components/sections/ZoomParallax";
import { Lab } from "@/components/sections/Lab";
import { BandWipe } from "@/components/sections/BandWipe";
import { Lookbook } from "@/components/sections/Lookbook";
import { Showcase } from "@/components/sections/Showcase";
import { Testimonials } from "@/components/sections/Testimonials";
import { Timeline } from "@/components/sections/Timeline";
import { Contact } from "@/components/sections/Contact";

/**
 * The descent.
 *
 * There is one background for the whole document now (see SiteBackdrop), so the
 * order here is no longer about which ground each section paints — it is about
 * the rhythm of what the visitor is asked to do. Roughly:
 *
 *   read → play → read → browse → fly → drift → hold → read → close
 *
 * The three heavy visual chapters (work world, zoom flight, lab plane) are
 * deliberately never adjacent to each other without a reading section between
 * them: three full-screen spectacles in a row stops registering as spectacle.
 *
 * `ZoomParallax` and `Lab` sit between Work and Archive specifically. That
 * stretch was a single stock photograph and several screens of nothing; it is
 * now the longest continuous piece of motion on the page, and the zoom resolves
 * into the archive rather than cutting to it.
 *
 * `Lookbook` is the `hold`. It is the one section that stops the descent — a
 * single viewport the visitor drives themselves, sat directly after the band
 * wipe because a title card wants something to open onto. It is also the only
 * section allowed to paint its own ground; the reason is in its own header.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <About />
      <Connect />
      <Capabilities />
      <SelectedWork />
      <ZoomParallax />
      <Lab />
      <BandWipe
        words={["On", "Screen"]}
        label="Neo-Tokyo skyline interstitial"
        chapter="SCREEN"
        caption="STUDIO — 2026"
      />
      <Lookbook />
      <Showcase />
      <Testimonials />
      <Timeline />
      <Contact />
    </>
  );
}
