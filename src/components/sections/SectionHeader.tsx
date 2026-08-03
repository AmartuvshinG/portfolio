import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  index: string;
  label: string;
  title: string;
  description?: string;
  className?: string;
  align?: "left" | "center";
}

/**
 * Consistent section masthead: a bracketed HUD label + index on top, an
 * oversized display title, and an optional description. Reused by every
 * content section so the page reads as one system.
 */
export function SectionHeader({
  index,
  label,
  title,
  description,
  className,
  align = "left",
}: SectionHeaderProps) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-cyan">[ {index} ]</span>
        <span className="h-px w-10 bg-line-strong" />
        <span className="hud-label">{label}</span>
      </div>

      <h2
        className="font-display font-black uppercase leading-[0.9] text-fg"
        style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}
      >
        {title}
      </h2>

      {description && (
        <p
          className={cn(
            "max-w-xl text-base leading-relaxed text-muted",
            align === "center" && "mx-auto"
          )}
        >
          {description}
        </p>
      )}
    </Reveal>
  );
}
