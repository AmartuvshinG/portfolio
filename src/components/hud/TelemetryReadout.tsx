import { cn } from "@/lib/utils";

interface TelemetryReadoutProps {
  label: string;
  value: string;
  accent?: boolean;
  blink?: boolean;
  className?: string;
}

/** Compact HUD label/value pair with an optional status dot. */
export function TelemetryReadout({
  label,
  value,
  accent,
  blink,
  className,
}: TelemetryReadoutProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="hud-label flex items-center gap-1.5">
        {blink && (
          <span
            className={cn(
              "h-1.5 w-1.5",
              accent ? "bg-cyan" : "bg-muted",
              blink && "animate-blink"
            )}
          />
        )}
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-sm tabular",
          accent ? "text-cyan" : "text-fg"
        )}
      >
        {value}
      </span>
    </div>
  );
}
