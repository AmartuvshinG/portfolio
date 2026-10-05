"use client";

import { useEffect, useRef, useState } from "react";
import { iconStroke } from "@/lib/icon";
import { frameHeight } from "@/lib/viewport";
import Image from "next/image";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { Capability } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { caseHash, openCase } from "@/lib/caseFile";
import { ICONS } from "@/components/ui/CapabilityCard";
import { TechMark, techLabel } from "@/components/ui/TechMarks";
import { LogoDock } from "@/components/ui/LogoDock";
import { CourseChips } from "@/components/ui/CourseChips";
import { HoverSlider, TextStaggerHover } from "@/components/ui/animated-slideshow";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { EASE_EXPO } from "@/lib/motion";
import { cn, pad } from "@/lib/utils";

/** Scroll per capability, in viewport heights. */
const STEP_VH = 60;
/** How far a neighbouring face is tipped back, in degrees. */
const TILT_DEG = 10;
/** How far a neighbouring face sits below (or above) the one being read, in
 *  its own heights. */
const SHIFT = 0.08;
/** Share of each step the stack holds still, so a face can be read at rest. */
const HOLD = 0.55;

/** Scroll position (0…n-1, continuous) → drum position: whole numbers held,
 *  the turns between them eased. */
function stepped(v: number): number {
  const i = Math.floor(v);
  const f = v - i;
  const a = HOLD / 2;
  const t = Math.min(1, Math.max(0, (f - a) / (1 - HOLD)));
  return i + t * t * (3 - 2 * t);
}

/**
 * Skills, as a stack of panels.
 *
 * The section pins. The six skills are a column of titles on the left and,
 * on the right, six panels the page scroll rolls through: the face in front
 * is the one being read, the next waits just below, tipped back a little,
 * and the last one lifts away as it fades. The roll is small on purpose — a
 * cross-fade with a hint of depth, not a spin. Each change is eased and each
 * face holds still for a while, so a reader who stops scrolling always stops
 * on a flat, sharp panel — at rest a face's transform is exactly `none`.
 *
 * A large outlined numeral rolls with the drum like an odometer, and each
 * title's underline fills as its face comes round, so the scroll position is
 * always readable.
 *
 * **Scroll drives it; the pointer never does.** A pointer resting on the
 * titles changes nothing, so it can't fight the scroll. Clicking a title
 * glides the page to that face's step; keyboard focus on a title turns it
 * straight there until the scroll moves on to the next step.
 *
 * Transform and opacity only, from one scroll value — no React render per
 * frame. Phones get the list (CraftTrack); reduced motion keeps the grid.
 */
export function CraftIndex({ items }: { items: Capability[] }) {
  const { t } = useI18n();
  const { scrollTo } = useSmoothScroll();
  const pinRef = useRef<HTMLDivElement>(null);
  const n = items.length;
  const [step, setStep] = useState(0);
  const [pointer, setPointer] = useState<number | null>(null);
  const active = pointer ?? step;

  const { scrollYProgress } = useScroll({ target: pinRef, offset: ["start start", "end end"] });
  const rail = useTransform(scrollYProgress, [0, 1], [0.02, 1]);
  /** Where the drum is turned to: the scroll, unless a title has the pointer. */
  const view = useMotionValue(0);
  const pointerRef = useRef<number | null>(null);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const raw = v * (n - 1);
    const i = Math.min(n - 1, Math.max(0, Math.round(raw)));
    if (i !== step) {
      setStep(i);
      if (pointerRef.current !== null) {
        pointerRef.current = null;
        setPointer(null);
        animate(view, stepped(raw), { duration: 0.5, ease: EASE_EXPO });
        return;
      }
    }
    if (pointerRef.current === null && !view.isAnimating()) view.set(stepped(raw));
  });

  useEffect(() => {
    if (pointer === null) return;
    const c = animate(view, pointer, { duration: 0.7, ease: EASE_EXPO });
    return () => c.stop();
  }, [pointer, view]);

  const choose = (i: number) => {
    if (i === active) return;
    pointerRef.current = i;
    setPointer(i);
  };

  /** Glide to the scroll position where `i` is the step. */
  const goTo = (i: number) => {
    const pin = pinRef.current;
    if (!pin || n < 2) return;
    const top = pin.getBoundingClientRect().top + window.scrollY;
    const travel = pin.offsetHeight - frameHeight();
    scrollTo(top + (travel * i) / (n - 1));
  };

  const counterY = useTransform(view, (v) => `${-v}em`);

  return (
    <div ref={pinRef} className="relative" style={{ height: `calc(100svh + ${(n - 1) * STEP_VH}svh)` }}>
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-clip pt-20">
        <HoverSlider
          active={active}
          onActiveChange={choose}
          className="relative mx-auto grid w-full max-w-[112.5rem] grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-10 px-8 lg:gap-16 lg:px-16"
        >
          <ol className="flex flex-col gap-[clamp(0.5rem,1.6svh,1.25rem)]">
            {items.map((item, i) => (
              <li key={item.code} className="flex items-start gap-4 lg:gap-6">
                <span
                  className={cn(
                    "micro tabular mt-[clamp(0.3rem,0.75vw,0.95rem)] w-8 shrink-0 transition-colors duration-300",
                    i === active ? "text-fg" : "text-muted"
                  )}
                >
                  {pad(i + 1)}
                </span>
                <span className="relative min-w-0">
                  <TextStaggerHover
                    index={i}
                    text={item.title}
                    onClick={goTo}
                    hoverActivates={false}
                    dim={0.5}
                    className="font-display text-[clamp(1.2rem,2.05vw,2.6rem)] uppercase leading-[1.2] tracking-tight text-fg"
                  />
                  <Fill view={view} i={i} />
                </span>
              </li>
            ))}
          </ol>

          <div className="relative" style={{ perspective: "1600px" }}>
            <Brackets />
            <div className="grid [transform-style:preserve-3d]">
              {items.map((item, i) => (
                <Face key={item.code} view={view} i={i} live={i === active}>
                  <Slide item={item} index={i} live={i === active} />
                </Face>
              ))}
            </div>
          </div>
        </HoverSlider>

        <div className="relative mx-auto mt-8 flex w-full max-w-[112.5rem] items-center gap-5 px-8 lg:px-16">
          {/* The odometer: the step number on a strip that rolls with the drum. */}
          <span className="flex items-baseline gap-2 tabular">
            <span className="sr-only">
              {pad(active + 1)} / {pad(n)}
            </span>
            <span
              aria-hidden
              className="block h-[1em] overflow-hidden font-display text-[clamp(2.25rem,3.4vw,3.5rem)] leading-none text-fg"
            >
              <motion.span className="flex flex-col" style={{ y: counterY }}>
                {items.map((item, i) => (
                  <span key={item.code} className="block h-[1em]">
                    {pad(i + 1)}
                  </span>
                ))}
              </motion.span>
            </span>
            <span aria-hidden className="font-mono text-sm text-muted">
              / {pad(n)}
            </span>
          </span>
          <span aria-hidden className="relative h-px flex-1 bg-line">
            <motion.span className="spectrum-rule absolute inset-0 origin-left" style={{ scaleX: rail }} />
          </span>
          <span className="micro">{t.craft.hint}</span>
        </div>
      </div>
    </div>
  );
}

/** One panel of the stack: a neighbour sits a little below, tipped back
 *  and a touch smaller, and fades well before it could overlap the one
 *  being read. */
function Face({
  view,
  i,
  live,
  children,
}: {
  view: MotionValue<number>;
  i: number;
  live: boolean;
  children: React.ReactNode;
}) {
  const transform = useTransform(view, (v) => {
    const d = Math.max(-2, Math.min(2, v - i));
    if (Math.abs(d) < 1e-3) return "none";
    return `translateY(${(d * SHIFT * 100).toFixed(2)}%) rotateX(${(-d * TILT_DEG).toFixed(2)}deg) scale(${(1 - Math.abs(d) * 0.04).toFixed(4)})`;
  });
  /* Solid near the front, gone well before a face could sit beside the one
     being read: two half-faded faces overlapping is noise, not depth. */
  const opacity = useTransform(view, (v) => Math.min(1, Math.max(0, (0.55 - Math.abs(v - i)) / 0.4)));
  const visibility = useTransform(view, (v) => (Math.abs(v - i) >= 0.55 ? "hidden" : "visible"));
  return (
    <motion.div
      aria-hidden={!live}
      inert={!live}
      className="[grid-area:1/1] [backface-visibility:hidden]"
      style={{ transform, opacity, visibility, zIndex: live ? 2 : 1 }}
    >
      {children}
    </motion.div>
  );
}

/** A title's underline: fills as its face comes round to the front. */
function Fill({ view, i }: { view: MotionValue<number>; i: number }) {
  const scaleX = useTransform(view, (v) => Math.max(0, 1 - Math.abs(v - i)));
  return (
    <motion.span
      aria-hidden
      className="spectrum-rule absolute -bottom-1 left-0 h-[2px] w-full origin-left"
      style={{ scaleX, opacity: scaleX }}
    />
  );
}

/** HUD corner brackets around the evidence panel, in sodium: the same
 *  targeting language as the active nav link. */
function Brackets() {
  const arm = "absolute h-5 w-5 border-[var(--color-hazard)]";
  return (
    <span aria-hidden className="pointer-events-none absolute -inset-3 z-10">
      <span className={cn(arm, "left-0 top-0 border-l-2 border-t-2")} />
      <span className={cn(arm, "right-0 top-0 border-r-2 border-t-2")} />
      <span className={cn(arm, "bottom-0 left-0 border-b-2 border-l-2")} />
      <span className={cn(arm, "bottom-0 right-0 border-b-2 border-r-2")} />
    </span>
  );
}

/** Static scanlines — a repeating gradient, never animated. */
const SCANLINES =
  "repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.22) 2px 3px)";

function Slide({ item, index, live }: { item: Capability; index: number; live: boolean }) {
  const { c, t } = useI18n();
  const proof = item.proof ? c.projects.find((p) => p.slug === item.proof) : undefined;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[4px] bg-[#08181c] ring-1 ring-inset ring-line-strong">
      <div className="relative aspect-[16/9] max-h-[34svh] w-full overflow-hidden border-b border-line">
        {item.shot ? (
          <Image
            src={item.shot}
            alt=""
            fill
            sizes="(min-width: 1024px) 55vw, 60vw"
            className="object-cover object-top"
          />
        ) : (
          <Schematic item={item} index={index} />
        )}
        <span aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: SCANLINES }} />
        <span className="micro absolute left-4 top-3 rounded-sm bg-[#061317]/80 px-2 py-1 tabular text-fg">
          {pad(index + 1)}
          {proof && item.shot ? ` · ${proof.title}` : ""}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-6 lg:px-8 lg:py-6">
        <h3 className="font-tech text-[clamp(1.4rem,1.9vw,2rem)] font-bold uppercase leading-tight text-fg">
          {item.title}
        </h3>
        <p className="max-w-[60ch] text-base leading-relaxed text-fg/85 lg:text-lg">{item.description}</p>
        {item.courses && item.courses.length > 0 && (
          <div>
            <p className="micro mb-2">{t.craft.studied}</p>
            <CourseChips codes={item.courses} play={live} delay={0.25} compact />
          </div>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <LogoDock keys={item.stack} labels={t.craft.tools} size="sm" align="start" play={live} />
          {proof && (
            <a
              href={caseHash(proof.slug)}
              onClick={(e) => {
                e.preventDefault();
                openCase(proof.slug);
              }}
              className="group flex items-center gap-3 font-tech text-sm font-semibold uppercase tracking-wider text-fg"
            >
              <span className="micro">{t.craft.proven}</span>
              {proof.title}
              <ArrowRight
                size={18}
                strokeWidth={iconStroke(18)}
                aria-hidden
                className="text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-fg"
              />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

/** A capability with no screenshot: its glyph and its tools, drawn as a plate. */
function Schematic({ item, index }: { item: Capability; index: number }) {
  const { t } = useI18n();
  const Icon = ICONS[item.icon];
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        backgroundColor: "#08181c",
        backgroundImage:
          "radial-gradient(60% 70% at 30% 40%, color-mix(in srgb, var(--spectrum-1) 22%, transparent), transparent 70%)," +
          "radial-gradient(55% 65% at 75% 65%, color-mix(in srgb, var(--spectrum-3) 20%, transparent), transparent 70%)," +
          "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)," +
          "linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "auto, auto, 32px 32px, 32px 32px",
      }}
    >
      <span
        aria-hidden
        className="outline-text absolute -right-2 -top-6 font-display text-[clamp(7rem,12vw,12rem)] leading-none"
      >
        {pad(index + 1)}
      </span>
      <div className="relative flex items-center gap-[clamp(1.5rem,3vw,3rem)]">
        <span
          className="flex aspect-square w-[clamp(6rem,9vw,9rem)] items-center justify-center rounded-3xl text-fg ring-1 ring-inset ring-line-strong"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--spectrum-1) 34%, transparent), color-mix(in srgb, var(--spectrum-3) 24%, transparent))",
          }}
        >
          <Icon className="h-1/2 w-1/2" strokeWidth={iconStroke(56, "light")} aria-hidden />
        </span>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-4">
          {item.stack.map((key) => (
            <li key={key} className="flex items-center gap-3 font-tech text-base font-semibold uppercase tracking-wide text-fg/90">
              <TechMark name={key} size={30} />
              {techLabel(key, t.craft.tools)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
