"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Menu, X } from "lucide-react";
import {
  navLinks as sectionLinks,
  RESUME_EN,
  RESUME_MN,
  type NavLink,
} from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { LangToggle } from "@/components/chrome/LangToggle";
import { isCaseHash } from "@/lib/caseFile";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { useOverlay } from "@/hooks/useOverlay";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { cn } from "@/lib/utils";

const BAR_SPRING = { type: "spring", stiffness: 200, damping: 50 } as const;

/* --- The dock.
   Lifted from the macOS-dock reference, with one substitution that is the whole
   design decision: it magnifies **words, not icons**. There is no guessable
   glyph for "Signal" or "Craft", so an icon dock turns every visit into a
   hover-hunt for a section you could otherwise have read. The magnification is
   the part of that pattern worth having; the iconography is not.

   The reference's spring, unchanged — it is doing the work. */
const DOCK_SPRING = { mass: 0.1, stiffness: 150, damping: 12 } as const;
/** Influence either side of a link's centre, px. */
const REACH = 150;
/** Scale at dead centre. */
const PEAK = 1.24;
/** Lift at dead centre, px. */
const LIFT = -6;

/** How long after the last scroll event the glass comes back, ms. */
const GLASS_DELAY = 150;
/** Crossfade either side of that, ms. Must match the CSS duration below. */
const GLASS_FADE = 220;

/**
 * HUD command bar — the NEXUS header, restored and recoloured.
 *
 * Sits flush across the viewport at rest; past the fold it contracts into a
 * chamfered floating console. The active section drives a `layoutId` pill that
 * slides between links, which doubles as a position indicator.
 *
 * Three things here are less obvious than they look, and each is a fix for a
 * real defect rather than a preference:
 *
 * 1. **The console is a container query context, not a viewport one.** Its
 *    contents are `flex-nowrap`, and `chamfer-lg` is a `clip-path` — so when
 *    ten links plus a clock plus a CTA overflow, the excess is *silently cut
 *    off* at the panel edge with no scrollbar and no warning. Sizing the drop
 *    ladder off the viewport could never be right, because the thing
 *    overflowing is the console, whose width is a `min()` of two other things.
 *
 * 2. **The glass is on demand.** See `GLASS_DELAY` below.
 *
 * 3. **It knows what page it is on.** The section observer can only work on the
 *    home route; everywhere else the active item comes from the pathname.
 */
export function Navbar() {
  const { c, t, locale } = useI18n();
  const { navLinks, profile, contact } = c;
  const resume = locale === "mn" ? RESUME_MN : RESUME_EN;
  const { scrollTo } = useSmoothScroll();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const reduced = useReducedMotion();

  /* Pointer position across the link row, in viewport coordinates. `Infinity`
     parks every link at rest — the distance transform clamps, so the value
     never has to be special-cased downstream. */
  const mouseX = useMotionValue(Infinity);
  const [dockable, setDockable] = useState(false);

  const [contracted, setContracted] = useState(false);
  const [observed, setObserved] = useState<string | null>("#hero");
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrolling, setScrolling] = useState(false);
  const [glassLive, setGlassLive] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const closeSheet = useCallback(() => setOpen(false), []);

  /* The sheet is a real modal now — same trap, restore and lock as the dossier,
     the palette and ESPER. See the sheet's own markup below for why that forced
     it to grow a header of its own. */
  useOverlay({
    open,
    onClose: closeSheet,
    ref: sheetRef,
    restoreFocus: toggleRef,
  });

  /* The site is one route. Off it (a 404) there is nothing to observe, and no
     pill at all is the correct answer — a great deal better than lighting
     INDEX. */
  const active = isHome ? observed : null;

  /* Contract past the fold, track read progress, and drive the glass. */
  useEffect(() => {
    let ticking = false;
    let inGesture = false;
    let idle: ReturnType<typeof setTimeout>;
    let kill: ReturnType<typeof setTimeout>;

    const onScroll = () => {
      /* Gesture start. The teardown is scheduled **once here, not on every
         scroll event** — resetting it per event meant that during a continuous
         scroll (an event every frame) the timer was cleared and rescheduled
         forever and the filter was never actually removed, which is the whole
         point of the exercise. */
      if (!inGesture) {
        inGesture = true;
        setScrolling(true);
        /* Tear the filter down only after the fade-out has finished — pulling
           the filtered layer mid-transition pops for a frame. */
        kill = setTimeout(() => setGlassLive(false), GLASS_FADE);
      }

      clearTimeout(idle);
      idle = setTimeout(() => {
        inGesture = false;
        /* Cancel a teardown that has not fired yet: a flick shorter than the
           fade never needs the filter removed at all. */
        clearTimeout(kill);
        setScrolling(false);
        /* Stand the layer back up in the same commit that starts the fade-in,
           so it exists before its opacity begins to climb. Both of these live
           in a timer callback rather than an effect body — React batches them
           into one render, and setting state synchronously in an effect
           cascades. */
        setGlassLive(true);
      }, GLASS_DELAY);

      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setContracted(y > 100);
        setProgress(max > 0 ? Math.min(1, y / max) : 0);
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(idle);
      clearTimeout(kill);
    };
  }, []);

  /* --- The on-demand glass.
     A `backdrop-filter` on a *fixed* element makes its layer depend on the
     scrolling content beneath it: the compositor has to rasterise the page,
     filter it, then composite, in that order, on every frame of every scroll,
     for the entire session. That is why the previous `glass` utility was
     stripped from this component in the performance pass.

     The bargain: the filter is only live while the page is *still*. During a
     scroll the bar falls back to its opaque fill, which at 92% was doing all
     the legibility work anyway; ~150ms after you stop, the real blur crossfades
     in. You only ever see glass when you are in a position to look at it.

     Order matters. `backdrop-filter` is written *before* the fade-in starts and
     removed only *after* the fade-out has finished, because creating or
     destroying the filtered layer mid-transition pops for a frame. And
     `opacity: 0` is not enough on its own — the `none` is what actually buys
     the frames back. */
  const glassSupported =
    typeof CSS !== "undefined" &&
    CSS.supports?.("backdrop-filter", "blur(1px)") &&
    /* Somebody who has asked for less transparency has asked for exactly this
       feature to be off. */
    typeof window !== "undefined" &&
    !window.matchMedia("(prefers-reduced-transparency: reduce)").matches;

  const glassOn = glassSupported && contracted && !open && !scrolling;

  /* Active-chapter tracking. Home only, and rebuilt when the route changes —
     with `[]` deps this ran once on mount, so arriving on a case file left the
     observer permanently unattached and the nav dead for the rest of the
     session, including after navigating back to the home page. */
  useEffect(() => {
    /* No need to clear `observed` off-route — `active` already ignores it
       there, and writing state from an effect to represent something already
       derivable is how you get a render cascade. */
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
    return () => cancelAnimationFrame(id);
  }, [isHome, scrollTo]);

  /* The dock only exists where there is a pointer to drive it. On touch the
     magnification could only ever fire on tap — landing a label at 1.24x under
     the finger that is already navigating away from it — and reduced motion has
     asked for exactly this class of thing to stop. Measured once and on change
     rather than read during render, so SSR and hydration agree on `false`. */
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setDockable(mq.matches && !reduced);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [reduced]);

  /* Close the sheet the moment the viewport reaches the desktop breakpoint.
     The sheet and its toggle are both `min-[1080px]:hidden`, so widening the
     window with it open hid the whole thing in CSS while `open` stayed true —
     leaving a scroll lock held by a dialog that no longer exists on screen and
     no control left to close it. The query must match the one in the class. */
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(min-width: 1080px)");
    const check = () => mq.matches && setOpen(false);
    check();
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, [open]);

  const go = (href: string) => {
    scrollTo(href);
    setOpen(false);
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[60]">
        <motion.div
          animate={{
            /* 84rem, not 72: ten links, a status lamp, a clock and a CTA do not
               fit in 1152px, and the chamfer's clip-path hides the evidence. */
            width: contracted ? "min(96%, 84rem)" : "100%",
            y: contracted ? 14 : 0,
          }}
          transition={BAR_SPRING}
          className={cn(
            "@container relative mx-auto",
            contracted &&
              "chamfer-lg border border-line shadow-[0_18px_60px_rgba(0,0,0,0.6)]"
          )}
        >
          {/* Opaque fill — what you actually see while scrolling. */}
          {contracted && (
            <span
              aria-hidden
              className="chamfer-lg absolute inset-0 bg-bg transition-opacity duration-[220ms]"
              style={{ opacity: glassOn ? 0.55 : 0.95 }}
            />
          )}
          {/* Glass — live only when the page is still. */}
          {contracted && glassSupported && (
            <span
              aria-hidden
              className="chamfer-lg absolute inset-0 transition-opacity duration-[220ms]"
              style={{
                opacity: glassOn ? 1 : 0,
                backdropFilter: glassLive ? "blur(18px) saturate(1.3)" : "none",
                WebkitBackdropFilter: glassLive
                  ? "blur(18px) saturate(1.3)"
                  : "none",
                background:
                  "linear-gradient(180deg, rgba(236,238,251,0.05), transparent 42%)",
              }}
            />
          )}

          <nav
            className={cn(
              "relative mx-auto flex h-16 flex-nowrap items-center justify-between gap-4 overflow-hidden transition-[padding] duration-300",
              contracted ? "px-5" : "max-w-[1600px] px-5 md:px-8"
            )}
          >
            {/* Wordmark. A real link off-route so it navigates home rather than
                scrolling a page that has no #hero. */}
            {isHome ? (
              <a
                href="#hero"
                onClick={(e) => {
                  e.preventDefault();
                  go("#hero");
                }}
                className="flex shrink-0 items-center gap-3"
                aria-label={`${profile.wordmark} — ${t.nav.backToTop}`}
              >
                <Lamp />
                <span className="font-display text-xl text-fg">
                  {profile.wordmark}
                </span>
              </a>
            ) : (
              <Link
                href="/"
                className="flex shrink-0 items-center gap-3"
                aria-label={`${profile.wordmark} — ${t.nav.home}`}
              >
                <Lamp />
                <span className="font-display text-xl text-fg">
                  {profile.wordmark}
                </span>
              </Link>
            )}

            {/* Desktop links.
                `shrink-0`, not `min-w-0`. Allowing this list to shrink below
                its content does not make it overflow — flex just compresses it
                until the last links sit *underneath* the status cluster, which
                looks like a rendering fault and, worse, leaves
                `nav.scrollWidth === nav.clientWidth`, so an overflow check
                reports everything is fine. Refusing to shrink turns a silent
                overlap into a visible overflow that the ladder below can be
                measured against. */}
            <ul
              className="hidden shrink-0 flex-nowrap items-center gap-0.5 min-[1080px]:flex"
              onMouseMove={(e) => dockable && mouseX.set(e.clientX)}
              onMouseLeave={() => mouseX.set(Infinity)}
            >
              {navLinks.map((link) => (
                <DockLink
                  key={link.href}
                  link={link}
                  isActive={active === link.href}
                  isHome={isHome}
                  contracted={contracted}
                  dockable={dockable}
                  mouseX={mouseX}
                  go={go}
                />
              ))}
            </ul>

            {/* Right: status, CTA, menu button.
                The ladder here is the fix for the clipping — each item declares
                the console width below which it is not worth its space. There
                used to be a live UTC clock here too: it re-rendered the navbar
                every second to show a timezone nobody visiting needs, and after
                the type scale went up it was the item pushing the CTA off the
                edge at 1440px. */}
            <div className="flex shrink-0 items-center gap-4">
              <span
                className={cn(
                  "hud-label shrink-0 items-center gap-2 whitespace-nowrap !text-fg",
                  contracted ? "hidden @[84rem]:flex" : "hidden @[80rem]:flex"
                )}
              >
                <span
                  className="h-1.5 w-1.5 animate-blink rounded-full"
                  style={{ background: "var(--color-hazard)" }}
                />
                {t.nav.online}
              </span>

              <LangToggle className="hidden sm:flex" />

              {/* The one gradient-filled element in the chrome — and the one
                  thing a recruiter most wants from the header. It used to read
                  "Available" and scroll to the contact form, which the nav
                  already does; the résumé had no way in from the chrome at all.
                  Follows the language: the Mongolian site hands over the
                  Mongolian PDF. */}
              <a
                href={resume}
                target="_blank"
                rel="noopener"
                aria-label={t.nav.resumeAria}
                className="chamfer-sm hidden px-4 py-2 font-mono text-[0.8125rem] uppercase tracking-[0.18em] text-void transition-transform duration-300 hover:scale-[1.04] sm:block"
                style={{ backgroundImage: "var(--gradient-spectrum)" }}
              >
                {t.nav.resume}
              </a>

              <button
                ref={toggleRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
                aria-expanded={open}
                aria-controls="mobile-nav"
                className="flex h-11 w-11 items-center justify-center border border-line text-fg min-[1080px]:hidden"
              >
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </nav>

          {/* Read-progress hairline along the bar's base */}
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-px origin-left"
            style={{
              backgroundImage: "var(--gradient-spectrum)",
              transform: `scaleX(${progress})`,
              opacity: progress > 0.005 ? 0.9 : 0,
              transition: "opacity 300ms linear",
            }}
          />
        </motion.div>
      </header>

      {/* Mobile full-screen sheet.
          A real modal: `z-80` so it is over the header rather than under it,
          and `aria-modal` so the page behind is gone from the a11y tree. That
          last one is why it carries its own wordmark, lamp and close button —
          the header's copies are outside the dialog, and `aria-modal` makes
          them unreachable to a screen reader, so a sheet without its own close
          affordance would have had no way out but the Escape key. */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={sheetRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label={t.nav.siteMenu}
            initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
            exit={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[80] flex flex-col bg-bg/95 px-8 backdrop-blur-xl min-[1080px]:hidden"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="holo-grid absolute inset-0 opacity-20" aria-hidden />

            {/* The sheet's own header row. `h-16` matches the bar it covers, so
                the wordmark lands on the same optical line it was already on
                and the transition reads as the page opening rather than as two
                headers swapping. */}
            <div className="relative flex h-16 shrink-0 items-center justify-between">
              <span className="flex items-center gap-3">
                <Lamp />
                <span className="font-display text-xl text-fg">
                  {profile.wordmark}
                </span>
              </span>
              <button
                type="button"
                data-autofocus
                onClick={closeSheet}
                aria-label={t.nav.closeMenu}
                className="-mr-2 flex h-11 w-11 items-center justify-center border border-line text-fg"
              >
                <X size={18} />
              </button>
            </div>

            <ul className="relative my-auto space-y-1">
              {navLinks.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.05 * i,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="border-b border-line"
                >
                  {isHome ? (
                    <a
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        go(link.href);
                      }}
                      className="flex items-baseline gap-4 py-3"
                    >
                      <span className="spectrum-text font-mono text-xs">
                        {link.code}
                      </span>
                      <span className="font-display text-2xl uppercase text-fg">
                        {link.label}
                      </span>
                    </a>
                  ) : (
                    <Link
                      href={`/${link.href}`}
                      onClick={() => setOpen(false)}
                      className="flex items-baseline gap-4 py-3"
                    >
                      <span className="spectrum-text font-mono text-xs">
                        {link.code}
                      </span>
                      <span className="font-display text-2xl uppercase text-fg">
                        {link.label}
                      </span>
                    </Link>
                  )}
                </motion.li>
              ))}
            </ul>
            <div className="relative mb-6 flex shrink-0 flex-wrap items-center justify-between gap-4">
              <a
                href={`mailto:${contact.email}`}
                className="hud-label flex h-11 items-center"
              >
                {contact.email}
              </a>
              <div className="flex items-center gap-3">
                <LangToggle />
                <a
                  href={resume}
                  target="_blank"
                  rel="noopener"
                  aria-label={t.nav.resumeAria}
                  className="chamfer-sm flex h-9 items-center px-4 font-mono text-[0.8125rem] uppercase tracking-[0.18em] text-void"
                  style={{ backgroundImage: "var(--gradient-spectrum)" }}
                >
                  {t.nav.resume}
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * One link in the dock.
 *
 * Three things here are deliberate and each one is a fix rather than a taste:
 *
 * 1. **Scale, never width.** The console is a `clip-path` (`chamfer-lg`) with
 *    `flex-nowrap` contents, so it clips overflow silently — no scrollbar, no
 *    warning, the tail links simply vanish behind the chamfer. Animating the
 *    *width* of a magnified link would push the last two links out of the panel
 *    on any narrow-ish viewport. `scale` changes what you see and not what the
 *    row measures, so the layout is identical at rest and at full deflection.
 *    The growth is absorbed by the existing horizontal padding, which is why
 *    `PEAK` is 1.24 and not the reference's 1.6.
 *
 * 2. **`transformOrigin: 50% 100%`.** Growing from the baseline is what makes
 *    this read as a dock; growing from the centre reads as a zoom.
 *
 * 3. **The transform is not on the `MagneticButton`.** That component writes a
 *    raw CSS `transform` every frame for its own magnet effect, so the two
 *    would overwrite each other at frame rate. The dock transform goes on the
 *    `<li>`, outside it — the same reason the active pill already sits out
 *    there.
 */
function DockLink({
  link,
  isActive,
  isHome,
  contracted,
  dockable,
  mouseX,
  go,
}: {
  link: NavLink;
  isActive: boolean;
  isHome: boolean;
  contracted: boolean;
  dockable: boolean;
  mouseX: MotionValue<number>;
  go: (href: string) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);

  /* Signed distance from the pointer to this link's centre. Measured per frame
     off the live rect rather than cached: the row reflows when the bar
     contracts, and a cached centre would leave every link magnifying at the
     wrong moment for the rest of the session. */
  const distance = useTransform(mouseX, (x: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return REACH * 2;
    return x - box.left - box.width / 2;
  });

  const scale = useSpring(
    useTransform(distance, [-REACH, 0, REACH], [1, PEAK, 1]),
    DOCK_SPRING
  );
  const y = useSpring(
    useTransform(distance, [-REACH, 0, REACH], [0, LIFT, 0]),
    DOCK_SPRING
  );
  /* A tighter falloff than the scale, so the hairline belongs to one link
     rather than smearing across three. */
  const rule = useSpring(
    useTransform(distance, [-REACH * 0.4, 0, REACH * 0.4], [0, 1, 0]),
    DOCK_SPRING
  );

  const label = (
    <>
      {/* The numbering is HUD decoration, and it is the first thing to go —
          measured, it costs ~260px across ten links, which is more than a
          compact console has spare at any viewport width. So it belongs to the
          full-width bar at the top of the page and not to the floating console;
          the mobile sheet keeps it too. */}
      <span
        className={cn(
          /* Was `text-[0.6rem] opacity-50` — 9.6px, and the opacity composited
             muted down to 2.34:1, which is worse than any raw token on the
             site. The subordination is now carried by `--color-faint`, which
             is a real 5:1 step below muted rather than a half-erased one. */
          "text-[0.75rem] text-faint",
          contracted ? "hidden" : "hidden @[84rem]:inline"
        )}
      >
        {link.code}
      </span>
      <span>{link.label}</span>
    </>
  );

  const linkClass = cn(
    "relative flex items-center gap-2 whitespace-nowrap px-2.5 py-2 font-mono text-xs uppercase tracking-[0.16em] transition-colors @[76rem]:px-3.5",
    isActive ? "text-fg" : "text-muted hover:text-fg"
  );

  return (
    <motion.li
      ref={ref}
      className="relative"
      style={
        dockable
          ? { scale, y, transformOrigin: "50% 100%" }
          : undefined
      }
    >
      {isActive && (
        <motion.span
          layoutId="nav-active"
          aria-hidden
          className="chamfer-sm absolute inset-0 border border-line-strong"
          style={{
            background:
              "linear-gradient(100deg, rgba(255,45,143,0.16), rgba(123,92,255,0.16), rgba(34,224,255,0.16))",
          }}
          transition={BAR_SPRING}
        />
      )}

      <MagneticButton strength={0.2}>
        {isHome ? (
          <a
            href={link.href}
            onClick={(e) => {
              e.preventDefault();
              go(link.href);
            }}
            aria-current={isActive ? "location" : undefined}
            className={linkClass}
          >
            {label}
          </a>
        ) : (
          <Link
            href={`/${link.href}`}
            aria-current={isActive ? "page" : undefined}
            className={linkClass}
          >
            {label}
          </Link>
        )}
      </MagneticButton>

      {/* The dock's indicator. A ramp hairline drawing itself under the nearest
          link — the one piece of colour the row gets, and it replaces the
          reference's floating tooltip, which would be repeating a word the
          visitor is already reading. */}
      {dockable && (
        <motion.span
          aria-hidden
          className="spectrum-rule absolute inset-x-2 bottom-0 h-px origin-center"
          style={{ scaleX: rule, opacity: rule }}
        />
      )}
    </motion.li>
  );
}

function Lamp() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
    </span>
  );
}
