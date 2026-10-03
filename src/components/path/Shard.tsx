"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { TimelineEntry } from "@/lib/content";
import { decode } from "@/lib/neonField";
import { strike } from "@/lib/neonStrike";
import { EASE_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { PathWords } from "@/components/path/NeonStamp";

/* ---------------------------------------------------------------------------
   The route log is a shard reader.

   In the city this site imagines, records travel on data shards. Each entry
   on the Path is one: its type is the shard's class, and opening a row slots
   that shard into the board's reader, which reads it.

     EDU  Education  holo     a credential is data
     WRK  Work       sodium   the physical city: shifts, halls, freight
     PRJ  Project    spectrum something built

   The shard carries only what the record already says: the class, the plain
   type word (so a recruiter still reads "Education"), the degree's
   "Graduated", and a serial made of the organisation's initials and the
   start date — "GU · 2026.05". Nothing on it is invented.

   On open, once, settling and never looping (transform and opacity only):
   the shard slides into the slot and seats with a one-pixel knock; the slot's
   lamp strikes; the contacts light one after another; the reader's line
   passes once over the record beside it (ReadLine) while the organisation
   decodes into place (DecodeText). Under reduced motion it is all simply
   there.
   --------------------------------------------------------------------------- */

type Kind = TimelineEntry["kind"];

const CLASS: Record<Kind, { lamp: string; ink: string; code: "education" | "work" | "project" }> = {
  education: { lamp: "var(--color-holo)", ink: "var(--color-holo)", code: "education" },
  work: { lamp: "var(--color-hazard)", ink: "var(--color-hazard)", code: "work" },
  project: { lamp: "var(--gradient-spectrum)", ink: "var(--spectrum-3)", code: "project" },
};

/** The class colour as a background (the project class is a ramp). */
export function shardLamp(kind: Kind): React.CSSProperties {
  const lamp = CLASS[kind].lamp;
  return lamp.includes("gradient") ? { backgroundImage: lamp } : { background: lamp };
}

/** Legal forms carry no identity: Oyu Tolgoi LLC is "OT". */
const LEGAL = new Set(["LLC", "ХХК", "Inc", "Inc.", "Ltd"]);

/**
 * The organisation's initials: the capitalised words of its name, before
 * any "·". "Mongolian University of Science and Technology" → MUST,
 * "Шинжлэх Ухаан, Технологийн Их Сургууль" → ШУТИС — the names they go by.
 */
export function initials(org: string): string {
  return org
    .split("·")[0]
    .split(/[\s,]+/)
    .filter((w) => w && !LEGAL.has(w) && /^\p{Lu}/u.test(w))
    .map((w) => w.charAt(0))
    .join("");
}

/** "2026.05", "2022.S" for a summer, "2020" for a bare year. */
function stamp(s: TimelineEntry["start"]): string {
  if (s.month) return `${s.year}.${String(s.month).padStart(2, "0")}`;
  if (s.season === "summer") return `${s.year}.S`;
  return String(s.year);
}

/** When the shard is seated, s after `play`: the read starts from here. */
export const SEAT_AT = 0.42;

export function Shard({
  entry,
  words,
  play,
  instant,
  className,
}: {
  entry: TimelineEntry;
  words: PathWords;
  play: boolean;
  instant: boolean;
  className?: string;
}) {
  const cls = CLASS[entry.kind];
  const label = words[cls.code];
  const code = words.shardCodes[entry.kind];
  const serial = `${initials(entry.org)} · ${stamp(entry.start)}`;
  const still = instant || !play;
  const t = (delay: number, duration: number) =>
    instant ? { duration: 0 } : { duration, delay, ease: EASE_EXPO };

  return (
    <div className={cn("relative flex w-fit items-center", className)}>
      {/* The slot: a rail open to the right, with its lamp on the lip. */}
      <span aria-hidden className="absolute -inset-y-[5px] -left-[5px] right-6 border-y border-l border-line-strong" />
      <motion.span
        aria-hidden
        className="absolute -left-[5px] top-1/2 h-4 w-[2px] -translate-y-1/2"
        style={{ ...shardLamp(entry.kind), boxShadow: `0 0 8px ${cls.ink}` }}
        initial={false}
        {...strike(play, instant, SEAT_AT, 0.5)}
      />

      <motion.div
        className="relative flex h-[3.25rem] items-stretch overflow-hidden [clip-path:polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,0_100%)]"
        style={{
          /* A chip's face: the class tint, a fine diagonal etch, and a lit
             top edge. */
          background:
            `linear-gradient(180deg, color-mix(in srgb, ${cls.ink} 16%, transparent), transparent 40%),` +
            `repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 5px),` +
            `color-mix(in srgb, ${cls.ink} 7%, #090a12)`,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${cls.ink} 42%, transparent), inset 0 1px 0 color-mix(in srgb, ${cls.ink} 75%, transparent)`,
        }}
        initial={false}
        animate={still && !instant ? { x: 28, y: 0, opacity: 0 } : { x: [28, 0, 0, 0], y: [0, 0, 1, 0], opacity: 1 }}
        transition={
          instant || still
            ? { duration: 0 }
            : {
                x: { duration: SEAT_AT, times: [0, 0.76, 0.88, 1], ease: EASE_EXPO, delay: 0.1 },
                y: { duration: SEAT_AT, times: [0, 0.76, 0.88, 1], delay: 0.1 },
                opacity: { duration: 0.18, delay: 0.1 },
              }
        }
      >
        {/* The contacts: the edge that goes into the reader. */}
        <span aria-hidden className="flex w-3.5 flex-col justify-center gap-[3px] border-r border-line pl-[4px]">
          {Array.from({ length: 6 }, (_, i) => (
            <motion.span
              key={i}
              className="h-[3px] w-[5px] bg-[#ffc56b]"
              initial={false}
              animate={{ opacity: still && !instant ? 0.18 : 1 }}
              transition={t(SEAT_AT + 0.05 + i * 0.04, 0.12)}
              style={{ boxShadow: still && !instant ? undefined : "0 0 4px rgba(255,170,60,0.7)" }}
            />
          ))}
        </span>

        <span className="flex flex-col justify-center gap-[3px] pl-3 pr-4">
          <span className="display-caps text-[1.15rem] leading-none text-fg">{code}</span>
          <span
            className={cn(
              "font-mono text-[0.625rem] uppercase leading-none tracking-[0.22em]",
              entry.kind === "project" && "spectrum-text"
            )}
            style={entry.kind === "project" ? undefined : { color: cls.ink }}
          >
            {label}
            {entry.note === "graduated" && <span className="text-fg/80"> · {words.graduated}</span>}
          </span>
        </span>

        <span aria-hidden className="tabular ml-auto flex items-end pb-[7px] pr-4 font-mono text-[0.625rem] tracking-[0.12em] text-faint">
          {serial}
        </span>
      </motion.div>
    </div>
  );
}

/**
 * The reader's line: one holo hairline passing down over the record beside
 * the shard, once, as it is read. Place inside a `relative` box.
 */
export function ReadLine({ play, instant }: { play: boolean; instant: boolean }) {
  if (instant) return null;
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-px"
      style={{
        background: "linear-gradient(90deg, transparent, var(--color-holo) 20%, var(--color-holo) 80%, transparent)",
        boxShadow: "0 0 12px 1px color-mix(in srgb, var(--color-holo) 55%, transparent)",
      }}
      initial={false}
      animate={play ? { top: ["0%", "100%"], opacity: [0, 0.9, 0.9, 0] } : { top: "0%", opacity: 0 }}
      transition={play ? { duration: 0.55, delay: SEAT_AT + 0.14, ease: [0.45, 0, 0.25, 1], opacity: { duration: 0.55, delay: SEAT_AT + 0.14, times: [0, 0.15, 0.8, 1] } } : { duration: 0 }}
    />
  );
}

/**
 * Text that decodes left to right when `play` turns on — through Latin or
 * Cyrillic look-alikes, whichever the text is — then holds. Written straight
 * to the node, never through React; the real string is the node's text at
 * rest, and in a visually hidden copy for assistive tech.
 */
export function DecodeText({
  text,
  play,
  instant,
  delay = SEAT_AT + 0.14,
  duration = 0.5,
  className,
}: {
  text: string;
  play: boolean;
  instant: boolean;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (instant || !play) {
      el.textContent = text;
      return;
    }
    let raf = 0;
    const t0 = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const p = (now - t0) / (duration * 1000);
      el.textContent = p >= 1 ? text : decode(text, Math.max(0, p), Math.floor(now / 45));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, play, instant, delay, duration]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden>
        {text}
      </span>
    </span>
  );
}
