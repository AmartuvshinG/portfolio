"use client";

import { useI18n } from "@/lib/i18n";
import type { Locale } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * EN / МН, as a two-segment switch.
 *
 * Both labels are always shown in their own script — a Mongolian reader looking
 * for their language scans for "МН", not "MN" — and the pair is a group of two
 * pressed-state buttons rather than a select: two options is one click, and a
 * dropdown for two options is a click to find out there are only two.
 *
 * Renders nothing until a second locale actually exists, so the chrome never
 * advertises a translation that isn't there.
 */
export function LangToggle({ className }: { className?: string }) {
  const { locale, setLocale, available, t } = useI18n();
  if (available.length < 2) return null;

  return (
    <div
      role="group"
      aria-label={t.lang.switchTo}
      className={cn("flex items-center border border-line", className)}
    >
      {available.map((l: Locale) => {
        const on = l === locale;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={on}
            onClick={() => setLocale(l)}
            className={cn(
              "h-9 min-w-10 px-2.5 font-mono text-[0.8125rem] tracking-[0.12em] transition-colors",
              on ? "bg-fg text-void" : "text-muted hover:text-fg"
            )}
          >
            {t.lang[l]}
          </button>
        );
      })}
    </div>
  );
}
