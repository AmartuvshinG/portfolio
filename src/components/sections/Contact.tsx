"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Copy, Mail } from "lucide-react";
import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { Reveal } from "@/components/motion/Reveal";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { LinkedInMark } from "@/components/ui/BrandMarks";
import { NeonSign } from "@/components/ui/NeonSign";
import { InkSign } from "@/components/ui/InkSign";

/**
 * The closing block: the address, large, and the two ways in.
 *
 * There used to be a contact form here. With no backend it could only hand a
 * draft to the visitor's mail app, which on webmail-only or managed machines —
 * most recruiters — does nothing at all, and even when it worked it asked them
 * to write in a box on this page rather than in their own inbox. What a
 * recruiter actually does is copy the address or open LinkedIn, so those are
 * the whole block now: the email set as the headline act with a copy button,
 * then mail and LinkedIn as buttons, and when to expect a reply.
 */
export function Contact() {
  const { c, t } = useI18n();
  const { contact, profile, socials } = c;
  const linkedin = socials.find((s) => s.mark === "linkedin");
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.email);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* Clipboard refused (insecure context, permissions): the address is
         right there as text and as a mailto link, so there is nothing to add. */
    }
  };

  return (
    <section
      id="contact"
      data-act="void"
      data-chapter="CONTACT"
      className="relative overflow-hidden pb-24 pt-24 md:pb-36 md:pt-36"
      aria-label={t.contact.aria}
    >
      <ChapterSeam wipe />

      {/* The hero's sign again, unlit: a ghost of the name in Mongol bichig
          down the right margin, behind the astronaut. */}
      <InkSign
        tone="ghost"
        className="pointer-events-none absolute right-[1.5%] top-[14%] hidden h-[min(64vh,40rem)] md:block"
      />

      <div className="relative mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <Reveal className="flex flex-col gap-4">
          <span className="micro kicker-plate w-fit">
            {sectionIndex("#contact")} — {contact.heading}
          </span>
          <h2 className="display-caps text-[clamp(1.9rem,6vw,6rem)] text-fg">
            {/* The bookend to the hero: the last sign on the street lights as
                you reach it. */}
            <NeonSign text={t.contact.title} lit="view" />
          </h2>
          <p className="max-w-2xl font-tech text-2xl leading-snug text-fg md:text-3xl">
            {contact.lead}
          </p>
        </Reveal>

        <div className="mt-16 grid gap-14 border-t border-line pt-14 lg:grid-cols-12">
          <Reveal className="min-w-0 lg:col-span-8">
            <p className="micro">{t.contact.email}</p>

            {/* The address is the headline. It breaks anywhere rather than
                overflowing a phone, and the copy button sits on its baseline. */}
            <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3">
              <a
                href={`mailto:${contact.email}`}
                className="spectrum-underline min-w-0 break-all font-tech text-[clamp(1.75rem,4.6vw,4rem)] font-semibold leading-[1.05] text-fg"
              >
                {contact.email}
              </a>
              <button
                type="button"
                onClick={copy}
                className="liquid-glass mb-1 flex h-11 shrink-0 items-center gap-2 rounded-full px-4 font-mono text-xs uppercase tracking-[0.16em] text-fg transition-transform duration-200 hover:scale-[1.03]"
              >
                {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                {copied ? t.contact.copied : t.contact.copy}
              </button>
              <span aria-live="polite" className="sr-only">
                {copied ? t.contact.copiedLive(contact.email) : ""}
              </span>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href={`mailto:${contact.email}`}
                style={{ backgroundImage: "var(--gradient-spectrum)" }}
                /* The ramp carries the colour and the label stays dark on it:
                   bone on magenta is only ~3:1. */
                className="chamfer-sm flex items-center gap-3 px-7 py-3.5 font-mono text-xs uppercase tracking-[0.2em] text-void transition-transform duration-300 hover:scale-[1.03]"
              >
                <Mail size={15} aria-hidden />
                {t.contact.emailMe}
              </a>
              {linkedin && (
                <a
                  href={linkedin.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="liquid-glass group flex items-center gap-3 rounded-full px-6 py-3.5 font-mono text-xs uppercase tracking-[0.2em] text-fg transition-transform duration-300 hover:scale-[1.03]"
                >
                  <LinkedInMark className="h-4 w-auto" />
                  LinkedIn
                  <ArrowUpRight size={14} aria-hidden className="text-muted group-hover:text-fg" />
                  <span className="sr-only">{t.common.newTab}</span>
                </a>
              )}
            </div>
          </Reveal>

          <Reveal className="lg:col-span-4" delay={0.1}>
            <dl className="grid gap-8 sm:grid-cols-3 lg:grid-cols-1">
              <div>
                <dt className="micro">{t.contact.availability}</dt>
                <dd className="mt-2 font-tech text-xl font-semibold uppercase text-fg">
                  {contact.availability}
                </dd>
              </div>
              <div>
                <dt className="micro">{t.contact.response}</dt>
                <dd className="mt-2 font-tech text-xl font-semibold uppercase text-fg">
                  {t.contact.responseTime}
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
        </div>
      </div>
    </section>
  );
}
