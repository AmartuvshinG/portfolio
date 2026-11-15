"use client";

import { useEffect, useRef, useState } from "react";
import { iconStroke } from "@/lib/icon";
import { AnimatePresence, motion, useAnimationControls, useInView } from "framer-motion";
import { Briefcase, Clock, MapPin } from "lucide-react";
import { sectionIndex } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { ChapterSeam } from "@/components/chrome/ChapterSeam";
import { LinkedInMark } from "@/components/ui/BrandMarks";
import { InkSign } from "@/components/ui/InkSign";
import { IconCheck, IconCopy, IconMail } from "@/components/ui/HudIcons";
import { Cta } from "@/components/ui/Cta";
import { Seal } from "@/components/ui/Seal";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FrameLock } from "@/components/motion/FrameLock";
import { LocalClock } from "@/components/ui/LocalClock";
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
 * with the same thud. Under it, three plain facts in one line: where he
 * works now, when to expect a reply, and where he is.
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
      className="relative overflow-x-clip pb-24 pt-24 md:pb-36 md:pt-36"
      aria-label={t.contact.aria}
    >
      <ChapterSeam wipe />

      {/* The bookend: the hero's sign again, down the right margin, written
          in light once more as you arrive. Dimmer, so it never competes with
          the address. */}
      <InkSign
        tone="neon"
        lit="write"
        className="pointer-events-none absolute right-[1.5%] top-[14%] hidden h-[min(64vh,40rem)] opacity-40 xl:block"
      />

      <div className="relative mx-auto max-w-[112.5rem] px-5 md:px-8 lg:px-16">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader index={sectionIndex("#contact")} label={contact.heading} title={t.contact.title} chapter="#contact" />
          <p className="max-w-md text-lg leading-relaxed text-fg/85 md:text-right">{contact.lead}</p>
        </div>

        {/* The signal card: the address and the two ways in on the left, the
            live status on the right. Locks in like every card on the page. */}
        <FrameLock className="ct-card mt-14 md:mt-20">
          <div className="ct-main fl-in min-w-0" style={{ "--i": 0 } as React.CSSProperties}>
            <p className="tag text-[var(--color-rim)]">{t.contact.email}</p>

            {/* The address is the headline. It breaks anywhere rather than
                overflowing a phone, and the copy button sits on its baseline.
                The thud: the line dips a hair as the seal lands. Driven by
                controls, never by re-keying: a remount would take the Copy
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
              {/* His seal, pressed beside the address. */}
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
              {/* The ramp carries the colour and the label stays dark on it. */}
              <MagneticButton strength={0.25}>
                <Cta href={`mailto:${contact.email}`} icon={<IconMail size={15} />} label={t.contact.emailMe} className="h-12 px-7" />
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
          </div>

          {/* The status panel: what a recruiter checks before writing, as
              live readouts in the ID card's module style. */}
          <dl className="ct-status fl-in" style={{ "--i": 1 } as React.CSSProperties}>
            <div className="ct-row">
              <dt className="tag flex items-center gap-2">
                <span aria-hidden className="idc-lamp ct-lamp" />
                {t.about.now}
              </dt>
              <dd className="flex items-center gap-2.5">
                <Briefcase aria-hidden size={18} strokeWidth={iconStroke(18)} className="shrink-0 text-[var(--color-rim)]" />
                {contact.availability}
              </dd>
            </div>
            <div className="ct-row">
              <dt className="tag">{t.about.localTime}</dt>
              <dd className="flex items-center gap-2.5">
                <Clock aria-hidden size={18} strokeWidth={iconStroke(18)} className="shrink-0 text-[var(--color-rim)]" />
                <span>
                  <LocalClock className="text-fg" /> <span className="text-fg/80">· GMT+8</span>
                </span>
              </dd>
            </div>
            <div className="ct-row">
              <dt className="tag">{t.contact.reply}</dt>
              <dd>{t.contact.responseTime}</dd>
            </div>
            <div className="ct-row">
              <dt className="tag">{c.about.signature[3]?.k}</dt>
              <dd className="flex items-center gap-2.5">
                <MapPin aria-hidden size={18} strokeWidth={iconStroke(18)} className="shrink-0 text-[var(--color-rim)]" />
                {profile.location}
              </dd>
            </div>
          </dl>
        </FrameLock>
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
