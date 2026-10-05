"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useScrollTimelines } from "@/hooks/useScrollTimelines";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

/**
 * The entire surviving HUD budget: a corner crosshair, two hairline gutter
 * rules, chapter numbering, and the spine (the page's scrollbar, with chapter ticks). Everything else from the old NEXUS overlay —
 * scanlines, telemetry, tickers, the console dock — is gone.
 *
 * This is KPR's chrome, and the restraint is the point. Micro-type at the edges
 * reads as instrumentation only while it stays sparse; once it's competing with
 * itself it just reads as decoration.
 *
 * Colours come entirely from `--color-fg` / `--color-line`, so the whole frame
 * inverts for free when ActTheme switches the chrome's `data-act`.
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
    <>
      {/* The spine is the page's scrollbar now (the native one is hidden), so
          it shows at every width; the rest of the frame is desktop chrome. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] text-fg">
        <ChapterSpine chapters={chapters} active={active} />
      </div>
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
    </>
  );
}

/**
 * The page as a reel, down the right gutter — and, since the native scrollbar
 * was hidden, the page's scrollbar.
 *
 * A hairline track, a coral fill for how far you are, a grab handle at the
 * fill's head, and a tick where each chapter begins. Drag anywhere on the
 * strip to scrub the page (it follows the pointer exactly, no glide); click
 * the track to glide there; hover a tick for its name, click it to go.
 *
 * Tick positions are where each chapter starts as a fraction of the scroll
 * range, so the fill reaches a tick exactly as its chapter arrives. Measured on
 * resize and when the page height changes; the fill and the handle ride one
 * transform together (the reel), run by a scroll timeline where there is one.
 *
 * Pointer only: the frame is aria-hidden and the ticks are out of the tab
 * order. Keyboard, wheel and touch scrolling are untouched — hiding the native
 * bar took nothing from them (keyboard users also have the navbar, j/k and
 * the palette).
 */
function ChapterSpine({ chapters, active }: { chapters: string[]; active: number }) {
  const { c } = useI18n();
  const { scrollTo, goTo } = useSmoothScroll();
  const trackRef = useRef<HTMLDivElement>(null);
  const reelRef = useRef<HTMLSpanElement>(null);
  const [marks, setMarks] = useState<number[]>([]);
  const [dragging, setDragging] = useState(false);
  /* The timeline rules only exist without a reduced-motion preference
     (globals.css); under one, the JS has to paint or the spine sits at 0. */
  const timelines = useScrollTimelines();
  const reduced = useReducedMotion();
  /* Touch paints the reel in JS. iPhone Safari's scroll timeline, sampled
     on its own, still threw the whole reel back about every 0.75 s of a
     fling for two or three frames, to a place the page never was: the
     wrong rows fit 1.265 × the right ones, as if -100% had been resolved
     against a box too tall (ScreenRecording 2026-10-05 11-27). On a phone
     the spine is only an indicator, so a frame of lag is invisible; a
     frame somewhere else is not. */
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);
  const css = timelines && !reduced && !coarse;
  /** The track's height in px: the JS reel moves by it, never by a %. */
  const trackH = useRef(0);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      trackH.current = trackRef.current?.clientHeight ?? 0;
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
      /* With a scroll timeline the CSS runs the reel on the compositor
         (.spine-reel); writing here too would only cost a style pass per
         frame for a value the animation overrides. */
      if (css) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (reelRef.current) reelRef.current.style.transform = `translate3d(0, ${((p - 1) * trackH.current).toFixed(2)}px, 0)`;
    };
    /* On a phone the spine is an indicator, shown while the page moves and
       gone a beat after, the way iOS's own is. One attribute on the track,
       flipped only when it changes. */
    let idle: ReturnType<typeof setTimeout> | undefined;
    let shown = false;
    const track = trackRef.current;
    const settle = () => {
      shown = false;
      track?.removeAttribute("data-scrolling");
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
      if (!shown) {
        shown = true;
        track?.setAttribute("data-scrolling", "");
      }
      clearTimeout(idle);
      idle = setTimeout(settle, 900);
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
    /* The track too: it is in svh/px, so the toolbar never resizes it, but a
       rotation does, and the reel's px travel must follow at once. */
    const trackRo = new ResizeObserver(() => {
      measure();
      paint();
    });
    if (trackRef.current) trackRo.observe(trackRef.current);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      clearTimeout(idle);
      ro.disconnect();
      trackRo.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [chapters, css]);

  /* --- Scrubbing. A press that moves more than a few px is a drag, and the
     page follows the pointer exactly; one that does not is a click, and
     glides to that point. */
  const press = useRef<{ id: number; y: number; moved: boolean } | null>(null);
  const toScroll = (clientY: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (!r || r.height <= 0 || max <= 0) return 0;
    return Math.min(1, Math.max(0, (clientY - r.top) / r.height)) * max;
  };
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    press.current = { id: e.pointerId, y: e.clientY, moved: false };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    if (!p.moved && Math.abs(e.clientY - p.y) < 4) return;
    if (!p.moved) {
      // Captured only once it is a drag, so a plain click on a tick still
      // lands on the tick.
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    }
    p.moved = true;
    scrollTo(toScroll(e.clientY), 0, true);
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    setDragging(false);
    if (!p.moved && e.type === "pointerup" && !(e.target as Element).closest("button")) goTo(toScroll(e.clientY));
  };

  /* Symmetric in the gutter on desktop; hard against the edge on a phone,
     where the gutter is the page's own padding. `svh`, so the track does not
     stretch and shrink as Safari's toolbar comes and goes. A finger never
     grabs it: the strip it used to own along the right edge turned thumb
     scrolls that began there into scrubs, and the page jumped. */
  return (
    <div
      ref={trackRef}
      className="group/spine absolute bottom-[18svh] right-[max(0.375rem,env(safe-area-inset-right))] top-[18svh] w-px translate-x-1/2 transition-opacity duration-500 pointer-coarse:opacity-0 pointer-coarse:data-scrolling:opacity-100 pointer-coarse:data-scrolling:duration-150 lg:right-5"
      /* On the track, not the strip, so a press that lands on a chapter tick
         can still become a drag; a tick that is only clicked goes to its
         chapter. */
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {/* The hit strip: far wider than the hairline, for a mouse. */}
      <div className="pointer-events-auto absolute -inset-y-3 -left-3 -right-3 cursor-grab active:cursor-grabbing pointer-coarse:hidden" />
      <span className="pointer-events-none absolute inset-0 bg-current opacity-[0.14] transition-opacity group-hover/spine:opacity-30" />
      {/* The reel: the fill and the grab handle as ONE box the track's
          height, slid from fully above the track (-100%) to resting on it
          (0) by one transform. The fill's end and the handle are the same
          row by construction. They used to be two scroll-timeline animations
          (a scaleY fill and a translating runner), and iPhone Safari
          sampled them on different frames: the handle sat a fifth of the
          track short of the fill and flicked between the two
          (ScreenRecording 2026-10-05).

          The window clips what is above the track, outset by the handle's
          half-height (h-7 / lg:h-9) so the handle shows whole at either
          end; the fill's last few px above the top are under the handle,
          which is wider. Sides outset for the glow. overflow, not
          clip-path: a plain overflow clip is one the compositor keeps. */}
      <span className="pointer-events-none absolute -inset-x-3.5 -inset-y-3.5 overflow-hidden lg:-inset-y-[18px]">
        <span
          ref={reelRef}
          className={cn(
            "absolute inset-x-3.5 inset-y-3.5 will-change-transform lg:inset-y-[18px]",
            css && "spine-reel"
          )}
          /* `transition: none`: the reduced-motion reset only shortens
             durations, and a 1µs transition on the JS-written transform
             still lands a frame late in WebKit. */
          style={{ transform: "translateY(-100%)", transition: "none" }}
        >
          <span
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, color-mix(in srgb, var(--color-hazard) 30%, transparent), var(--color-hazard))",
              boxShadow: "0 0 8px color-mix(in srgb, var(--color-hazard) 60%, transparent)",
            }}
          />
          <span
            className={
              "absolute bottom-0 left-1/2 h-7 -translate-x-1/2 translate-y-1/2 rounded-full bg-[var(--color-hazard)] shadow-[0_0_12px_var(--color-hazard)] transition-[width] duration-200 lg:h-9 " +
              (dragging ? "w-[5px]" : "w-[3px] group-hover/spine:w-[5px]")
            }
          />
        </span>
      </span>
      {marks.map((m, i) => {
        const id = chapters[i];
        const link = c.navLinks.find((l) => l.href === `#${id}`);
        const on = i === active;
        return (
          <button
            key={id}
            type="button"
            tabIndex={-1}
            onClick={() => goTo(`#${id}`)}
            className="group pointer-events-auto absolute left-1/2 hidden h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center lg:flex"
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
                "tag pointer-events-none absolute right-6 whitespace-nowrap transition-[opacity,transform] duration-300 " +
                /* Labels only on hover: the navbar already says where you
                   are, and an always-on label sat over section content. */
                (on ? "text-[var(--color-hazard)]" : "text-fg") +
                " translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-90"
              }
            >
              <span className="tabular opacity-75">{link?.code ?? "--"}</span> {link?.label ?? id}
            </span>
          </button>
        );
      })}
    </div>
  );
}
