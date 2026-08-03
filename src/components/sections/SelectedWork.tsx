import { projects } from "@/lib/content";
import { SectionHeader } from "./SectionHeader";
import { FeaturedProject } from "./FeaturedProject";
import { WorkRail } from "./WorkRail";

export function SelectedWork() {
  return (
    <section id="work" className="relative border-t border-line pt-24 md:pt-36">
      <div className="mx-auto max-w-[1600px] px-5 md:px-8">
        <SectionHeader
          index="03"
          label="SELECTED WORK"
          title="Work"
          description="A selection of systems I've designed and engineered — each built for performance, motion and impact."
        />
      </div>

      <div className="mt-16">
        <FeaturedProject project={projects[0]} />
        <WorkRail />
      </div>
    </section>
  );
}
