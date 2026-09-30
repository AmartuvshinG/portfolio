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
import { X } from "lucide-react";
import { navLinks as sectionLinks, type NavLink } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { LangToggle } from "@/components/chrome/LangToggle";
import { isCaseHash } from "@/lib/caseFile";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { useOverlay } from "@/hooks/useOverlay";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { cn } from "@/lib/utils";
import { Monogram, NAV_ICONS } from "@/components/chrome/NavGlyphs";

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
 * The command bar.
 *
 * Sits flush across the viewport at rest. Past the fold it contracts into a
 * floating liquid-glass capsule: a lit rim, a highlight that follows the
 * pointer, and while the page is still, real refraction through the `#lg`
 * filter. The active section is a glass droplet that slides between links on a
 * `layoutId` and lands with a squash, which doubles as a position indicator.
 *
 * Three things here are less obvious than they look, and each is a fix for a
 * real defect rather than a preference:
 *
 * 1. **The console is a container query context, not a viewport one.** Its
 *    contents are `flex-nowrap` inside an `overflow-hidden` row — so when
 *    the links plus the controls overflow, the excess is *silently cut off* at the
 *    capsule's edge with no scrollbar and no warning. Sizing the drop
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
  /* Where the full link row takes over from the menu sheet. Mongolian labels
     run ~40% longer, and at 1080px the row overran the console by ~170px — so
     Mongolian keeps the sheet until 1280.
     Written out in full because Tailwind only sees literal class names. */
  const mn = locale === "mn";
  const deskQuery = mn ? "(min-width: 1280px)" : "(min-width: 1080px)";
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
  const barRef = useRef<HTMLDivElement>(null);
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
    /* One last landing after the curtain has lifted, then hands off. */
    const giveUp = window.setTimeout(() => {
      land();
      finish();
    }, 3000);
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
     The sheet and its toggle are both `min-[1080px]:hidden` (1280 in
     Mongolian — see `deskQuery`), so widening the
     window with it open hid the whole thing in CSS while `open` stayed true —
     leaving a scroll lock held by a dialog that no longer exists on screen and
     no control left to close it. The query must match the one in the class. */
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia(deskQuery);
    const check = () => mq.matches && setOpen(false);
    check();
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, [open, deskQuery]);

  /* With the full link row showing, a bar narrower than 72rem cannot hold the
     wordmark as well; the monogram carries the brand alone there. Phones never
     show the row, so they always keep the name. */
  const wordmarkFit = mn
    ? "@max-[72rem]:min-[1280px]:hidden"
    : "@max-[72rem]:min-[1080px]:hidden";

  const go = (href: string) => {
    scrollTo(href);
    setOpen(false);
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[60]">
        <motion.div
          ref={barRef}
          /* The glint: one custom property on the bar itself, written only
             while the pointer is over it. */
          onPointerMove={(e) => {
            const el = barRef.current;
            if (!el || !contracted) return;
            const box = el.getBoundingClientRect();
            el.style.setProperty("--gx", `${(((e.clientX - box.left) / box.width) * 100).toFixed(1)}%`);
          }}
          animate={{
            /* 84rem, not 72: ten links, a status lamp and the controls do not
               fit in 1152px, and the capsule's overflow hides the evidence. */
            width: contracted ? "min(96%, 84rem)" : "100%",
            y: contracted ? 14 : 0,
          }}
          transition={BAR_SPRING}
          className={cn(
            "@container relative mx-auto",
            contracted && "rounded-full shadow-[0_18px_60px_rgba(0,0,0,0.6)]"
          )}
        >
          {/* Tinted fill — what you actually see while scrolling. */}
          {contracted && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-bg transition-opacity duration-[220ms]"
              style={{ opacity: glassOn ? 0.42 : 0.92 }}
            />
          )}
          {/* Glass — live only when the page is still. `liquid-glass-live`
              carries the backdrop-filter (refraction on Chromium, blur
              elsewhere), and it is on the element only while `glassLive`. */}
          {contracted && glassSupported && (
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 rounded-full transition-opacity duration-[220ms]",
                glassLive && "liquid-glass-live"
              )}
              style={{
                opacity: glassOn ? 1 : 0,
                background:
                  "radial-gradient(40% 140% at var(--gx, 30%) 0%, rgba(255,255,255,0.12), transparent 70%)," +
                  "linear-gradient(180deg, rgba(236,238,251,0.07), transparent 46%)",
              }}
            />
          )}

          <nav
            className={cn(
              "relative mx-auto flex h-16 flex-nowrap items-center justify-between gap-4 overflow-hidden transition-[padding] duration-300",
              contracted ? "px-3 md:px-4" : "max-w-[1600px] px-5 md:px-8"
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
                className="flex shrink-0 items-center gap-2.5 rounded-full"
                aria-label={`${profile.wordmark} — ${t.nav.backToTop}`}
              >
                <Monogram className="shrink-0" />
                <span className={cn("font-display text-xl text-fg", wordmarkFit)}>
                  {profile.wordmark}
                </span>
              </a>
            ) : (
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2.5 rounded-full"
                aria-label={`${profile.wordmark} — ${t.nav.home}`}
              >
                <Monogram className="shrink-0" />
                <span className={cn("font-display text-xl text-fg", wordmarkFit)}>
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
              className={cn(
                "hidden shrink-0 flex-nowrap items-center gap-0.5",
                mn ? "min-[1280px]:flex" : "min-[1080px]:flex"
              )}
              onMouseMove={(e) => dockable && mouseX.set(e.clientX)}
              onMouseLeave={() => mouseX.set(Infinity)}
            >
              {/* No INDEX here: the wordmark beside this row already goes to
                  the top, and seven links plus the language switch and the
                  rest crowded the capsule. The sheet, palette and footer keep
                  it. */}
              {navLinks.filter((l) => l.href !== "#hero").map((link) => (
                <DockLink
                  key={link.href}
                  link={link}
                  isActive={active === link.href}
                  isHome={isHome}
                  dockable={dockable}
                  mouseX={mouseX}
                  go={go}
                />
              ))}
            </ul>

            {/* Right: language, menu button.
                The ladder here is the fix for the clipping — each item declares
                the console width below which it is not worth its space. There
                used to be a live UTC clock here too: it re-rendered the navbar
                every second to show a timezone nobody visiting needs, and after
                the type scale went up it was the item pushing the controls off the
                edge at 1440px. */}
            <div className="flex shrink-0 items-center gap-4">
              <UbClock />
              <LangToggle className="hidden sm:flex" />

              <button
                ref={toggleRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
                aria-expanded={open}
                aria-controls="mobile-nav"
                className={cn(
                  "liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-fg",
                  mn ? "min-[1280px]:hidden" : "min-[1080px]:hidden"
                )}
              >
                {/* Two strokes that cross into an X. */}
                <span aria-hidden className="relative block h-4 w-4">
                  {[-1, 1].map((d) => (
                    <span
                      key={d}
                      className="absolute left-0 top-1/2 h-[1.5px] w-full rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{
                        transform: open
                          ? `translateY(-50%) rotate(${d * 45}deg)`
                          : `translateY(calc(-50% + ${d * 4}px))`,
                      }}
                    />
                  ))}
                </span>
              </button>
            </div>
          </nav>

          {/* The capsule's rim: a lit upper lip and a cool lower edge, drawn
              over the content so it reads as the edge of the glass. */}
          {contracted && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(236,238,251,0.1), inset 0 -1px 0 rgba(34,224,255,0.18)",
              }}
            />
          )}

          {/* Read-progress hairline along the bar's base. Pulled in from the
              ends when contracted so it stays inside the capsule's curve. */}
          <span
            aria-hidden
            className={cn(
              "absolute bottom-0 h-px origin-left",
              contracted ? "inset-x-10" : "inset-x-0"
            )}
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
            className={cn(
              "liquid-glass-live fixed inset-0 z-[80] flex flex-col bg-bg/80 px-8",
              mn ? "min-[1280px]:hidden" : "min-[1080px]:hidden"
            )}
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
                <Monogram className="shrink-0" />
                <span className="font-display text-xl text-fg">
                  {profile.wordmark}
                </span>
              </span>
              <button
                type="button"
                data-autofocus
                onClick={closeSheet}
                aria-label={t.nav.closeMenu}
                className="liquid-glass -mr-2 flex h-11 w-11 items-center justify-center rounded-full text-fg"
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
                      className="flex items-center gap-4 py-3"
                    >
                      <SheetGlyph href={link.href} code={link.code} />
                      <span className="font-nav text-3xl font-semibold uppercase tracking-[0.14em] text-fg [:root:lang(mn)_&]:normal-case [:root:lang(mn)_&]:tracking-normal">
                        {link.label}
                      </span>
                    </a>
                  ) : (
                    <Link
                      href={`/${link.href}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-4 py-3"
                    >
                      <SheetGlyph href={link.href} code={link.code} />
                      <span className="font-nav text-3xl font-semibold uppercase tracking-[0.14em] text-fg [:root:lang(mn)_&]:normal-case [:root:lang(mn)_&]:tracking-normal">
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
              <LangToggle />
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
 * 1. **Scale, never width.** The capsule's row is `overflow-hidden` with
 *    `flex-nowrap` contents, so it clips overflow silently — no scrollbar, no
 *    warning, the tail links simply vanish past the curve. Animating the
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
  dockable,
  mouseX,
  go,
}: {
  link: NavLink;
  isActive: boolean;
  isHome: boolean;
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

  const { ref: scrambleRef, run: runScramble } = useScramble(link.label);
  const label = (
    <>
      {/* The section's index, where the lucide glyph used to be: the HUD's
          own wayfinding, and two mono digits are narrower than an icon. Still
          the first thing to go when the capsule runs short. */}
      <span
        aria-hidden
        className={cn(
          "hidden font-mono text-[0.6875rem] tabular tracking-normal transition-colors @[78rem]:inline",
          "[:root:lang(mn)_&]:hidden [:root:lang(mn)_&]:@[84rem]:inline",
          isActive ? "text-[var(--color-hazard)]" : "text-faint"
        )}
      >
        {link.code}
      </span>
      <span className="sr-only">{link.label}</span>
      <span ref={scrambleRef} aria-hidden className="inline-block whitespace-nowrap">
        {link.label}
      </span>
    </>
  );

  const linkClass = cn(
    "relative flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-2 font-nav text-[1.0625rem] font-semibold uppercase tracking-[0.2em] transition-colors @[76rem]:px-3.5",
    /* Exo 2 caps in Cyrillic run long; mixed case keeps the Mongolian row
       inside the console. */
    "[:root:lang(mn)_&]:normal-case [:root:lang(mn)_&]:tracking-[0.02em]",
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
      {/* The active section: sodium corner brackets and a faint amber
          under-glow, sliding between links on one layoutId. It replaced the
          glass droplet: a HUD targets things, it does not puddle under them. */}
      {isActive && (
        <motion.span
          layoutId="nav-active"
          aria-hidden
          className="hud-brackets hud-brackets-live absolute inset-0"
          transition={{ layout: { type: "spring", stiffness: 420, damping: 36 } }}
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
            onMouseEnter={runScramble}
            onFocus={runScramble}
            className={linkClass}
          >
            {label}
          </a>
        ) : (
          <Link
            href={`/${link.href}`}
            aria-current={isActive ? "page" : undefined}
            onMouseEnter={runScramble}
            onFocus={runScramble}
            className={linkClass}
          >
            {label}
          </Link>
        )}
      </MagneticButton>

      {!isActive && (
        <span
          aria-hidden
          className="hud-brackets pointer-events-none absolute inset-0 scale-110 opacity-0 transition-[opacity,transform] duration-200 [li:hover>&]:scale-100 [li:hover>&]:opacity-100 [li:focus-within>&]:scale-100 [li:focus-within>&]:opacity-100"
        />
      )}

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

/** The sheet's row marker: the section glyph over its number. */
function SheetGlyph({ href, code }: { href: string; code: string }) {
  const Icon = NAV_ICONS[href];
  return (
    <span className="liquid-glass flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full">
      {Icon && <Icon aria-hidden size={15} strokeWidth={1.75} className="text-fg" />}
      <span className="spectrum-text font-mono text-[0.625rem] leading-none">{code}</span>
    </span>
  );
}

/** The split-flap alphabets the nav labels resolve through. Each glyph flips
 *  through its own script and case, so a Mongolian label never shows Latin
 *  mid-flip and a lowercase one never jumps to capitals. */
const FLAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const FLAP_CYR = "АБВГДЕЖЗИЙКЛМНОӨПРСТУҮФХЦЧШЭЮЯ";
const FLAP_CYR_LOWER = FLAP_CYR.toLowerCase();

function flapFor(ch: string) {
  if (/[а-яөү]/.test(ch)) return FLAP_CYR_LOWER;
  if (/[А-ЯӨҮ]/.test(ch)) return FLAP_CYR;
  return FLAP;
}

/**
 * A label that decodes itself on hover: every glyph flips through the
 * alphabet and they lock left to right, in ~260ms.
 *
 * Written straight to the node — no re-render per frame — and the span's
 * width is pinned for the run, so the proportional face swapping glyphs can
 * never jostle the row. The accessible name is a separate sr-only copy, so
 * nothing ever hears the scramble.
 */
function useScramble(text: string) {
  const ref = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);

  const run = useCallback(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cancelAnimationFrame(raf.current);
    const chars = Array.from(text);
    el.style.width = `${el.getBoundingClientRect().width}px`;
    const t0 = performance.now();
    const DUR = 260;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / DUR);
      const flip = Math.floor(now / 40);
      el.textContent = chars
        .map((ch, i) =>
          ch === " " || p >= (i + 1) / chars.length
            ? ch
            : flapFor(ch)[(flip * 7 + i * 13) % flapFor(ch).length]
        )
        .join("");
      if (p < 1) raf.current = requestAnimationFrame(step);
      else {
        el.textContent = text;
        el.style.width = "";
      }
    };
    raf.current = requestAnimationFrame(step);
  }, [text]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return { ref, run };
}

/**
 * Local time in Ulaanbaatar, HH:MM:SS. It used to be a UTC clock that
 * re-rendered the whole navbar every second; this one writes one text node
 * once a second and never re-renders. The server renders a placeholder, so
 * hydration always agrees. Shown only when the capsule has the room.
 */
function UbClock() {
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
      className="hidden items-center gap-2 font-mono text-xs tabular tracking-[0.18em] text-faint @[80rem]:flex"
    >
      <span className="h-1 w-1 rounded-full bg-[var(--color-hazard)]" />
      UB
      <span ref={ref} className="text-muted">
        --:--:--
      </span>
    </span>
  );
}
