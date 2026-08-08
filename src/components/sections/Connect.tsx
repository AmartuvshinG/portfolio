"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { GlareCard } from "@/components/motion/GlareCard";
import { socials } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { srand } from "@/lib/utils";

/**
 * "Find me elsewhere", promoted.
 *
 * This used to be a small fan of thumbnails tucked under the contact form at
 * the very bottom of the page, where nobody who had already decided to leave
 * would see it. It is now a full chapter sitting next to the profile, at roughly
 * three times the size, and it is the first interactive thing on the page.
 *
 * The fan opens as you scroll into it rather than arriving pre-splayed: the arc
 * spreads from a closed deck to its full sweep across the section's entry, so
 * the cards are doing something while you read the heading. Each card also
 * tilts against the pointer, which is what stops a splayed row of rectangles
 * reading as flat.
 *
 * Geometry is derived from the list length, never hand-tuned per card — with
 * hardcoded rotations the arc breaks the moment a link is added, and this list
 * is exactly the kind of thing that changes.
 */

/** Total sweep across the fan, degrees. */
const SPREAD = 30;
/** Vertical drop from the centre card to the outermost, px. */
const ARC = 54;

export function Connect() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const mid = (socials.length - 1) / 2;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "start 15%"],
  });

  /* One shared value drives the whole fan; each card multiplies it by its own
     offset. Animating the cards independently would need a motion value per
     card and they would drift out of step at different scroll speeds. */
  const open = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      id="connect"
      data-act="deck"
      data-chapter="SIGNAL"
      ref={ref}
      className="relative flex min-h-[92vh] flex-col justify-center overflow-hidden py-28 md:py-36"
      aria-label="Find me elsewhere"
    >
      <ChapterSeam />

      <div className="relative z-10 mx-auto w-full max-w-[1800px] px-5 md:px-8 lg:px-16">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <span className="micro tabular">02</span>
            <span className="h-px w-10 bg-current opacity-25" />
            <span className="micro">Find me elsewhere</span>
          </div>
          <h2
            className="display-caps text-fg"
            style={{ fontSize: "clamp(1.6rem, 4.4vw, 4.25rem)" }}
          >
            Signal
          </h2>
          <p className="max-w-md text-base leading-relaxed text-muted">
            Four channels, one inbox. The work goes up first on the ones that
            move fastest.
          </p>
        </div>

        <ul className="mt-20 flex items-end justify-center md:mt-24">
          {socials.map((social, i) => {
            // -1 at the left edge, 0 at centre, +1 at the right.
            const t = mid === 0 ? 0 : (i - mid) / mid;
            return (
              <FanCard
                key={social.label}
                social={social}
                t={t}
                index={i}
                count={socials.length}
                mid={mid}
                open={open}
                reduced={reduced}
              />
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function FanCard({
  social,
  t,
  index,
  count,
  mid,
  open,
  reduced,
}: {
  social: (typeof socials)[number];
  t: number;
  index: number;
  count: number;
  mid: number;
  open: import("framer-motion").MotionValue<number>;
  reduced: boolean;
}) {
  const rotate = useTransform(open, [0, 1], [0, t * (SPREAD / 2)]);
  const marginTop = useTransform(open, [0, 1], [0, (1 - Math.cos(t * 1.1)) * ARC * 3]);
  const overlap = useTransform(open, [0, 1], ["-5.5rem", "-2.5rem"]);

  return (
    <motion.li
      style={{
        rotate: reduced ? t * (SPREAD / 2) : rotate,
        marginTop: reduced ? (1 - Math.cos(t * 1.1)) * ARC * 3 : marginTop,
        marginLeft: index === 0 ? 0 : reduced ? "-2.5rem" : overlap,
        // Centre card on top, falling away to either edge, so the deck reads as
        // stacked rather than as a row with an arbitrary paint order.
        zIndex: count - Math.abs(index - mid),
      }}
      whileHover={reduced ? undefined : { y: -34, rotate: 0, scale: 1.04 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group"
    >
      {/* `flat`: the fan already rotates every card, and a second rotation on
          the same element simply fights the first. */}
      <GlareCard
        as="a"
        mode="flat"
        href={social.href}
        target="_blank"
        rel="noreferrer noopener"
        className="notch-card block w-28 bg-surface ring-1 ring-inset ring-line transition-shadow duration-300 group-hover:ring-line-strong sm:w-40 md:w-52 lg:w-60"
      >
        <div className="relative aspect-[3/4] w-full">
          <ChannelPlate seed={index} />

          {/* Ramp wash, only on hover — at rest the deck stays achromatic so
              the fan doesn't compete with the shader behind it. */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ backgroundImage: "var(--gradient-spectrum)", mixBlendMode: "overlay" }}
          />

          <div className="absolute inset-0 flex flex-col justify-between p-3 md:p-5">
            <div className="flex items-start justify-between">
              <span className="font-mono text-[0.65rem] tracking-[0.2em] text-fg md:text-xs">
                {social.code}
              </span>
              <ArrowUpRight
                size={16}
                className="text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg"
              />
            </div>
            <div>
              <span className="block font-tech text-sm font-bold uppercase leading-tight text-fg md:text-lg">
                {social.label}
              </span>
              <span className="mt-1 block font-mono text-[0.6rem] lowercase tracking-wider text-muted md:text-[0.7rem]">
                {social.handle}
              </span>
            </div>
          </div>
        </div>
      </GlareCard>
    </motion.li>
  );
}

/**
 * Card art, generated. The fan used to pull four picsum thumbnails — four
 * network requests for four pictures of nothing. This is drawn from the ramp
 * instead, so the deck is on-palette by construction.
 */
function ChannelPlate({ seed }: { seed: number }) {
  const hue = seed % 3;
  const stop = ["var(--spectrum-1)", "var(--spectrum-2)", "var(--spectrum-3)"][hue];

  return (
    <svg
      aria-hidden
      viewBox="0 0 300 400"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <rect width="300" height="400" fill="#0b0d1a" />
      <ellipse cx="150" cy="300" rx="200" ry="180" fill={stop} opacity="0.3" />
      {/* Concentric arcs — a signal radiating out of the bottom edge. */}
      <g fill="none" stroke={stop} strokeOpacity="0.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <circle key={i} cx="150" cy="400" r={40 + i * 46} />
        ))}
      </g>
      <g fill="#eceefb">
        {Array.from({ length: 26 }).map((_, i) => (
          <circle
            key={i}
            cx={(srand(seed * 31 + i * 3) * 300).toFixed(2)}
            cy={(srand(seed * 31 + i * 7 + 1) * 400).toFixed(2)}
            r={(0.6 + srand(seed * 31 + i * 11 + 2) * 1.6).toFixed(2)}
            opacity={(0.15 + srand(seed * 31 + i * 13 + 5) * 0.5).toFixed(3)}
          />
        ))}
      </g>
      <rect
        width="300"
        height="400"
        fill="url(#connect-fade)"
        className="[--x:0]"
      />
      <defs>
        <linearGradient id="connect-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#05060d" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#05060d" stopOpacity="0.85" />
        </linearGradient>
      </defs>
    </svg>
  );
}
