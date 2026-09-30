"use client";

import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { Reveal, RevealStagger } from "@/components/motion/Reveal";
import { fadeUp } from "@/lib/motion";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { NeonSign } from "@/components/ui/NeonSign";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/**
 * Profile: the lead as a pull quote, three paragraphs, and a signature row.
 *
 * It sits on the same aurora as every other section. It used to carry its own
 * bloom wash and a portrait plate, which made it the one section with a
 * visibly different ground behind it.
 */
export function About() {
  const { c, t } = useI18n();
  const { about, profile } = c;
  const reduced = useReducedMotion();
  return (
    <section
      id="about"
      data-act="bloom"
      data-chapter="PROFILE"
      className="relative overflow-hidden py-24 text-fg md:py-36"
      aria-label={t.about.aria}
    >
      <ChapterSeam />

      <div className="relative mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <div className="grid gap-14 md:grid-cols-12">
          {/* Lead — set large in the serif, treated as a pull quote rather
              than as body copy with a heading over it. */}
          <Reveal className="md:col-span-7">
            <span className="micro">
              {sectionIndex("#about")} — {about.heading}
            </span>
            <h2 className="mt-6 font-tech text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.04]">
              {about.lead}
            </h2>
          </Reveal>

          <Reveal className="md:col-span-5 md:pt-24" delay={0.12}>
            <RevealStagger className="space-y-5">
              {about.paragraphs.map((p, i) => (
                <Reveal key={i} asChild variants={fadeUp}>
                  <p className="text-base leading-relaxed text-muted">{p}</p>
                </Reveal>
              ))}
            </RevealStagger>
          </Reveal>
        </div>

        {/* The dossier plate. It replaced three glass cards: one bracketed
            panel reads as a file on a person; three rounded cards read as a
            pricing table. Every value is already stated elsewhere on the page. */}
        <Reveal className="mt-20 md:mt-28" variants={fadeUp}>
          <div className="relative overflow-hidden border border-line bg-[#05060d]/60">
            {/* Own layer: .hud-brackets sets the `background` shorthand, and
                unlayered CSS would wipe the plate's fill if they shared a node. */}
            <span
              aria-hidden
              className="hud-brackets pointer-events-none absolute inset-0 z-20 [--hud-c:var(--color-hazard)] [--hud-l:14px] [--hud-w:2px]"
            />
            {/* One sodium scan down the plate as it arrives: a full-size layer
                with the line on its bottom edge, slid from -100% to 0. */}
            {!reduced && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                  background:
                    "linear-gradient(180deg, transparent calc(100% - 28px), color-mix(in srgb, var(--color-hazard) 18%, transparent) calc(100% - 2px), var(--color-hazard))",
                }}
                initial={{ y: "-100%", opacity: 1 }}
                whileInView={{ y: "0%", opacity: [1, 1, 0] }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 1.1, ease: [0.45, 0, 0.2, 1], opacity: { times: [0, 0.85, 1], duration: 1.1 } }}
              />
            )}

            <div className="relative p-6 md:p-10 md:pr-28">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <span className="micro text-[var(--color-hazard)]">
                  {t.about.file} · {sectionIndex("#about")}
                </span>
                <span className="micro">{profile.role}</span>
              </div>
              <p className="mt-5 font-display text-[clamp(1.5rem,3.2vw,3rem)] uppercase leading-none text-fg">
                {profile.fullName}
              </p>

              <dl className="mt-8 grid grid-cols-1 border-t border-line sm:grid-cols-2 lg:grid-cols-6">
                {[
                  ...about.signature.map((s) => ({ k: s.k, v: s.v, wide: false })),
                  { k: t.about.languages, v: t.about.languagesValue, wide: false },
                  { k: t.about.status, v: profile.status, wide: true },
                ].map((f) => (
                  <div
                    key={f.k}
                    className={cn(
                      "flex flex-col gap-2 border-b border-line py-5 sm:pr-6",
                      f.wide ? "sm:col-span-2 lg:col-span-2" : "lg:col-span-1"
                    )}
                  >
                    <dt className="micro">{f.k}</dt>
                    <dd className="font-tech text-lg font-semibold uppercase leading-tight text-fg">
                      {f.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* The name again, in Mongol bichig, hung down the plate's edge. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-20 items-center justify-center border-l border-line md:flex"
            >
              <NeonSign
                text={profile.nameScript}
                lit="view"
                tone="sodium"
                idle
                lang="mn-Mong"
                className="font-script text-[1.9rem] leading-none"
                style={{ writingMode: "vertical-lr" }}
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
