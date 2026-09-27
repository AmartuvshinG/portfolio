"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { GlareCard } from "@/components/motion/GlareCard";
import { sectionIndex, type SocialLink } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { ChannelField } from "@/components/ui/ChannelField";
import { GitHubMark, LinkedInMark } from "@/components/ui/BrandMarks";

/**
 * "Find me elsewhere", at the scale it should always have been.
 *
 * This was a fan of four 7rem cards — thumbnails, in a section given 92vh to
 * work with, in a page whose whole argument is that it takes up space
 * confidently. The fan itself was fine; it was just tiny, and a splayed deck of
 * playing cards is a gesture that wants to be either small and incidental or
 * not used at all.
 *
 * It is now four full-height panels filling the frame edge to edge, and the
 * interaction is the size: the panel under the pointer takes two and a half
 * times its share of the row and the other three give way, so the row is always
 * exactly full and something is always moving. At rest each panel is a lit slab
 * with its name set vertically up the side; expanded it turns horizontal and
 * the handle, the code and the call to action rise out of the base.
 *
 * ---------------------------------------------------------------------------
 * **Animate `flex-grow`, not `width`.**
 *
 * Four siblings whose widths are tweened independently do not add up to the
 * container during the tween — every frame lands a fraction over or under, so
 * the row breathes at its right edge and the last panel jitters against the
 * gutter. `flex-grow` is a *share*, so whatever the four numbers are mid-tween
 * the row is full by construction. It is the one property that makes an
 * accordion stable, and it is the reason this is not four `motion.div`s with
 * animated widths.
 *
 * It does cost layout on four elements per frame of the tween, which is why the
 * accordion is gated to pointer devices and to a 0.55s spring rather than being
 * driven by scroll. A layout tween you trigger deliberately is nothing like one
 * that runs on every scroll frame.
 * ---------------------------------------------------------------------------
 *
 * On a phone the row becomes a column and the accordion is switched off
 * entirely: four channels sharing 390px of width is 24px each, and there is no
 * hover to open them with. Every panel renders in its expanded state instead.
 */

/** Share of the row taken by the open panel, the closed ones, and at rest. */
const OPEN = 2.6;
const SHUT = 0.8;
const REST = 1;

const PANEL_SPRING = { type: "spring", stiffness: 210, damping: 30 } as const;

export function Connect() {
  const { c, t } = useI18n();
  const { socials } = c;
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);
  /* The accordion needs a row to run in. Below `md` the panels stack and every
     one of them renders open, so `row` gates both the layout and the tween. */
  const [row, setRow] = useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "start 25%"],
  });

  /* One shared value drives the arrival; each panel offsets it by its index.
     A motion value per panel would drift out of step at different scroll
     speeds, which is the same reason the fan used one. */
  const open = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)");
    const update = () => setRow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const accordion = row && !reduced;

  return (
    <section
      id="connect"
      data-act="deck"
      data-chapter="SIGNAL"
      ref={ref}
      className="relative flex min-h-[92vh] flex-col justify-center overflow-hidden py-24 md:py-32"
      aria-label={t.connect.aria}
    >
      <ChapterSeam />

      <div className="relative z-10 mx-auto w-full max-w-[1800px] px-5 md:px-8 lg:px-16">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <span className="micro tabular">{sectionIndex("#connect")}</span>
              <span className="h-px w-10 bg-current opacity-25" />
              <span className="micro">{t.connect.eyebrow}</span>
            </div>
            <h2
              className="display-caps text-fg"
              style={{ fontSize: "clamp(1.6rem, 4.4vw, 4.25rem)" }}
            >
              {t.connect.title}
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-muted md:pb-3 md:text-right">
            {t.connect.lead}
          </p>
        </div>

        <ul
          className="mt-12 flex flex-col gap-2 md:mt-16 md:h-[68vh] md:min-h-[520px] md:flex-row"
          onMouseLeave={() => setHovered(null)}
        >
          {socials.map((social, i) => (
            <ChannelPanel
              key={social.label}
              social={social}
              index={i}
              count={socials.length}
              /* At rest every panel is equal. Once one is hovered it takes the
                 lion's share and the rest compress — never to zero, because a
                 panel you cannot see is a panel you cannot move back to. */
              grow={
                hovered === null ? REST : hovered === i ? OPEN : SHUT
              }
              expanded={!accordion || hovered === i}
              accordion={accordion}
              open={open}
              reduced={reduced}
              onEnter={() => accordion && setHovered(i)}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

function ChannelPanel({
  social,
  index,
  count,
  grow,
  expanded,
  accordion,
  open,
  reduced,
  onEnter,
}: {
  social: SocialLink;
  index: number;
  count: number;
  grow: number;
  expanded: boolean;
  accordion: boolean;
  open: import("framer-motion").MotionValue<number>;
  reduced: boolean;
  onEnter: () => void;
}) {
  const { t } = useI18n();
  /* The arrival: the panels rise and settle in sequence as the section enters,
     so the row has already performed once before the pointer ever reaches it.
     Later panels start lower and land later — the same stagger the fan had,
     expressed as travel rather than as rotation. */
  const rise = useTransform(open, [0, 1], [70 + index * 26, 0]);
  const fade = useTransform(open, [0, 0.55 + (index / count) * 0.35], [0, 1]);

  return (
    <motion.li
      className="relative min-w-0 md:h-full"
      style={reduced ? undefined : { y: rise, opacity: fade }}
      animate={accordion ? { flexGrow: grow } : undefined}
      transition={PANEL_SPRING}
      onMouseEnter={onEnter}
      onFocus={onEnter}
    >
      {/* `mode="flat"`: the panel is already growing and turning its label; a
          tilt on top of that reads as wobble rather than as depth. The glare
          still tracks the pointer, which is what the large surface wants. */}
      <GlareCard
        as="a"
        mode="flat"
        href={social.href}
        target="_blank"
        rel="noreferrer noopener"
        className="liquid-glass group/panel relative block h-[30vh] w-full overflow-hidden rounded-3xl md:h-full"
      >
        <ChannelField
          kind={social.mark ?? "resume"}
          seed={index}
          lit={expanded}
        />

        {/* Ramp wash. Only under the open panel — at rest the row stays
            achromatic so four channels don't compete with the backdrop. */}
        <div
          aria-hidden
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            backgroundImage: "var(--gradient-spectrum)",
            mixBlendMode: "overlay",
            opacity: expanded ? 0.6 : 0,
          }}
        />

        {/* Floor gradient, so the copy at the base always has a ground. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3"
          style={{
            background:
              "linear-gradient(0deg, var(--color-void) 4%, color-mix(in srgb, var(--color-void) 55%, transparent) 46%, transparent 100%)",
          }}
        />

        <ChannelArt social={social} lit={expanded} />

        <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <span className="font-mono text-[0.8125rem] tracking-[0.24em] text-fg md:text-xs">
              {social.code}
            </span>
            <ArrowUpRight
              size={20}
              className="shrink-0 text-muted transition-transform duration-300 group-hover/panel:-translate-y-1 group-hover/panel:translate-x-1 group-hover/panel:text-fg"
            />
          </div>

          {/* Two labels, crossfaded rather than one label re-flowed. A single
              element switching `writing-mode` re-lays-out the whole panel on
              the same frame the accordion is tweening its share of the row,
              which is exactly when you cannot afford a second reflow. Both are
              always in the tree; only their opacity moves.

              The vertical one is `aria-hidden` — the horizontal copy is the
              accessible name and announcing the channel twice helps nobody. */}
          <div className="relative">
            <span
              aria-hidden
              className="absolute bottom-0 left-0 hidden font-tech text-lg font-bold uppercase leading-none tracking-wide text-fg transition-opacity duration-300 md:block"
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                /* Both children of this box are absolute, so the box itself is
                   zero-high — and a vertical-rl run wraps against the available
                   *height*, which is therefore zero. Without this, "X / TWITTER"
                   breaks into a column of stacked words that reads as a layout
                   fault. `nowrap` is the fix that does not depend on the parent
                   having a resolved height. */
                whiteSpace: "nowrap",
                opacity: expanded ? 0 : 1,
              }}
            >
              {social.label}
            </span>

            <div
              className="transition-opacity duration-300 md:absolute md:bottom-0 md:left-0 md:w-max"
              style={{ opacity: expanded ? 1 : 0 }}
            >
              <span className="block whitespace-nowrap font-tech text-2xl font-bold uppercase leading-tight text-fg md:text-4xl">
                {social.label}
              </span>
              <span className="mt-1 block font-mono text-xs lowercase tracking-wider text-muted md:text-sm">
                {social.handle}
              </span>
              <span className="micro mt-4 hidden md:block">
                {social.href.endsWith(".pdf") ? t.connect.openPdf : t.connect.openProfile}
              </span>
              <span className="sr-only">{t.common.newTab}</span>
            </div>
          </div>
        </div>
      </GlareCard>
    </motion.li>
  );
}

/**
 * What the channel *is*, drawn large enough to read across the room: the
 * service's own mark for a profile, the document itself for a resume.
 *
 * It sits above the ramp wash and the floor gradient in the stack, never under
 * them. The wash is an `overlay` blend, and running it across a trademark would
 * recolour it — which both brands' guidelines rule out. So the marks stay at
 * full, untinted white in every state; only their scale answers the accordion.
 * The resume sheet is the site's own material and is allowed to dim at rest.
 *
 * Sized off the panel's *height*, not its width: the same box has to hold a
 * mark in a closed desktop column (tall and narrow), an open one, and a phone
 * row (wide and short), and height is the one dimension all three share.
 */
function ChannelArt({
  social,
  lit,
}: {
  social: SocialLink;
  lit: boolean;
}) {
  if (social.mark) {
    const Mark = social.mark === "github" ? GitHubMark : LinkedInMark;
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[46%] top-[16%] flex items-center justify-center md:bottom-[40%] md:top-[20%]"
      >
        <div
          className="flex h-full max-w-[64%] items-center justify-center transition-transform duration-300 ease-out"
          style={{ transform: `scale(${lit ? 1 : 0.86})` }}
        >
          <Mark className="h-full max-h-full w-auto max-w-full object-contain" />
        </div>
      </div>
    );
  }

  if (social.preview) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[42%] top-[12%] flex items-center justify-center md:bottom-[34%] md:top-[14%]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative, fixed asset */}
        <img
          src={social.preview}
          alt=""
          width={1191}
          height={1684}
          loading="lazy"
          className="h-full w-auto max-w-[78%] rounded-[2px] object-contain shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] transition-[transform,opacity] duration-300 ease-out"
          style={{
            opacity: lit ? 1 : 0.62,
            transform: `rotate(${lit ? -2 : -5}deg) scale(${lit ? 1 : 0.92})`,
          }}
        />
      </div>
    );
  }

  return null;
}
