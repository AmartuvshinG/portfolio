"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { navLinks as sectionLinks, type NavLink } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { LangToggle } from "@/components/chrome/LangToggle";
import { isCaseHash } from "@/lib/caseFile";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { useOverlay } from "@/hooks/useOverlay";
import { cn } from "@/lib/utils";
import { Monogram } from "@/components/chrome/NavGlyphs";
import { InkSign } from "@/components/ui/InkSign";
import { useScramble } from "@/hooks/useScramble";

/**
 * The HUD.
 *
 * No bar and no capsule: the chrome sits *in the frame*, the way a camera's
 * readout does. The wordmark holds the top-left corner; the chapter index
 * holds the top-right. Past the fold a dark scrim
 * fades in behind them (no backdrop-filter — a blur on fixed chrome is a tax on
 * every scroll frame), and at a chapter cut the letterbox's top bar closes in
 * behind the row, so the HUD ends up printed on the matte.
 *
 * The links: a mono index and a wide-tracked label. Hover draws a hairline out
 * from the left with a little sodium light under it, and the label decodes
 * through its own script (useScramble). The section you are in carries the
 * live hairline, which slides between links on a `layoutId`. Scroll progress
 * lives in the chapter spine at the right edge (ChapterFrame), not here.
 *
 * Kept from the capsule, each a fix rather than a taste:
 *
 * 1. **The row is a container query context.** Its contents are `nowrap`; the
 *    wordmark gives way as the row narrows, and the breakpoints are measured
 *    against the row, not the viewport.
 * 2. **It knows what page it is on.** The section observer can only work on the
 *    home route; everywhere else the active item comes from the pathname.
 * 3. **Deep links re-land** while the page is still growing (see below).
 */
export function Navbar() {
  const { c, t, locale } = useI18n();
  const { navLinks, profile, contact } = c;
  /* Where the full link row takes over from the menu sheet. Mongolian labels
     run ~40% longer, so Mongolian keeps the sheet until 1280.
     Written out in full because Tailwind only sees literal class names. */
  const mn = locale === "mn";
  const deskQuery = mn ? "(min-width: 1280px)" : "(min-width: 1080px)";
  const { scrollTo } = useSmoothScroll();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [scrolled, setScrolled] = useState(false);
  const [observed, setObserved] = useState<string | null>("#hero");
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const closeSheet = useCallback(() => setOpen(false), []);

  /* The sheet is a real modal — same trap, restore and lock as the dossier and
     the palette. See the sheet's own markup for why it has a header of its own. */
  useOverlay({
    open,
    onClose: closeSheet,
    ref: sheetRef,
    restoreFocus: toggleRef,
  });

  /* The site is one route. Off it (a 404) there is nothing to observe, and no
     active link at all is the correct answer. */
  const active = isHome ? observed : null;

  /* The scrim past the fold. One boolean, flipped at most twice a gesture. */
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 100);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Active-chapter tracking. Home only, and rebuilt when the route changes. */
  useEffect(() => {
    if (!isHome) return;
    /* The static list, not the translated one: only the hrefs are read, and
       they are the same in every language — depending on the translated
       array would tear the observer down on every language switch. */
    const sections = sectionLinks
      .map((l) => document.querySelector<HTMLElement>(l.href))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) setObserved(`#${hit.target.id}`);
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isHome]);

  /* Arriving from another route with a hash: Lenis owns the scroll position and
     does not act on the browser's own hash jump, so the page lands at the top
     with the right URL. One frame later, put it where it was asked to go. */
  useEffect(() => {
    const hash = window.location.hash;
    /* `#case=…` belongs to the case-file host, and is not a valid selector —
       `querySelector` would throw on the `=`. Look up plain ids only. */
    if (!isHome || !hash || isCaseHash(hash)) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    const id = requestAnimationFrame(() => scrollTo(window.location.hash));

    /* The page is not its final height yet. `useReducedMotion` reports true
       for the first render, so the hero starts without its runway and the film
       interludes start collapsed; ScrollTrigger then inserts pin spacers. Each
       of those grows the page *above* the target after the jump was aimed, and
       a deep link to #about landed a screen and a half short. So for a moment
       after arrival, every change in the page's height re-lands on the target —
       until the visitor takes over, or it has had time to settle.

       The position is computed here and handed over as a number. Given a
       selector, Lenis adds the element's rect to its *own* scroll value, which
       never saw the browser's native anchor jump — and the glide above is
       ignored anyway while the preloader holds the lock — so a selector
       re-land aimed from the wrong origin. */
    let done = false;
    let t = 0;
    const land = () => {
      if (done) return;
      const y = target.getBoundingClientRect().top + window.scrollY;
      scrollTo(y, 0, true);
    };
    const settle = () => {
      if (done) return;
      clearTimeout(t);
      t = window.setTimeout(land, 120);
    };
    const finish = () => {
      done = true;
      clearTimeout(t);
      ro.disconnect();
    };
    const ro = new ResizeObserver(settle);
    ro.observe(document.body);
    /* One last landing after the curtain has lifted, then hands off. The ink
       intro runs ~9.5s on a first view, so this waits that long and a beat. */
    const giveUp = window.setTimeout(() => {
      land();
      finish();
    }, 10500);
    const opts = { once: true, passive: true } as const;
    window.addEventListener("wheel", finish, opts);
    window.addEventListener("touchstart", finish, opts);
    window.addEventListener("keydown", finish, { once: true });
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(giveUp);
      finish();
      window.removeEventListener("wheel", finish);
      window.removeEventListener("touchstart", finish);
      window.removeEventListener("keydown", finish);
    };
  }, [isHome, scrollTo]);

  /* Close the sheet the moment the viewport reaches the desktop breakpoint.
     The sheet and its toggle are both `min-[1080px]:hidden` (1280 in
     Mongolian — see `deskQuery`), so widening the window with it open hid the
     whole thing in CSS while `open` stayed true — leaving a scroll lock held
     by a dialog that no longer exists on screen and no control left to close
     it. The query must match the one in the class. */
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia(deskQuery);
    const check = () => mq.matches && setOpen(false);
    check();
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, [open, deskQuery]);

  const go = (href: string) => {
    scrollTo(href);
    setOpen(false);
  };

  const brand = (
    <>
      <Monogram className="shrink-0" />
      <span
        className={cn(
          "font-display text-lg text-fg",
          /* With the full link row showing, a row under 70rem cannot hold the
             wordmark too; the monogram carries the brand alone there. */
          mn ? "@max-[70rem]:min-[1280px]:hidden" : "@max-[70rem]:min-[1080px]:hidden"
        )}
      >
        {profile.wordmark}
      </span>
    </>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[60]">
        {/* The scrim: only past the fold, and only a gradient — the frame
            stays open; the HUD just keeps its legibility over the film. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 transition-opacity duration-500"
          style={{
            opacity: scrolled ? 1 : 0,
            background: "linear-gradient(180deg, rgba(2,3,6,0.88) 0%, rgba(2,3,6,0.55) 45%, rgba(2,3,6,0) 100%)",
          }}
        />
        <nav className="@container relative mx-auto flex h-16 max-w-[1800px] flex-nowrap items-center justify-between gap-3 px-5 sm:gap-6 md:px-8 lg:px-10">
          {/* Top-left: the brand. A real link off-route so it navigates home
              rather than scrolling a page that has no #hero. */}
          <div className="flex min-w-0 shrink-0 items-center gap-5">
            {isHome ? (
              <a
                href="#hero"
                onClick={(e) => {
                  e.preventDefault();
                  go("#hero");
                }}
                className="flex shrink-0 items-center gap-2.5"
                aria-label={`${profile.wordmark} — ${t.nav.backToTop}`}
              >
                {brand}
              </a>
            ) : (
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2.5"
                aria-label={`${profile.wordmark} — ${t.nav.home}`}
              >
                {brand}
              </Link>
            )}
          </div>

          {/* Top-right: the chapter index. `shrink-0`: a list allowed to
              shrink is compressed under its neighbours rather than overflowing,
              which reads as a rendering fault and hides from overflow checks. */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-6">
            <ul className={cn("hidden shrink-0 flex-nowrap items-center", mn ? "min-[1280px]:flex" : "min-[1080px]:flex")}>
              {/* No INDEX: the wordmark already goes to the top. The sheet,
                  palette and footer keep it. */}
              {navLinks
                .filter((l) => l.href !== "#hero")
                .map((link) => (
                  <HudLink key={link.href} link={link} isActive={active === link.href} isHome={isHome} go={go} />
                ))}
            </ul>

            <LangToggle className="hidden sm:flex" />

            <button
              ref={toggleRef}
              type="button"
              /* The sheet opens on its own short fade. It used to be inked in
                 by a full-screen flood, which read as heavy-handed for a menu. */
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
              aria-expanded={open}
              aria-controls="mobile-nav"
              className={cn(
                "hud-brackets flex h-11 items-center gap-3 px-3 font-mono text-[0.875rem] uppercase tracking-[0.16em] text-fg",
                mn ? "min-[1280px]:hidden" : "min-[1080px]:hidden"
              )}
            >
              <span aria-hidden className="hidden min-[420px]:inline [:root:lang(mn)_&]:normal-case [:root:lang(mn)_&]:tracking-[0.08em]">
                {/* Below 420px the wordmark needs the room; the button keeps
                    its accessible name either way. */}
                {t.nav.index}
              </span>
              {/* Two hairlines of unequal length that cross into an X. */}
              <span aria-hidden className="relative block h-3 w-5">
                {[-1, 1].map((d) => (
                  <span
                    key={d}
                    className="absolute right-0 top-1/2 h-px bg-current transition-[transform,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      width: open || d < 0 ? "100%" : "60%",
                      transform: open
                        ? `translateY(-50%) rotate(${d * 45}deg)`
                        : `translateY(calc(-50% + ${d * 3.5}px))`,
                    }}
                  />
                ))}
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* The phone index: a full-screen sheet of big, developing links.
          A real modal: `z-80` so it is over the header rather than under it,
          and `aria-modal` so the page behind is gone from the a11y tree. That
          is why it carries its own wordmark and close button — the header's
          copies are outside the dialog and unreachable to a screen reader. */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={sheetRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label={t.nav.siteMenu}
            /* A quiet fade, not a curtain: opacity only, quick in, quicker
               out, so the page dims under the glass instead of being
               swept away. */
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
            className={cn(
              "liquid-glass-live fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[#020a0c]/85 px-6",
              mn ? "min-[1280px]:hidden" : "min-[1080px]:hidden"
            )}
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* The name, brushed, as a ghost down the sheet's right edge. */}
            <InkSign tone="ghost" className="pointer-events-none absolute -right-2 top-[12%] h-[70%]" />

            <div className="relative flex h-16 shrink-0 items-center justify-between">
              <span className="flex items-center gap-3">
                <Monogram className="shrink-0" />
                <span className="font-display text-lg text-fg">{profile.wordmark}</span>
              </span>
              <button
                type="button"
                data-autofocus
                onClick={closeSheet}
                aria-label={t.nav.closeMenu}
                className="hud-brackets -mr-1 flex h-11 w-11 items-center justify-center text-fg"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <ul className="relative my-auto">
              {navLinks.map((link, i) => {
                const isActive = active === link.href;
                const inner = (
                  <>
                    <span
                      className={cn(
                        "w-8 shrink-0 font-mono text-xs tabular",
                        isActive ? "text-[var(--color-hazard)]" : "text-faint"
                      )}
                    >
                      {link.code}
                    </span>
                    <span className="font-tech text-[clamp(2rem,9vw,3.25rem)] font-semibold uppercase leading-none tracking-[0.04em] text-fg [:root:lang(mn)_&]:normal-case [:root:lang(mn)_&]:tracking-normal">
                      {link.label}
                    </span>
                    {isActive && (
                      <span
                        aria-hidden
                        className="ml-auto h-1.5 w-1.5 self-center rounded-full bg-[var(--color-hazard)] shadow-[0_0_12px_var(--color-hazard)]"
                      />
                    )}
                  </>
                );
                return (
                  <motion.li
                    key={link.href}
                    /* The lines settle in a short cascade: a few pixels and a
                       fade each, all landed within ~0.6s of the tap. */
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + 0.03 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="border-b border-line"
                  >
                    {isHome ? (
                      <a
                        href={link.href}
                        onClick={(e) => {
                          e.preventDefault();
                          go(link.href);
                        }}
                        aria-current={isActive ? "location" : undefined}
                        className="flex items-baseline gap-4 py-3.5"
                      >
                        {inner}
                      </a>
                    ) : (
                      <Link
                        href={`/${link.href}`}
                        onClick={() => setOpen(false)}
                        className="flex items-baseline gap-4 py-3.5"
                      >
                        {inner}
                      </Link>
                    )}
                  </motion.li>
                );
              })}
            </ul>
            <div className="relative mb-6 flex shrink-0 flex-wrap items-center justify-between gap-4">
              <a href={`mailto:${contact.email}`} className="hud-label flex h-11 items-center">
                {contact.email}
              </a>
              <LangToggle />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * One link in the HUD: index, label, and the hairlines.
 *
 * The active hairline is one element on a `layoutId`, so it travels between
 * links rather than blinking from one to the next. The hover hairline draws
 * out from the left over 300ms with a little sodium light pooled under the
 * label; both are transform/opacity only. The label decodes on hover and on
 * focus (useScramble); its accessible name is a separate sr-only copy.
 */
function HudLink({
  link,
  isActive,
  isHome,
  go,
}: {
  link: NavLink;
  isActive: boolean;
  isHome: boolean;
  go: (href: string) => void;
}) {
  const { ref: scrambleRef, run: runScramble } = useScramble(link.label);
  /* A language switch decodes the label into its new script, the way a
     hover does (see lib/localeDecode for the headings). */
  const shownLabel = useRef(link.label);
  useEffect(() => {
    if (shownLabel.current === link.label) return;
    shownLabel.current = link.label;
    runScramble();
  }, [link.label, runScramble]);
  const linkClass = cn(
    "group/hud relative flex items-baseline gap-2 whitespace-nowrap px-2.5 py-3 font-nav text-[1.0625rem] font-semibold uppercase tracking-[0.2em] transition-colors duration-300 @[76rem]:px-3.5",
    /* Exo 2 caps in Cyrillic run long; mixed case keeps the Mongolian row. */
    "[:root:lang(mn)_&]:normal-case [:root:lang(mn)_&]:tracking-[0.02em]",
    isActive ? "text-fg" : "text-muted hover:text-fg"
  );
  const parts = (
    <>
      {/* Light pooled under the label on hover. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1 bottom-0 h-6 opacity-0 transition-opacity duration-300 group-hover/hud:opacity-100 group-focus-visible/hud:opacity-100"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, color-mix(in srgb, var(--color-hazard) 22%, transparent), transparent)",
        }}
      />
      {/* The index: the first thing to go when the row runs short. */}
      <span
        aria-hidden
        className={cn(
          "hidden font-mono text-[0.6875rem] tabular tracking-normal transition-colors duration-300 @[76rem]:inline",
          "[:root:lang(mn)_&]:hidden [:root:lang(mn)_&]:@[84rem]:inline",
          /* Muted, not faint: over the film, faint measured 4.28–4.49:1. */
          isActive ? "text-[var(--color-hazard)]" : "text-muted group-hover/hud:text-[var(--color-hazard)]"
        )}
      >
        {link.code}
      </span>
      <span className="sr-only">{link.label}</span>
      <span ref={scrambleRef} aria-hidden className="inline-block whitespace-nowrap">
        {link.label}
      </span>
      {/* The hover hairline, drawn from the left. */}
      {!isActive && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2.5 bottom-1 h-px origin-left scale-x-0 bg-fg/60 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/hud:scale-x-100 group-focus-visible/hud:scale-x-100 @[76rem]:inset-x-3.5"
        />
      )}
      {isActive && (
        <motion.span
          layoutId="nav-active"
          aria-hidden
          className="pointer-events-none absolute inset-x-2.5 bottom-1 h-px bg-[var(--color-hazard)] shadow-[0_0_8px_var(--color-hazard),0_0_18px_color-mix(in_srgb,var(--color-hazard)_50%,transparent)] @[76rem]:inset-x-3.5"
          transition={{ layout: { type: "spring", stiffness: 380, damping: 34 } }}
        />
      )}
    </>
  );

  return (
    <li className="relative">
      {isHome ? (
        <a
          href={link.href}
          onClick={(e) => {
            e.preventDefault();
            go(link.href);
          }}
          aria-current={isActive ? "location" : undefined}
          onMouseEnter={runScramble}
          onFocus={runScramble}
          className={linkClass}
        >
          {parts}
        </a>
      ) : (
        <Link
          href={`/${link.href}`}
          aria-current={isActive ? "page" : undefined}
          onMouseEnter={runScramble}
          onFocus={runScramble}
          className={linkClass}
        >
          {parts}
        </Link>
      )}
    </li>
  );
}

/**
 * Local time in Ulaanbaatar, HH:MM:SS. It writes one text node once a second
 * and never re-renders. The server renders a placeholder, so hydration always
 * agrees. Footer only; the navbar does not carry it.
 */
export function UbClock({
  /** Visibility classes. */
  className = "flex",
}: {
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ulaanbaatar",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => {
      if (ref.current) ref.current.textContent = fmt.format(new Date());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span
      aria-hidden
      className={cn("items-center gap-2 font-mono text-xs tabular tracking-[0.18em] text-faint", className)}
    >
      <span className="h-1 w-1 rounded-full bg-[var(--color-hazard)]" />
      UB
      <span ref={ref} className="text-muted">
        --:--:--
      </span>
    </span>
  );
}
