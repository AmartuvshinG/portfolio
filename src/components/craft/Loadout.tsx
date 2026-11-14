"use client";

import { useEffect, useRef, useState } from "react";
import { techGroups } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { useScrollTimelines } from "@/hooks/useScrollTimelines";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { TechMark, brandTile, techLabel } from "@/components/ui/TechMarks";
import { cn } from "@/lib/utils";

/**
 * The loadout: the tech stack as a game's equipment screen.
 *
 * Every tool is a big tile with its name always showing, so nothing waits on
 * a hover (the old dock's tiles were too small to read until magnified). The
 * tiles come in from scattered positions and lock into their group's slots as
 * the chapter scrolls up: scrubbed on a view timeline where the browser has
 * them, a one-time settle on entry where it does not. Each group's ramp rule
 * draws as its tiles land.
 */

/** A fixed scatter per slot (no Math.random: same on server and client). */
function scatter(g: number, i: number) {
  const s = Math.sin((g + 1) * 12.9898 + (i + 1) * 78.233) * 43758.5453;
  const r = s - Math.floor(s);
  const dir = (g + i) % 2 === 0 ? -1 : 1;
  return {
    "--sx": `${Math.round(dir * (60 + r * 140))}px`,
    "--sy": `${Math.round(90 + r * 160)}px`,
    "--sr": `${Math.round(dir * (8 + r * 22))}deg`,
  };
}

export function Loadout({ className }: { className?: string }) {
  const { t } = useI18n();
  const css = useScrollTimelines();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  /* The fallback settle, for browsers without scroll timelines. */
  useEffect(() => {
    if (css || reduced) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [css, reduced]);

  return (
    <div
      ref={ref}
      className={cn("loadout", css && !reduced && "loadout--scroll", className)}
      data-in={reduced || inView ? "true" : "false"}
      data-still={reduced ? "true" : "false"}
    >
      <h3 className="tag text-center text-fg">{t.craft.dock}</h3>
      <div className="loadout-groups">
        {techGroups.map((keys, g) => (
          <section key={g} className="loadout-group" aria-label={t.craft.groups[g]} style={{ "--count": keys.length } as React.CSSProperties}>
            <header className="loadout-head">
              <span className="tag tabular text-fg/85">{String(g + 1).padStart(2, "0")}</span>
              <span className="tag text-fg">{t.craft.groups[g]}</span>
              <span aria-hidden className="loadout-rule" style={{ "--g": g } as React.CSSProperties} />
            </header>
            <ul className="loadout-slots">
              {keys.map((key, i) => {
                const { tile, ink } = brandTile(key);
                return (
                  <li
                    key={key}
                    className="loadout-slot"
                    style={{ "--g": g, "--i": i, ...scatter(g, i) } as React.CSSProperties}
                  >
                    <span className="loadout-tile" style={{ background: tile, color: ink }}>
                      <TechMark name={key} size={44} />
                    </span>
                    <span className="loadout-name">{techLabel(key, t.craft.tools)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
