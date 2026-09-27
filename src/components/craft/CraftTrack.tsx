"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  motion,
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
import { TechStrip, techLabel } from "@/components/ui/TechMarks";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { cn, pad } from "@/lib/utils";

/**
 * Craft, as a track the page scroll drives sideways.
 *
 * The section pins for as long as it takes the row to pass, and the vertical
 * scroll is converted into horizontal travel — no arrows, no dragging, nothing
 * to click to get to the next card. It replaced a WebGL carousel whose text was
 * painted into a texture and then bent through a lens, which is why it could
 * never be sharp. Everything here is real type.
 *
 * **Sharp at rest, by construction.** The track's x is rounded to whole pixels,
 * and the card in focus lands on scale 1, rotate 0 and a zero parallax offset,
 * so its layer composites at identity and the text rasterises crisply.
 *
 * **Centred cards, no measuring per frame.** The track is padded by half the
 * frame minus half a card on both sides, so card `i` is centred at exactly
 * progress `i / (n - 1)`. Every per-card effect is a pure function of the one
 * progress value; the only layout read is the travel distance, on resize.
 *
 * **Parallax** is several layers of each card moving at different rates
 * against the card's own travel: the ghost index behind it, the icon, the
 * tool marks. Behind the whole row an outlined CRAFT drifts the other way.
 */
export function CraftTrack({ items }: { items: Capability[] }) {
  const { t } = useI18n();
  const { scrollTo } = useSmoothScroll();
  const pinRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dist, setDist] = useState(0);
  const [active, setActive] = useState(0);
  const n = items.length;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const track = trackRef.current;
    if (!frame || !track) return;
    /* First card centred to last card centred. Not scrollWidth: it drops the
       track's end padding, and the last card would stop short of centre. */
    const measure = () => {
      const cards = track.children;
      const first = cards[0] as HTMLElement | undefined;
      const last = cards[cards.length - 1] as HTMLElement | undefined;
      setDist(first && last ? last.offsetLeft - first.offsetLeft : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    ro.observe(track);
    return () => ro.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({ target: pinRef, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, (v) => Math.round(-v * dist));
  const ghostX = useTransform(scrollYProgress, [0, 1], ["4%", "-22%"]);
  const rail = useTransform(scrollYProgress, [0, 1], [0.02, 1]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.round(v * (n - 1));
    if (i !== active) setActive(i);
  });

  /* Tabbing to a link inside an off-screen card scrolls the page to the point
     where that card is centred, so keyboard focus is never somewhere unseen. */
  const onFocus = (i: number) => {
    const pin = pinRef.current;
    if (!pin || n < 2) return;
    const top = pin.getBoundingClientRect().top + window.scrollY;
    const travel = pin.offsetHeight - window.innerHeight;
    /* A frame late on purpose: the browser's own focus scroll runs after
       this handler and would otherwise win. */
    requestAnimationFrame(() => scrollTo(top + (travel * i) / (n - 1), 0, true));
  };

  return (
    <div ref={pinRef} className="relative" style={{ height: `calc(100svh + ${dist}px)` }}>
      {/* pt clears the fixed navbar, so the row centres in the visible area.
          `overflow-clip`, not hidden: a hidden box is still scrollable by
          script, and focusing a link in an off-screen card scrolled it
          sideways, knocking the whole track out of register. */}
      <div ref={frameRef} className="sticky top-0 flex h-svh flex-col justify-center overflow-clip pt-20">
        {/* The ghost word, the deepest layer. */}
        <motion.span
          aria-hidden
          style={{ x: ghostX }}
          className="outline-text pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap font-display text-[clamp(8rem,26vw,26rem)] leading-none"
        >
          {t.craft.title}
        </motion.span>

        <motion.div
          ref={trackRef}
          style={{ x, ["--card-w" as string]: "min(84vw, 38rem)" }}
          className="relative flex items-stretch gap-8 px-[calc(50vw-var(--card-w)/2)] [perspective:1400px]"
        >
          {items.map((item, i) => (
            <TrackCard
              key={item.code}
              item={item}
              index={i}
              count={n}
              progress={scrollYProgress}
              onFocus={() => onFocus(i)}
            />
          ))}
        </motion.div>

        {/* Where you are in the row, and that scrolling is the way through. */}
        <div className="relative mx-auto mt-10 flex w-[min(84vw,38rem)] items-center gap-5">
          <span className="font-mono text-sm tabular text-fg">
            {pad(active + 1)}
            <span className="text-muted"> / {pad(n)}</span>
          </span>
          <span aria-hidden className="relative h-px flex-1 bg-line">
            <motion.span
              className="spectrum-rule absolute inset-0 origin-left"
              style={{ scaleX: rail }}
            />
          </span>
          <span className="micro hidden sm:inline">{t.craft.hint}</span>
        </div>
      </div>
    </div>
  );
}

function TrackCard({
  item,
  index,
  count,
  progress,
  onFocus,
}: {
  item: Capability;
  index: number;
  count: number;
  progress: MotionValue<number>;
  onFocus: () => void;
}) {
  /* -1 when one card left of centre, 0 centred, +1 one card right. */
  const local = useTransform(progress, (v) => v * (count - 1) - index);
  const focus = useTransform(local, (l) => 1 - Math.min(Math.abs(l), 1));
  const scale = useTransform(focus, [0, 1], [0.88, 1]);
  const opacity = useTransform(focus, [0, 1], [0.42, 1]);
  const rotateY = useTransform(local, [-1, 0, 1], [12, 0, -12]);
  const ghost = useTransform(local, [-1, 1], [140, -140]);
  const iconX = useTransform(local, [-1, 1], [-36, 36]);
  const stripX = useTransform(local, [-1, 1], [-56, 56]);

  return (
    <motion.article
      style={{ scale, opacity, rotateY, ["--live" as string]: focus }}
      onFocusCapture={onFocus}
      className="liquid-glass live-rim relative flex w-[var(--card-w)] shrink-0 flex-col overflow-hidden rounded-[28px] p-7 md:p-10"
    >
      <CardBody item={item} ghostX={ghost} iconX={iconX} stripX={stripX} index={index} />
    </motion.article>
  );
}

/**
 * The card's contents. Shared by the pinned track and the phone stack, which
 * pass their own parallax values.
 */
export function CardBody({
  item,
  index,
  ghostX,
  iconX,
  stripX,
  ghostY,
}: {
  item: Capability;
  index: number;
  ghostX?: MotionValue<number>;
  iconX?: MotionValue<number>;
  stripX?: MotionValue<number>;
  ghostY?: MotionValue<number>;
}) {
  const { c, t } = useI18n();
  const Icon = ICONS[item.icon];
  const proof = item.proof ? c.projects.find((p) => p.slug === item.proof) : undefined;
  /* A tag that is already a tool mark would say the same thing twice. */
  const marks = new Set(item.stack.map((k) => techLabel(k, t.craft.tools).toLowerCase()));
  const tags = item.tags.filter((tag) => !marks.has(tag.toLowerCase()));

  return (
    <>
      <motion.span
        aria-hidden
        style={{ x: ghostX, y: ghostY }}
        className="outline-text pointer-events-none absolute -right-4 -top-8 font-display text-[clamp(9rem,16vw,15rem)] leading-none"
      >
        {pad(index + 1)}
      </motion.span>

      <motion.div style={{ x: iconX }} className="relative flex items-center gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-fg ring-1 ring-inset ring-line-strong"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--spectrum-1) 30%, transparent), color-mix(in srgb, var(--spectrum-3) 20%, transparent))",
          }}
        >
          <Icon size={26} strokeWidth={1.6} aria-hidden />
        </span>
        <span className="micro tabular">{item.code}</span>
      </motion.div>

      <h3 className="relative mt-7 font-tech text-[clamp(1.875rem,3.2vw,3rem)] font-bold uppercase leading-[1.04] text-fg text-balance">
        {item.title}
      </h3>

      <p className="relative mt-5 text-lg leading-relaxed text-fg/85 md:text-xl">{item.description}</p>

      {tags.length > 0 && (
        <ul className="relative mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm uppercase tracking-wider text-muted">
          {tags.map((tag) => (
            <li key={tag}>
              <span aria-hidden className="text-fg/40">
                #
              </span>
              {tag}
            </li>
          ))}
        </ul>
      )}

      <motion.div style={{ x: stripX }} className="relative mt-auto pt-8">
        <p className="micro mb-3">{t.craft.stack}</p>
        <TechStrip stack={item.stack} labels={t.craft.tools} />
      </motion.div>

      {proof && (
        <a
          href={caseHash(proof.slug)}
          onClick={(e) => {
            e.preventDefault();
            openCase(proof.slug);
          }}
          className="group relative mt-7 flex items-center justify-between gap-4 border-t border-line pt-5"
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="micro">{t.craft.proven}</span>
            <span className="font-tech text-lg font-semibold uppercase leading-snug text-fg">
              {proof.title}
            </span>
          </span>
          <ArrowRight
            size={20}
            aria-hidden
            className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-fg"
          />
        </a>
      )}
    </>
  );
}

/**
 * Phones: no pin — sideways scroll-jacking under a thumb fights the gesture
 * the thumb is making. The cards stack, and each one's layers separate as it
 * rises into view.
 */
export function CraftStack({ items }: { items: Capability[] }) {
  return (
    <div className="mt-12 flex flex-col gap-6">
      {items.map((item, i) => (
        <StackCard key={item.code} item={item} index={i} />
      ))}
    </div>
  );
}

function StackCard({ item, index }: { item: Capability; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const y = useTransform(scrollYProgress, [0, 1], [48, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0.3, 1]);
  const focus = useTransform(scrollYProgress, [0.6, 1], [0, 1]);
  const ghostY = useTransform(scrollYProgress, [0, 1], [70, 0]);
  const iconX = useTransform(scrollYProgress, [0, 1], [-18, 0]);
  const stripX = useTransform(scrollYProgress, [0, 1], [28, 0]);

  return (
    <motion.article
      ref={ref}
      style={{ y, opacity, ["--live" as string]: focus }}
      className={cn("liquid-glass live-rim relative flex flex-col overflow-hidden rounded-[24px] p-6")}
    >
      <CardBody item={item} index={index} ghostY={ghostY} iconX={iconX} stripX={stripX} />
    </motion.article>
  );
}

/** Below `md`, the stack; the pin needs a row's width to be worth it. */
export function useWideCraft() {
  const [wide, setWide] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}
