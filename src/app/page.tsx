import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Capabilities } from "@/components/sections/Capabilities";
import { SelectedWork } from "@/components/sections/SelectedWork";
import { BandWipe } from "@/components/sections/BandWipe";
import { Showcase } from "@/components/sections/Showcase";
import { Testimonials } from "@/components/sections/Testimonials";
import { Timeline } from "@/components/sections/Timeline";
import { Contact } from "@/components/sections/Contact";

/**
 * The act sequence.
 *
 * paper → flat → paper → VOID → paper … → VOID
 *
 * The two dark acts are the load-bearing structure: the work world in the
 * middle and the close at the end. Everything between them is paper, so each
 * drop into black lands as an event rather than as another background colour.
 * Reordering these is not a cosmetic change — the lavender flat exists to
 * establish that this page changes colour before the work world does it hard.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <About />
      <Capabilities />
      <SelectedWork />
      <BandWipe
        words={["On", "Screen"]}
        src="https://picsum.photos/seed/amara-band/2400/1200"
        alt="Studio work in progress"
        caption="STUDIO — 2026"
      />
      <Showcase />
      <Testimonials />
      <Timeline />
      <Contact />
    </>
  );
}
