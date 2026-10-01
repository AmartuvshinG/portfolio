"use client";

import { useI18n } from "@/lib/i18n";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { UbClock } from "@/components/chrome/Navbar";
import { LedTicker } from "@/components/chrome/LedTicker";
import { Reveal } from "@/components/motion/Reveal";
import { Cta } from "@/components/ui/Cta";
import { InkSign } from "@/components/ui/InkSign";
import { Seal } from "@/components/ui/Seal";
import { IconArrowUp, IconReplay } from "@/components/ui/HudIcons";
import { replayIntro } from "@/lib/intro";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** The footage's makers, as their own components name them. */
const CITY = { name: "Guglielmo Giannattasio", via: "21st.dev", href: "https://www.guglielmogiannattasio.it" };
const STATION = { name: "yuraoak", via: "GitHub", href: "https://github.com/yuraoak/airlock-hero-assets" };

/**
 * The end of the reel.
 *
 * The site opened like a film — a slate, a scroll being written — so it ends
 * like one: the LED sign running the name as the house lights come up, then
 * end credits, set the way a film sets them, roles right-aligned against names
 * on a centre line. Every credit is a fact about how the site was made: who
 * designed and built it, the faces, the stack, and — owed since the film went
 * in — who made the two reels the backdrop is cut from. Then the seal, the
 * brushed name, and the house index for anyone who wants to go back in.
 *
 * Carries `data-act="void"` so the chrome above stays inverted to the bottom.
 */
export function Footer() {
  const { c, t } = useI18n();
  const { navLinks, socials, profile, contact } = c;
  const { scrollTo } = useSmoothScroll();
  const reduced = useReducedMotion();
  const year = new Date().getFullYear();
  const cr = t.footer.credits;

  const credits: { role: string; value: React.ReactNode }[] = [
    { role: cr.design, value: profile.fullName },
    { role: cr.type, value: "Michroma · Chakra Petch · Archivo · Rajdhani · JetBrains Mono · Noto Sans Mongolian" },
    { role: cr.built, value: "Next.js · React · Tailwind CSS · Framer Motion · GSAP · Lenis · WebGL" },
    {
      role: cr.city,
      value: (
        <a href={CITY.href} target="_blank" rel="noopener noreferrer" className="spectrum-underline">
          {CITY.name}
          <span className="text-muted"> — {cr.via} {CITY.via}</span>
          <span className="sr-only">{t.common.newTab}</span>
        </a>
      ),
    },
    {
      role: cr.station,
      value: (
        <a href={STATION.href} target="_blank" rel="noopener noreferrer" className="spectrum-underline">
          {STATION.name}
          <span className="text-muted"> — {cr.via} {STATION.via}</span>
          <span className="sr-only">{t.common.newTab}</span>
        </a>
      ),
    },
    { role: cr.base, value: profile.location },
  ];

  return (
    <footer data-act="void" className="relative z-10 overflow-hidden text-fg" aria-label={t.footer.aria}>
      {/* The intro's name again, as a lit street sign: his name in Mongol
          bichig running through a dot-matrix band (LedTicker). It steps only
          while on screen. */}
      <div className="border-y border-line py-6">
        <LedTicker />
      </div>

      {/* ---- the credits --------------------------------------------- */}
      <div className="relative mx-auto max-w-[1800px] px-5 pb-10 pt-24 md:px-8 md:pt-32">
        <InkSign
          tone="ghost"
          className="pointer-events-none absolute left-[4%] top-16 hidden h-[min(80%,34rem)] lg:block"
        />
        <Reveal className="flex flex-col items-center">
          <h2 className="micro tracking-[0.5em] !text-[var(--color-hazard)]">{cr.title}</h2>
          <span aria-hidden className="mt-4 h-10 w-px bg-gradient-to-b from-[var(--color-hazard)] to-transparent" />
        </Reveal>

        <dl className="mx-auto mt-10 grid max-w-4xl gap-y-6">
          {credits.map((row) => (
            <Reveal key={row.role} className="grid grid-cols-1 gap-1 text-center md:grid-cols-[1fr_1fr] md:gap-x-10 md:text-left">
              <dt className="micro md:text-right">{row.role}</dt>
              <dd className="font-tech text-base text-fg md:text-lg">{row.value}</dd>
            </Reveal>
          ))}
        </dl>

        <Reveal className="mt-20 flex flex-col items-center gap-6">
          <Seal className="h-12 w-12 opacity-90" />
          <p className="font-tech text-3xl text-fg md:text-4xl">{profile.fullName}</p>
          <a href={`mailto:${contact.email}`} className="spectrum-underline font-mono text-sm text-fg">
            {contact.email}
          </a>
        </Reveal>
      </div>

      {/* ---- the house index ------------------------------------------- */}
      <div className="mx-auto grid max-w-[1800px] gap-10 px-5 pb-12 pt-8 md:grid-cols-2 md:px-8">
        <FooterCol title={t.footer.index}>
          {navLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo(l.href);
                }}
                className="group inline-flex min-h-11 items-center gap-3 font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-fg md:min-h-0"
              >
                <span className="tabular text-faint transition-colors group-hover:text-[var(--color-hazard)]">{l.code}</span>
                {l.label}
              </a>
            </li>
          ))}
        </FooterCol>

        <FooterCol title={t.footer.elsewhere}>
          {socials.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-11 items-center justify-between gap-4 font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-fg md:min-h-0"
              >
                {s.label}
                {/* Revealed on hover — so on a touch screen, always shown, and
                    at full muted strength: at 60% it read 3-point-something:1. */}
                <span className="opacity-0 transition-opacity group-hover:opacity-60 [@media(hover:none)]:opacity-100">
                  {s.handle}
                </span>
              </a>
            </li>
          ))}
        </FooterCol>
      </div>

      {/* The last frame: room at the foot for the letterbox to close over
          without covering anything (lg+, where the matte exists). */}
      <div className="flex flex-col items-start justify-between gap-3 border-t border-line px-5 py-5 font-mono text-xs uppercase tracking-[0.2em] text-faint md:flex-row md:items-center md:px-8 lg:pb-[calc(1.25rem+5vh)]">
        <div className="flex flex-col gap-2">
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>
              © {year} {profile.fullName}
            </span>
            <UbClock className="flex" />
            <span
              aria-hidden
              lang="mn-Mong"
              className="font-script text-sm normal-case tracking-normal text-[color-mix(in_srgb,var(--color-hazard)_70%,transparent)]"
            >
              {profile.nameScript}
            </span>
          </span>
          {/* The trademark credit for the marks on the Signal panels. Sentence
              case and normal tracking: it is a sentence someone may actually
              need to read, not a HUD label. */}
          <span className="max-w-2xl font-sans text-xs normal-case leading-relaxed tracking-normal">
            {t.footer.credit}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* The film can be run again. Not under reduced motion, where
              there is no intro to run. */}
          {!reduced && (
            <Cta variant="secondary" onClick={replayIntro} icon={<IconReplay size={14} />} label={t.footer.replay} arrow={null} />
          )}
          <Cta variant="secondary" onClick={() => scrollTo(0)} icon={<IconArrowUp size={14} />} label={t.footer.top} arrow={null} />
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="micro mb-4">{title}</p>
      {/* Rows are 44px tap targets on a phone, so they carry their own
          spacing there; on desktop they are type-height again. */}
      <ul className="md:space-y-3">{children}</ul>
    </div>
  );
}
