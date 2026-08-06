"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { navLinks, profile, contact } from "@/lib/content";
import { useSmoothScroll } from "@/components/layout/SmoothScroll";
import { useLockScroll } from "@/hooks/useLockScroll";
import { cn } from "@/lib/utils";

/**
 * Editorial header, on KPR's model: wordmark left, chapter rail centred, a
 * single signal-coloured CTA right. No glass, no chamfer, no telemetry — the
 * old HUD command bar is gone.
 *
 * Everything here is coloured from `currentColor` / `--color-*`, which means it
 * inverts automatically as ActTheme swaps `<html data-act>` and the dark work
 * world passes underneath. That inversion is the whole reason the header can
 * stay transparent instead of hiding behind a scrim.
 */
export function Navbar() {
  const { scrollTo } = useSmoothScroll();
  const [active, setActive] = useState("#hero");
  const [open, setOpen] = useState(false);

  useLockScroll(open);

  /* Active-chapter tracking. Fires on the same 50% line the ChapterFrame uses,
     so the rail dot and the corner numbering never disagree. */
  useEffect(() => {
    const sections = navLinks
      .map((l) => document.querySelector<HTMLElement>(l.href))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) setActive(`#${hit.target.id}`);
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    scrollTo(href);
  };

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[60] text-fg transition-colors duration-[620ms]">
        {/* Barely-there scrim. The header is transparent by design, but content
            scrolls under it at every act and a dense card grid passing beneath
            the wordmark is unreadable without something to separate them.
            Fades from the current act's own background, so it is invisible as
            a band and only ever reads as the header having a little air. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-28 opacity-90"
          style={{
            background:
              "linear-gradient(180deg, var(--color-bg) 15%, transparent 100%)",
          }}
        />
        <div className="relative mx-auto flex max-w-[1800px] items-start justify-between px-5 py-5 md:px-8 md:py-6 lg:px-16">
          {/* Wordmark — stacked, tight, Lando's lockup */}
          <a
            href="#hero"
            onClick={go("#hero")}
            className="pointer-events-auto -my-1 leading-[0.82]"
            aria-label={`${profile.wordmark} — back to top`}
          >
            <span className="block font-editorial text-2xl tracking-tight md:text-[1.75rem]">
              {profile.fullName.split(" ")[0]}
            </span>
            <span className="block font-display text-xl font-extrabold uppercase tracking-tight md:text-[1.4rem]">
              {profile.fullName.split(" ")[1] ?? profile.role}
            </span>
          </a>

          {/* Chapter rail */}
          <nav
            aria-label="Chapters"
            className="pointer-events-auto hidden lg:block"
          >
            <ul className="flex items-center gap-7">
              {navLinks.map((link) => {
                const isActive = active === link.href;
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={go(link.href)}
                      aria-current={isActive ? "true" : undefined}
                      className="group relative flex items-center gap-2 py-1"
                    >
                      {/* The dot only exists on the active item and is animated
                          between them by layoutId — one element sliding along
                          the rail, not six fading in and out. */}
                      <span className="relative h-1.5 w-1.5">
                        {isActive && (
                          <motion.span
                            layoutId="chapter-dot"
                            className="absolute inset-0 rounded-full bg-signal"
                            transition={{
                              type: "spring",
                              stiffness: 380,
                              damping: 32,
                            }}
                          />
                        )}
                      </span>
                      <span
                        className={cn(
                          "micro !text-current transition-opacity duration-300",
                          isActive
                            ? "opacity-100"
                            : "opacity-45 group-hover:opacity-80"
                        )}
                      >
                        {link.label}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="pointer-events-auto flex items-center gap-3">
            {/* The one signal-filled element on screen. Lime on ink is 17:1;
                the label is ink-on-lime here, never lime-on-paper. */}
            <a
              href="#contact"
              onClick={go("#contact")}
              className="hidden rounded-full bg-signal px-5 py-2.5 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink transition-transform duration-300 hover:scale-[1.04] sm:block"
            >
              Available
            </a>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="chapter-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-current/25 lg:hidden"
            >
              <span className="relative block h-3 w-4">
                <span
                  className={cn(
                    "absolute left-0 h-px w-full bg-current transition-transform duration-300",
                    open ? "top-1/2 rotate-45" : "top-0"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 h-px w-full bg-current transition-transform duration-300",
                    open ? "top-1/2 -rotate-45" : "bottom-0"
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile chapter menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="chapter-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[59] bg-bg lg:hidden"
          >
            <nav
              aria-label="Chapters"
              className="flex h-full flex-col justify-center px-6"
            >
              <ul>
                {navLinks.map((link, i) => (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.06 * i,
                      duration: 0.5,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="border-b border-line"
                  >
                    <a
                      href={link.href}
                      onClick={go(link.href)}
                      className="flex items-baseline gap-4 py-4"
                    >
                      <span className="micro tabular w-8 shrink-0">
                        {link.code}
                      </span>
                      <span className="display-caps text-[13vw] text-fg">
                        {link.label}
                      </span>
                    </a>
                  </motion.li>
                ))}
              </ul>
              <a
                href={`mailto:${contact.email}`}
                className="micro mt-10 !text-current opacity-60"
              >
                {contact.email}
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
