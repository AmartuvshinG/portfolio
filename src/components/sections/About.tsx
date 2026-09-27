"use client";

import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { Reveal, RevealStagger } from "@/components/motion/Reveal";
import { fadeUp } from "@/lib/motion";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";

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

        {/* Signature. The name and role head it, and the three facts run the
            full measure beneath. */}
        <Reveal className="mt-20 md:mt-28" variants={fadeUp}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <span className="font-tech text-2xl font-bold uppercase md:text-3xl">
              {profile.fullName}
            </span>
            <span className="micro">{profile.role}</span>
          </div>
          <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {about.signature.map((s) => (
              <div key={s.k} className="liquid-glass flex flex-col gap-3 rounded-2xl p-6">
                <dt className="micro">{s.k}</dt>
                <dd className="font-tech text-xl font-semibold uppercase leading-tight">
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
