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
 * On-brand, network-free project visual: a metal panel with holo grid, an
 * accent energy glow, an oversized index and a title watermark. Used for the
 * homepage rail and featured reveal (detail pages use a real photo).
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
      className={cn("metal relative h-full w-full overflow-hidden", className)}
      style={{ ["--pv" as string]: color }}
    >
      {/* Grid */}
      <div className="holo-grid absolute inset-0 opacity-25" />

      {/* Energy glow */}
      <div
        className="absolute -right-1/4 top-1/2 h-[120%] w-2/3 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: color }}
      />

      {/* Scanlines */}
      <div className="scanlines absolute inset-0 opacity-30" />

      {/* Oversized index */}
      <span
        className="absolute -bottom-6 -left-2 select-none font-display font-black leading-none opacity-10"
        style={{ fontSize: "clamp(8rem, 22vw, 20rem)", color }}
      >
        {index}
      </span>

      {/* Title watermark */}
      <div className="absolute inset-0 flex flex-col justify-between p-6">
        <span className="hud-label" style={{ color }}>
          {category}
        </span>
        <span className="font-display text-3xl font-black uppercase text-fg/90 md:text-5xl">
          {title}
        </span>
      </div>

      {/* Corner ticks */}
      <span className="absolute left-3 top-3 h-4 w-4 border-l border-t" style={{ borderColor: color }} />
      <span className="absolute bottom-3 right-3 h-4 w-4 border-b border-r" style={{ borderColor: color }} />
    </div>
  );
}
