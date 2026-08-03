import { cn } from "@/lib/utils";

interface StatusTickerProps {
  items: string[];
  className?: string;
}

/**
 * Infinite horizontal marquee of technical status strings. The list is
 * duplicated so the CSS translateX(-50%) loop is seamless. Pauses under
 * reduced-motion (global rule freezes the animation).
 */
export function StatusTicker({ items, className }: StatusTickerProps) {
  const row = [...items, ...items];
  return (
    <div
      className={cn(
        "relative flex overflow-hidden border-y border-line bg-surface/40 py-2",
        className
      )}
    >
      <div className="animate-marquee flex shrink-0 items-center gap-8 pr-8">
        {row.map((item, i) => (
          <span key={i} className="hud-label flex items-center gap-3 text-muted">
            <span className="h-1 w-1 bg-cyan" aria-hidden />
            {item}
          </span>
        ))}
      </div>
      <div
        className="animate-marquee flex shrink-0 items-center gap-8 pr-8"
        aria-hidden
      >
        {row.map((item, i) => (
          <span key={i} className="hud-label flex items-center gap-3 text-muted">
            <span className="h-1 w-1 bg-cyan" aria-hidden />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
