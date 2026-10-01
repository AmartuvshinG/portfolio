"use client";

import { ArrowUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { UbClock } from "@/components/chrome/Navbar";
import { LedTicker } from "@/components/chrome/LedTicker";

/**
 * Footer, continuing the dark closing act — it carries `data-act="void"` so the
 * chrome above it stays inverted all the way to the bottom of the document
 * instead of snapping a step lighter over a black background.
 */
export function Footer() {
  const { c, t } = useI18n();
  const { navLinks, socials, profile, contact } = c;
  const { scrollTo } = useSmoothScroll();
  const year = new Date().getFullYear();

  return (
    <footer
      data-act="void"
      className="relative z-10 text-fg"
      aria-label={t.footer.aria}
    >
      {/* The intro's LED sign again, as the closing ticker: his name in Mongol
          bichig running through a dot-matrix band (LedTicker). It replaced an
          outlined-wordmark marquee. It steps only while on screen. */}
      <div className="border-y border-line py-6">
        <LedTicker />
      </div>

      <div className="mx-auto grid max-w-[1800px] gap-10 px-5 py-14 md:grid-cols-[2fr_1fr_1fr] md:px-8">
        <div>
          <p className="font-tech text-4xl text-fg">{profile.fullName}</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {profile.role} — {profile.discipline}.
          </p>
          <a
            href={`mailto:${contact.email}`}
            className="spectrum-underline mt-6 inline-block font-mono text-sm text-fg"
          >
            {contact.email}
          </a>
        </div>

        <FooterCol title={t.footer.index}>
          {navLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo(l.href);
                }}
                className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-fg md:min-h-0"
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

      <div className="flex flex-col items-start justify-between gap-3 border-t border-line px-5 py-5 font-mono text-xs uppercase tracking-[0.2em] text-faint md:flex-row md:items-center md:px-8">
        <div className="flex flex-col gap-2">
          {/* The closing status line: the site signs off the way the nav
              opened it — the lamp, the local time, the name in its script. */}
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
        <button
          type="button"
          onClick={() => scrollTo(0)}
          /* `h-11`, not `py-2` — the padded box came out at ~34px. The border
             is the visible shape, so the height goes on the box and the
             padding stays where it was. */
          className="group relative flex h-11 items-center gap-2 rounded-full border border-line px-4 transition-colors hover:border-current hover:text-fg"
        >
          <span
            aria-hidden
            className="hud-brackets pointer-events-none absolute -inset-1.5 scale-110 opacity-0 transition-[opacity,transform] duration-200 [--hud-c:var(--color-hazard)] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
          />
          <ArrowUp size={12} /> {t.footer.top}
        </button>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="micro mb-4">{title}</p>
      {/* Rows are 44px tap targets on a phone, so they carry their own
          spacing there; on desktop they are type-height again. */}
      <ul className="md:space-y-3">{children}</ul>
    </div>
  );
}
