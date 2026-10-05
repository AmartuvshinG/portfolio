"use client";

import { useEffect, useState } from "react";
import { iconStroke } from "@/lib/icon";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { Capability } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { caseHash, openCase } from "@/lib/caseFile";
import { ICONS } from "@/components/ui/CapabilityCard";
import { techLabel } from "@/components/ui/TechMarks";
import { ToolChips } from "@/components/ui/LogoDock";
import { CourseChips } from "@/components/ui/CourseChips";
import { pad } from "@/lib/utils";

/*
 * Craft on a phone. The wide-screen sideways track that used to live here was
 * replaced by CraftIndex (recoverable from git at
 * checkpoint/descent-film-2026-09-30); the phone's standing-card stack, by
 * CraftList (2026-10-05).
 */

/**
 * Phones: the six capabilities as a list, one open at a time. Each row closes
 * to its number, its title and the tools it uses in plain words, so the whole
 * section reads at a glance; a tap opens the rest. The rows used to be full
 * cards that stood up as they rose, each taller than the screen and only
 * upright once its middle reached the screen's: the reader always saw half a
 * card leaning back with the next one arriving under it, and six cards'
 * worth of scroll-linked transforms ran on the main thread. Nothing here
 * moves with the scroll but a one-off rise per row, on the compositor
 * (globals.css `.craft-row`). `<details name>` makes the accordion exclusive
 * without any script.
 */
export function CraftList({ items }: { items: Capability[] }) {
  const { c, t } = useI18n();
  return (
    <ol className="mt-12 flex flex-col gap-3">
      {items.map((item, i) => {
        const Icon = ICONS[item.icon];
        const proof = item.proof ? c.projects.find((p) => p.slug === item.proof) : undefined;
        const tools = item.stack.map((k) => techLabel(k, t.craft.tools));
        return (
          <li key={item.code} className="craft-row">
            <details name="craft" className="group liquid-glass overflow-hidden rounded-[20px]">
              <summary className="flex min-h-11 cursor-pointer list-none items-start gap-4 p-5 [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-fg ring-1 ring-inset ring-line-strong"
                  style={{
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, var(--spectrum-1) 30%, transparent), color-mix(in srgb, var(--spectrum-3) 20%, transparent))",
                  }}
                >
                  <Icon size={22} strokeWidth={iconStroke(22)} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex items-baseline gap-3">
                    <span className="micro tabular !text-fg/70">{pad(i + 1)}</span>
                    <span className="font-tech text-xl font-bold uppercase leading-tight text-fg text-balance">
                      {item.title}
                    </span>
                  </span>
                  <span className="text-[0.9375rem] leading-snug text-muted">{tools.join(" · ")}</span>
                </span>
                <ChevronDown
                  size={20}
                  strokeWidth={iconStroke(20)}
                  aria-hidden
                  className="mt-3 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180"
                />
              </summary>

              <div className="border-t border-line px-5 pb-6 pt-5">
                <p className="text-base leading-relaxed text-fg/85">{item.description}</p>
                {item.courses && item.courses.length > 0 && (
                  <div className="mt-5">
                    <p className="micro mb-2">{t.craft.studied}</p>
                    <CourseChips codes={item.courses} compact />
                  </div>
                )}
                <p className="micro mb-3 mt-5">{t.craft.stack}</p>
                <ToolChips keys={item.stack} labels={t.craft.tools} size="sm" />
                {proof && (
                  <a
                    href={caseHash(proof.slug)}
                    onClick={(e) => {
                      e.preventDefault();
                      openCase(proof.slug);
                    }}
                    className="mt-6 flex min-h-11 items-center justify-between gap-4 border-t border-line pt-5"
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="micro">{t.craft.proven}</span>
                      <span className="font-tech text-lg font-semibold uppercase leading-snug text-fg">{proof.title}</span>
                    </span>
                    <ArrowRight size={20} strokeWidth={iconStroke(20)} aria-hidden className="shrink-0 text-muted" />
                  </a>
                )}
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

/** Below `md`, the list; the pin needs a row's width to be worth it. */
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
