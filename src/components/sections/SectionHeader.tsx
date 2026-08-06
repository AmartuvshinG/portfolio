import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  index: string;
  label: string;
  title: string;
  description?: string;
  className?: string;
  align?: "left" | "center";
  /**
   * `caps` sets the title in KPR's oversized grotesk; `serif` in the editorial
   * face. Alternating between them across the page is what gives the acts
   * distinct voices — a single treatment everywhere flattens them back out.
   */
  voice?: "caps" | "serif";
}

/**
 * Section masthead: a mono index and label above an oversized title.
 *
 * The old bracketed-HUD version is gone along with the rest of that vocabulary;
 * what remains is a rule, an index and the title, which is what all three
 * reference sites do.
 */
export function SectionHeader({
  index,
  label,
  title,
  description,
  className,
  align = "left",
  voice = "caps",
}: SectionHeaderProps) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-5",
        align === "center" && "items-center text-center",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <span className="micro tabular">{index}</span>
        <span className="h-px w-10 bg-current opacity-25" />
        <span className="micro">{label}</span>
      </div>

      {voice === "caps" ? (
        <h2
          className="display-caps text-fg"
          style={{ fontSize: "clamp(2.75rem, 8vw, 8rem)" }}
        >
          {title}
        </h2>
      ) : (
        <h2
          className="font-editorial leading-[1.02] text-fg"
          style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}
        >
          {title}
        </h2>
      )}

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
