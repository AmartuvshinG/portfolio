"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { Reveal } from "@/components/motion/Reveal";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { LinkedInMark } from "@/components/ui/BrandMarks";
import { NeonSign } from "@/components/ui/NeonSign";
import { InkSign } from "@/components/ui/InkSign";
import { IconCheck, IconCopy, IconMail } from "@/components/ui/HudIcons";
import { Cta } from "@/components/ui/Cta";
import { Seal } from "@/components/ui/Seal";
import { UbClock } from "@/components/chrome/Navbar";
import { ScriptLabel } from "@/components/ui/ScriptLabel";
import { useReducedMotion } from "@/hooks/useReducedMotion";

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
 *
 * Copying the address is answered the way the intro ends: his seal stamps
 * beside it, with the same thud. The facts beside it are a status board —
 * availability on a lamp, the reply window, the base, and the time it is
 * there now (so a recruiter in another zone knows whether he is awake).
 */
export function Contact() {
  const { c, t } = useI18n();
  const { contact, profile, socials } = c;
  const linkedin = socials.find((s) => s.mark === "linkedin");
  const [copied, setCopied] = useState(false);
  /* Each copy stamps again, so the seal is keyed by a count, not the flag. */
  const [stamps, setStamps] = useState(0);
  const reduced = useReducedMotion();
  const thud = useAnimationControls();
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.email);
      setCopied(true);
      setStamps((n) => n + 1);
      if (!reduced) void thud.start({ y: [0, 0, 2, 0], transition: { duration: 0.42, times: [0, 0.38, 0.55, 1] } });
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

      {/* The bookend: the hero's sign again, down the right margin, written
          in light once more as you arrive — dimmer, a sign further down the
          street, so it never competes with the address. */}
      <InkSign
        tone="neon"
        lit="write"
        className="pointer-events-none absolute right-[1.5%] top-[14%] hidden h-[min(64vh,40rem)] opacity-45 md:block"
      />

      <div className="relative mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <Reveal className="relative flex flex-col gap-4">
          <ScriptLabel href="#contact" />
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
            {/* The thud: the line dips a hair as the seal lands. Driven by
                controls, never by re-keying — a remount would take the Copy
                button, and keyboard focus with it. */}
            <motion.div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3" animate={thud}>
              <a
                href={`mailto:${contact.email}`}
                className="spectrum-underline min-w-0 break-all font-tech text-[clamp(1.75rem,4.6vw,4rem)] font-semibold leading-[1.05] text-fg"
              >
                {contact.email}
              </a>
              <Cta
                variant="secondary"
                onClick={copy}
                className="mb-1 shrink-0"
                icon={copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                label={copied ? t.contact.copied : t.contact.copy}
              />
              <span aria-live="polite" className="sr-only">
                {copied ? t.contact.copiedLive(contact.email) : ""}
              </span>
              {/* His seal, pressed beside the address: falls in large, lands
                  with the intro's ease, holds while "Copied" does. */}
              <AnimatePresence>
                {copied && (
                  <motion.span
                    key={stamps}
                    aria-hidden
                    className="mb-1 block h-12 w-12 shrink-0 md:h-14 md:w-14"
                    initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.5, rotate: -14 }}
                    animate={{ opacity: 0.95, scale: 1, rotate: -6 }}
                    exit={{ opacity: 0, transition: { duration: 0.5 } }}
                    transition={{ duration: 0.16, ease: [0.55, 0, 0.9, 0.4] }}
                  >
                    <Seal className="h-full w-full" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            <div className="mt-10 flex flex-wrap gap-3">
              {/* The ramp carries the colour and the label stays dark on it:
                  bone on magenta is only ~3:1. */}
              <Cta
                href={`mailto:${contact.email}`}
                icon={<IconMail size={15} />}
                label={t.contact.emailMe}
                className="h-12 px-7"
              />
              {linkedin && (
                <Cta
                  variant="secondary"
                  href={linkedin.href}
                  external
                  icon={<LinkedInMark className="h-4 w-auto" />}
                  label="LinkedIn"
                  className="h-12 px-6"
                />
              )}
            </div>
          </Reveal>

          <Reveal className="lg:col-span-4" delay={0.1}>
            {/* The status board: a readout, so its values are lit in holo;
                the one lamp, on availability, is sodium — the site's
                "available" call. */}
            <div className="relative border border-line bg-[#061317]/60 px-5 py-4">
              <span
                aria-hidden
                className="hud-brackets pointer-events-none absolute inset-0 [--hud-c:color-mix(in_srgb,var(--color-holo)_70%,transparent)] [--hud-l:10px]"
              />
              <p className="micro mb-3">{t.contact.board}</p>
              <dl className="divide-y divide-line">
                {[
                  { k: t.contact.availability, v: contact.availability, lamp: true },
                  { k: t.contact.response, v: t.contact.responseTime, lamp: false },
                  { k: t.contact.based, v: profile.location, lamp: false },
                ].map((row) => (
                  <div key={row.k} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-baseline gap-4 py-3">
                    <dt className="micro">{row.k}</dt>
                    <dd className="flex items-baseline gap-2 font-mono text-sm uppercase leading-snug tracking-[0.08em] text-[var(--color-holo)]">
                      {row.lamp && (
                        <span
                          aria-hidden
                          /* Steady, not blinking: an infinite animation keeps
                             the page producing frames even off screen. */
                          className="h-1.5 w-1.5 shrink-0 -translate-y-px rounded-full bg-[var(--color-hazard)] shadow-[0_0_8px_var(--color-hazard)]"
                        />
                      )}
                      {row.v}
                    </dd>
                  </div>
                ))}
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-baseline gap-4 py-3">
                  <dt className="micro">{t.contact.localTime}</dt>
                  <dd className="font-mono text-sm">
                    {/* Aria-hidden ticking digits; the row's label is enough
                        and nobody needs the seconds read out. */}
                    <UbClock className="flex [&_span:last-child]:!text-[var(--color-holo)]" />
                  </dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
