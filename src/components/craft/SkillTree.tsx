"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { MARK_D, MARK_T } from "@/components/chrome/NavGlyphs";
import { TechMark, techLabel } from "@/components/ui/TechMarks";
import { getCourse, type Capability } from "@/lib/content";
import { openCase } from "@/lib/caseFile";

/**
 * Skill tree: the six capabilities as nodes on a ring around the mark, wired
 * to it like a game's talent tree, with the item card beside it.
 *
 * One clock drives the graph and the card. The chapter pins, and node *i*
 * owns the stretch of scroll [i/n, (i+1)/n]:
 *
 *   0–30%   a packet of light runs out along the wire to the node, and the
 *           wire draws behind it (scrubbed on the runway's view timeline);
 *   at 30%  the node ignites AND the card flips to it: both read the same
 *           threshold from the same scroll position, so they change together;
 *   30–100% hold. A bar across the top of the card fills as you dwell and
 *           resets when the next node takes over, so you can see the card
 *           counting down to the next node.
 *
 * A tether is drawn from the lit node to the card's edge, the hub's dial turns
 * to face it, and the card's contents are swept in by a beam from the side
 * the tether enters. Unlocked nodes stay lit and the ring closes by node 06.
 * Clicking a node scrolls to its hold; nothing follows the pointer (pinned UI,
 * AGENTS.md).
 *
 * Wide screens with motion only. Phones and reduced motion keep the list and
 * the bento (Capabilities).
 */

const STEP_VH = 70;
/** Node positions on the ring, as angles (deg, 0 = up, clockwise). */
const ANGLES = [-60, 0, 60, 120, 180, 240];
const RING = 36;
/** Where in its stretch a node ignites and the card flips. */
const IGNITE = 0.3;

export function SkillTree({ items }: { items: Capability[] }) {
  const { c, t } = useI18n();
  const { scrollTo } = useSmoothScroll();
  const ref = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const nodeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [tether, setTether] = useState<{ x: number; y: number; len: number; deg: number } | null>(null);
  const n = items.length;
  const started = unlocked > 0;

  /* The discrete half of the clock: which node is lit, which card shows. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const travel = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / travel));
      const lit = Math.min(n, Math.max(0, Math.floor(p * n - IGNITE + 1)));
      setUnlocked((u) => Math.max(u, lit));
      setActive(Math.max(0, lit - 1));
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

  /* The tether: from the lit node's hex to the middle of the card's leading
     edge, measured when the node changes or the frame resizes. The frame is
     pinned, so nothing moves under it during the hold. */
  useLayoutEffect(() => {
    const tree = treeRef.current;
    const panel = panelRef.current;
    if (!tree || !panel) return;
    const measure = () => {
      const node = nodeRefs.current[active];
      if (!node) return;
      const T = tree.getBoundingClientRect();
      const N = node.getBoundingClientRect();
      /* The layout box, not the painted one: the standby offset (a
         transform) is still settling when node 01 ignites. */
      const R = panel.getBoundingClientRect();
      const shift = new DOMMatrixReadOnly(getComputedStyle(panel).transform).m41;
      const P = { left: R.left - shift, top: R.top, height: R.height };
      const x0 = N.left + N.width / 2 - T.left;
      const y0 = N.top + N.height / 2 - T.top;
      const x1 = P.left - T.left;
      const y1 = P.top + P.height * 0.18 - T.top;
      const dx = x1 - x0;
      const dy = y1 - y0;
      setTether({ x: x0, y: y0, len: Math.hypot(dx, dy), deg: (Math.atan2(dy, dx) * 180) / Math.PI });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(tree);
    return () => ro.disconnect();
  }, [active, started]);

  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    scrollTo(top + ((i + (1 + IGNITE) / 2) / n) * travel);
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

  return (
    <div
      ref={ref}
      className="tree-runway relative"
      style={{ height: `${n * STEP_VH + 100}svh`, "--n": n, "--ignite": IGNITE } as React.CSSProperties}
    >
      <div className="sticky top-0 flex h-[100svh] items-center">
        <div ref={treeRef} className="tree relative mx-auto w-full max-w-[112.5rem] px-8 lg:px-16">
          {tether && unlocked > 0 && (
            <span
              key={`t-${active}`}
              aria-hidden
              className="tree-tether"
              style={{ left: tether.x, top: tether.y, width: tether.len, transform: `rotate(${tether.deg}deg)` }}
            >
              <span />
            </span>
          )}
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
              {items.map((it, i) => (
                /* The link to the next node: drawn once both ends are lit,
                   so by the last node the ring is closed. */
                <path
                  key={it.code}
                  d={arc(i)}
                  pathLength={1}
                  className="tree-link"
                  data-on={i + 1 < unlocked || (i === n - 1 && unlocked === n) ? "true" : "false"}
                />
              ))}
            </svg>
            {/* The wires, as hairlines turned to each node's angle: the lit
                one draws on scaleX and the packet rides it, both scrubbed. */}
            <div className="tree-spokes" aria-hidden>
              {items.map((it, i) => (
                <span
                  key={it.code}
                  className="tree-spoke"
                  data-on={i < unlocked ? "true" : "false"}
                  style={{ "--i": i, transform: `rotate(${(ANGLES[i] ?? 0) - 90}deg)` } as React.CSSProperties}
                >
                  <span className="tree-spoke-lit" />
                  <span className="tree-pk">
                    <span />
                  </span>
                </span>
              ))}
            </div>
            <div className="tree-hub">
              {/* The dial: its notch turns to face the lit node, and settles. */}
              <span aria-hidden className="tree-dial" style={{ transform: `rotate(${ANGLES[active] ?? 0}deg)` }} data-on={unlocked > 0 ? "true" : "false"} />
              <svg viewBox="0 0 32 32" aria-hidden>
                <path d={MARK_D} transform={MARK_T} fill="currentColor" />
              </svg>
            </div>
            <ol className="tree-nodes">
              {items.map((it, i) => {
                const { x, y } = pos(i);
                const on = i < unlocked;
                const isActive = on && i === active;
                return (
                  <li key={it.code} style={{ left: `${50 + x}%`, top: `${50 + y}%` }}>
                    <button
                      type="button"
                      className="tree-node"
                      data-on={on ? "true" : "false"}
                      data-active={isActive ? "true" : "false"}
                      aria-current={isActive ? "step" : undefined}
                      onClick={() => go(i)}
                    >
                      <span
                        className="tree-hex"
                        aria-hidden
                        ref={(el) => {
                          nodeRefs.current[i] = el;
                        }}
                      >
                        <TechMark name={it.stack[0]} size={26} />
                        <span className="tree-num tabular">{String(i + 1).padStart(2, "0")}</span>
                      </span>
                      {isActive && <span key={`sh-${active}`} aria-hidden className="tree-shock" />}
                      <span className="tree-node-label">{it.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <article ref={panelRef} className="tree-panel" aria-live="polite" data-on={unlocked > 0 ? "true" : "false"}>
            {/* The dwell bar: one segment per node, each filling over its
                node's hold (motion.css, on the runway's timeline). */}
            <span aria-hidden className="tree-seg">
              {items.map((it, i) => (
                <span key={it.code} style={{ "--i": i } as React.CSSProperties} />
              ))}
            </span>
            {/* The beam that sweeps each new item in from the tether's side. */}
            <span key={`b-${active}`} aria-hidden className="tree-beam" />
            <span aria-hidden className="tree-ghost display-caps tabular">
              <span key={`g-${active}`}>{String(active + 1).padStart(2, "0")}</span>
            </span>
            <div key={`c-${active}`} className="tree-panel-body">
              <span className="micro flex items-center gap-3 text-fg/85">
                <span className="tree-code">{t.craft.title}</span>
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
