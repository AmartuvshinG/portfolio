"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { restoreSound, setSound, soundOn, subscribeSound, tick } from "@/lib/sound";
import { cn } from "@/lib/utils";

/**
 * Sound on / off, as a slim text switch beside the language toggle.
 *
 * Four equaliser bars and a word. The bars stand still when off and bounce
 * when on, so the state is readable without the word. Off by default: sound
 * is opt-in, always, and the click on this button is the user gesture the
 * browser needs before any audio may start (lib/sound).
 */
export function SoundToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const [on, setOn] = useState(false);

  useEffect(() => {
    const off = subscribeSound(setOn);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a stored preference
    setOn(restoreSound() || soundOn());
    return off;
  }, []);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={t.sound.label}
      onClick={() => {
        setSound(!on);
        if (!on) setTimeout(() => tick(4), 40);
      }}
      className={cn(
        "group relative flex items-center gap-2 px-1.5 py-3 font-mono text-xs tracking-[0.18em] transition-colors duration-200",
        on ? "text-fg" : "text-faint hover:text-fg",
        className
      )}
    >
      <span aria-hidden className={cn("flex h-3 items-end gap-[2px]", on && "sound-live")}>
        {[0.45, 1, 0.65, 0.85].map((h, i) => (
          <span
            key={i}
            className="sound-bar w-[2px] origin-bottom rounded-full bg-current"
            style={{ height: "100%", transform: `scaleY(${on ? h : 0.3})`, animationDelay: `${i * 0.13}s` }}
          />
        ))}
      </span>
      <span aria-hidden>{on ? t.sound.on : t.sound.off}</span>
      {on && <span aria-hidden className="spectrum-rule absolute inset-x-1.5 bottom-2 h-px" />}
    </button>
  );
}
