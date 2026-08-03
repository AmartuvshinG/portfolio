"use client";

import { ArrowUp } from "lucide-react";
import { navLinks, socials, profile, contact } from "@/lib/content";
import { useSmoothScroll } from "@/components/layout/SmoothScroll";
import { GlitchText } from "@/components/motion/GlitchText";
import { cn } from "@/lib/utils";

export function Footer() {
  const { scrollTo } = useSmoothScroll();
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-line-strong bg-surface/40">
      {/* Marquee wordmark */}
      <div className="overflow-hidden border-b border-line py-6">
        <div className="animate-marquee flex shrink-0 items-center gap-8 whitespace-nowrap">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="font-display text-6xl font-black uppercase text-faint md:text-8xl"
            >
              {profile.wordmark} <span className="text-cyan">/</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-10 px-5 py-14 md:grid-cols-[2fr_1fr_1fr] md:px-8">
        {/* Brand + CTA */}
        <div>
          <GlitchText
            text={profile.wordmark}
            as="p"
            className="font-display text-4xl font-black text-fg"
          />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {profile.role} — {profile.discipline}.
          </p>
          <a
            href={`mailto:${contact.email}`}
            className="mt-6 inline-block border-b border-cyan/40 pb-1 font-mono text-sm text-cyan transition-colors hover:border-cyan"
          >
            {contact.email}
          </a>
        </div>

        {/* Sitemap */}
        <FooterCol title="INDEX">
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

        {/* Socials */}
        <FooterCol title="CHANNELS">
          {socials.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-4 font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-fg"
              >
                {s.label}
                <span className="text-cyan opacity-0 transition-opacity group-hover:opacity-100">
                  {s.handle}
                </span>
              </a>
            </li>
          ))}
        </FooterCol>
      </div>

      {/* Status bar. Extra bottom padding clears the fixed console dock so the
          last line of the page is never sitting underneath it. */}
      <div className="flex flex-col items-start justify-between gap-3 border-t border-line px-5 py-4 pb-24 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-faint md:flex-row md:items-center md:px-8 md:pb-4 md:pr-8 lg:pb-24">
        <span>
          © {year} {profile.fullName} — ALL SYSTEMS NOMINAL
        </span>
        <span className="flex items-center gap-4">
          <span>LAT 00.000 / LON 00.000</span>
          <button
            type="button"
            onClick={() => scrollTo(0)}
            className={cn(
              "flex items-center gap-2 border border-line px-3 py-1.5 text-muted transition-colors hover:border-cyan hover:text-cyan"
            )}
          >
            <ArrowUp size={12} /> TOP
          </button>
        </span>
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
      <p className="hud-label mb-4 text-cyan/70">{title}</p>
      <ul className="space-y-3">{children}</ul>
    </div>
  );
}
