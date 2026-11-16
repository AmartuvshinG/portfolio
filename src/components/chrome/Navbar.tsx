"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { iconStroke } from "@/lib/icon";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { navLinks as sectionLinks } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { LangToggle } from "@/components/chrome/LangToggle";
import { isCaseHash } from "@/lib/caseFile";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { useOverlay } from "@/hooks/useOverlay";
import { cn } from "@/lib/utils";
import { Monogram } from "@/components/chrome/NavGlyphs";
import { InkSign } from "@/components/ui/InkSign";
import { MenuStage } from "@/components/ui/MenuStage";

/**
 * The Chapter HUD.
 *
 * One slim instrument floating at the top centre of the frame, the way a
 * game's HUD carries the objective: the ᠠ (back to the top), a split-flap
 * readout of the chapter you are in, and the language switch. A ramp
 * hairline along its bottom edge is how far down the page you are; it runs
 * on the root scroll timeline, so no JavaScript touches it per frame. The
 * fill is opaque, not glass: a blur on fixed chrome is a tax on every scroll
 * frame.
 *
 * Desktop: the readout is a disclosure. Hover, or Enter on it, drops the
 * chapter select beneath the bar (the title screen's diagonal menu, the
 * chapter you are in lit); a chapter jumps there. Escape, leaving it or
 * picking a chapter puts it away. Phones: the readout and the menu button
 * open the pause menu, as before.
 *
 * Kept, each a fix rather than a taste:
 * 1. **It knows what page it is on.** The section observer can only work on
 *    the home route; everywhere else nothing is active.
 * 2. **Deep links re-land** while the page is still growing (see below).
 * 3. **The pause menu closes at the desktop breakpoint**, so no scroll lock
 *    outlives the dialog that held it.
 */
/** How far down the page the reader is, 0–1 (read when the menu opens). */
function readProgress(): number {
  if (typeof window === "undefined") return 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

/** Where the chapter select takes over from the pause menu. */
const DESK_QUERY = "(min-width: 1024px)";

export function Navbar() {
  const { c, t } = useI18n();
  const { navLinks, profile, contact } = c;
  const { scrollTo, goTo } = useSmoothScroll();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [observed, setObserved] = useState<string | null>("#hero");
  const [open, setOpen] = useState(false);
  const [select, setSelect] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<number | undefined>(undefined);
  /* Opened by hovering, so the click that usually follows keeps it open. */
  const hoverOpened = useRef(false);

  const closeSheet = useCallback(() => setOpen(false), []);

  /* The pause menu is a real modal: same trap, restore and lock as the case
     file and the palette. */
  useOverlay({
    open,
    onClose: closeSheet,
    ref: sheetRef,
    restoreFocus: toggleRef,
  });

  /* The site is one route. Off it (a 404) there is nothing to observe, and no
     active chapter at all is the correct answer. */
  const active = isHome ? observed : null;
  const activeIndex = Math.max(0, navLinks.findIndex((l) => l.href === active));
  const cur = navLinks[activeIndex];

  /* Active-chapter tracking. Home only, and rebuilt when the route changes. */
  useEffect(() => {
    if (!isHome) return;
    /* The static list, not the translated one: only the hrefs are read, and
       they are the same in every language. */
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
     with the right URL. One frame later, put it where it was asked to go.

     The page is not its final height yet (pins and runways mount after the
     first render), so for a moment after arrival every change in the page's
     height re-lands on the target, until the visitor takes over or it has had
     time to settle. The position is handed over as a number: given a
     selector, Lenis adds the element's rect to its own scroll value, which
     never saw the browser's native anchor jump. */
  useEffect(() => {
    const hash = window.location.hash;
    /* `#case=…` belongs to the case-file host, and is not a valid selector. */
    if (!isHome || !hash || isCaseHash(hash)) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    const id = requestAnimationFrame(() => scrollTo(window.location.hash));

    let done = false;
    let timer = 0;
    const land = () => {
      if (done) return;
      const y = target.getBoundingClientRect().top + window.scrollY;
      scrollTo(y, 0, true);
    };
    const settle = () => {
      if (done) return;
      clearTimeout(timer);
      timer = window.setTimeout(land, 120);
    };
    const finish = () => {
      done = true;
      clearTimeout(timer);
      ro.disconnect();
    };
    const ro = new ResizeObserver(settle);
    ro.observe(document.body);
    /* One last landing after the loader has lifted, then hands off. */
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

  /* Close the pause menu the moment the viewport reaches the desktop
     breakpoint (its toggle is hidden there), and the chapter select below
     it (its trigger is a plain readout there). */
  useEffect(() => {
    const mq = window.matchMedia(DESK_QUERY);
    const check = () => (mq.matches ? setOpen(false) : setSelect(false));
    check();
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, []);

  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const go = (href: string) => {
    goTo(href);
    setOpen(false);
    setSelect(false);
  };
  const jump = (i: number) => {
    const link = navLinks[i];
    if (isHome) go(link.href);
    else window.location.assign(`/${link.href}`);
  };

  /* Hovering the readout opens the select on a mouse (not the whole bar: the
     language switch sits in it too); leaving the HUD puts it away after a
     beat, so the pointer can cross the gap between the bar and the panel. */
  const onEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !window.matchMedia(DESK_QUERY).matches) return;
    window.clearTimeout(leaveTimer.current);
    if (!select) hoverOpened.current = true;
    setSelect(true);
  };
  const onLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => {
      /* Never pull the menu out from under keyboard focus. */
      if (document.getElementById("hud-select")?.contains(document.activeElement)) return;
      hoverOpened.current = false;
      setSelect(false);
    }, 220);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && select) {
      e.stopPropagation();
      setSelect(false);
      triggerRef.current?.focus();
    }
  };
  /* Focus leaving the HUD puts the select away. */
  const onBlur = (e: React.FocusEvent) => {
    if (!hudRef.current?.contains(e.relatedTarget as Node | null)) setSelect(false);
  };

  const homeLabel = `${profile.wordmark} — ${isHome ? t.nav.backToTop : t.nav.home}`;
  const monogram = isHome ? (
    <a
      href="#hero"
      onClick={(e) => {
        e.preventDefault();
        go("#hero");
      }}
      className="hud-home"
      aria-label={homeLabel}
    >
      <Monogram className="shrink-0" />
    </a>
  ) : (
    <Link href="/" className="hud-home" aria-label={homeLabel}>
      <Monogram className="shrink-0" />
    </Link>
  );

  return (
    <>
      {/* Padded by the safe-area insets: the viewport is `cover`. */}
      <header
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[calc(env(safe-area-inset-top)+10px)]"
        /* Its own layer in a chapter jump (SmoothScroll), so it holds still
           while the page dissolves under it. Named only during the jump. */
        data-vt="nav"
      >
        <div
          ref={hudRef}
          className="hud pointer-events-auto relative"
          data-select={select ? "true" : "false"}
          onPointerLeave={onLeave}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        >
          <nav className="hud-bar hud-bar--lit" aria-label={t.nav.siteMenu}>
            <span aria-hidden className="hud-corners" />
            {/* Edge light: a ramp comet runs once round the rim each time the
                chapter changes (keyed by it), then the rim rests. */}
            <span key={`edge-${cur.code}`} aria-hidden className="hud-edge" />
            {monogram}
            <span aria-hidden className="hud-sep" />

            {/* The readout. Desktop: the chapter select's trigger. Phones: it
                opens the pause menu, like the button beside it. */}
            <button
              ref={triggerRef}
              type="button"
              className="hud-readout hidden lg:inline-flex"
              aria-expanded={select}
              aria-controls="hud-select"
              aria-label={`${t.nav.chapters}: ${cur.code} ${cur.label}`}
              onClick={(e) => {
                /* A mouse click right after a hover-open keeps it open. */
                const next = e.detail > 0 && hoverOpened.current ? true : !select;
                hoverOpened.current = false;
                setSelect(next);
                /* Opened from the keyboard: focus goes to the lit chapter, so
                   the next arrow or Enter acts in the menu. */
                if (next && e.detail === 0) {
                  requestAnimationFrame(() =>
                    document.querySelector<HTMLElement>("#hud-select .ms-item[tabindex=\"0\"]")?.focus()
                  );
                }
              }}
              onPointerEnter={onEnter}
            >
              <Readout code={cur.code} label={cur.label} />
              <ChevronDown aria-hidden size={16} strokeWidth={iconStroke(16, "medium")} className="hud-chev" />
            </button>
            <button
              type="button"
              className="hud-readout lg:hidden"
              aria-label={`${t.nav.openMenu}: ${cur.code} ${cur.label}`}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen(true)}
            >
              <Readout code={cur.code} label={cur.label} />
            </button>

            <span aria-hidden className="hud-sep hidden sm:block" />
            <LangToggle className="hidden sm:flex" />

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
              aria-expanded={open}
              aria-controls="mobile-nav"
              className="hud-menu lg:hidden"
            >
              {/* Two hairlines of unequal length. */}
              <span aria-hidden className="relative block h-3 w-5">
                <span className="absolute right-0 top-[2px] h-px w-full bg-current" />
                <span className="absolute right-0 bottom-[2px] h-px w-3/5 bg-current" />
              </span>
            </button>

            {/* How far down the page: the root scroll timeline (motion.css). */}
            <span aria-hidden className="hud-progress">
              <span />
            </span>
          </nav>

          {/* The chapter select (desktop). */}
          <div id="hud-select" className="hud-select" hidden={!select} onPointerEnter={onEnter}>
            {select && (
              <>
                <span aria-hidden className="hud-select-shutter">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} style={{ "--b": i } as React.CSSProperties} />
                  ))}
                </span>
                <MenuStage
                  items={navLinks.map((link) => ({ key: link.href, code: link.code, label: link.label }))}
                  active={activeIndex}
                  onSelect={jump}
                  selectOnMove={false}
                  linkProps={(i) => ({ href: isHome ? navLinks[i].href : `/${navLinks[i].href}` })}
                  label={t.nav.chapters}
                  size="sm"
                  pointerLights
                  sweep
                />
              </>
            )}
          </div>
        </div>
      </header>

      {/* The phone index: the game's pause menu.
          The page stops behind an opaque screen, a shutter of ramp bars
          sweeps across, and the chapters stand down the diagonal like the
          title screen's menu, the one you are in lit. A real modal: `z-80`
          over the header, `aria-modal`, its own mark and close button (the
          header's copies are outside the dialog). Close, Escape, or a chapter
          tap resumes. */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="nav-pause"
            ref={sheetRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label={t.nav.siteMenu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.18 } }}
            exit={{ opacity: 0, transition: { duration: 0.24, delay: 0.1 } }}
            className="pause fixed inset-0 z-[80] flex flex-col overflow-hidden px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-[calc(env(safe-area-inset-top)+10px)] lg:hidden"
          >
            <span aria-hidden className="pause-shutter">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span key={i} style={{ "--b": i } as React.CSSProperties} />
              ))}
            </span>
            {/* The name in light down the right edge. */}
            <InkSign tone="neon" className="pause-script pointer-events-none absolute right-3 top-[16%] h-[62%]" />

            {/* The same instrument as the HUD, so the menu reads as the bar
                opened out. */}
            <div className="hud-bar hud-bar--pause relative shrink-0 self-center">
              <span aria-hidden className="hud-corners" />
              <span className="hud-home" aria-hidden>
                <Monogram className="shrink-0" />
              </span>
              <span aria-hidden className="hud-sep" />
              <span className="hud-readout">
                <span className="font-display text-lg leading-none text-fg">{profile.wordmark}</span>
              </span>
              <span aria-hidden className="hud-sep" />
              <button
                type="button"
                data-autofocus
                onClick={closeSheet}
                aria-label={t.nav.closeMenu}
                className="hud-menu"
              >
                <X size={18} strokeWidth={iconStroke(18, "medium")} />
              </button>
            </div>

            <div className="pause-head relative mt-5 shrink-0">
              <span className="pause-title display-caps">{t.nav.paused}</span>
              <span aria-hidden className="pause-progress">
                <span
                  ref={(el) => {
                    if (el) el.style.transform = `scaleX(${readProgress()})`;
                  }}
                />
              </span>
            </div>

            {/* The chapters scroll inside if a short phone cannot fit them,
                so the language row below is never pushed off screen. */}
            <div data-lenis-prevent className="pause-menu relative mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-12">
              <MenuStage
                items={navLinks.map((link) => ({ key: link.href, code: link.code, label: link.label }))}
                active={activeIndex}
                onSelect={jump}
                selectOnMove={false}
                linkProps={(i) => ({ href: isHome ? navLinks[i].href : `/${navLinks[i].href}` })}
                label={t.nav.siteMenu}
                size="lg"
                pointerLights
                sweep
              />
            </div>

            <div className="pause-hud relative mt-3 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
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

/** The chapter readout: its code and name flap down, split-flap style, each
 *  time the chapter changes. Keyed by the label, so a language switch flaps
 *  it into the new script too. */
function Readout({ code, label }: { code: string; label: string }) {
  return (
    <span className="hud-flap" aria-hidden>
      <span key={`${code}-${label}`} className="hud-flap-card">
        <span className="hud-code tabular">{code}</span>
        <span className="hud-tri">▸</span>
        <span className="hud-label-text">{label}</span>
      </span>
    </span>
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
