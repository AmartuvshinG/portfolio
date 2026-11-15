"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { techGroups } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { useScrollTimelines } from "@/hooks/useScrollTimelines";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { TechMark, brandTile, techLabel } from "@/components/ui/TechMarks";
import { PIN_QUERY } from "@/lib/viewport";
import { cn } from "@/lib/utils";

/**
 * The loadout: the tech stack as a game's equipment screen, dealt by the
 * scroll.
 *
 * Wide screens with scroll timelines: the frame pins and every tool starts in
 * one fanned deck at the centre. The scroll deals them out, one tile after
 * another, into their group's slots; as a group fills, its header lands, its
 * counter ticks up (0/3 → 3/3) and its ramp rule draws. When the last tile is
 * down, one scan of light crosses the whole loadout and the degree line under
 * it rises in. All of it runs on the runway's view timeline (motion.css), on
 * the compositor; React only measures each slot's distance from the deck,
 * once per resize.
 *
 * Everywhere else: each group's tiles flip into their slots once on entry
 * (phones, short windows, browsers without scroll timelines). Reduced motion:
 * the grid at rest.
 *
 * Every tool is a big tile with its name always showing, so nothing waits on
 * a hover.
 */

const RUNWAY_VH = 230;
/** Where in the runway the dealing starts and how much each tile takes. */
const DEAL_FROM = 8;
const DEAL_STEP = 5;

/** The global index of each tile, in dealing order. */
const ORDER = (() => {
  let k = 0;
  return techGroups.map((g) => g.map(() => k++));
})();
const TOTAL = ORDER.flat().length;

export function Loadout({ className, footer }: { className?: string; footer?: React.ReactNode }) {
  const { t } = useI18n();
  const css = useScrollTimelines();
  const reduced = useReducedMotion();
  const room = useMediaQuery(PIN_QUERY);
  const pinned = css && room && !reduced;
  const ref = useRef<HTMLDivElement>(null);
  const groupsRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  /* The settle-once on entry, wherever the deal does not run. */
  useEffect(() => {
    if (pinned || reduced) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [pinned, reduced]);

  /* Each slot's distance from the deck, from layout boxes (offset*, which a
     running transform does not move), written once per resize. */
  useLayoutEffect(() => {
    if (!pinned) return;
    const box = groupsRef.current;
    if (!box) return;
    const measure = () => {
      const B = box.getBoundingClientRect();
      const cx = B.width / 2;
      const cy = B.height / 2;
      box.querySelectorAll<HTMLElement>(".loadout-slot").forEach((slot) => {
        const tile = slot.querySelector<HTMLElement>(".loadout-tile");
        if (!tile) return;
        /* The slot itself never moves (its card is what deals), so its box
           is the layout position. The tile sits at the top of it. */
        const R = slot.getBoundingClientRect();
        const x = R.left - B.left + R.width / 2;
        const y = R.top - B.top + tile.offsetHeight / 2;
        slot.style.setProperty("--dx", `${Math.round(cx - x)}px`);
        slot.style.setProperty("--dy", `${Math.round(cy - y)}px`);
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [pinned]);

  const body = (
    <div
      ref={ref}
      className={cn("loadout", pinned && "loadout--deal", className)}
      data-in={reduced || inView ? "true" : "false"}
      data-still={reduced ? "true" : "false"}
    >
      <h3 className="tag text-center text-fg">{t.craft.dock}</h3>
      <div ref={groupsRef} className="loadout-groups">
        {techGroups.map((keys, g) => {
          const first = ORDER[g][0];
          const last = ORDER[g][keys.length - 1];
          return (
            <section
              key={g}
              className="loadout-group"
              aria-label={t.craft.groups[g]}
              style={{ "--count": keys.length, "--g": g, "--first": first, "--last": last } as React.CSSProperties}
            >
              <header className="loadout-head">
                <span className="tag tabular text-fg/85">{String(g + 1).padStart(2, "0")}</span>
                <span className="tag text-fg">{t.craft.groups[g]}</span>
                {/* The counter: a column of digits stepped up the scroll. */}
                <span aria-hidden className="loadout-count tag tabular">
                  <span className="loadout-count-roll" style={{ "--n": keys.length } as React.CSSProperties}>
                    {Array.from({ length: keys.length + 1 }, (_, n) => (
                      <span key={n}>{n}</span>
                    ))}
                  </span>
                  /{keys.length}
                </span>
                <span aria-hidden className="loadout-rule" />
              </header>
              <ul className="loadout-slots">
                {keys.map((key, i) => {
                  const { tile, ink } = brandTile(key);
                  const k = ORDER[g][i];
                  return (
                    <li
                      key={key}
                      className="loadout-slot"
                      style={
                        {
                          "--i": i,
                          "--k": k,
                          /* The fan: the deck splays a little either side. */
                          "--fr": `${(k - (TOTAL - 1) / 2) * 2.4}deg`,
                          "--fz": `${(TOTAL - k) * -1.5}px`,
                        } as React.CSSProperties
                      }
                    >
                      <span className="loadout-card">
                        <span className="loadout-tile" style={{ background: tile, color: ink }}>
                          <TechMark name={key} size={44} />
                        </span>
                        <span className="loadout-name">{techLabel(key, t.craft.tools)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {pinned && <span aria-hidden className="loadout-sweep" />}
      </div>
      {footer ? <div className="loadout-footer">{footer}</div> : null}
    </div>
  );

  if (!pinned) return body;
  return (
    <div
      className="loadout-runway relative"
      style={{ height: `${RUNWAY_VH}svh`, "--deal-from": DEAL_FROM, "--deal-step": DEAL_STEP } as React.CSSProperties}
    >
      <div className="sticky top-0 flex h-svh flex-col justify-center">{body}</div>
    </div>
  );
}
