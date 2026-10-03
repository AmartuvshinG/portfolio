"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useInView } from "framer-motion";
import { Clock, MapPin } from "lucide-react";
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
import { MagneticButton } from "@/components/motion/MagneticButton";
import { ScriptLabel } from "@/components/ui/ScriptLabel";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { EASE_EXPO } from "@/lib/motion";

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
 * The address arrives letter by letter, each rising out of its own slot,
 * and its underline draws in from whichever side the pointer came from.
 * Copying it is answered the way the intro ends: his seal stamps beside it,
 * with the same thud. Under it, three plain facts in one line: open to
 * work, when to expect a reply, and where he is.
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

        <Reveal className="mt-16 min-w-0 border-t border-line pt-14">
          <p className="micro">{t.contact.email}</p>

          {/* The address is the headline. It breaks anywhere rather than
              overflowing a phone, and the copy button sits on its baseline.
              The thud: the line dips a hair as the seal lands. Driven by
              controls, never by re-keying — a remount would take the Copy
              button, and keyboard focus with it. */}
          <motion.div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3" animate={thud}>
            <Address email={contact.email} reduced={reduced} />
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

          {/* Three facts, one line: what a recruiter checks before writing. */}
          <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-base text-fg/90 md:text-lg">
            <li className="flex items-center gap-2.5">
              <span
                aria-hidden
                /* Steady, not blinking: an infinite animation keeps the page
                   producing frames even off screen. */
                className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-hazard)] shadow-[0_0_10px_var(--color-hazard)]"
              />
              {contact.availability}
            </li>
            <li className="flex items-center gap-2.5">
              <Clock aria-hidden size={18} className="shrink-0 text-[var(--color-holo)]" />
              {t.contact.responseTime}
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin aria-hidden size={18} className="shrink-0 text-[var(--color-holo)]" />
              {profile.location}
            </li>
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            {/* The ramp carries the colour and the label stays dark on it:
                bone on magenta is only ~3:1. */}
            <MagneticButton strength={0.25}>
              <Cta
                href={`mailto:${contact.email}`}
                icon={<IconMail size={15} />}
                label={t.contact.emailMe}
                className="h-12 px-7"
              />
            </MagneticButton>
            {linkedin && (
              <MagneticButton strength={0.25}>
                <Cta
                  variant="secondary"
                  href={linkedin.href}
                  external
                  icon={<LinkedInMark className="h-4 w-auto" />}
                  label={linkedin.label === "LINKEDIN" ? "LinkedIn" : linkedin.label}
                  className="h-12 px-6"
                />
              </MagneticButton>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * The address as a mailto link. Each letter rises out of its own slot, in a
 * wave, the first time it is seen; the underline draws in from the side the
 * pointer entered on. The letters are decoration — the whole address is a
 * visually hidden text node inside the link, so it is read once, whole.
 */
function Address({ email, reduced }: { email: string; reduced: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const [from, setFrom] = useState<"left" | "right">("left");
  return (
    <a
      ref={ref}
      href={`mailto:${email}`}
      onPointerEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setFrom(e.clientX - r.left < r.width / 2 ? "left" : "right");
      }}
      className="group relative min-w-0 break-all pb-[0.12em] font-tech text-[clamp(1.75rem,4.6vw,4rem)] font-semibold leading-[1.05] text-fg"
    >
      <span className="sr-only">{email}</span>
      <span aria-hidden>
        {Array.from(email).map((ch, i) => (
          <span key={i} className="inline-block overflow-hidden align-bottom">
            <motion.span
              className="inline-block"
              initial={reduced ? false : { y: "105%" }}
              animate={reduced || seen ? { y: "0%" } : undefined}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.022, ease: EASE_EXPO }}
            >
              {ch}
            </motion.span>
          </span>
        ))}
      </span>
      {/* Resting: a faint ramp. Hovered or focused: the full ramp, drawn in
          from the pointer's side. */}
      <span aria-hidden className="spectrum-rule absolute inset-x-0 bottom-0 h-[0.08em] opacity-30" />
      <span
        aria-hidden
        className="spectrum-rule absolute inset-x-0 bottom-0 h-[0.08em] scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100"
        style={{ transformOrigin: from }}
      />
    </a>
  );
}
