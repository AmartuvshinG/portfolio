"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export type StageItem = { key: string; code: string; label: string; sub?: string };

/**
 * The title screen's menu, as a part: stages down a diagonal, the lit one
 * lifted out in the stacked ramp. Chapters use it as their index (the
 * capstone's steps, the phone's pause menu).
 *
 * `active` is owned by the caller. In a pinned chapter that is the scroll, so
 * the pointer never lights a stage on its own (AGENTS.md); a click or Enter
 * calls `onSelect`, which jumps the scroll there. Arrow keys move focus
 * between stages (roving tabindex) and select as they go.
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
}) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const n = items.length;
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

  return (
    <nav className={cn("ms", `ms--${size}`, className)} aria-label={label} onKeyDown={onKeyDown}>
      <ol>
        {items.map((item, i) => {
          const lit = i === active;
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
            tabIndex: lit ? 0 : -1,
            "data-lit": lit ? "true" : "false",
            "data-past": i < active ? "true" : "false",
            className: "ms-item",
            "aria-current": lit ? ("step" as const) : undefined,
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
