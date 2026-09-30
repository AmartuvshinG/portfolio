"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { Capability } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { caseHash, openCase } from "@/lib/caseFile";
import { ICONS } from "@/components/ui/CapabilityCard";
import { TechMark, TechStrip, techLabel } from "@/components/ui/TechMarks";
import {
  HoverSlider,
  HoverSliderImageWrap,
  HoverSliderPanel,
  TextStaggerHover,
} from "@/components/ui/animated-slideshow";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { cn, pad } from "@/lib/utils";

/** Scroll per capability, in viewport heights. */
const STEP_VH = 55;

/**
 * Craft, as an index.
 *
 * The section pins; the six capabilities are a column of titles on the left
 * and one evidence panel on the right. The active title's letters roll over
 * and its panel wipes down over the last one (ui/animated-slideshow).
 *
 * **Three ways to drive it, one index.** The page scroll steps through the six
 * in order — so a reader who only scrolls sees every one — while hovering or
 * focusing a title jumps straight to it. The pointer wins until the scroll
 * reaches the next step, which hands control back. Clicking a title glides the
 * page to that title's step, so the scroll and the picture agree again.
 *
 * **Evidence, not decoration.** A capability with a `shot` shows the real
 * screenshot from the project that proves it. The rest get a schematic: their
 * glyph and their tools, drawn large. Nothing on either is invented.
 *
 * **Sharp at rest.** Nothing that carries text is scaled or rotated; the wipe
 * is a clip-path, which never resamples what it reveals.
 *
 * Replaced the sideways CraftTrack on wide screens. Phones keep the stack.
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
  const ghostX = useTransform(scrollYProgress, [0, 1], ["2%", "-14%"]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.min(n - 1, Math.max(0, Math.round(v * (n - 1))));
    if (i !== step) {
      setStep(i);
      setPointer(null);
    }
  });

  const choose = (i: number) => {
    if (i === active) return;
    setPointer(i);
  };

  /** Glide to the scroll position where `i` is the step. */
  const goTo = (i: number) => {
    const pin = pinRef.current;
    if (!pin || n < 2) return;
    const top = pin.getBoundingClientRect().top + window.scrollY;
    const travel = pin.offsetHeight - window.innerHeight;
    scrollTo(top + (travel * i) / (n - 1));
  };

  return (
    <div ref={pinRef} className="relative" style={{ height: `calc(100svh + ${(n - 1) * STEP_VH}svh)` }}>
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-clip pt-20">
        <motion.span
          aria-hidden
          style={{ x: ghostX }}
          className="outline-text pointer-events-none absolute bottom-[4%] left-0 whitespace-nowrap font-display text-[clamp(7rem,20vw,22rem)] leading-none opacity-50"
        >
          {t.craft.title}
        </motion.span>

        <HoverSlider
          active={active}
          onActiveChange={choose}
          className="relative mx-auto grid w-full max-w-[1800px] grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-10 px-8 lg:gap-16 lg:px-16"
        >
          <ol className="flex flex-col gap-[clamp(0.5rem,1.6svh,1.25rem)]">
            {items.map((item, i) => (
              <li key={item.code} className="flex items-start gap-4 lg:gap-6">
                <span
                  className={cn(
                    "micro tabular mt-[clamp(0.3rem,0.75vw,0.95rem)] w-14 shrink-0 transition-colors duration-300",
                    i === active ? "text-fg" : "text-muted"
                  )}
                >
                  {item.code}
                </span>
                <span className="relative min-w-0">
                  <TextStaggerHover
                    index={i}
                    text={item.title}
                    onClick={goTo}
                    dim={0.5}
                    className="font-display text-[clamp(1.2rem,2.05vw,2.6rem)] uppercase leading-[1.2] tracking-tight text-fg"
                  />
                  {/* The ramp underline: a gradient, never a flat fill. */}
                  <motion.span
                    aria-hidden
                    className="spectrum-rule absolute -bottom-1 left-0 h-[2px] w-full origin-left"
                    initial={false}
                    animate={{ scaleX: i === active ? 1 : 0, opacity: i === active ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
                  />
                </span>
              </li>
            ))}
          </ol>

          <div className="relative">
            <Brackets />
            <HoverSliderImageWrap className="rounded-[4px]">
              {items.map((item, i) => (
                <HoverSliderPanel key={item.code} index={i}>
                  <Slide item={item} index={i} live={i === active} />
                </HoverSliderPanel>
              ))}
            </HoverSliderImageWrap>
          </div>
        </HoverSlider>

        <div className="relative mx-auto mt-8 flex w-full max-w-[1800px] items-center gap-5 px-8 lg:px-16">
          <span className="font-mono text-sm tabular text-fg">
            {pad(active + 1)}
            <span className="text-muted"> / {pad(n)}</span>
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

/** HUD corner brackets around the evidence panel. */
function Brackets() {
  const arm = "absolute h-5 w-5 border-fg/70";
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
    <article className="flex h-full flex-col overflow-hidden rounded-[4px] bg-[#070814] ring-1 ring-inset ring-line-strong">
      <div className="relative aspect-[16/9] max-h-[42svh] w-full overflow-hidden border-b border-line">
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
        <span className="micro absolute left-4 top-3 rounded-sm bg-[#05060d]/80 px-2 py-1 tabular text-fg">
          {item.code}
          {proof && item.shot ? ` · ${proof.title}` : ""}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-6 lg:p-8">
        <h3 className="relative font-tech text-[clamp(1.4rem,1.9vw,2rem)] font-bold uppercase leading-tight text-fg">
          {/* The change lands with a split: the two ramp ends pull in onto
              the title and vanish. Once, on the incoming slide only. Generated
              content, not text nodes: axe would measure them mid-fade. */}
          <motion.span
            aria-hidden
            data-text={item.title}
            className="pointer-events-none absolute inset-0 text-[var(--spectrum-1)] mix-blend-screen before:content-[attr(data-text)]"
            initial={false}
            animate={live ? { x: [-7, 0], opacity: [0.9, 0] } : { opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          />
          <motion.span
            aria-hidden
            data-text={item.title}
            className="pointer-events-none absolute inset-0 text-[var(--spectrum-3)] mix-blend-screen before:content-[attr(data-text)]"
            initial={false}
            animate={live ? { x: [7, 0], opacity: [0.9, 0] } : { opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          />
          <span className="relative">{item.title}</span>
        </h3>
        <p className="max-w-[60ch] text-base leading-relaxed text-fg/85 lg:text-lg">{item.description}</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <TechStrip stack={item.stack} labels={t.craft.tools} />
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
        backgroundColor: "#070814",
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
          <Icon className="h-1/2 w-1/2" strokeWidth={1.25} aria-hidden />
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
