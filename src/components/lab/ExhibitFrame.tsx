"use client";

import { cn } from "@/lib/utils";

/**
 * A LAB exhibit's layout: the explanation and the controls on the left, the
 * live stage on the right (stacked on a phone). The stage is a terminal —
 * holo reticle corners, a status strip naming the exhibit — because what is
 * on it is a reading of the machinery, not decoration.
 */
export function ExhibitFrame({
  index,
  title,
  body,
  controls,
  stageLabel,
  stageRef,
  stageClassName,
  children,
}: {
  index: string;
  title: string;
  body: string;
  controls: React.ReactNode;
  /** Right side of the stage's status strip (live readouts). */
  stageLabel?: React.ReactNode;
  stageRef?: React.Ref<HTMLDivElement>;
  stageClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      <div className="flex flex-col gap-6 lg:col-span-5">
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-xs tabular tracking-[0.24em] text-[var(--color-holo)]">EXHIBIT {index}</span>
          <h3 className="font-tech text-[clamp(1.75rem,3vw,2.75rem)] font-bold uppercase leading-none text-fg">{title}</h3>
        </div>
        <p className="max-w-xl text-base leading-relaxed text-muted md:text-lg">{body}</p>
        <div className="flex flex-col gap-5">{controls}</div>
      </div>

      <div className="lg:col-span-7">
        <div className="relative overflow-hidden border border-line bg-[#04060b]">
          <span
            aria-hidden
            className="hud-brackets pointer-events-none absolute inset-0 z-20 [--hud-c:color-mix(in_srgb,var(--color-holo)_80%,transparent)] [--hud-l:14px] [--hud-w:2px]"
          />
          <div className="relative z-10 flex h-9 items-center justify-between gap-4 border-b border-line bg-[#06070c] px-4 font-mono text-[0.625rem] uppercase tracking-[0.22em]">
            <span className="flex items-center gap-2 text-[var(--color-holo)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-holo)] shadow-[0_0_6px_var(--color-holo)]" />
              LAB · {index}
            </span>
            <span className="truncate text-muted">{stageLabel}</span>
          </div>
          <div ref={stageRef} className={cn("relative h-[62vh] max-h-[44rem] min-h-[22rem] w-full", stageClassName)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A two-state control: a mono label with a lit bar when on. */
export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={cn(
        "flex min-h-11 items-center gap-3 border px-3 font-mono text-xs uppercase tracking-[0.16em] transition-colors",
        on ? "border-[color-mix(in_srgb,var(--color-holo)_60%,transparent)] text-fg" : "border-line text-muted hover:text-fg"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-3 w-1 transition-colors",
          on ? "bg-[var(--color-holo)] shadow-[0_0_8px_var(--color-holo)]" : "bg-line-strong"
        )}
      />
      {label}
    </button>
  );
}

/** A row of readouts: label over value, value in holo. */
export function Readouts({ items }: { items: { k: string; v: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-3 gap-4 border-t border-line pt-4">
      {items.map((it) => (
        <div key={it.k} className="flex min-w-0 flex-col gap-1">
          <dt className="truncate font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">{it.k}</dt>
          <dd className="font-mono text-sm tabular text-[var(--color-holo)]">{it.v}</dd>
        </div>
      ))}
    </dl>
  );
}
