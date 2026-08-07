import type { AccentKey } from "@/lib/content";
import { accentColor } from "@/lib/content";
import { cn } from "@/lib/utils";

interface ProjectVisualProps {
  index: string;
  title: string;
  category: string;
  accent: AccentKey;
  className?: string;
}

/**
 * Network-free project visual, drawn from the project's own data.
 *
 * This is the DOM twin of `lib/cardTexture.ts` — same composition, same tint,
 * one for the 3D world and one for everything flat. It sits *underneath* the
 * real screenshot wherever a project is shown, so a missing image file degrades
 * to a designed panel rather than to a broken frame, and the site looks
 * finished before any assets arrive.
 */
export function ProjectVisual({
  index,
  title,
  category,
  accent,
  className,
}: ProjectVisualProps) {
  const color = accentColor[accent];
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-void-2",
        className
      )}
    >
      {/* Hairline grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(236,238,251,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(236,238,251,0.07) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Accent wash, weighted to one corner so the projects don't read alike */}
      <div
        className="absolute -right-1/4 top-1/2 h-[130%] w-2/3 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: color }}
      />

      {/* Oversized index watermark */}
      <span
        className="display-caps absolute -bottom-[0.18em] -left-2 select-none opacity-[0.14]"
        style={{ fontSize: "clamp(8rem, 22vw, 20rem)", color }}
      >
        {index}
      </span>

      <div className="absolute inset-0 flex flex-col justify-between p-6">
        <span
          className="font-mono text-[0.6875rem] uppercase tracking-[0.22em]"
          style={{ color }}
        >
          {category}
        </span>
        <span className="display-caps text-3xl text-fg/90 md:text-5xl">
          {title}
        </span>
      </div>
    </div>
  );
}
