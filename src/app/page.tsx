import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Connect } from "@/components/sections/Connect";
import { Capabilities } from "@/components/sections/Capabilities";
import { SelectedWork } from "@/components/sections/SelectedWork";
import { Timeline } from "@/components/sections/Timeline";
import { Contact } from "@/components/sections/Contact";
import { FilmInterlude } from "@/components/sections/FilmInterlude";
import { CaseFileHost } from "@/components/work/CaseFile";
import { getGitHubSummary } from "@/lib/github";

/* The Signal panel's GitHub numbers are fetched here and refreshed daily. */
export const revalidate = 86400;

/**
 * The descent.
 *
 * There is one background for the whole document (see SiteBackdrop), so the
 * order here is about what the visitor needs, in the order they need it. The
 * reader this page is built for is a recruiter with a minute, often on a phone:
 *
 *   who → where to find him → what he built → what he can do → where he's
 *   been → reach him
 *
 * Work comes before Craft deliberately — the evidence before the claims. The
 * visual set pieces that used to sit between Work and the ledger (zoom flight,
 * lab plane, band wipe, lookbook, archive, voices) were cut when the template
 * content was replaced: they had no real material to show, and they doubled the
 * scroll between the one project that matters and the contact form.
 */
export default async function Home() {
  const github = await getGitHubSummary();
  return (
    <>
      <Hero />
      {/* The film behind the page (FilmBackdrop) moves at the joins; these
          two give its biggest moments — the doors, the porthole — empty
          screen to land on. */}
      <FilmInterlude variant="doors" />
      <About />
      <Connect github={github} />
      <SelectedWork />
      <FilmInterlude variant="airlock" />
      <Capabilities />
      <Timeline />
      <Contact />
      {/* Case files open over the page, keyed to `#case=<slug>`. The site is
          one route: there is nowhere else to navigate to. */}
      <CaseFileHost />
    </>
  );
}
