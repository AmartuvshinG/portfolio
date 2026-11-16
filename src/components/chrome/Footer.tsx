"use client";

import { useI18n } from "@/lib/i18n";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { FrameLock } from "@/components/motion/FrameLock";
import { MARK_D, MARK_T } from "@/components/chrome/NavGlyphs";
import { LedTicker } from "@/components/chrome/LedTicker";
import { Reveal } from "@/components/motion/Reveal";
import { Cta } from "@/components/ui/Cta";
import { InkSign } from "@/components/ui/InkSign";
import { Seal } from "@/components/ui/Seal";
import { IconReplay } from "@/components/ui/HudIcons";
import { replayIntro } from "@/lib/intro";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** The three loops behind the page (backdrop/VideoGround). */
const FOOTAGE = [
  { name: "Futuristic City", by: "Infinite Visual", href: "https://www.youtube.com/@infinite.visual" },
  { name: "Black Hole", by: "3rdeyeview", href: "https://www.youtube.com/watch?v=mNcM7Sl0_CY" },
  { name: "Purple Classic Galaxy", by: "AA-VFX", href: "https://www.youtube.com/watch?v=eTD0WWFIDAg" },
];
/** The preloader's halftone and the hero menu's stages follow the Vinyl
    Halftone Preloader; the arc of work cards follows Cue's Chained Spring Arc
    Carousel; the glass mark reveal is ported from zanwei/glass-icon-reveal. */
const GROUND = { name: "Vinyl Halftone Preloader · Chained Spring Arc Carousel · glass-icon-reveal", via: "21st.dev · Cue · GitHub" };
/** The Path's globe is Natural Earth's land, lakes and borders, baked (scripts/bake-globe-mask). */
const MAP = { name: "Natural Earth", href: "https://www.naturalearthdata.com" };

/**
 * The end of the reel.
 *
 * The site opened like a film, so it ends like one: the LED sign running the
 * name, then end credits on one frame-locked card, roles right-aligned against
 * names on a centre line, each row rising in as the roll scrolls up. Every
 * credit is a fact about how the site was made: who designed and built it, the
 * faces, the stack, and where the footage, components and map data come from.
 * Then the seal and the name, the contents and the links, and the ᠠ to go
 * back to the top.
 *
 * Carries `data-act="void"` so the chrome above stays inverted to the bottom.
 */
export function Footer() {
  const { c, t } = useI18n();
  const { navLinks, socials, profile } = c;
  const { goTo } = useSmoothScroll();
  const reduced = useReducedMotion();
  const year = new Date().getFullYear();
  const cr = t.footer.credits;

  const credits: { role: string; value: React.ReactNode }[] = [
    { role: cr.design, value: profile.fullName },
    { role: cr.type, value: "Big Shoulders · Chakra Petch · Archivo · Rajdhani · JetBrains Mono · Noto Sans Mongolian" },
    { role: cr.built, value: "Next.js · React · Tailwind CSS · Framer Motion · GSAP · Lenis · WebGL" },
    {
      role: cr.footage,
      value: (
        <>
          {FOOTAGE.map((f) => (
            <span key={f.name} className="block">
              {f.name}
              <span className="cr-by">
                {" — "}
                <a href={f.href} target="_blank" rel="noopener noreferrer" className="spectrum-underline">
                  {f.by}
                  <span className="sr-only">{t.common.newTab}</span>
                </a>
              </span>
                          </span>
          ))}
        </>
      ),
    },
    {
      role: cr.ground,
      value: (
        <>
          {GROUND.name}
          <span className="cr-by"> — {cr.via} {GROUND.via}</span>
        </>
      ),
    },
    {
      role: cr.map,
      value: (
        <a href={MAP.href} target="_blank" rel="noopener noreferrer" className="spectrum-underline">
          {MAP.name}
          <span className="sr-only">{t.common.newTab}</span>
        </a>
      ),
    },
  ];

  return (
    <footer data-act="void" className="relative z-10 overflow-hidden pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] text-fg" aria-label={t.footer.aria}>
      {/* The intro's name again, as a lit street sign: his name in Mongol
          bichig running through a dot-matrix band (LedTicker). It steps only
          while on screen. */}
      <div className="hidden border-y border-line py-6 md:block">
        <LedTicker />
      </div>

      {/* ---- the credits --------------------------------------------- */}
      <div className="relative mx-auto max-w-[112.5rem] px-5 pb-10 pt-24 md:px-8 md:pt-32">
        <InkSign
          tone="ghost"
          className="pointer-events-none absolute left-[4%] top-16 hidden h-[min(80%,34rem)] lg:block"
        />
        <Reveal className="cr-head hidden md:flex">
          <h2 className="cr-title">{cr.title}</h2>
          <span aria-hidden className="cr-rule" />
        </Reveal>

        <FrameLock as="div" className="cr-roll hidden md:block">
          <dl className="m-0">
            {credits.map((row, i) => (
              <div key={row.role} className="cr-row fl-in" style={{ "--i": Math.min(i, 6) } as React.CSSProperties}>
                <dt className="tag">{row.role}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </FrameLock>

        <Reveal className="mt-20 flex flex-col items-center gap-6">
          <Seal className="h-12 w-12 opacity-90" />
          <p className="font-tech text-3xl text-fg md:text-4xl">{profile.fullName}</p>

        </Reveal>
      </div>

      {/* ---- the house index ------------------------------------------- */}
      <div className="mx-auto grid max-w-[112.5rem] gap-10 px-5 pb-12 pt-8 md:grid-cols-2 md:px-8">
        <FooterCol title={t.footer.index}>
          {navLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(l.href);
                }}
                className="ft-link"
              >
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
                className="ft-link w-full justify-between"
              >
                {s.label}
                <span className="hidden normal-case tracking-normal text-fg/80 md:inline">{s.handle}</span>
              </a>
            </li>
          ))}
        </FooterCol>
      </div>

      {/* The last frame: room at the foot for the letterbox to close over
          without covering anything (lg+, where the matte exists). */}
      <div className="flex flex-col items-start justify-between gap-5 border-t border-line px-5 py-6 md:flex-row md:items-center md:px-8 lg:pb-[calc(1.5rem+5vh)]">
        <div className="flex flex-col gap-3">
          <span className="ft-base flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>
              © {year} {profile.fullName}
            </span>

            <span aria-hidden lang="mn-Mong" className="font-script text-base normal-case tracking-normal text-[var(--color-rim)]">
              {profile.nameScript}
            </span>
          </span>
          {/* The trademark credit: a sentence someone may actually need to
              read, so sentence case at the 14px floor. */}
          <span className="hidden max-w-2xl text-sm leading-relaxed text-fg/80 md:block">{t.footer.credit}</span>
          <details className="max-w-2xl text-sm leading-relaxed text-fg/80 md:hidden">
            <summary className="min-h-11 cursor-pointer py-3">{cr.title}</summary>
            <p>{t.footer.credit}</p>
          </details>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* The film can be run again. Not under reduced motion, where
              there is no intro to run. */}
          {!reduced && (
            <Cta variant="secondary" onClick={replayIntro} icon={<IconReplay size={14} />} label={t.footer.replay} arrow={null} />
          )}
          <button type="button" className="ft-top" onClick={() => goTo(0)} aria-label={t.footer.top}>
            <svg viewBox="0 0 32 32" aria-hidden>
              <path d={MARK_D} transform={MARK_T} fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="tag mb-4 text-[var(--color-rim)]">{title}</p>
      {/* Rows are 44px tap targets on a phone, so they carry their own
          spacing there; on desktop they are type-height again. */}
      <ul className="md:space-y-3">{children}</ul>
    </div>
  );
}
