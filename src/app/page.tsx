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
 * The act sequence — depths of one dark theme, never a light/dark inversion.
 *
 * void → bloom → deck → VOID → deck … → VOID
 *
 * The two full-void acts are the load-bearing structure: the work world in the
 * middle and the close at the end. `deck` lifts a step between them so each
 * drop back to the base black lands as an event rather than as more of the
 * same. Reordering these is not a cosmetic change — the bloom exists to
 * establish that this page shifts before the work world does it hard.
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
