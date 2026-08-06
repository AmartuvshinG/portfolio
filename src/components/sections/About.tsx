import Image from "next/image";
import { about, profile } from "@/lib/content";
import { Reveal, RevealStagger } from "@/components/motion/Reveal";
import { fadeUp } from "@/lib/motion";

/**
 * The lavender interstitial — KPR's flat-colour chapter.
 *
 * Its job is structural rather than informational: after a full viewport of
 * paper, a saturated flat is what tells the eye a chapter ended. The copy could
 * sit on paper and lose nothing; the *break* is the point, and it's also what
 * earns the drop into the dark work world two sections later by establishing
 * that this site changes colour when it changes subject.
 */
export function About() {
  return (
    <section
      id="about"
      data-act="flat"
      data-chapter="PROFILE"
      className="relative overflow-hidden bg-bg py-24 text-fg md:py-36"
      aria-label="Profile"
    >
      <div className="mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <div className="grid gap-14 md:grid-cols-12">
          {/* Lead — set large in the serif, treated as a pull quote rather
              than as body copy with a heading over it. */}
          <Reveal className="md:col-span-7">
            <span className="micro">01 — {about.heading}</span>
            <h2 className="mt-6 font-editorial text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.04]">
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
            <div className="notch-card relative aspect-[5/6] w-full overflow-hidden bg-black/10">
              <Image
                src="https://picsum.photos/seed/amara-operator/900/1120"
                alt={`Portrait of ${profile.fullName}`}
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-display text-lg font-bold uppercase">
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
                  className="flex flex-col gap-3 bg-bg p-6"
                >
                  <dt className="micro">{s.k}</dt>
                  <dd className="font-display text-xl font-semibold uppercase leading-tight">
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
