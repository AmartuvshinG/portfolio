"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { navLinks, profile, contact } from "@/lib/content";
import { useSmoothScroll } from "@/components/layout/SmoothScroll";
import { useLockScroll } from "@/hooks/useLockScroll";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { cn } from "@/lib/utils";

const BAR_SPRING = { type: "spring", stiffness: 200, damping: 50 } as const;

/**
 * HUD command bar — the NEXUS header, restored and recoloured.
 *
 * Sits flush across the viewport at rest; past the fold it contracts into a
 * chamfered floating console — narrower, glassed, lifted off the top edge — so
 * it reads as a piece of instrumentation rather than a website header. The
 * active section drives a `layoutId` pill that slides between links, which
 * doubles as a position indicator (you always know where you are in the page
 * without a separate progress element).
 *
 * Deliberately never hides on scroll-down: once it's a small floating console
 * it costs almost nothing on screen, and hiding navigation to reclaim 64px is
 * a bad trade for discoverability.
 *
 * Two things are carried over from the editorial header that replaced this one,
 * because both were improvements on the original: the stricter 50%-line
 * IntersectionObserver (which agrees with ChapterFrame instead of drifting a
 * chapter ahead of it), and the AVAILABLE call-to-action.
 */
export function Navbar() {
  const { scrollTo } = useSmoothScroll();
  const [contracted, setContracted] = useState(false);
  const [active, setActive] = useState("#hero");
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState("--:--:--");
  const [progress, setProgress] = useState(0);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useLockScroll(open);

  /* Contract past the fold + track read progress. */
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
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
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Active-chapter tracking. Fires on the same 50% line the ChapterFrame uses,
     so the nav pill and the corner numbering never disagree. Highest ratio
     wins rather than last-intersecting, which is what stops the pill jumping
     backwards when two sections are in view at once. */
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
            width: contracted ? "min(96%, 72rem)" : "100%",
            y: contracted ? 14 : 0,
          }}
          transition={BAR_SPRING}
          className={cn(
            "relative mx-auto",
            // `glass` alone is too sheer once the bar floats over body copy —
            // the page text reads straight through it. The opaque base goes
            // underneath so nav labels always win.
            contracted &&
              "chamfer-lg glass bg-bg/92 shadow-[0_18px_60px_rgba(0,0,0,0.6)]"
          )}
        >
          <nav
            className={cn(
              "mx-auto flex h-16 flex-nowrap items-center justify-between gap-4 transition-[padding] duration-300",
              contracted ? "px-5" : "max-w-[1600px] px-5 md:px-8"
            )}
          >
            {/* Wordmark */}
            <a
              href="#hero"
              onClick={(e) => {
                e.preventDefault();
                go("#hero");
              }}
              className="flex items-center gap-3"
              aria-label={`${profile.wordmark} — back to top`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
              </span>
              <span className="font-display text-2xl font-black tracking-tight text-fg">
                {profile.wordmark}
              </span>
            </a>

            {/* Desktop links */}
            <ul className="hidden shrink-0 flex-nowrap items-center gap-0.5 lg:flex">
              {navLinks.map((link) => {
                const isActive = active === link.href;
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
                      <a
                        href={link.href}
                        onClick={(e) => {
                          e.preventDefault();
                          go(link.href);
                        }}
                        aria-current={isActive ? "location" : undefined}
                        className={cn(
                          "relative flex items-center gap-2 whitespace-nowrap px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] transition-colors xl:px-4",
                          isActive ? "text-fg" : "text-muted hover:text-fg"
                        )}
                      >
                        <span className="text-[0.6rem] opacity-50">{link.code}</span>
                        <span>{link.label}</span>
                      </a>
                    </MagneticButton>
                  </li>
                );
              })}
            </ul>

            {/* Right: status + clock (desktop), CTA, menu button (mobile).
                Contracted, there isn't room for the full readout beside six
                links — the clock drops first, then the status lamp. */}
            <div className="flex shrink-0 items-center gap-4">
              <div className="hidden items-center gap-4 md:flex">
                <span
                  className={cn(
                    "hud-label flex shrink-0 items-center gap-2 whitespace-nowrap !text-fg",
                    contracted && "hidden xl:flex"
                  )}
                >
                  <span className="h-1.5 w-1.5 animate-blink rounded-full bg-signal" />
                  ONLINE
                </span>
                <span
                  className={cn(
                    "hud-label tabular whitespace-nowrap",
                    contracted && "hidden 2xl:inline"
                  )}
                >
                  {clock} UTC
                </span>
              </div>

              {/* The one gradient-filled element in the chrome. Bone label on
                  the ramp — the ramp never carries type itself at this size. */}
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

              <button
                ref={toggleRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                aria-controls="mobile-nav"
                className="flex h-10 w-10 items-center justify-center border border-line text-fg lg:hidden"
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
            className="fixed inset-0 z-[59] flex flex-col justify-center bg-bg/95 px-8 backdrop-blur-xl lg:hidden"
          >
            <div className="holo-grid absolute inset-0 opacity-20" aria-hidden />
            <ul className="relative space-y-2">
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
                    onClick={(e) => {
                      e.preventDefault();
                      go(link.href);
                    }}
                    className="flex items-baseline gap-4 py-4"
                  >
                    <span className="spectrum-text font-mono text-xs">
                      {link.code}
                    </span>
                    <span className="font-display text-4xl font-bold uppercase text-fg">
                      {link.label}
                    </span>
                  </a>
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
