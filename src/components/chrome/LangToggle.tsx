"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { DROPLET_LAND, DROPLET_STYLE } from "@/components/chrome/NavGlyphs";
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
 *
 * A glass capsule whose active segment is the nav's droplet, sliding across on
 * its own `layoutId` (scoped per instance: the header and the mobile sheet
 * each render one).
 */
export function LangToggle({ className }: { className?: string }) {
  const { locale, setLocale, available, t } = useI18n();
  const drop = `lang-drop-${useId()}`;
  if (available.length < 2) return null;

  return (
    <div
      role="group"
      aria-label={t.lang.switchTo}
      className={cn("liquid-glass flex items-center rounded-full p-0.5", className)}
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
              "relative h-8 min-w-10 rounded-full px-2.5 font-mono text-[0.8125rem] tracking-[0.12em] transition-colors duration-200",
              on ? "text-fg" : "text-muted hover:text-fg"
            )}
          >
            {on && (
              <motion.span
                layoutId={drop}
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={DROPLET_STYLE}
                initial={DROPLET_LAND.initial}
                animate={DROPLET_LAND.animate}
                transition={DROPLET_LAND.transition}
              />
            )}
            <span className="relative">{t.lang[l]}</span>
          </button>
        );
      })}
    </div>
  );
}
