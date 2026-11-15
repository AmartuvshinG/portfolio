"use client";

import { useI18n } from "@/lib/i18n";
import type { Locale } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * EN / МН, as a two-position slide switch.
 *
 * Both labels are always shown in their own script (a Mongolian reader scans
 * for "МН", not "MN"), and the pair is a group of two pressed-state buttons
 * rather than a select: two options is one click.
 *
 * A thumb of the ramp sits under the chosen language and slides across on a
 * transform when it changes; the label on it is `text-void`, as all text on
 * the ramp is. Each button keeps a 44px hit area on touch.
 *
 * Renders nothing until a second locale actually exists, so the chrome never
 * advertises a translation that isn't there.
 */
export function LangToggle({ className }: { className?: string }) {
  const { locale, setLocale, available, t } = useI18n();
  if (available.length < 2) return null;
  const at = Math.max(0, available.indexOf(locale));

  return (
    <div
      role="group"
      aria-label={t.lang.switchTo}
      className={cn("lsw", className)}
      style={{ "--n": available.length, "--at": at } as React.CSSProperties}
    >
      <span aria-hidden className="lsw-thumb" />
      {available.map((l: Locale) => {
        const on = l === locale;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={on}
            onClick={() => setLocale(l)}
            className="lsw-opt"
            data-on={on ? "true" : "false"}
          >
            {t.lang[l]}
          </button>
        );
      })}
    </div>
  );
}
