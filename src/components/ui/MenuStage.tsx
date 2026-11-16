"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type StageItem = { key: string; code: string; label: string; sub?: string };

/** Gap between stages as the opening sweep runs down the menu, in ms. */
const SWEEP_STEP = 70;

/**
 * The title screen's menu, as a part: stages down a diagonal, the lit one
 * lifted out in the stacked ramp. Chapters use it as their index (the
 * capstone's steps) and the navbar uses it as its menus.
 *
 * `active` is owned by the caller. In a pinned chapter that is the scroll, so
 * the pointer never lights a stage on its own (AGENTS.md); a click or Enter
 * calls `onSelect`, which jumps the scroll there. Arrow keys move focus
 * between stages (roving tabindex) and select as they go.
 *
 * Two options make it behave like the hero's menu, for the navbar only (a
 * menu of links, not scroll-driven UI, so the pointer rule doesn't apply):
 *   - `pointerLights`: hovering or focusing a stage lights it, and leaving
 *     the menu hands the light back to `active`;
 *   - `sweep`: as the menu opens, the light runs down every stage once and
 *     settles on `active`. Any pointer or key input cuts it short. Skipped
 *     under reduced motion.
 */
export function MenuStage({
  items,
  active,
  onSelect,
  label,
  size = "md",
  className,
  linkProps,
  selectOnMove = true,
  pointerLights = false,
  sweep = false,
}: {
  items: StageItem[];
  active: number;
  onSelect: (i: number) => void;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Render stages as links (the phone menu) instead of buttons. */
  linkProps?: (i: number) => { href: string };
  /** Arrow keys select as they move (a chapter index), or only move focus
   *  (the phone menu, where selecting navigates away). */
  selectOnMove?: boolean;
  /** Hover and focus light a stage, as on the title screen. */
  pointerLights?: boolean;
  /** Run the light down the menu once as it opens. */
  sweep?: boolean;
}) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const n = items.length;
  const [hover, setHover] = useState<number | null>(null);
  const [sweepAt, setSweepAt] = useState<number | null>(null);
  const timers = useRef<number[]>([]);

  const stopSweep = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setSweepAt(null);
  };

  /* The opening sweep: one pass, then the light rests on `active`. */
  useEffect(() => {
    if (!sweep || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ids: number[] = [];
    for (let k = 0; k <= n; k++) {
      ids.push(window.setTimeout(() => setSweepAt(k < n ? k : null), 120 + k * SWEEP_STEP));
    }
    timers.current = ids;
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [sweep, n]);

  const lit = sweepAt ?? (pointerLights ? hover : null) ?? active;

  /* Which stage has focus, for arrow keys when they don't select. */
  const focusAt = () => {
    const i = refs.current.findIndex((el) => el === document.activeElement);
    return i < 0 ? active : i;
  };

  const move = (to: number) => {
    const k = (to + n) % n;
    refs.current[k]?.focus();
    if (selectOnMove) onSelect(k);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (sweepAt !== null) stopSweep();
    const at = selectOnMove ? active : focusAt();
    const keys: Record<string, number> = {
      ArrowDown: at + 1,
      ArrowRight: at + 1,
      ArrowUp: at - 1,
      ArrowLeft: at - 1,
      Home: 0,
      End: n - 1,
    };
    if (e.key in keys) {
      e.preventDefault();
      e.stopPropagation();
      move(keys[e.key]);
    }
  };

  const light = (i: number) => {
    if (!pointerLights) return;
    if (sweepAt !== null) stopSweep();
    setHover(i);
  };

  return (
    <nav
      className={cn("ms", `ms--${size}`, pointerLights && "ms--hero", className)}
      aria-label={label}
      onKeyDown={onKeyDown}
      onPointerLeave={pointerLights ? () => setHover(null) : undefined}
    >
      <ol>
        {items.map((item, i) => {
          const isLit = i === lit;
          const inner = (
            <>
              <span className="ms-code tag" aria-hidden>
                {item.code}
              </span>
              <span className="ms-label">{item.label}</span>
              {item.sub ? <span className="ms-sub">{item.sub}</span> : null}
            </>
          );
          const common = {
            ref: (el: HTMLElement | null) => {
              refs.current[i] = el;
            },
            tabIndex: i === active ? 0 : -1,
            "data-lit": isLit ? "true" : "false",
            "data-past": i < active ? "true" : "false",
            className: "ms-item",
            "aria-current": i === active ? ("step" as const) : undefined,
            onPointerEnter: pointerLights ? () => light(i) : undefined,
            onFocus: pointerLights ? () => light(i) : undefined,
          };
          return (
            <li key={item.key} className="ms-stage" style={{ "--i": i } as React.CSSProperties}>
              {linkProps ? (
                <a
                  {...common}
                  {...linkProps(i)}
                  ref={common.ref as React.Ref<HTMLAnchorElement>}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelect(i);
                  }}
                >
                  {inner}
                </a>
              ) : (
                <button {...common} ref={common.ref as React.Ref<HTMLButtonElement>} type="button" onClick={() => onSelect(i)}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
