"use client";

import { useEffect, useRef, useState } from "react";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

/**
 * The entire surviving HUD budget: a corner crosshair, two hairline gutter
 * rules, chapter numbering, and the spine (scroll progress and chapter ticks). Everything else from the old NEXUS overlay —
 * scanlines, telemetry, tickers, the console dock — is gone.
 *
 * This is KPR's chrome, and the restraint is the point. Micro-type at the edges
 * reads as instrumentation only while it stays sparse; once it's competing with
 * itself it just reads as decoration.
 *
 * Colours come entirely from `--color-fg` / `--color-line`, so the whole frame
 * inverts for free when ActTheme switches `<html data-act>`.
 *
 * **Names and numbers come from the nav, not from counting sections.** It used
 * to number chapters 1-based by DOM order and print each section's
 * `data-chapter` codename, so the gutter said "LEDGER 06" and "CONTACT 07"
 * while the navbar called the same sections "Path 05" and "Contact 06". One
 * source for both, and it translates with everything else.
 */
export function ChapterFrame() {
  const { c } = useI18n();
  /** Section ids, in page order. */
  const [chapters, setChapters] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const sections = gsap.utils.toArray<HTMLElement>("[data-chapter]");
    if (!sections.length) return;

    // One-shot measurement of what the page actually rendered — the sections
    // are the source of truth for the chapter list, so there is nothing to
    // derive this from during render. Runs once on mount and never cascades.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChapters(sections.map((el) => el.id));

    const triggers = sections.map((el, i) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top 50%",
        end: "bottom 50%",
        /* Enter / enter-back rather than onToggle: a jump (a deep link,
           the footer's index, End) passes several triggers in one update,
           and a section skipped over never toggles active — the frame kept
           reading INDEX at the foot of the page. ScrollTrigger fires the
           skipped callbacks in order, so the last one standing is right.
           The last chapter also claims leaving past its end (the footer).
           There used to be a `chapter-change` event dispatched here for a
           lens overlay; it was the source of the horizontal cyan/magenta bars
           reported on every scroll, and it is gone rather than tuned. */
        onEnter: () => setActive(i),
        onEnterBack: () => setActive(i),
        onLeave: i === sections.length - 1 ? () => setActive(i) : undefined,
      })
    );

    return () => triggers.forEach((t) => t.kill());
  }, []);

  if (!chapters.length) return null;

  const id = chapters[active];
  const name =
    c.navLinks.find((l) => l.href === `#${id}`)?.label ?? id;
  const code = sectionIndex(`#${id}`);
  const last = c.navLinks[c.navLinks.length - 1]?.code ?? "--";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[70] hidden text-fg transition-colors duration-[620ms] lg:block"
    >
      {/* Hairline gutter rules. Inset rather than full-bleed so they read as
          registration marks on a print sheet, not as a layout grid. */}
      <span className="absolute inset-y-[14vh] left-5 w-px bg-current opacity-[0.12]" />
      <span className="absolute inset-y-[14vh] right-5 w-px bg-current opacity-[0.12]" />

      {/* Crosshair, left gutter, mid-height */}
      <span className="absolute left-5 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 bg-current opacity-60" />
        <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-current opacity-60" />
      </span>

      {/* --- The spine, right gutter: the page as a reel. A hairline track,
              a sodium fill for how far you are, and a tick where each
              chapter begins. Hover a tick for its name; click to go. It
              replaced a flickering neon tab that said only where you were. */}
      <ChapterSpine chapters={chapters} active={active} />

      {/* Chapter numbering, set vertically in the left gutter.
          It reads bottom-to-top up the rule rather than sitting horizontally in
          the bottom-left corner, where it collided with the closing row of
          every section — the gutter is empty by construction, so nothing the
          page lays out can ever run into it. */}
      <div
        className="absolute bottom-[14vh] left-5 flex origin-bottom-left translate-x-[0.6rem] items-center gap-3"
        style={{ writingMode: "vertical-rl", rotate: "180deg" }}
      >
        <span className="micro tabular !text-current opacity-70">
          {code} / {last}
        </span>
        <span className="h-6 w-px bg-current opacity-30" />
        <span className="micro !text-current opacity-70">{name}</span>
      </div>
    </div>
  );
}

/**
 * The page as a reel, down the right gutter.
 *
 * Tick positions are where each chapter starts as a fraction of the scroll
 * range, so the fill reaches a tick exactly as its chapter arrives. Measured on
 * resize and when the page height changes; the fill is one transform written
 * per scroll frame.
 *
 * The ticks are a pointer convenience, not navigation: the frame is
 * aria-hidden, so they are taken out of the tab order (keyboard users have the
 * navbar, the j/k keys and the palette).
 */
function ChapterSpine({ chapters, active }: { chapters: string[]; active: number }) {
  const { c } = useI18n();
  const { scrollTo } = useSmoothScroll();
  const fillRef = useRef<HTMLSpanElement>(null);
  const [marks, setMarks] = useState<number[]>([]);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      setMarks(
        chapters.map((id) => {
          const el = document.getElementById(id);
          if (!el) return 0;
          return Math.min(1, Math.max(0, (el.getBoundingClientRect().top + window.scrollY) / max));
        })
      );
    };
    const paint = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${p.toFixed(4)})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    measure();
    paint();
    let t: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        measure();
        paint();
      }, 250);
    });
    ro.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [chapters]);

  /* Ends above the film's vertical reel timecode in the same gutter. */
  return (
    <div className="absolute bottom-[34vh] right-5 top-[18vh] w-px translate-x-1/2">
      <span className="absolute inset-0 bg-current opacity-[0.14]" />
      <span
        ref={fillRef}
        className="absolute inset-0 origin-top"
        style={{
          transform: "scaleY(0)",
          background: "linear-gradient(180deg, color-mix(in srgb, var(--color-hazard) 30%, transparent), var(--color-hazard))",
          boxShadow: "0 0 8px color-mix(in srgb, var(--color-hazard) 60%, transparent)",
        }}
      />
      {marks.map((m, i) => {
        const id = chapters[i];
        const link = c.navLinks.find((l) => l.href === `#${id}`);
        const on = i === active;
        return (
          <button
            key={id}
            type="button"
            tabIndex={-1}
            onClick={() => scrollTo(`#${id}`)}
            className="group pointer-events-auto absolute left-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{ top: `${m * 100}%` }}
          >
            <span
              className={
                on
                  ? "h-2 w-2 rotate-45 bg-[var(--color-hazard)] shadow-[0_0_10px_var(--color-hazard)] transition-all duration-300"
                  : "h-1.5 w-1.5 rotate-45 border border-current opacity-50 transition-all duration-300 group-hover:opacity-100"
              }
            />
            <span
              className={
                "pointer-events-none absolute right-6 whitespace-nowrap font-mono text-[0.6875rem] uppercase tracking-[0.22em] transition-[opacity,transform] duration-300 " +
                (on
                  ? "translate-x-0 text-[var(--color-hazard)] opacity-90"
                  : "translate-x-1 text-fg opacity-0 group-hover:translate-x-0 group-hover:opacity-90")
              }
            >
              <span className="tabular opacity-60">{link?.code ?? "--"}</span> {link?.label ?? id}
            </span>
          </button>
        );
      })}
    </div>
  );
}
