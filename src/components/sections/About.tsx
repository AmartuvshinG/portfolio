"use client";

import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { PortraitPlate } from "@/components/ui/PortraitPlate";
import { Reveal, RevealStagger } from "@/components/motion/Reveal";
import { fadeUp } from "@/lib/motion";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";

/**
 * The charged interstitial — the one chromatic ground on the site.
 *
 * Its job is structural rather than informational: after a full viewport of
 * near-black, a ground that visibly holds colour is what tells the eye a
 * chapter ended. The copy could sit on the base void and lose nothing; the
 * *break* is the point, and it is what earns the drop into the work world two
 * sections later by establishing that this site shifts when it changes subject.
 *
 * This used to be a flat lavender panel. Flat colour is the one thing the
 * palette rule forbids, so the shift is carried by a bloom over a deep violet-
 * black instead — same structural beat, without a second palette appearing for
 * one section and then never again.
 */
export function About() {
  const { c, t } = useI18n();
  const { about, profile } = c;
  return (
    <section
      id="about"
      data-act="bloom"
      data-chapter="PROFILE"
      className="relative overflow-hidden py-24 text-fg md:py-36"
      aria-label={t.about.aria}
    >
      <ChapterSeam />

      {/* The charge. Sits under everything and bleeds past all four edges so it
          never resolves into a shape with a boundary. */}
      <div
        aria-hidden
        /* A radial wash, not a 90px-blurred animated layer.
           This was `spectrum-bloom … animate-drift blur-[90px]`, and the two
           halves compounded: `spectrum-drift` animates `scale`, and scaling a
           blurred element forces the browser to re-run the 90px gaussian over a
           full-bleed surface on every frame of a 34-second loop, forever. It
           was the largest single stall on the page. It is also redundant now —
           the global backdrop already charges this act via `u_act`, and this
           was a second bloom painted on top of the first. */
        className="spectrum-bloom pointer-events-none absolute -inset-x-[10%] -inset-y-[20%] opacity-40"
      />

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

        {/* Portrait band + signature. The photo is a wide crop rather than a
            portrait one so it reads as a spread across the flat, not as a
            second attempt at the hero. */}
        <div className="mt-20 grid gap-10 md:mt-28 md:grid-cols-12 md:items-end">
          <Reveal className="md:col-span-5" variants={fadeUp}>
            <div className="notch-card relative aspect-[5/6] w-full overflow-hidden bg-void/40">
              <PortraitPlate alt={t.about.portrait(profile.fullName)} />
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-tech text-lg font-bold uppercase">
                {profile.fullName}
              </span>
              <span className="micro">{profile.role}</span>
            </div>
          </Reveal>

          <Reveal className="md:col-span-7" variants={fadeUp} delay={0.1}>
            <dl className="grid grid-cols-1 gap-px border border-current/15 bg-current/15 sm:grid-cols-3">
              {about.signature.map((s) => (
                <div
                  key={s.k}
                  className="flex flex-col gap-3 bg-surface p-6"
                >
                  <dt className="micro">{s.k}</dt>
                  <dd className="font-tech text-xl font-semibold uppercase leading-tight">
                    {s.v}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
