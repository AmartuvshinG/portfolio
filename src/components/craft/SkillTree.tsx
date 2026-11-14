"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { MARK_D, MARK_T } from "@/components/chrome/NavGlyphs";
import { TechMark, techLabel } from "@/components/ui/TechMarks";
import { getCourse, type Capability } from "@/lib/content";
import { openCase } from "@/lib/caseFile";

/**
 * Skill tree: the six capabilities as nodes on a ring around the mark, wired
 * to it like a game's talent tree.
 *
 * The chapter pins. Its scroll progress unlocks the nodes in order: the wire
 * to each one draws, the hex lights, and the panel beside the tree shows what
 * that node holds (the tools, the courses behind it, the project that proves
 * it). Unlocked nodes stay lit. Clicking a node scrolls to its position;
 * nothing follows the pointer (pinned UI, AGENTS.md).
 *
 * Wide screens with motion only. Phones and reduced motion keep the list and
 * the bento (Capabilities).
 */

const STEP_VH = 70;
/** Node positions on the ring, as angles (deg, 0 = up). */
const ANGLES = [-60, 0, 60, 120, 180, 240];
const RING = 36;

export function SkillTree({ items }: { items: Capability[] }) {
  const { c, t } = useI18n();
  const { scrollTo } = useSmoothScroll();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const n = items.length;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const travel = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / travel));
      const i = Math.min(n - 1, Math.floor(p * n * 0.999));
      setActive(i);
      setUnlocked((u) => Math.max(u, p > 0 ? i + 1 : 0));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [n]);

  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    scrollTo(top + ((i + 0.5) / n) * travel);
  };

  const cur = items[active];
  const pos = (i: number) => {
    const a = ((ANGLES[i] ?? 0) * Math.PI) / 180;
    return { x: Math.sin(a) * RING, y: -Math.cos(a) * RING };
  };
  /* The ring arc from node i to the next, clockwise (the last closes it). */
  const arc = (i: number) => {
    const p0 = pos(i);
    const p1 = pos((i + 1) % n);
    return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${RING} ${RING} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  };
  const tip = pos(active);

  return (
    <div ref={ref} className="relative" style={{ height: `${n * STEP_VH + 100}svh` }}>
      <div className="sticky top-0 flex h-[100svh] items-center">
        <div className="tree mx-auto w-full max-w-[112.5rem] px-8 lg:px-16">
          <div className="tree-graph">
            <svg className="tree-wires" viewBox="-50 -50 100 100" aria-hidden>
              <defs>
                <linearGradient id="tree-ramp" x1="-40" y1="40" x2="40" y2="-40" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#ff1f3d" />
                  <stop offset="0.4" stopColor="#e81cc8" />
                  <stop offset="0.72" stopColor="#8a3dff" />
                  <stop offset="1" stopColor="#5664ff" />
                </linearGradient>
              </defs>
              <circle r={RING} className="tree-orbit" />
              {items.map((it, i) => {
                const { x, y } = pos(i);
                return (
                  <g key={it.code}>
                    <line x1={0} y1={0} x2={x} y2={y} className="tree-wire" />
                    <line x1={0} y1={0} x2={x} y2={y} pathLength={1} className="tree-wire--lit" data-on={i < unlocked ? "true" : "false"} />
                    {/* The link to the next node: drawn once both ends are
                        unlocked, so by the last node the ring is closed. */}
                    <path
                      d={arc(i)}
                      pathLength={1}
                      className="tree-link"
                      data-on={(i + 1 < unlocked || (i === n - 1 && unlocked === n)) ? "true" : "false"}
                    />
                  </g>
                );
              })}
              {/* A packet of light runs out along the wire to the node that
                  just lit. Remounted per node, so it plays once each time. */}
              {unlocked > 0 && (
                <g key={`pk-${active}`} className="tree-packet" style={{ "--tx": `${tip.x}px`, "--ty": `${tip.y}px` } as React.CSSProperties}>
                  <circle r={1.6} className="tree-packet-core" />
                  <circle r={3.6} className="tree-packet-halo" />
                </g>
              )}
            </svg>
            <div className="tree-hub">
              <svg viewBox="0 0 32 32" aria-hidden>
                <path d={MARK_D} transform={MARK_T} fill="currentColor" />
              </svg>
            </div>
            <ol className="tree-nodes">
              {items.map((it, i) => {
                const { x, y } = pos(i);
                return (
                  <li key={it.code} style={{ left: `${50 + x}%`, top: `${50 + y}%` }}>
                    <button
                      type="button"
                      className="tree-node"
                      data-on={i < unlocked ? "true" : "false"}
                      data-active={i === active ? "true" : "false"}
                      aria-current={i === active ? "step" : undefined}
                      onClick={() => go(i)}
                    >
                      <span className="tree-hex" aria-hidden>
                        <TechMark name={it.stack[0]} size={26} />
                        <span className="tree-num tabular">{String(i + 1).padStart(2, "0")}</span>
                      </span>
                      {i === active && unlocked > 0 && <span key={`sh-${active}`} aria-hidden className="tree-shock" />}
                      <span className="tree-node-label">{it.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <article className="tree-panel" aria-live="polite">
            {/* A shutter of ramp bars closes and opens over each new item. */}
            <span key={`w-${active}`} aria-hidden className="tree-shutter">
              {[0, 1, 2, 3, 4].map((b) => (
                <span key={b} style={{ "--b": b } as React.CSSProperties} />
              ))}
            </span>
            <span aria-hidden className="tree-ghost display-caps tabular">
              <span key={`g-${active}`}>{String(active + 1).padStart(2, "0")}</span>
            </span>
            <div key={`c-${active}`} className="tree-panel-body">
              <span className="micro flex items-center gap-3 text-fg/85">
                <span className="tree-code">{cur.code}</span>
                <span className="tree-roll tabular">
                  <span>{String(active + 1).padStart(2, "0")}</span>
                </span>
                / {String(n).padStart(2, "0")}
              </span>
              <h3 className="tree-title display-caps">{cur.title}</h3>
              <p className="text-base leading-relaxed text-fg/85">{cur.description}</p>
              <div>
                <span className="tag text-[var(--color-rim)]">{t.craft.stack}</span>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {cur.stack.map((k, i) => (
                    <li key={k} className="tree-tool" style={{ "--i": i } as React.CSSProperties}>
                      <span className="tree-tool-mark">
                        <TechMark name={k} size={22} />
                      </span>
                      {techLabel(k, t.craft.tools)}
                    </li>
                  ))}
                </ul>
              </div>
              {(cur.courses?.length ?? 0) > 0 && (
                <div>
                  <span className="tag text-[var(--color-rim)]">{t.craft.studied}</span>
                  <ul className="mt-3 grid gap-1.5">
                    {cur.courses?.map((code, i) => (
                      <li key={code} className="tree-course" style={{ "--i": i } as React.CSSProperties}>
                        <span aria-hidden className="tree-tick" />
                        <span className="font-mono text-fg/85">{code}</span>
                        <span className="text-fg">{getCourse(code)?.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {cur.proof && (
                <button type="button" className="tree-proof tag" onClick={() => openCase(cur.proof!)}>
                  {t.craft.proven} {c.projects.find((p) => p.slug === cur.proof)?.title ?? cur.proof} <ArrowUpRight aria-hidden size={18} />
                </button>
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
