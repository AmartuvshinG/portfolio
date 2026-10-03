"use client";

import { motion } from "framer-motion";
import type { UiStrings } from "@/lib/ui";
import { EASE_DEVELOP } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Words = UiStrings["anatomy"];
type Stride = keyof Words["threats"];

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
const NEIGHBOURS = [0.86, 0.71, 0.63];

/** The beats that carry a drawing. Copy alone for the rest. */
export function BeatDetail({ i, words, animate }: { i: number; words: Words; animate: boolean }) {
  switch (i) {
    case 0:
      return <InputField words={words} animate={animate} />;
    case 1:
      return <Threats keys={["S", "D"]} words={words} animate={animate} />;
    case 2:
      return <Threats keys={["T", "I", "E", "R"]} words={words} animate={animate} />;
    case 3:
      return <Forest words={words} animate={animate} />;
    case 4:
      return <Override words={words} animate={animate} />;
    case 5:
      return <Neighbours words={words} animate={animate} />;
    case 6:
      return <Result words={words} animate={animate} />;
    case 7:
      return <Alternatives words={words} animate={animate} />;
    case 8:
      return <Usability words={words} animate={animate} />;
    default:
      return null;
  }
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
  return (
    <span className="ml-2 rounded-sm border border-line px-1.5 py-px font-mono text-[0.625rem] uppercase tracking-[0.16em] text-faint">
      {words.illustrative}
    </span>
  );
}

function InputField({ words, animate }: { words: Words; animate: boolean }) {
  return (
    <div>
      <Label>{words.exampleLabel}</Label>
      <div className="mt-2 border border-line-strong bg-[color-mix(in_srgb,var(--color-bg)_70%,transparent)] px-4 py-3 font-mono text-[0.9375rem] text-fg">
        <motion.span
          className="inline-block overflow-hidden whitespace-nowrap align-bottom"
          initial={animate ? { clipPath: "inset(0 100% 0 0)" } : false}
          animate={{ clipPath: "inset(0 0% 0 0)" }}
          transition={{ duration: 1.1, ease: "linear" }}
        >
          {EXAMPLE}
        </motion.span>
        <span aria-hidden className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] bg-[var(--color-holo)]" />
      </div>
      <p className="mt-3 font-mono text-xs tracking-[0.12em] text-[var(--color-holo)]">POST /analyze_bug</p>
    </div>
  );
}

function Threats({ keys, words, animate }: { keys: Stride[]; words: Words; animate: boolean }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {keys.map((k, n) => (
        <motion.li
          key={k}
          className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 py-2.5"
          initial={animate ? { opacity: 0, x: -8 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.08 * n, ease: EASE_DEVELOP }}
        >
          <span className="grid h-8 w-8 place-items-center border border-[var(--color-holo)] font-mono text-sm font-bold text-[var(--color-holo)]">
            {k}
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-faint">{words.stride[k]}</p>
            <p className="mt-0.5 text-[0.9375rem] leading-snug text-fg">{words.threats[k].threat}</p>
            <p className="mt-0.5 text-sm leading-snug text-[var(--color-holo)]">→ {words.threats[k].control}</p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

function Forest({ words, animate }: { words: Words; animate: boolean }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <div className="flex items-center">
          <Label>{words.tokensLabel}</Label>
          <Illustrative words={words} />
        </div>
        <ul className="mt-2 space-y-1.5">
          {TOKENS.map(([w, v], n) => (
            <li key={w} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3">
              <span className="font-mono text-xs text-fg/80">{w}</span>
              <span className="h-1.5 bg-[var(--color-line)]">
                <Grow to={v} animate={animate} delay={0.05 * n} className="bg-[var(--color-holo)]" />
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="flex items-center">
          <Label>{words.votesLabel}</Label>
          <Illustrative words={words} />
        </div>
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {VOTES.map((v, n) => (
            <motion.span
              key={n}
              className={cn(
                "grid h-8 place-items-center border font-mono text-xs",
                v === MAJORITY
                  ? "border-[var(--color-holo)] text-[var(--color-holo)]"
                  : "border-line-strong text-faint"
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
          <span className="display-caps text-2xl text-[var(--color-holo)]">{MAJORITY}</span>
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
      <p className="border border-line-strong px-4 py-3 font-mono text-[0.9375rem] text-fg/85">
        <Marked />
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <span className="display-caps text-3xl text-faint line-through decoration-2">{MAJORITY}</span>
        <span aria-hidden className="font-mono text-faint">→</span>
        <motion.span
          className="display-caps text-5xl text-[var(--color-hazard)] [text-shadow:0_0_22px_color-mix(in_srgb,var(--color-hazard)_55%,transparent)]"
          initial={animate ? { opacity: 0, scale: 1.4 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.35, ease: EASE_DEVELOP }}
        >
          S1
        </motion.span>
        <span className="hud-brackets px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-hazard)] [--hud-c:var(--color-hazard)]">
          {words.override} · {words.keyword}: “{KEYWORD}”
        </span>
      </div>
    </div>
  );
}

function Neighbours({ words, animate }: { words: Words; animate: boolean }) {
  return (
    <div>
      <div className="flex items-center">
        <Label>{words.vectorLabel}</Label>
        <Illustrative words={words} />
      </div>
      <div className="mt-2 flex h-10 items-end gap-[3px]">
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
      <p className="mt-5">
        <Label>{words.neighbours}</Label>
      </p>
      <ul className="mt-2 space-y-2">
        {NEIGHBOURS.map((v, n) => (
          <li key={n} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3">
            <span className="font-mono text-xs text-fg/80">{words.pastReport(n + 1)}</span>
            <span className="h-1.5 bg-[var(--color-line)]">
              <Grow to={v} animate={animate} delay={0.4 + 0.1 * n} className="bg-[var(--color-holo)]" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Result({ words, animate }: { words: Words; animate: boolean }) {
  const R = words.result;
  const T = words.timing;
  const bars: [string, number][] = [
    [T.prediction, 3.4],
    [T.similarity, 1.2],
  ];
  return (
    <div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1.5 border border-line-strong px-4 py-3">
        <dt className="micro self-center">{R.severity}</dt>
        <dd className="display-caps text-2xl text-[var(--color-hazard)]">S1</dd>
        <dt className="micro self-center">{R.keywords}</dt>
        <dd className="font-mono text-sm text-[var(--color-hazard)]">{KEYWORD}</dd>
        <dt className="micro self-center">{R.confidence}</dt>
        <dd className="text-sm text-fg/80">{R.confidenceValue}</dd>
        <dt className="micro self-center">{R.team}</dt>
        <dd className="self-center">
          <span className="block h-1.5 w-24 bg-[var(--color-line-strong)]" />
        </dd>
        <dt className="micro self-center">{R.similar}</dt>
        <dd className="font-mono text-sm text-fg">3</dd>
      </dl>

      {/* Measured averages against the 5 s target (report §15.2). */}
      <div className="mt-5 space-y-2.5">
        {bars.map(([k, s], n) => (
          <div key={k} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3.5rem] items-center gap-3">
            <span className="micro">{k}</span>
            <span className="relative h-2 bg-[var(--color-line)]">
              <Grow to={s / 5} animate={animate} delay={0.15 * n} className="bg-[var(--color-holo)]" />
              <span aria-hidden className="absolute -top-1.5 right-0 h-5 w-px bg-[var(--color-hazard)]" />
            </span>
            <span className="tabular text-right font-mono text-sm text-fg">
              {s} {T.unit}
            </span>
          </div>
        ))}
        <p className="text-right font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--color-hazard)]">
          {T.target} &lt; 5 {T.unit}
        </p>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
        {words.extras.map((e) => (
          <div key={e.k} className="flex flex-col-reverse">
            <dt className="micro">{e.k}</dt>
            <dd className="display-caps tabular text-xl text-fg">{e.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Alternatives({ words, animate }: { words: Words; animate: boolean }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {words.alternatives.map((a, n) => (
        <motion.li
          key={a.name}
          className="py-3"
          initial={animate ? { opacity: 0, x: -8 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.08 * n, ease: EASE_DEVELOP }}
        >
          <p className="flex flex-wrap items-baseline justify-between gap-x-4">
            <span className="font-tech text-lg font-semibold uppercase tracking-wide text-fg/90 line-through decoration-[var(--color-faint)] decoration-1">
              {a.name}
            </span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-faint">{words.notChosen}</span>
          </p>
          <p className="mt-1 text-[0.9375rem] leading-snug text-fg/75">{a.why}</p>
        </motion.li>
      ))}
    </ul>
  );
}

const PRIORITY_TONE = {
  critical: "var(--color-signal)",
  high: "var(--color-hazard)",
  medium: "var(--color-holo)",
  low: "var(--color-faint)",
} as const;

function Usability({ words, animate }: { words: Words; animate: boolean }) {
  const U = words.usability;
  return (
    <div>
      <div className="border border-line-strong px-4 py-3">
        <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <Label>{U.target}</Label>
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-hazard)]">
            {U.result}: {U.status}
          </span>
        </p>
        <p className="mt-1 text-[0.9375rem] leading-snug text-fg">{U.targetText}</p>
        <dl className="mt-3 grid grid-cols-2 gap-4">
          {U.figures.map((f) => (
            <div key={f.k} className="flex flex-col-reverse">
              <dt className="mt-0.5 text-xs leading-snug text-muted">{f.k}</dt>
              <dd className="display-caps tabular text-2xl leading-none text-fg">{f.v}</dd>
            </div>
          ))}
        </dl>
        {/* The fixes below name the same two bugs: on a short screen this
            line is the one to give up. */}
        <p className="mt-3 text-sm leading-snug text-fg/75 md:[@media(max-height:820px)]:hidden">{U.blockedBy}</p>
      </div>

      <p className="mt-4">
        <Label>{U.fixesLabel}</Label>
      </p>
      <ul className="mt-1 divide-y divide-line border-b border-line">
        {U.fixes.map((f, n) => (
          <motion.li
            key={f.problem}
            className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-1.5"
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.06 * n }}
          >
            <span
              className="pt-[3px] font-mono text-[0.625rem] uppercase tracking-[0.14em]"
              style={{ color: PRIORITY_TONE[f.priority] }}
            >
              {U.priority[f.priority]}
            </span>
            <span className="min-w-0 text-[0.8125rem] leading-snug">
              <span className="text-fg">{f.problem}</span>
              <span className="text-fg/60"> → {f.fix}</span>
              <span
                className={cn(
                  "ml-2 font-mono text-[0.625rem] uppercase tracking-[0.14em]",
                  f.open ? "text-[var(--color-hazard)]" : "text-[var(--color-holo)]"
                )}
              >
                {f.open ? U.open : U.fixed}
              </span>
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
