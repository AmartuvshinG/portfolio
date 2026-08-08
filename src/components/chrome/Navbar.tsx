"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { navLinks, routeSections, profile, contact } from "@/lib/content";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { useLockScroll } from "@/hooks/useLockScroll";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { cn } from "@/lib/utils";

const BAR_SPRING = { type: "spring", stiffness: 200, damping: 50 } as const;

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
  const { scrollTo } = useSmoothScroll();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [contracted, setContracted] = useState(false);
  const [observed, setObserved] = useState<string | null>("#hero");
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState("--:--:--");
  const [progress, setProgress] = useState(0);
  const [scrolling, setScrolling] = useState(false);
  const [glassLive, setGlassLive] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useLockScroll(open);

  /* Off the home route there is nothing to observe, so the active item is
     derived from the URL. `null` when nothing matches — no pill at all is the
     correct answer for a 404, and a great deal better than lighting INDEX. */
  const routeActive =
    routeSections.find((r) => pathname.startsWith(r.prefix))?.href ?? null;
  const active = isHome ? observed : routeActive;

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

    const sections = navLinks
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
    if (!isHome || !window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    if (!target) return;
    const id = requestAnimationFrame(() => scrollTo(window.location.hash));
    return () => cancelAnimationFrame(id);
  }, [isHome, scrollTo]);

  /* Live clock (UTC) */
  useEffect(() => {
    const update = () =>
      setClock(
        new Date().toLocaleTimeString("en-GB", {
          hour12: false,
          timeZone: "UTC",
        })
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  /* Escape closes the mobile sheet and returns focus to its trigger. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
                aria-label={`${profile.wordmark} — back to top`}
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
                aria-label={`${profile.wordmark} — home`}
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
            <ul className="hidden shrink-0 flex-nowrap items-center gap-0.5 min-[1080px]:flex">
              {navLinks.map((link) => {
                const isActive = active === link.href;
                const label = (
                  <>
                    {/* The numbering is HUD decoration, and it is the first
                        thing to go — measured, it costs ~260px across ten
                        links, which is more than a compact console has spare at
                        any viewport width. So it belongs to the full-width bar
                        at the top of the page and not to the floating console;
                        the mobile sheet keeps it too. Trying to fit it into the
                        console with container queries alone is how this ended
                        up overlapping the status cluster. */}
                    <span
                      className={cn(
                        "text-[0.6rem] opacity-50",
                        contracted ? "hidden" : "hidden @[70rem]:inline"
                      )}
                    >
                      {link.code}
                    </span>
                    <span>{link.label}</span>
                  </>
                );

                return (
                  <li key={link.href} className="relative">
                    {/* The pill sits outside MagneticButton on purpose: the
                        magnetic wrapper writes a raw CSS transform, and layout
                        projection measured through it would drift while the
                        active link is also the hovered one. */}
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
                          className={cn(
                            "relative flex items-center gap-2 whitespace-nowrap px-2.5 py-2 font-mono text-xs uppercase tracking-[0.16em] transition-colors @[76rem]:px-3.5",
                            isActive ? "text-fg" : "text-muted hover:text-fg"
                          )}
                        >
                          {label}
                        </a>
                      ) : (
                        <Link
                          href={`/${link.href}`}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "relative flex items-center gap-2 whitespace-nowrap px-2.5 py-2 font-mono text-xs uppercase tracking-[0.16em] transition-colors @[76rem]:px-3.5",
                            isActive ? "text-fg" : "text-muted hover:text-fg"
                          )}
                        >
                          {label}
                        </Link>
                      )}
                    </MagneticButton>
                  </li>
                );
              })}
            </ul>

            {/* Right: status + clock, CTA, menu button.
                The ladder here is the fix for the clipping — each item declares
                the console width below which it is not worth its space. */}
            <div className="flex shrink-0 items-center gap-4">
              <span
                className={cn(
                  "hud-label shrink-0 items-center gap-2 whitespace-nowrap !text-fg",
                  contracted ? "hidden @[74rem]:flex" : "hidden @[56rem]:flex"
                )}
              >
                <span
                  className="h-1.5 w-1.5 animate-blink rounded-full"
                  style={{ background: "var(--color-hazard)" }}
                />
                ONLINE
              </span>
              {/* Clock on the full-width bar only. A live readout is the least
                  useful thing in the row and the second most expensive in
                  width; the console has better uses for 110px. */}
              <span
                className={cn(
                  "hud-label tabular whitespace-nowrap",
                  contracted ? "hidden" : "hidden @[64rem]:inline"
                )}
              >
                {clock} UTC
              </span>

              {/* The one gradient-filled element in the chrome. */}
              {isHome ? (
                <a
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    go("#contact");
                  }}
                  className="chamfer-sm hidden px-4 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-void transition-transform duration-300 hover:scale-[1.04] sm:block"
                  style={{ backgroundImage: "var(--gradient-spectrum)" }}
                >
                  Available
                </a>
              ) : (
                <Link
                  href="/#contact"
                  className="chamfer-sm hidden px-4 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-void transition-transform duration-300 hover:scale-[1.04] sm:block"
                  style={{ backgroundImage: "var(--gradient-spectrum)" }}
                >
                  Available
                </Link>
              )}

              <button
                ref={toggleRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                aria-controls="mobile-nav"
                className="flex h-10 w-10 items-center justify-center border border-line text-fg min-[1080px]:hidden"
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

      {/* Mobile full-screen sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
            exit={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[59] flex flex-col justify-center bg-bg/95 px-8 backdrop-blur-xl min-[1080px]:hidden"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="holo-grid absolute inset-0 opacity-20" aria-hidden />
            <ul className="relative space-y-1">
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
            <a
              href={`mailto:${contact.email}`}
              className="hud-label absolute bottom-10 left-8"
            >
              {contact.email}
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
