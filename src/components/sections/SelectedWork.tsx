"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { openCase } from "@/lib/caseFile";
import type { Project } from "@/lib/content";

/**
 * Missions: every screenshot of every project, fanned on an arch.
 *
 * After the Chained Spring Arc Carousel reference (docs/reference): cards sit
 * on a wheel whose pivot is far below the frame, so their tops trace a shallow
 * arc. When the lead card moves, the rest follow it like a plucked string
 * (each card springs toward its neighbour's angle less one gap), so a jump
 * ripples down the wheel instead of rotating as one plate.
 *
 * **Scroll drives it, never the pointer.** On a wide screen the chapter pins
 * and its scroll progress picks the card in front: no wheel hijack, no hover
 * steering (AGENTS.md). Clicking a side card scrolls to its position; clicking
 * the front card, or the title, opens the project's case file. On a phone or
 * under reduced motion the chapter doesn't pin: ← / → buttons and a swipe move
 * the wheel instead.
 *
 * The physics live in a ref-backed frame loop that writes transforms directly
 * and goes to sleep as soon as the wheel settles. React only re-renders when
 * the front card changes, which is when the label above it changes.
 */

interface Card {
  project: Project;
  src: string;
  alt: string;
}

/** Degrees between neighbouring cards. */
const GAP = 13;
const STIFF = 0.16;
const DAMP = 0.62;
/** Scroll per card while pinned, in viewport heights. */
const STEP_VH = 34;

export function SelectedWork() {
  const { c, t } = useI18n();
  const reduced = useReducedMotion();
  const wide = useMediaQuery("(min-width: 768px) and (min-height: 600px)");
  const pinned = wide && !reduced;
  const { scrollTo } = useSmoothScroll();

  const cards = useMemo<Card[]>(
    () =>
      c.projects.flatMap((p) => [
        ...(p.shot ? [{ project: p, src: p.shot, alt: p.title }] : []),
        ...(p.gallery ?? []).map((g) => ({ project: p, src: g.src, alt: g.alt })),
      ]),
    [c.projects]
  );
  const n = cards.length;

  const sectionRef = useRef<HTMLElement>(null);
  const cardEls = useRef<(HTMLButtonElement | null)[]>([]);
  const target = useRef(0);
  const angles = useRef<{ a: number; v: number }[]>([]);
  const wake = useRef<() => void>(() => {});
  const [front, setFront] = useState(0);

  /* The wheel: a chained spring, asleep whenever it is still. */
  useEffect(() => {
    if (angles.current.length !== n) angles.current = Array.from({ length: n }, (_, i) => ({ a: i * GAP, v: 0 }));
    let raf = 0;
    const write = () => {
      const st = angles.current;
      let best = 0;
      let bestAbs = Infinity;
      for (let i = 0; i < st.length; i++) {
        const el = cardEls.current[i];
        const a = st[i].a;
        if (el) {
          el.style.transform = `rotate(${a.toFixed(3)}deg) translateY(calc(var(--arc-r) * -1))`;
          el.style.zIndex = String(1000 - Math.round(Math.abs(a) * 10));
          el.style.opacity = Math.abs(a) > 75 ? "0" : "1";
        }
        if (Math.abs(a) < bestAbs) {
          bestAbs = Math.abs(a);
          best = i;
        }
      }
      setFront((f) => (f === best ? f : best));
    };
    const step = () => {
      raf = 0;
      const st = angles.current;
      if (reduced) {
        st.forEach((c, i) => {
          c.a = (i - target.current) * GAP;
          c.v = 0;
        });
        write();
        return;
      }
      // The lead is the front target card; neighbours chase it outward.
      const lead = Math.round(target.current);
      const L = st[lead];
      L.v = (L.v + ((lead - target.current) * GAP - L.a) * STIFF) * DAMP;
      L.a += L.v;
      for (let i = lead + 1; i < st.length; i++) {
        const cur = st[i];
        cur.v = (cur.v + (st[i - 1].a + GAP - cur.a) * STIFF) * DAMP;
        cur.a += cur.v;
      }
      for (let i = lead - 1; i >= 0; i--) {
        const cur = st[i];
        cur.v = (cur.v + (st[i + 1].a - GAP - cur.a) * STIFF) * DAMP;
        cur.a += cur.v;
      }
      write();
      const moving = st.some((c, i) => Math.abs(c.v) > 0.01 || Math.abs((i - target.current) * GAP - c.a) > 0.05);
      if (moving) raf = requestAnimationFrame(step);
    };
    wake.current = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    write();
    return () => cancelAnimationFrame(raf);
  }, [reduced, n]);

  /* Pinned: the chapter's scroll progress is the target card. */
  useEffect(() => {
    if (!pinned) return;
    const el = sectionRef.current;
    if (!el) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const travel = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / travel));
      const next = p * (n - 1);
      if (Math.abs(next - target.current) > 0.001) {
        target.current = next;
        wake.current();
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pinned, n]);

  /* Keyboard focus follows the front card, without letting the browser
     scroll the clipped stage to reach it. */
  useEffect(() => {
    const el = document.activeElement;
    if (el instanceof HTMLElement && el.classList.contains("arc-card")) cardEls.current[front]?.focus({ preventScroll: true });
  }, [front]);

  const goCard = (i: number) => {
    const k = Math.max(0, Math.min(n - 1, i));
    if (pinned) {
      const el = sectionRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const travel = el.offsetHeight - window.innerHeight;
      scrollTo(top + (k / Math.max(1, n - 1)) * travel);
    } else {
      target.current = k;
      wake.current();
    }
  };

  /* Swipe, unpinned only. */
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (pinned) return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || pinned) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y)) goCard(front + (dx < 0 ? 1 : -1));
  };

  const card = cards[front];
  const project = card?.project;
  const projectCards = cards.filter((x) => x.project.slug === project?.slug);
  const shotIndex = projectCards.indexOf(card) + 1;

  return (
    <section
      id="work"
      ref={sectionRef}
      data-act="void"
      data-chapter="WORK"
      aria-label={t.work.aria}
      className="relative z-10"
      style={pinned ? { height: `${(n - 1) * STEP_VH + 100}svh` } : undefined}
    >
      <ChapterSeam />
      <div
        className={pinned ? "sticky top-0 h-[100svh] overflow-clip" : "relative h-[min(100svh,860px)] min-h-[620px] overflow-clip"}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            goCard(front + 1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            goCard(front - 1);
          }
        }}
      >
        {/* The label: index, title, the shot's place in the set. */}
        {project && (
          <div className="arc-label">
            <span className="micro text-fg/85">{t.work.title} · {t.work.count(front + 1, n)}</span>
            <span className="arc-index display-caps tabular" key={`i-${project.slug}`}>
              {project.index}
            </span>
            <button type="button" className="arc-title display-caps" onClick={() => openCase(project.slug)}>
              <span className="arc-title-label spectrum-text" key={`t-${project.slug}`}>
                {project.title}
              </span>
              <ArrowUpRight aria-hidden className="arc-title-arrow" />
            </button>
            <span className="micro text-fg/85">
              {project.category} · {project.year} · {shotIndex}/{projectCards.length}
            </span>
          </div>
        )}

        <div className="arc-stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
          <div className="arc-arch" aria-hidden />
          <div className="arc-pivot">
            {cards.map((cd, i) => (
              <button
                key={`${cd.project.slug}-${i}`}
                ref={(el) => {
                  cardEls.current[i] = el;
                }}
                type="button"
                tabIndex={i === front ? 0 : -1}
                className="arc-card"
                data-front={i === front ? "true" : "false"}
                aria-label={i === front ? t.work.preview(cd.project.title) : `${cd.project.title} · ${i + 1}/${n}`}
                aria-current={i === front ? "true" : undefined}
                onClick={() => (i === front ? openCase(cd.project.slug) : goCard(i))}
              >
                <span className="arc-card-inner">
                  <Image src={cd.src} alt="" fill sizes="(max-width: 768px) 180px, 300px" className="object-cover" />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="arc-controls">
          <button type="button" className="arc-btn" onClick={() => goCard(front - 1)} disabled={front === 0} aria-label={t.work.prev}>
            <ArrowLeft aria-hidden />
          </button>
          <span className="micro hidden text-fg/85 md:inline">{pinned ? t.work.hint : null}</span>
          <button type="button" className="arc-btn" onClick={() => goCard(front + 1)} disabled={front === n - 1} aria-label={t.work.next}>
            <ArrowRight aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
