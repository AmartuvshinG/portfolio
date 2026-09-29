"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import type { Locale } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * EN / МН, as a slim text switch.
 *
 * Both labels are always shown in their own script — a Mongolian reader looking
 * for their language scans for "МН", not "MN" — and the pair is a group of two
 * pressed-state buttons rather than a select: two options is one click, and a
 * dropdown for two options is a click to find out there are only two.
 *
 * Renders nothing until a second locale actually exists, so the chrome never
 * advertises a translation that isn't there.
 *
 * No pill: two words and a hairline of the ramp under the active one, sliding
 * across on its own `layoutId` (scoped per instance: the header and the mobile
 * sheet each render one). The padding keeps a full-height hit area.
 */
export function LangToggle({ className }: { className?: string }) {
  const { locale, setLocale, available, t } = useI18n();
  const rule = `lang-rule-${useId()}`;
  if (available.length < 2) return null;

  return (
    <div
      role="group"
      aria-label={t.lang.switchTo}
      className={cn("flex items-center", className)}
    >
      {available.map((l: Locale, i) => {
        const on = l === locale;
        return (
          <span key={l} className="flex items-center">
            {i > 0 && (
              <span aria-hidden className="px-0.5 font-mono text-xs text-faint">
                /
              </span>
            )}
            <button
              type="button"
              lang={l}
              aria-pressed={on}
              onClick={() => setLocale(l)}
              className={cn(
                "relative px-1.5 py-3 font-mono text-xs tracking-[0.18em] transition-colors duration-200",
                on ? "text-fg" : "text-faint hover:text-fg"
              )}
            >
              {t.lang[l]}
              {on && (
                <motion.span
                  layoutId={rule}
                  aria-hidden
                  className="spectrum-rule absolute inset-x-1.5 bottom-2 h-px"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
            </button>
          </span>
        );
      })}
    </div>
  );
}
