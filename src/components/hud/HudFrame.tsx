import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HudFrameProps {
  children: ReactNode;
  className?: string;
  /** Optional label rendered on the top-left of the frame. */
  label?: string;
  /** Optional readout rendered on the top-right. */
  readout?: string;
  as?: "div" | "section" | "article";
}

/**
 * A bordered HUD panel with L-shaped corner brackets and optional
 * label/readout. Presentational-only (server component).
 */
export function HudFrame({
  children,
  className,
  label,
  readout,
  as: Tag = "div",
}: HudFrameProps) {
  return (
    <Tag className={cn("relative border border-line", className)}>
      {/* Corner brackets */}
      <Corner className="left-0 top-0 border-l border-t" />
      <Corner className="right-0 top-0 border-r border-t" />
      <Corner className="bottom-0 left-0 border-b border-l" />
      <Corner className="bottom-0 right-0 border-b border-r" />

      {(label || readout) && (
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2">
          {label && <span className="hud-label text-cyan/80">{label}</span>}
          {readout && <span className="hud-label tabular">{readout}</span>}
        </div>
      )}

      {children}
    </Tag>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute h-3 w-3 border-cyan",
        className
      )}
    />
  );
}
