"use client";

import { ArrowUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";

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
      {/* Marquee wordmark. Set in the outline weight rather than solid: at 8rem
          a filled wordmark is heavier than the closing headline above it and
          steals the last word of the page. */}
      <div className="overflow-hidden border-y border-line py-6">
        <div className="animate-marquee flex shrink-0 items-center gap-10 whitespace-nowrap">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="display-caps text-4xl text-transparent md:text-6xl"
              /* Hard-coded, and the one place on the site that is. This used to
                 read `var(--color-faint)`, and when that token was lifted for
                 contrast (2.59:1 → 5.08:1) the stroke came with it — nearly
                 double the luminance on a 6rem wordmark, which is exactly the
                 "steals the last word of the page" failure the comment above
                 describes. The contrast rule does not apply here: this is
                 decorative repetition of the wordmark, not text anyone reads.
                 The old faint value, frozen. */
              style={{ WebkitTextStroke: "1px #4d5166" }}
            >
              {profile.wordmark} —
            </span>
          ))}
        </div>
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
                className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-fg"
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
                className="group flex items-center justify-between gap-4 font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-fg"
              >
                {s.label}
                <span className="opacity-0 transition-opacity group-hover:opacity-60">
                  {s.handle}
                </span>
              </a>
            </li>
          ))}
        </FooterCol>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 border-t border-line px-5 py-5 font-mono text-[0.8125rem] uppercase tracking-[0.2em] text-faint md:flex-row md:items-center md:px-8">
        <div className="flex flex-col gap-2">
          <span>
            © {year} {profile.fullName}
          </span>
          {/* The trademark credit for the marks on the Signal panels. Sentence
              case and normal tracking: it is a sentence someone may actually
              need to read, not a HUD label. */}
          <span className="max-w-2xl font-sans text-[0.8125rem] normal-case leading-relaxed tracking-normal">
            {t.footer.credit}
          </span>
        </div>
        <button
          type="button"
          onClick={() => scrollTo(0)}
          /* `h-11`, not `py-2` — the padded box came out at ~34px. The border
             is the visible shape, so the height goes on the box and the
             padding stays where it was. */
          className="flex h-11 items-center gap-2 rounded-full border border-line px-4 transition-colors hover:border-current hover:text-fg"
        >
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
      <ul className="space-y-3">{children}</ul>
    </div>
  );
}
