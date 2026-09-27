"use client";

import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { ContactForm } from "@/components/ui/ContactForm";
import { Reveal } from "@/components/motion/Reveal";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";

/**
 * The closing block: the base void, with the ramp rising off the bottom edge.
 *
 * The page opened on the void and lifted through its middle, so dropping back
 * to it here closes the loop the work world opened rather than introducing a
 * third idea. This bloom is the one place the ramp is allowed real estate — it
 * is a wash behind everything, never a colour anything is set in.
 */
export function Contact() {
  const { c, t } = useI18n();
  const { contact, profile } = c;
  return (
    <section
      id="contact"
      data-act="void"
      data-chapter="CONTACT"
      className="relative overflow-hidden pb-24 pt-24 md:pb-36 md:pt-36"
      aria-label={t.contact.aria}
    >
      <ChapterSeam wipe />

      <div className="relative mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <Reveal className="flex flex-col gap-4">
          <span className="micro">
            {sectionIndex("#contact")} — {contact.heading}
          </span>
          <h2 className="display-caps text-[clamp(1.9rem,6vw,6rem)] text-fg">
            {t.contact.title}
          </h2>
          <p className="max-w-lg font-tech text-2xl leading-snug text-fg md:text-3xl">
            {contact.lead}
          </p>
        </Reveal>

        <div className="mt-16 grid gap-14 border-t border-line pt-14 md:grid-cols-12">
          <Reveal className="md:col-span-5">
            <dl className="space-y-8">
              <div>
                <dt className="micro">{t.contact.email}</dt>
                <dd className="mt-2">
                  <a
                    href={`mailto:${contact.email}`}
                    className="spectrum-underline font-tech text-xl font-semibold text-fg md:text-2xl"
                  >
                    {contact.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="micro">{t.contact.availability}</dt>
                <dd className="mt-2 font-tech text-xl font-semibold uppercase text-fg">
                  {contact.availability}
                </dd>
              </div>
              <div>
                <dt className="micro">{t.contact.based}</dt>
                <dd className="mt-2 font-tech text-xl font-semibold uppercase text-fg">
                  {profile.location}
                </dd>
              </div>
            </dl>
          </Reveal>

          <Reveal className="md:col-span-7" delay={0.1}>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
