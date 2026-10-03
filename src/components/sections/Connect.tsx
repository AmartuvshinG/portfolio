"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { GlareCard } from "@/components/motion/GlareCard";
import { sectionIndex, type SocialLink } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScramble } from "@/hooks/useScramble";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { ChannelField } from "@/components/ui/ChannelField";
import { GitHubMark, LinkedInMark } from "@/components/ui/BrandMarks";
import { ScriptLabel } from "@/components/ui/ScriptLabel";
import { brandTile, TechMark, type TechKey } from "@/components/ui/TechMarks";
import type { GitHubSummary } from "@/lib/github";

/**
 * Links (was Signal): the three places to find him, as a bank of terminals.
 *
 * Three full-height panels fill the frame edge to edge. The panel under the
 * pointer takes two and a half times its share of the row and the other two
 * give way, so the row is always exactly full.
 *
 * **Motion signature: power-on.** As the section scrolls in, each terminal
 * switches on as a CRT does: one bright line across the dark, which opens top
 * and bottom into the picture under a flash of white that fades as it
 * settles. Staggered across the three and scrubbed by the scroll, so it is
 * reversible and still when the scroll is; at rest nothing is scaled. The
 * corner arrow is magnetic, leaning toward the pointer, and each panel has a
 * copy-link button beside it. (A tuner band with a needle and a scope used to
 * sit over the row; it repeated what the accordion says, and it went.)
 *
 * Every panel is a terminal now rather than a lit slab: a dark CRT ground,
 * the channel's mark kept small, and the data up front in holo (the colour
 * of readouts; sodium is for the physical city and the things you press).
 * The readout decodes line by line as a panel opens. GitHub shows what the
 * daily fetch really returns — repo count, last push, the language mix of
 * his own repos and a log of when each was started; the live product its
 * measured results as meters. Nothing is invented: with no GitHub data the
 * panel is the handle and the mark, as before.
 *
 * Keyboard: Tab reaches each channel (each is a link); ← and → move between
 * them and open each in turn, exactly as the pointer does.
 *
 * ---------------------------------------------------------------------------
 * **Animate `flex-grow`, not `width`.**
 *
 * Siblings whose widths are tweened independently do not add up to the
 * container during the tween — every frame lands a fraction over or under, so
 * the row breathes at its right edge. `flex-grow` is a *share*, so whatever
 * the numbers are mid-tween the row is full by construction. It does cost
 * layout on three elements per frame of the tween, which is why the accordion
 * is gated to pointer devices and to a short spring, never to scroll.
 * ---------------------------------------------------------------------------
 *
 * On a phone the row becomes a column and the accordion and tuner are off:
 * three channels sharing 390px is ~120px each, and there is no hover to open
 * them with. Every panel renders open.
 */

/** Share of the row taken by the open panel, the closed ones, and at rest. */
const OPEN = 2.6;
const SHUT = 0.8;
const REST = 1;

const PANEL_SPRING = { type: "spring", stiffness: 210, damping: 30 } as const;

type Kind = "github" | "linkedin" | "live";
const kindOf = (s: SocialLink): Kind => s.mark ?? "live";

export function Connect({ github }: { github: GitHubSummary | null }) {
  const { c, t } = useI18n();
  const { socials } = c;
  const ref = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotion();
  const [tuned, setTuned] = useState<number | null>(null);
  /* The accordion needs a row to run in. Below `md` the panels stack and every
     one of them renders open, so `row` gates both the layout and the tween. */
  const [row, setRow] = useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "start 25%"],
  });
  /* One shared value drives the arrival; each panel offsets it by its index. */
  const open = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)");
    const update = () => setRow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /* The channel art, the scope and the scan only run while the section is
     near the screen. On a phone every panel is expanded, so without this all
     three fields restyled every frame of every visit. */
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      rootMargin: "200px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const accordion = row && !reduced;

  /* ← / → between channels. Focus opens a panel (onFocus), so moving focus
     is the whole of it. */
  const panelLinks = useCallback(
    () => Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-channel]") ?? []),
    []
  );
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const links = panelLinks();
    const at = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (at < 0) return;
    e.preventDefault();
    const next = (at + (e.key === "ArrowRight" ? 1 : -1) + links.length) % links.length;
    links[next].focus();
  };

  return (
    <section
      id="connect"
      data-act="deck"
      data-chapter="LINKS"
      ref={ref}
      className="relative flex min-h-[92vh] flex-col justify-center overflow-hidden py-24 md:py-32"
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
              {t.connect.title}
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-muted md:pb-3 md:text-right">{t.connect.lead}</p>
        </div>

        <ul
          ref={listRef}
          className="mt-12 flex flex-col gap-2 md:mt-16 md:h-[64vh] md:min-h-[500px] md:flex-row"
          onMouseLeave={() => setTuned(null)}
          onKeyDown={onKeyDown}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setTuned(null);
          }}
        >
          {socials.map((social, i) => (
            <ChannelPanel
              key={social.label}
              social={social}
              index={i}
              count={socials.length}
              /* At rest every panel is equal. Once one is open it takes the
                 lion's share and the rest compress — never to zero, because a
                 panel you cannot see is a panel you cannot move back to. */
              grow={tuned === null ? REST : tuned === i ? OPEN : SHUT}
              expanded={!accordion || tuned === i}
              live={inView}
              accordion={accordion}
              open={open}
              reduced={reduced}
              onEnter={() => accordion && setTuned(i)}
              github={social.mark === "github" ? github : null}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* A channel                                                                 */
/* ------------------------------------------------------------------------ */

function ChannelPanel({
  social,
  index,
  count,
  grow,
  expanded,
  live,
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
  live: boolean;
  accordion: boolean;
  open: MotionValue<number>;
  reduced: boolean;
  onEnter: () => void;
  github: GitHubSummary | null;
}) {
  const { t } = useI18n();
  const kind = kindOf(social);
  const openLabel = social.shot ? t.connect.openSite : t.connect.openProfile;
  /* The arrival, per panel: its own window of the section's progress. */
  const a = (index / count) * 0.32;
  const p = useTransform(open, (v) => Math.min(1, Math.max(0, (v - a) / 0.62)));
  /* A line first, drawn out from the centre … */
  const sx = useTransform(p, (v) => 0.04 + 0.96 * easeOut(Math.min(1, v / 0.32)));
  /* … then opening into the picture. */
  const sy = useTransform(p, (v) => 0.008 + 0.992 * easeOut(Math.min(1, Math.max(0, (v - 0.26) / 0.5))));
  const flash = useTransform(p, [0, 0.2, 0.42, 0.85], [0, 0.95, 0.55, 0]);
  const shown = useTransform(p, [0, 0.06], [0, 1]);

  /* The magnetic arrow: it leans toward the pointer, at most a few px. */
  const ax = useSpring(0, { stiffness: 260, damping: 18 });
  const ay = useSpring(0, { stiffness: 260, damping: 18 });
  const arrowRef = useRef<HTMLSpanElement>(null);
  const lean = (e: React.PointerEvent) => {
    const r = arrowRef.current?.getBoundingClientRect();
    if (!r || reduced || e.pointerType !== "mouse") return;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1;
    const pull = Math.min(12, d * 0.08);
    ax.set((dx / d) * pull);
    ay.set((dy / d) * pull);
  };

  return (
    <motion.li
      className="relative min-w-0 md:h-full"
      animate={accordion ? { flexGrow: grow } : undefined}
      transition={PANEL_SPRING}
      onMouseEnter={onEnter}
      onFocus={onEnter}
      onPointerMove={lean}
      onPointerLeave={() => {
        ax.set(0);
        ay.set(0);
      }}
    >
      <motion.div
        className="relative h-full"
        style={reduced ? undefined : { scaleX: sx, scaleY: sy, opacity: shown }}
      >
      {/* `mode="flat"`: the panel is already growing; a tilt on top of that
          reads as wobble rather than as depth. The glare still tracks. */}
      <GlareCard
        as="a"
        mode="flat"
        href={social.href}
        target="_blank"
        rel="noreferrer noopener"
        data-channel=""
        className="signal-crt group/panel relative block min-h-[30vh] w-full overflow-hidden rounded-[3px] bg-[#040e11] md:h-full"
      >
        {/* The channel's texture, dimmed: the data leads now. */}
        <div className="absolute inset-0 opacity-40">
          <ChannelField kind={kind} seed={index} lit={expanded && live} />
        </div>
        {/* A terminal's frame, not a card's. */}
        <span aria-hidden className="monitor-reticle z-[1]" data-on={expanded ? "" : undefined} />

        {/* Floor gradient, so the copy at the base always has a ground. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3"
          style={{
            background:
              "linear-gradient(0deg, var(--color-void) 4%, color-mix(in srgb, var(--color-void) 55%, transparent) 46%, transparent 100%)",
          }}
        />

        <ChannelArt social={social} lit={expanded} live={live} />

        {/* Targeting brackets on hover — "this is the thing you press", so sodium. */}
        <span
          aria-hidden
          className="hud-brackets pointer-events-none absolute inset-2 z-10 scale-[1.03] opacity-0 transition-[opacity,transform] duration-300 [--hud-c:var(--color-hazard)] [--hud-l:16px] [--hud-w:2px] group-hover/panel:scale-100 group-hover/panel:opacity-100 group-focus-visible/panel:scale-100 group-focus-visible/panel:opacity-100"
        />

        <div className="relative z-[3] flex h-full min-h-[30vh] flex-col justify-between gap-6 p-4 md:absolute md:inset-0 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-xs tracking-[0.24em] text-fg">
                <span className="text-[var(--color-holo)]">CH-{String(index + 1).padStart(2, "0")}</span> · {social.code}
              </span>
              <motion.span ref={arrowRef} style={{ x: ax, y: ay }} className="shrink-0">
                <ArrowUpRight
                  size={22}
                  className="text-muted transition-colors duration-300 group-hover/panel:text-fg"
                />
              </motion.span>
            </div>
            <Readout kind={kind} github={github} expanded={expanded} live={live} />
            {kind === "github" && github && (
              <div
                className="hidden max-w-[30rem] flex-col gap-5 transition-opacity duration-300 md:flex"
                style={{ opacity: expanded ? 1 : 0 }}
              >
                <LanguageMix languages={github.languages} />
                <RepoLog log={github.log} />
              </div>
            )}
            {kind === "live" && <Meters expanded={expanded} />}
          </div>

          {/* Two labels, crossfaded rather than one label re-flowed: a single
              element switching `writing-mode` re-lays-out the whole panel on
              the frame the accordion is tweening. The vertical one is
              `aria-hidden`; the horizontal copy is the accessible name. */}
          <div className="relative">
            <span
              aria-hidden
              className="absolute bottom-0 left-0 hidden font-tech text-lg font-bold uppercase leading-none tracking-wide text-fg transition-opacity duration-300 md:block"
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                /* Both children of this box are absolute, so the box is zero-
                   high, and a vertical-rl run wraps against that height. */
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
        {/* The power-on flash: white over everything, fading as it settles. */}
        {!reduced && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 bg-[#eafcff] mix-blend-screen"
            style={{ opacity: flash }}
          />
        )}
      </GlareCard>
      <CopyLink href={social.href} label={social.label} expanded={expanded} />
      </motion.div>
    </motion.li>
  );
}

const easeOut = (x: number) => 1 - (1 - x) ** 3;

/**
 * Copy the channel's address. A sibling of the panel's link, never inside it
 * (a button in a link is invalid HTML). The icon morphs from two sheets to a
 * tick, and back after a moment.
 */
function CopyLink({ href, label, expanded }: { href: string; label: string; expanded: boolean }) {
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
      className="tag absolute right-12 top-2 z-30 inline-flex min-h-11 items-center gap-2 rounded-md px-2.5 text-fg/80 transition-[opacity,color,background-color] duration-300 hover:bg-white/5 hover:text-fg focus-visible:!opacity-100 md:right-14 md:top-3"
      style={{ opacity: expanded ? 1 : 0 }}
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

/**
 * What the channel *is*: the service's own mark for a profile, a live feed
 * for the product. Marks stay full, untinted white (both brands' rules), so
 * nothing blends over them. Shut, the mark stands in the middle of the
 * column; open, the data takes the middle and the mark steps down to the
 * bottom-right corner — two copies crossfaded, never a moving layout.
 *
 * Desktop only: a phone row is short, and its label names the channel.
 */
function ChannelArt({ social, lit, live }: { social: SocialLink; lit: boolean; live: boolean }) {
  if (social.mark) {
    const Mark = social.mark === "github" ? GitHubMark : LinkedInMark;
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
        <div
          className="absolute inset-x-0 bottom-[42%] top-[34%] flex items-center justify-center transition-opacity duration-300"
          style={{ opacity: lit ? 0 : 1 }}
        >
          <Mark className="h-full max-h-full w-auto max-w-[44%] object-contain" />
        </div>
        <div
          className="absolute bottom-6 right-6 h-14 transition-opacity duration-300"
          style={{ opacity: lit ? 0.9 : 0 }}
        >
          <Mark className="h-full w-auto" />
        </div>
      </div>
    );
  }

  if (social.shot) {
    /* The live product, as a monitored feed. */
    return (
      <div
        aria-hidden
        /* Right of the label column, so the feed and the name never overlap. */
        className="pointer-events-none absolute inset-x-0 bottom-[24%] top-[40%] hidden items-center justify-end pr-6 md:flex"
      >
        <div
          className="relative w-[62%] max-w-[30rem] overflow-hidden shadow-[0_24px_60px_-12px_rgba(0,0,0,0.75)] ring-1 ring-white/10 transition-[transform,opacity] duration-300 ease-out"
          style={{
            opacity: lit ? 1 : 0.7,
            transform: `perspective(900px) rotateY(${lit ? -4 : -12}deg) scale(${lit ? 1 : 0.9})`,
          }}
        >
          <div className="flex items-center gap-2 bg-[#051114] px-2.5 py-1.5 tag">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-holo)] shadow-[0_0_6px_var(--color-holo)]" />
            <span className="text-[var(--color-holo)]">LIVE</span>
            <span className="h-2.5 w-px bg-white/15" />
            <span className="truncate normal-case tracking-normal text-white/75">spotfixes.com</span>
          </div>
          <div className="relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative, fixed asset */}
            <img src={social.shot} alt="" loading="lazy" className="block aspect-[16/10] w-full object-cover object-top" />
            {/* One slow scan band down the feed while it is open. */}
            {lit && (
              <span
                className="feed-scan"
                style={{ animationPlayState: live ? "running" : "paused" }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * The panel's terminal readout: a few lines of real data behind holo
 * prompts. Each line decodes as the panel opens (useScramble), top first;
 * a screen reader hears the plain text once (the flipping copy is hidden).
 */
function Readout({
  kind,
  github,
  expanded,
  live,
}: {
  kind: Kind;
  github: GitHubSummary | null;
  expanded: boolean;
  /** The section is near the screen: only then does the lamp blink. */
  live: boolean;
}) {
  const { c, t, locale } = useI18n();
  let lines: string[] = [];
  if (kind === "github" && github) {
    lines = [
      t.connect.repos(github.repos),
      ...(github.lastPush ? [`${t.connect.lastPush} ${formatMonth(github.lastPush, locale)}`] : []),
      ...(github.recent.length
        ? [github.recent.map((r) => (r.language ? `${r.name} [${r.language}]` : r.name)).join(" · ")]
        : []),
    ];
  } else if (kind === "linkedin") {
    lines = [c.profile.role, c.profile.location, `${t.connect.status}: ${c.profile.status}`];
  }
  if (kind === "live") {
    return (
      <span className="flex w-fit items-center gap-2 rounded-md bg-[#061317]/55 px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-holo)]">
        <span className={`h-1.5 w-1.5 rounded-full bg-[var(--color-holo)] ${live ? "animate-blink" : ""}`} />
        {t.connect.live}
      </span>
    );
  }
  if (!lines.length) return null;
  /* A shut panel is a narrow column: the long lines wrapped into a tall
     stack that ran into the mark. Shut shows two lines; open shows them all. */
  const shown = expanded ? lines : lines.slice(0, 2);

  return (
    <div
      /* A faint dark backing: the channel art runs behind at fixed positions
         and would otherwise strike through a line of data. */
      className="-mx-2.5 flex w-fit max-w-[34rem] flex-col gap-1.5 rounded-md bg-[#061317]/55 px-2.5 py-2 font-mono text-xs uppercase tracking-[0.14em] text-fg/85 transition-opacity duration-300"
      style={{ opacity: expanded ? 1 : 0.55 }}
    >
      {shown.map((l, i) => (
        <ReadoutLine key={l} text={l} order={i} expanded={expanded} />
      ))}
    </div>
  );
}

function ReadoutLine({ text, order, expanded }: { text: string; order: number; expanded: boolean }) {
  const { ref, run } = useScramble(text);
  useEffect(() => {
    if (!expanded) return;
    const id = window.setTimeout(run, 90 * order);
    return () => window.clearTimeout(id);
  }, [expanded, order, run]);
  return (
    <span className="flex gap-2">
      <span aria-hidden className="text-[var(--color-holo)]">
        &gt;
      </span>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden className="min-w-0 break-words">
        {text}
      </span>
    </span>
  );
}

/** GitHub's language names, as the dock's marks. */
const LANG_MARKS: Record<string, TechKey | undefined> = {
  Python: "python",
  JavaScript: "javascript",
  TypeScript: "typescript",
  Java: "java",
  HTML: "html5",
  CSS: "css",
  "C++": "cpp",
};

/**
 * The languages of his own repos, as one bar cut into shares. Each share is
 * its slice of the spectrum ramp (one gradient laid across the whole bar and
 * windowed per segment), never a flat fill.
 */
function LanguageMix({ languages }: { languages: GitHubSummary["languages"] }) {
  const { t } = useI18n();
  const total = languages.reduce((a, l) => a + l.count, 0);
  if (!total) return null;
  const segs = languages.map((l, i) => ({
    ...l,
    from: languages.slice(0, i).reduce((a, x) => a + x.count, 0) / total,
    share: l.count / total,
  }));
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="tag text-muted">{t.connect.langMix}</figcaption>
      <div aria-hidden className="flex h-2 w-full gap-[3px]">
        {segs.map((s) => (
          <span
            key={s.name}
            className="h-full"
            style={{
              width: `${s.share * 100}%`,
              backgroundImage: "var(--gradient-spectrum)",
              backgroundSize: `${100 / s.share}% 100%`,
              backgroundPosition: `${s.share < 1 ? (s.from / (1 - s.share)) * 100 : 0}% 0`,
            }}
          />
        ))}
      </div>
      <ul className="tag flex flex-wrap gap-x-4 gap-y-1.5 text-fg/85">
        {segs.map((s, i) => {
          const mark = LANG_MARKS[s.name];
          return (
            <motion.li
              key={s.name}
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 + i * 0.06 }}
            >
              {mark && (
                <span
                  aria-hidden
                  className="flex h-5 w-5 items-center justify-center rounded-[5px]"
                  style={{ background: brandTile(mark).tile, color: brandTile(mark).ink }}
                >
                  <TechMark name={mark} size={12} />
                </span>
              )}
              {s.name} <span className="tabular text-[var(--color-holo)]">{Math.round(s.share * 100)}%</span>
            </motion.li>
          );
        })}
      </ul>
    </figure>
  );
}

/**
 * When each of his repos was started, on one time axis from the first to
 * now: a tick per repo, the latest lit. Hovering a tick names it.
 */
function RepoLog({ log }: { log: GitHubSummary["log"] }) {
  const { t, locale } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  if (log.length < 2) return null;
  const t0 = Date.parse(log[0].created);
  const t1 = Date.parse(log[log.length - 1].created);
  const span = Math.max(1, t1 - t0);
  const shown = hover ?? log.length - 1;
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="tag flex justify-between gap-4 text-muted">
        <span>{t.connect.repoLog}</span>
        <span className="truncate normal-case tracking-[0.08em] text-[var(--color-holo)]">
          {t.connect.started(log[shown].name, formatMonth(log[shown].created, locale))}
        </span>
      </figcaption>
      <div className="relative h-7" onMouseLeave={() => setHover(null)}>
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
        {log.map((r, i) => {
          const x = ((Date.parse(r.created) - t0) / span) * 100;
          const on = i === shown;
          return (
            <span
              key={r.name}
              aria-hidden
              onMouseEnter={() => setHover(i)}
              className="absolute top-0 flex h-full w-3 -translate-x-1/2 items-center justify-center"
              style={{ left: `${x}%` }}
            >
              <span
                className={`w-px transition-[height,background-color] duration-200 ${on ? "h-full bg-[var(--color-holo)] shadow-[0_0_8px_var(--color-holo)]" : "h-3 bg-fg/60"}`}
              />
            </span>
          );
        })}
      </div>
      <div aria-hidden className="tag flex justify-between tabular text-muted">
        <span>{new Date(t0).getUTCFullYear()}</span>
        <span>{new Date(t1).getUTCFullYear()}</span>
      </div>
    </figure>
  );
}

/**
 * The live product's measured results (Spotfixes' report, via content), as
 * meters: the figure large in holo, its label under it, and a hairline that
 * fills as the panel opens. Only a percentage gets a proportional fill;
 * counts and timings get a full rule, because a bar's length has to mean
 * something.
 */
function Meters({ expanded }: { expanded: boolean }) {
  const { c } = useI18n();
  const metrics = c.projects[0]?.metrics ?? [];
  if (!metrics.length) return null;
  return (
    <dl
      /* Shut, the column is too narrow for three figures: they wait. */
      className="grid max-w-[30rem] grid-cols-3 gap-4 transition-opacity duration-300"
      style={{ opacity: expanded ? 1 : 0 }}
    >
      {metrics.map((m) => {
        const pct = /^(\d+(?:\.\d+)?)%$/.exec(m.value);
        const fill = pct ? Number(pct[1]) / 100 : 1;
        return (
          <div key={m.label} className="flex min-w-0 flex-col gap-1.5">
            <dt className="tag order-2 text-muted">{m.label}</dt>
            <dd className="order-1 flex flex-col gap-1.5">
              <span className="font-tech text-2xl font-semibold tabular leading-none text-[var(--color-holo)] md:text-3xl">
                {m.value}
              </span>
              <span aria-hidden className="relative h-px w-full bg-line">
                <span
                  className="absolute inset-y-0 left-0 bg-[var(--color-holo)] transition-[width] duration-700 ease-out"
                  style={{ width: expanded ? `${fill * 100}%` : "0%" }}
                />
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** "May 2026" in English; the resume's own "2026.05" style in Mongolian. */
function formatMonth(iso: string, locale: string) {
  const d = new Date(iso);
  if (locale === "mn") return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}
