"use client";

import { motion } from "framer-motion";
import type { BeatShow, UiStrings } from "@/lib/ui";
import { EASE_DEVELOP } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Words = UiStrings["anatomy"];

/**
 * The example the chapter runs through the pipeline. Invented for the
 * illustration and labelled so on screen ("Example input"): it is not a real
 * report, and no prediction is claimed for it. It carries "crash" so the rule
 * engine's override has something to fire on. Locale-free — Spotfixes reads
 * English bug reports.
 */
export const EXAMPLE = "Browser tab crashes when uploading a large file";
const KEYWORD = "crash";

/* Illustrative figures, labelled as such wherever they are drawn. */
const TOKENS: [string, number][] = [
  ["browser", 0.42],
  ["tab", 0.31],
  ["crashes", 0.88],
  ["uploading", 0.55],
  ["large", 0.24],
  ["file", 0.37],
];
const VOTES = ["S2", "S1", "S2", "S3", "S2", "S2", "S1", "S2", "S3", "S2", "S1", "S2"];
const MAJORITY = "S2";
/** A deterministic vector to draw (an LCG, so server and client agree). */
const VECTOR = (() => {
  let s = 1234567;
  return Array.from({ length: 40 }, () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return 0.15 + (s / 2147483648) * 0.85;
  });
})();

/**
 * The duplicate-detection example from the team's final presentation (the
 * "REQ 2.b" slide): a new bug and the two past reports it matched.
 * Locale-free, like EXAMPLE.
 */
export const DUPLICATE = {
  query: "Browser freezes when opening a PDF with more than 100 pages",
  matches: [
    { text: "App hangs on large PDF documents — memory spike observed", score: 0.92 },
    { text: "PDF viewer unresponsive after loading document over 80 pages", score: 0.78 },
  ],
};

/**
 * The confusion matrix from the final presentation ("Model Performance"), rows actual,
 * columns predicted. It sums to 225,658 — every record, the training split
 * included — which is why the chapter sets it beside the report's 89%.
 */
export const SEVERITIES = ["S1", "S2", "S3", "S4"] as const;
export const MATRIX = [
  [14374, 99, 119, 30],
  [236, 17327, 198, 51],
  [1748, 1140, 144217, 1476],
  [88, 32, 334, 44189],
];

/** A step's drawings, stacked in the order the step lists them. */
export function BeatDetail({ i, words, animate }: { i: number; words: Words; animate: boolean }) {
  const show = words.beats[i].show;
  return (
    <div className="space-y-7">
      {show.map((k) => (
        <Drawing key={k} k={k} words={words} animate={animate} />
      ))}
    </div>
  );
}

function Drawing({ k, words, animate }: { k: BeatShow; words: Words; animate: boolean }) {
  switch (k) {
    case "input":
      return <InputField words={words} animate={animate} />;
    case "access":
      return <Access words={words} animate={animate} />;
    case "forest":
      return <Forest words={words} animate={animate} />;
    case "override":
      return <Override words={words} animate={animate} />;
    case "neighbours":
      return <Neighbours words={words} animate={animate} />;
    case "timing":
      return <Timing words={words} animate={animate} />;
    case "measured":
      return <Measured words={words} animate={animate} />;
    case "usability":
      return <Usability words={words} />;
    case "fixes":
      return <Fixes words={words} animate={animate} />;
  }
}

/** Under a step's lead: the same thing without the jargon, in the team's own
 *  plain-language words from their slides. */
export function BeatNotes({ i, words, className }: { i: number; words: Words; className?: string }) {
  const b = words.beats[i];
  if (!b.plain) return null;
  return (
    <p className={cn("border-l-2 border-[var(--color-holo)] pl-4 text-base leading-relaxed text-fg/90", className)}>
      <span className="tag mr-2 text-[var(--color-holo)]">{words.plainLabel}</span>
      {b.plain}
    </p>
  );
}

/** Grows in from the left when animated; simply there otherwise. */
function Grow({ to, animate, delay = 0, className }: { to: number; animate: boolean; delay?: number; className?: string }) {
  return (
    <motion.span
      className={cn("block h-full origin-left", className)}
      initial={animate ? { scaleX: 0 } : false}
      animate={{ scaleX: to }}
      transition={{ duration: 0.7, delay, ease: EASE_DEVELOP }}
    />
  );
}

function Label({ children, tone = "faint" }: { children: React.ReactNode; tone?: "faint" | "holo" }) {
  return <span className={cn("micro", tone === "holo" && "!text-[var(--color-holo)]")}>{children}</span>;
}

function Illustrative({ words }: { words: Words }) {
  return <span className="tag ml-2 rounded-sm border border-line px-1.5 py-px text-faint">{words.illustrative}</span>;
}

function InputField({ words, animate }: { words: Words; animate: boolean }) {
  return (
    <div>
      <Label>{words.exampleLabel}</Label>
      <div className="mt-2 border border-line-strong bg-[color-mix(in_srgb,var(--color-bg)_70%,transparent)] px-4 py-3 font-mono text-base text-fg">
        <motion.span
          className="inline-block overflow-hidden align-bottom"
          initial={animate ? { clipPath: "inset(0 100% 0 0)" } : false}
          animate={{ clipPath: "inset(0 0% 0 0)" }}
          transition={{ duration: 1.1, ease: "linear" }}
        >
          {EXAMPLE}
        </motion.span>
        <span aria-hidden className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] bg-[var(--color-holo)]" />
      </div>
    </div>
  );
}

/** The three risks the security step guards against, and what stops each. */
function Access({ words, animate }: { words: Words; animate: boolean }) {
  const keys = ["S", "I", "E"] as const;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {keys.map((k, n) => {
        const r = words.risks[k];
        return (
          <motion.li
            key={k}
            className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-4 py-3"
            initial={animate ? { opacity: 0, x: -8 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.08 * n, ease: EASE_DEVELOP }}
          >
            <span className="tag pt-0.5 text-[var(--color-holo)]">{r.name}</span>
            <span className="min-w-0">
              <span className="block text-base leading-snug text-fg">{r.threat}</span>
              <span className="mt-0.5 block text-base leading-snug text-fg/80">→ {r.control}</span>
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}

function Forest({ words, animate }: { words: Words; animate: boolean }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <div className="flex flex-wrap items-center gap-y-1">
          <Label>{words.tokensLabel}</Label>
          <Illustrative words={words} />
        </div>
        <ul className="mt-3 space-y-2">
          {TOKENS.map(([w, v], n) => (
            <li key={w} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3">
              <span className="font-mono text-sm text-fg/90">{w}</span>
              <span className="h-2 bg-[var(--color-line)]">
                <Grow to={v} animate={animate} delay={0.05 * n} className="bg-[var(--color-holo)]" />
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-y-1">
          <Label>{words.votesLabel}</Label>
          <Illustrative words={words} />
        </div>
        <div className="mt-3 grid grid-cols-6 gap-1.5">
          {VOTES.map((v, n) => (
            <motion.span
              key={n}
              className={cn(
                "grid h-10 place-items-center border font-mono text-sm",
                v === MAJORITY
                  ? "border-[var(--color-holo)] text-[var(--color-holo)]"
                  : "border-line-strong text-muted"
              )}
              initial={animate ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 + 0.05 * n }}
            >
              {v}
            </motion.span>
          ))}
        </div>
        <p className="mt-3 flex items-baseline gap-3">
          <Label>{words.majority}</Label>
          <span className="display-caps text-3xl text-[var(--color-holo)]">{MAJORITY}</span>
        </p>
      </div>
    </div>
  );
}

/** The example with the keyword lit where the rule engine finds it. */
function Marked() {
  const at = EXAMPLE.toLowerCase().indexOf(KEYWORD);
  return (
    <>
      {EXAMPLE.slice(0, at)}
      <mark className="bg-[color-mix(in_srgb,var(--color-hazard)_22%,transparent)] px-0.5 text-[color-mix(in_srgb,var(--color-hazard)_55%,white)] [text-shadow:0_0_12px_color-mix(in_srgb,var(--color-hazard)_60%,transparent)]">
        {EXAMPLE.slice(at, at + KEYWORD.length)}
      </mark>
      {EXAMPLE.slice(at + KEYWORD.length)}
    </>
  );
}

function Override({ words, animate }: { words: Words; animate: boolean }) {
  return (
    <div>
      <p className="border border-line-strong px-4 py-3 font-mono text-base text-fg/90">
        <Marked />
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <span className="display-caps text-3xl text-muted line-through decoration-2">{MAJORITY}</span>
        <span aria-hidden className="font-mono text-muted">→</span>
        <motion.span
          className="display-caps text-5xl text-[var(--color-hazard)] [text-shadow:0_0_22px_color-mix(in_srgb,var(--color-hazard)_55%,transparent)]"
          initial={animate ? { opacity: 0, scale: 1.4 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.35, ease: EASE_DEVELOP }}
        >
          S1
        </motion.span>
        <span className="tag hud-brackets px-3 py-1 text-[var(--color-hazard)] [--hud-c:var(--color-hazard)]">
          {words.override} · {words.keyword}: “{KEYWORD}”
        </span>
      </div>
    </div>
  );
}

function Neighbours({ words, animate }: { words: Words; animate: boolean }) {
  const X = words.example2;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-y-1">
        <Label>{words.vectorLabel}</Label>
        <Illustrative words={words} />
      </div>
      <div className="mt-2 flex h-8 items-end gap-[3px]">
        {VECTOR.map((v, n) => (
          <motion.span
            key={n}
            className="w-full origin-bottom bg-[var(--color-holo)]"
            style={{ height: `${v * 100}%`, opacity: 0.35 + v * 0.65 }}
            initial={animate ? { scaleY: 0 } : false}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.4, delay: 0.012 * n }}
          />
        ))}
      </div>

      {/* The presentation's worked example: real wording, real scores. */}
      <p className="mt-5">
        <Label tone="holo">{X.label}</Label>
      </p>
      <div className="mt-2 border border-line-strong px-4 py-3">
        <p className="tag text-muted">{X.newBug}</p>
        <p className="mt-1 font-mono text-base text-fg">“{DUPLICATE.query}”</p>
      </div>
      <p className="tag mt-4 text-muted">{X.matches}</p>
      <ul className="mt-2 space-y-3">
        {DUPLICATE.matches.map((m, n) => (
          <li key={m.text}>
            <p className="text-base leading-snug text-fg/90">“{m.text}”</p>
            <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <span className="h-2 bg-[var(--color-line)]">
                <Grow to={m.score} animate={animate} delay={0.4 + 0.1 * n} className="bg-[var(--color-holo)]" />
              </span>
              <span className="tabular font-mono text-sm text-[var(--color-holo)]">
                {Math.round(m.score * 100)}% {X.similar}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Measured averages against the 5 s goal (report §15.2). */
function Timing({ words, animate }: { words: Words; animate: boolean }) {
  const T = words.timing;
  const bars: [string, number][] = [
    [T.prediction, 3.4],
    [T.similarity, 1.2],
  ];
  return (
    <div className="space-y-3">
      {bars.map(([k, s], n) => (
        <div key={k} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_4rem] items-center gap-3">
          <span className="micro">{k}</span>
          <span className="relative h-2 bg-[var(--color-line)]">
            <Grow to={s / 5} animate={animate} delay={0.15 * n} className="bg-[var(--color-holo)]" />
            <span aria-hidden className="absolute -top-1.5 right-0 h-5 w-px bg-[var(--color-hazard)]" />
          </span>
          <span className="tabular text-right font-mono text-base text-fg">
            {s} {T.unit}
          </span>
        </div>
      ))}
      <p className="tag text-right text-[var(--color-hazard)]">
        {T.target} &lt; 5 {T.unit}
      </p>
    </div>
  );
}

/** The cell's tint: log-scaled, since the counts run from 30 to 144,217. */
function tint(n: number) {
  const max = Math.log10(144217);
  return Math.round((Math.log10(Math.max(1, n)) / max) * 26);
}

/**
 * The model, measured: the report's figure first, then the presentation's
 * grid with what it does and doesn't show said beside it. The diagonal is
 * solid holo (right answers); everything off it is a low tint, so its light
 * text keeps its contrast.
 */
function Measured({ words, animate }: { words: Words; animate: boolean }) {
  const M = words.measured;
  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="flex flex-col-reverse">
          <span className="micro">{M.report.k}</span>
          <span className="display-caps tabular text-3xl text-fg">{M.report.v}</span>
        </div>
        <dl className="flex flex-wrap gap-x-5 gap-y-2">
          {M.metrics.map((m) => (
            <div key={m.k} className="flex flex-col-reverse">
              <dt className="tag text-muted">{m.k}</dt>
              <dd className="display-caps tabular text-xl text-[var(--color-holo)]">{m.v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="tag mt-2 text-[var(--color-holo)]">{M.scope}</p>

      <figure className="mt-2">
        <div aria-hidden className="grid grid-cols-[1.25rem_2.25rem_repeat(4,minmax(0,1fr))] gap-1">
          <span />
          <span />
          {SEVERITIES.map((s) => (
            <span key={s} className="tag pb-0.5 text-center text-muted">
              {s}
            </span>
          ))}
          {MATRIX.map((row, r) => (
            <MatrixRow key={r} r={r} row={row} words={words} animate={animate} />
          ))}
        </div>
        <figcaption className="tag mt-1 text-right text-muted">{M.predicted} →</figcaption>
        <MatrixTable words={words} />
      </figure>

      <p className="mt-2 text-sm leading-snug text-fg/85">
        {M.caveat} <span className="text-[var(--color-holo)]">{M.loop}</span>
      </p>
    </div>
  );
}

function MatrixRow({ r, row, words, animate }: { r: number; row: number[]; words: Words; animate: boolean }) {
  return (
    <>
      {r === 0 ? (
        <span className="row-span-4 flex items-center justify-center">
          <span className="tag -rotate-90 whitespace-nowrap text-muted">{words.measured.actual}</span>
        </span>
      ) : null}
      <span className="tag grid place-items-center text-muted">{SEVERITIES[r]}</span>
      {row.map((n, c) => {
        const diag = r === c;
        return (
          <motion.span
            key={c}
            title={words.measured.cell(SEVERITIES[r], SEVERITIES[c], n.toLocaleString("en-US"))}
            className={cn(
              "tabular grid h-8 place-items-center rounded-[3px] font-mono text-sm",
              diag ? "bg-[var(--color-holo)] font-bold text-[var(--color-void)]" : "text-fg"
            )}
            style={
              diag ? undefined : { background: `color-mix(in srgb, var(--color-holo) ${tint(n)}%, var(--color-void))` }
            }
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.04 * (r * 4 + c) }}
          >
            {n.toLocaleString("en-US")}
          </motion.span>
        );
      })}
    </>
  );
}

/** The grid as a table, for assistive tech. */
export function MatrixTable({ words }: { words: Words }) {
  const M = words.measured;
  return (
    <table className="sr-only">
      <caption>{M.caption}</caption>
      <thead>
        <tr>
          <th scope="col">
            {M.actual} / {M.predicted}
          </th>
          {SEVERITIES.map((s) => (
            <th key={s} scope="col">
              {s}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {MATRIX.map((row, r) => (
          <tr key={r}>
            <th scope="row">{SEVERITIES[r]}</th>
            {row.map((n, c) => (
              <td key={c}>{n.toLocaleString("en-US")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const PRIORITY_TONE = {
  critical: "var(--color-signal)",
  high: "var(--color-hazard)",
  medium: "var(--color-holo)",
  low: "var(--color-muted)",
} as const;

function Usability({ words }: { words: Words }) {
  const U = words.usability;
  return (
    <div className="border border-line-strong px-5 py-4">
      <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Label>{U.target}</Label>
        <span className="tag text-[var(--color-hazard)]">
          {U.result}: {U.status}
        </span>
      </p>
      <p className="mt-2 text-lg leading-snug text-fg">{U.targetText}</p>
      <dl className="mt-4 grid grid-cols-2 gap-5">
        {U.figures.map((f) => (
          <div key={f.k} className="flex flex-col-reverse">
            <dt className="mt-1 text-base leading-snug text-muted">{f.k}</dt>
            <dd className="display-caps tabular text-4xl leading-none text-fg">{f.v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-base leading-relaxed text-fg/85">{U.blockedBy}</p>
    </div>
  );
}

function Fixes({ words, animate }: { words: Words; animate: boolean }) {
  const U = words.usability;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {U.fixes.map((f, n) => (
        <motion.li
          key={f.problem}
          className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-2.5"
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.06 * n }}
        >
          <span className="tag pt-0.5" style={{ color: PRIORITY_TONE[f.priority] }}>
            {U.priority[f.priority]}
          </span>
          <span className="min-w-0">
            <span className="block text-base leading-snug text-fg">{f.problem}</span>
            <span className="mt-0.5 block text-base leading-snug text-fg/80">
              → {f.fix}
              <span className={cn("tag ml-2", f.open ? "text-[var(--color-hazard)]" : "text-[var(--color-holo)]")}>
                {f.open ? U.open : U.fixed}
              </span>
            </span>
          </span>
        </motion.li>
      ))}
    </ul>
  );
}
