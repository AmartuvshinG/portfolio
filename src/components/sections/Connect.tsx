"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { sectionIndex, type SocialLink } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { SliceTitle } from "@/components/motion/SliceTitle";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { GitHubMark, LinkedInMark } from "@/components/ui/BrandMarks";
import { ScriptLabel } from "@/components/ui/ScriptLabel";
import type { GitHubSummary } from "@/lib/github";

/**
 * Links: the three places to find him, as three compact cartridges.
 *
 * Each card is a link: the service's own mark large at the top, then its
 * name, the handle, and one live fact — repos and last push from the daily
 * GitHub fetch, the role on LinkedIn, the live product's lamp. Nothing is
 * invented; with no GitHub data the card is the handle and the mark.
 *
 * **Hover: a halftone bloom.** Under the pointer a dot screen in the spectrum
 * ramp blooms out from the exact point it entered, following it while it
 * moves (`.cart-bloom`: the ramp under a dot mask intersected with a circle
 * whose radius is a registered custom property, so it transitions). The edge
 * traces once round in the ramp (`.cart-edge`) and the mark lifts. Keyboard
 * focus blooms from the centre. Masks, transforms and opacity only — no blur.
 *
 * **Arrival: power-on.** As the section scrolls in, each card switches on as
 * a CRT does: one bright line across the dark that opens top and bottom into
 * the picture under a fading flash. Staggered, scrubbed by the scroll, so it
 * is reversible and still when the scroll is; at rest nothing is scaled.
 *
 * The copy-link button is a sibling of each card's link, never inside it (a
 * button in a link is invalid HTML).
 */

type Kind = "github" | "linkedin" | "live";
const kindOf = (s: SocialLink): Kind => s.mark ?? "live";

export function Connect({ github }: { github: GitHubSummary | null }) {
  const { c, t } = useI18n();
  const { socials } = c;
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "start 30%"],
  });

  return (
    <section
      id="connect"
      data-act="deck"
      data-chapter="LINKS"
      ref={ref}
      className="relative overflow-hidden py-24 md:py-32"
      aria-label={t.connect.aria}
    >
      <ChapterSeam />
      <div className="relative z-10 mx-auto w-full max-w-[1800px] px-5 md:px-8 lg:px-16">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="relative flex flex-col gap-5">
            <ScriptLabel href="#connect" />
            <div className="flex items-center gap-4">
              <span className="eyebrow tabular">{sectionIndex("#connect")}</span>
              <span className="h-px w-12 bg-current opacity-25" />
              <span className="eyebrow">{t.connect.eyebrow}</span>
            </div>
            <h2 className="display-caps text-fg" style={{ fontSize: "clamp(1.6rem, 4.4vw, 4.25rem)" }}>
              <SliceTitle text={t.connect.title} />
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-fg/80 md:pb-3 md:text-right">{t.connect.lead}</p>
        </div>

        <ul className="mt-12 grid gap-4 md:mt-14 md:grid-cols-3 lg:gap-5">
          {socials.map((social, i) => (
            <Cartridge
              key={social.label}
              social={social}
              index={i}
              count={socials.length}
              progress={scrollYProgress}
              reduced={reduced}
              github={social.mark === "github" ? github : null}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

function Cartridge({
  social,
  index,
  count,
  progress,
  reduced,
  github,
}: {
  social: SocialLink;
  index: number;
  count: number;
  progress: MotionValue<number>;
  reduced: boolean;
  github: GitHubSummary | null;
}) {
  const { t } = useI18n();
  const kind = kindOf(social);
  const cardRef = useRef<HTMLAnchorElement>(null);

  /* The arrival, per card: its own window of the section's progress. */
  const a = (index / count) * 0.3;
  const p = useTransform(progress, (v) => Math.min(1, Math.max(0, (v - a) / 0.62)));
  /* A line first, drawn out from the centre … */
  const sx = useTransform(p, (v) => 0.04 + 0.96 * easeOut(Math.min(1, v / 0.32)));
  /* … then opening into the picture. */
  const sy = useTransform(p, (v) => 0.02 + 0.98 * easeOut(Math.min(1, Math.max(0, (v - 0.26) / 0.5))));
  const flash = useTransform(p, [0, 0.2, 0.42, 0.85], [0, 0.9, 0.5, 0]);
  const shown = useTransform(p, [0, 0.06], [0, 1]);

  /* The arrow leans toward the pointer, a few px at most. */
  const ax = useSpring(0, { stiffness: 260, damping: 18 });
  const ay = useSpring(0, { stiffness: 260, damping: 18 });

  /* The bloom's centre, in the card's own px — written to the card, never
     to the root, so only this card restyles. */
  const aim = (e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty("--x", `${x}px`);
    el.style.setProperty("--y", `${y}px`);
    if (!reduced) {
      const dx = x - (r.width - 36);
      const dy = y - 36;
      const d = Math.hypot(dx, dy) || 1;
      const pull = Math.min(10, d * 0.06);
      ax.set((dx / d) * pull);
      ay.set((dy / d) * pull);
    }
  };

  const Mark = kind === "github" ? GitHubMark : kind === "linkedin" ? LinkedInMark : null;

  return (
    <li className="relative min-w-0">
      <motion.div
        className="relative h-full"
        style={reduced ? undefined : { scaleX: sx, scaleY: sy, opacity: shown }}
      >
        <a
          ref={cardRef}
          href={social.href}
          target="_blank"
          rel="noreferrer noopener"
          onPointerEnter={aim}
          onPointerMove={aim}
          onPointerLeave={() => {
            ax.set(0);
            ay.set(0);
          }}
          className="cart group/cart relative flex h-full min-h-[9.5rem] flex-col justify-between gap-6 overflow-hidden rounded-2xl border border-line bg-[color-mix(in_srgb,var(--color-bg)_82%,transparent)] p-5 md:min-h-[14rem] md:p-6"
        >
          <span aria-hidden className="cart-bloom" />
          <span aria-hidden className="cart-edge" />

          <div className="relative flex items-start justify-between gap-4">
            <span className="cart-mark flex h-11 items-center md:h-14">
              {Mark ? (
                <Mark className="h-full w-auto" />
              ) : (
                social.shot && <LiveThumb src={social.shot} />
              )}
            </span>
            <motion.span style={{ x: ax, y: ay }} className="mt-1 shrink-0">
              <ArrowUpRight
                aria-hidden
                size={24}
                className="text-fg/70 transition-colors duration-300 group-hover/cart:text-fg"
              />
            </motion.span>
          </div>

          <div className="relative">
            <span className="block font-tech text-2xl font-bold uppercase leading-tight text-fg md:text-3xl">
              {social.label}
            </span>
            <span className="mt-1 block font-mono text-sm lowercase tracking-wider text-fg/90">{social.handle}</span>
            <Fact kind={kind} github={github} />
            <span className="sr-only">{t.common.newTab}</span>
          </div>

          {/* The power-on flash: white over everything, fading as it settles. */}
          {!reduced && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 bg-[#eafcff] mix-blend-screen"
              style={{ opacity: flash }}
            />
          )}
        </a>
        <CopyLink href={social.href} label={social.label} />
      </motion.div>
    </li>
  );
}

const easeOut = (x: number) => 1 - (1 - x) ** 3;

/** The one live line under the handle. */
function Fact({ kind, github }: { kind: Kind; github: GitHubSummary | null }) {
  const { c, t, locale } = useI18n();
  let text: string | null = null;
  if (kind === "github" && github) {
    text = [t.connect.repos(github.repos), github.lastPush && `${t.connect.lastPush} ${formatMonth(github.lastPush, locale)}`]
      .filter(Boolean)
      .join(" · ");
  } else if (kind === "linkedin") {
    text = c.profile.role;
  }
  if (kind === "live") {
    return (
      <span className="tag mt-4 flex items-center gap-2 text-[var(--color-holo)]">
        <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--color-holo)] shadow-[0_0_8px_var(--color-holo)]" />
        {t.connect.live}
      </span>
    );
  }
  if (!text) return null;
  return <span className="tag mt-4 block text-[var(--color-holo)]">{text}</span>;
}

/** The live product, as a small framed screen in place of a mark. */
function LiveThumb({ src }: { src: string }) {
  return (
    <span className="relative block h-full overflow-hidden rounded-md ring-1 ring-white/15">
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, fixed asset */}
      <img src={src} alt="" loading="lazy" className="block h-full w-auto object-cover object-top" />
    </span>
  );
}

/**
 * Copy the channel's address. The icon morphs from two sheets to a tick, and
 * back after a moment.
 */
function CopyLink({ href, label }: { href: string; label: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => setDone(false), 1600);
    return () => window.clearTimeout(id);
  }, [done]);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(href);
          setDone(true);
        } catch {
          /* No clipboard here (an insecure origin): the link itself still works. */
        }
      }}
      aria-label={t.connect.copy(label)}
      className="tag absolute right-12 top-3 z-30 inline-flex min-h-11 items-center gap-2 rounded-md px-2.5 text-fg/80 transition-[color,background-color] duration-300 hover:bg-white/5 hover:text-fg md:right-14 md:top-4"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
        <motion.path
          d="M5.5 5.5h7v7h-7z M3.5 10.5v-7h7"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 0 : 1, opacity: done ? 0 : 1 }}
          transition={{ duration: 0.25 }}
        />
        <motion.path
          d="M3 8.5l3.2 3L13 4.5"
          stroke="var(--color-holo)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: 0.3, delay: done ? 0.12 : 0 }}
        />
      </svg>
      <span aria-hidden className={done ? "text-[var(--color-holo)]" : undefined}>
        {done ? t.connect.copied : t.connect.copyShort}
      </span>
      <span role="status" className="sr-only">
        {done ? t.connect.copied : ""}
      </span>
    </button>
  );
}

/** "May 2026" in English; the resume's own "2026.05" style in Mongolian. */
function formatMonth(iso: string, locale: string) {
  const d = new Date(iso);
  if (locale === "mn") return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}
