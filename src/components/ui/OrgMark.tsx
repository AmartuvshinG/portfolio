import type { OrgMarkKey } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * The logo of a place on the Path, drawn in white.
 *
 * Each file in /public/marks is the organisation's official mark reduced to
 * one colour (the ШУТИС shield as a knockout: its light parts lit, its blue
 * and red dropped). It is used as a mask over `currentColor`, which stays
 * white: like the GitHub and LinkedIn marks on Signal, these are never tinted.
 * The footer credits them as their owners' trademarks.
 */
const MARKS: Record<OrgMarkKey, { src: string; aspect: number; name: string }> = {
  must: { src: "/marks/must.png", aspect: 643 / 1152, name: "Mongolian University of Science and Technology" },
  gannon: { src: "/marks/gannon.png", aspect: 442 / 432, name: "Gannon University" },
  chickfila: { src: "/marks/chickfila.svg", aspect: 582 / 263, name: "Chick-fil-A" },
  oyutolgoi: { src: "/marks/oyutolgoi.svg", aspect: 162 / 94, name: "Oyu Tolgoi" },
};

export function OrgMark({ mark, height, className }: { mark: OrgMarkKey; height: number; className?: string }) {
  const m = MARKS[mark];
  const mask = `url(${m.src}) center / contain no-repeat`;
  return (
    <span
      role="img"
      aria-label={m.name}
      className={cn("inline-block shrink-0 bg-[#f4fbfc]", className)}
      style={{ height, width: Math.round(height * m.aspect), mask, WebkitMask: mask }}
    />
  );
}
