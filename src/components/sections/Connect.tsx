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
import type { GitHubSummary } from "@/lib/github";

/**
 * "Find me elsewhere", at the scale it should always have been.
 *
 * This was a fan of four 7rem cards — thumbnails, in a section given 92vh to
 * work with, in a page whose whole argument is that it takes up space
 * confidently. The fan itself was fine; it was just tiny, and a splayed deck of
 * playing cards is a gesture that wants to be either small and incidental or
 * not used at all.
 *
 * It is now three full-height panels filling the frame edge to edge, and the
 * interaction is the size: the panel under the pointer takes two and a half
 * times its share of the row and the other two give way, so the row is always
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
 * It does cost layout on three elements per frame of the tween, which is why the
 * accordion is gated to pointer devices and to a 0.55s spring rather than being
 * driven by scroll. A layout tween you trigger deliberately is nothing like one
 * that runs on every scroll frame.
 * ---------------------------------------------------------------------------
 *
 * On a phone the row becomes a column and the accordion is switched off
 * entirely: three channels sharing 390px of width is ~120px each, and there is no
 * hover to open them with. Every panel renders in its expanded state instead.
 */

/** Share of the row taken by the open panel, the closed ones, and at rest. */
const OPEN = 2.6;
const SHUT = 0.8;
const REST = 1;

const PANEL_SPRING = { type: "spring", stiffness: 210, damping: 30 } as const;

export function Connect({ github }: { github: GitHubSummary | null }) {
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
              <span className="eyebrow tabular">{sectionIndex("#connect")}</span>
              <span className="h-px w-12 bg-current opacity-25" />
              <span className="eyebrow">{t.connect.eyebrow}</span>
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
              github={social.mark === "github" ? github : null}
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
  github,
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
  github: GitHubSummary | null;
}) {
  const { t } = useI18n();
  const kind = social.mark ?? "live";
  const openLabel = social.shot ? t.connect.openSite : t.connect.openProfile;
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
          kind={kind}
          seed={index}
          lit={expanded}
        />

        {/* Ramp wash. Only under the open panel — at rest the row stays
            achromatic so three channels don't compete with the backdrop. */}
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

        {/* Sodium targeting brackets, drawn in on hover — the nav's and Craft's
            language for "this is the thing in focus". */}
        <span
          aria-hidden
          className="hud-brackets pointer-events-none absolute inset-2 z-10 scale-[1.03] opacity-0 transition-[opacity,transform] duration-300 [--hud-c:var(--color-hazard)] [--hud-l:16px] [--hud-w:2px] group-hover/panel:scale-100 group-hover/panel:opacity-100 group-focus-visible/panel:scale-100 group-focus-visible/panel:opacity-100"
        />

        <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-xs tracking-[0.24em] text-fg">
                {social.code}
              </span>
              <ArrowUpRight
                size={20}
                className="shrink-0 text-muted transition-transform duration-300 group-hover/panel:-translate-y-1 group-hover/panel:translate-x-1 group-hover/panel:text-fg"
              />
            </div>
            <Readout kind={kind} github={github} expanded={expanded} />
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
              className="transition-opacity duration-300 md:absolute md:bottom-0 md:left-0 md:w-max md:max-w-full"
              style={{ opacity: expanded ? 1 : 0 }}
            >
              <span className="block whitespace-nowrap font-tech text-2xl font-bold uppercase leading-tight text-fg md:text-4xl">
                {social.label}
              </span>
              <span className="mt-1 block font-mono text-xs lowercase tracking-wider text-muted md:text-sm">
                {social.handle}
              </span>
              <span className="micro mt-4 hidden md:block">{openLabel}</span>
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
 * service's own mark for a profile, a browser window for the live product.
 *
 * It sits above the ramp wash and the floor gradient in the stack, never under
 * them. The wash is an `overlay` blend, and running it across a trademark would
 * recolour it — which both brands' guidelines rule out. So the marks stay at
 * full, untinted white in every state; only their scale answers the accordion.
 *
 * Sized off the panel's *height*, not its width: the same box has to hold a
 * mark in a closed desktop column (tall and narrow) and an open one.
 *
 * Desktop only. A phone row is 30vh tall, and with the terminal readout at
 * its head the mark and the browser window collided with the data; there the
 * row's own label names the channel and the readout is the content.
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
        /* A third smaller than it was: at full height the mark was a white slab
           that out-shouted the data; now the readout above leads. */
        className="pointer-events-none absolute inset-x-0 bottom-[46%] top-[24%] hidden items-center justify-center md:bottom-[42%] md:top-[34%] md:flex"
      >
        <div
          className="flex h-full max-w-[44%] items-center justify-center transition-transform duration-300 ease-out"
          style={{ transform: `scale(${lit ? 1 : 0.86})` }}
        >
          <Mark className="h-full max-h-full w-auto max-w-full object-contain" />
        </div>
      </div>
    );
  }

  if (social.shot) {
    /* The live product, as a browser window. Landscape inside a panel that is
       tall when closed, so it is sized off the width instead. */
    return (
      <div
        aria-hidden
        /* Clear of the readout above it (four lines on the live panel). */
        className="pointer-events-none absolute inset-x-0 bottom-[42%] top-[24%] hidden items-center justify-center md:bottom-[26%] md:top-[38%] md:flex"
      >
        <div
          className="w-[88%] max-w-[26rem] overflow-hidden rounded-lg shadow-[0_24px_60px_-12px_rgba(0,0,0,0.75)] ring-1 ring-white/10 transition-[transform,opacity] duration-300 ease-out"
          style={{
            opacity: lit ? 1 : 0.7,
            transform: `perspective(900px) rotateY(${lit ? -4 : -12}deg) scale(${lit ? 1 : 0.9})`,
          }}
        >
          <div className="flex items-center gap-1.5 bg-[#12142a] px-2.5 py-1.5">
            <span className="h-2 w-2 rounded-full bg-white/25" />
            <span className="h-2 w-2 rounded-full bg-white/25" />
            <span className="h-2 w-2 rounded-full bg-white/25" />
            <span className="ml-2 truncate font-mono text-[0.625rem] text-white/60">spotfixes.com</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative, fixed asset */}
          <img src={social.shot} alt="" loading="lazy" className="block aspect-[16/10] w-full object-cover object-top" />
        </div>
      </div>
    );
  }

  return null;
}

/**
 * The panel's terminal readout: a few lines of real data under the channel
 * code, each behind a sodium prompt. GitHub shows the numbers the page
 * already fetches daily (repos, last push, recent work); LinkedIn the role
 * and base; the live product its lamp and the three measured results.
 * Dimmer while the panel is shut, full when it opens.
 */
function Readout({
  kind,
  github,
  expanded,
}: {
  kind: "github" | "linkedin" | "live";
  github: GitHubSummary | null;
  expanded: boolean;
}) {
  const { c, t, locale } = useI18n();
  let lines: { k: string; v: string }[] = [];
  if (kind === "github" && github) {
    lines = [
      { k: ">", v: t.connect.repos(github.repos) },
      ...(github.lastPush ? [{ k: ">", v: `${t.connect.lastPush} ${formatMonth(github.lastPush, locale)}` }] : []),
      ...(github.recent.length
        ? [{ k: ">", v: github.recent.map((r) => (r.language ? `${r.name} [${r.language}]` : r.name)).join(" · ") }]
        : []),
    ];
  } else if (kind === "linkedin") {
    lines = [
      { k: ">", v: c.profile.role },
      { k: ">", v: c.profile.location },
    ];
  } else if (kind === "live") {
    const metrics = c.projects[0]?.metrics ?? [];
    lines = metrics.map((m) => ({ k: ">", v: `${m.label} ${m.value}` }));
  }
  if (!lines.length && kind !== "live") return null;
  /* A shut panel is a narrow column: the recent-repos line wrapped into a tall
     stack that ran into the mark. Shut shows two lines; open shows them all. */
  if (!expanded) lines = lines.slice(0, 2);

  return (
    <div
      /* A faint dark backing: the channel art (pulse lines, constellation)
         runs behind at fixed positions and would otherwise strike through a
         line of data. */
      className="-mx-2.5 flex w-fit max-w-[34rem] flex-col gap-1.5 rounded-md bg-[#05060d]/55 px-2.5 py-2 font-mono text-xs uppercase tracking-[0.14em] text-fg/85 transition-opacity duration-300"
      style={{ opacity: expanded ? 1 : 0.55 }}
    >
      {kind === "live" && (
        <span className="flex items-center gap-2 text-[var(--color-hazard)]">
          <span className="h-1.5 w-1.5 animate-blink rounded-full bg-[var(--color-hazard)]" />
          {t.connect.live}
        </span>
      )}
      {lines.map((l, i) => (
        <span key={i} className="flex gap-2">
          <span aria-hidden className="text-[var(--color-hazard)]">
            {l.k}
          </span>
          <span className="min-w-0 break-words">{l.v}</span>
        </span>
      ))}
    </div>
  );
}

/** "May 2026" in English; the resume's own "2026.05" style in Mongolian. */
function formatMonth(iso: string, locale: string) {
  const d = new Date(iso);
  if (locale === "mn") return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}
