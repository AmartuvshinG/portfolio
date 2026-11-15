"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useBootReady } from "@/hooks/useBootReady";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { MARK_D, MARK_T } from "@/components/chrome/NavGlyphs";
import { GlassIconReveal } from "@/components/ui/GlassLogoReveal";
import { groundStrike } from "@/lib/groundBus";
import { cn } from "@/lib/utils";

/**
 * The title screen.
 *
 * The page opens the way a game does: the name enormous over the city, a
 * glass seal of ᠠ settling beside it, and a menu down the diagonal that
 * actually works. Each stage is a chapter jump.
 *
 * The arrival, from the moment the curtain starts to tear (useBootReady):
 *
 *   0.10s  the name rises; its hairline outline fills with the ramp from the
 *          floor up, the same fill the loader ended on, so the two read as one
 *          continuous shot. As it lands the city takes its light (groundStrike).
 *   0.45s  the glass seal plays once: ᠠ magnified in a droplet that spreads
 *          into a tile and lets go (ui/GlassLogoReveal)
 *   0.70s  the menu's stages slide in down the diagonal, one after another
 *   1.20s  the player card and the hint settle
 *
 * The menu is a real menu: ↑/↓ (or ←/→) move the lit stage, Enter or a click
 * jumps, Home/End go to the ends. Hover lights a stage the way a cursor does
 * in a game. It is a set of links, not scroll-driven UI, so the pointer rule
 * doesn't apply. The lit stage pulses on a beat (transform only), and the
 * beat stops whenever the hero is off screen.
 *
 * Reduced motion: everything is at rest, the outline already filled, no beat.
 */

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="white" d="${MARK_D}" transform="${MARK_T}"/></svg>`;
/** When the fill lands, ms after boot: when the city takes the name's light. */
const STRIKE_AT = 1300;

export function Hero() {
  const { c, t } = useI18n();
  const { profile } = c;
  const ready = useBootReady();
  const reduced = useReducedMotion();
  const play = ready && !reduced;
  const { goTo } = useSmoothScroll();
  const ref = useRef<HTMLElement>(null);
  const itemsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const [lit, setLit] = useState(0);
  const [live, setLive] = useState(true);
  const [glassDone, setGlassDone] = useState(false);
  const onGlassDone = useCallback(() => setGlassDone(true), []);
  const menu = t.hero.menu;

  useEffect(() => {
    if (!play) return;
    const id = window.setTimeout(groundStrike, STRIKE_AT);
    return () => window.clearTimeout(id);
  }, [play]);

  /* The beat and the blink only run while the title screen is on screen. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const move = (to: number) => {
    const n = (to + menu.length) % menu.length;
    setLit(n);
    itemsRef.current[n]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      move(lit + 1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      move(lit - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(0);
    } else if (e.key === "End") {
      e.preventDefault();
      move(menu.length - 1);
    }
  };

  const state = reduced ? "rest" : ready ? "in" : "wait";

  return (
    <section
      id="hero"
      ref={ref}
      data-act="void"
      data-chapter="INDEX"
      aria-label={t.hero.aria}
      data-state={state}
      data-live={live && !reduced ? "true" : "false"}
      className="ts relative z-10 flex min-h-[100svh] flex-col"
    >
      <div className="ts-frame">
        <div className="ts-slate ts-reveal" style={{ "--d": "0.3s" } as React.CSSProperties}>
          <span className="micro text-fg/85">{profile.kicker}</span>
          <span className="micro text-fg/85">{profile.location}</span>
        </div>

        <div className="ts-main">
          <div className="ts-title">
            <h1 className="ts-name display-caps">
              <span className="sr-only">{profile.fullName}</span>
              <span aria-hidden className="ts-name-outline">
                {profile.wordmark}
              </span>
              {/* The ramp fill, revealed from the floor by two counter-moving
                  transforms (a clip that rises, a fill that holds still). */}
              <span aria-hidden className="ts-name-fill">
                <span>{profile.wordmark}</span>
              </span>
              {/* A light that crosses the name now and then: a narrow window
                  travelling right while the text inside it counter-travels,
                  so only transforms move. */}
              <span aria-hidden className="ts-name-sweep">
                <span>{profile.wordmark}</span>
              </span>
              {/* Each letter as its own key: hovering one lifts it out of the
                  name in the menu's stacked ramp, then lets it settle back. */}
              <span aria-hidden className="ts-name-keys">
                {Array.from(profile.wordmark).map((ch, i) => (
                  <span key={i}>{ch}</span>
                ))}
              </span>
            </h1>
            <p className="ts-role ts-reveal" style={{ "--d": "0.9s" } as React.CSSProperties}>
              <span className="ts-role-main">{profile.role}</span>
              <span className="ts-role-sub">{profile.discipline}</span>
            </p>
          </div>

          <div className="ts-seal ts-reveal" aria-hidden style={{ "--d": "0.45s" } as React.CSSProperties}>
            {play && !glassDone ? (
              <GlassIconReveal
                logo={LOGO}
                label=""
                look="dark"
                background="#05040c"
                logoColor="#f3f1ff"
                tileSize={150}
                logoScale={0.85}
                iconPlate={false}
                loop={false}
                play={play}
                onComplete={onGlassDone}
                speed={2}
                className="h-full w-full"
                tuning={{ dispersion: 1.6, present: 1.3, glide: 1.1 }}
              />
            ) : (
              <svg viewBox="0 0 32 32" className="ts-seal-mark">
                <defs>
                  <linearGradient id="ts-seal-ramp" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0" stopColor="#ff1f3d" />
                    <stop offset="0.4" stopColor="#e81cc8" />
                    <stop offset="0.72" stopColor="#8a3dff" />
                    <stop offset="1" stopColor="#5664ff" />
                  </linearGradient>
                </defs>
                <path d={MARK_D} transform={MARK_T} fill="url(#ts-seal-ramp)" />
              </svg>
            )}
          </div>

          <nav className="ts-menu" aria-label={t.hero.menuAria} onKeyDown={onKeyDown}>
            <div className="ts-burst" aria-hidden />
            <ol>
              {menu.map((item, i) => {
                const chapter = c.navLinks.find((l) => l.href === item.href);
                return (
                  <li
                    key={item.href}
                    className="ts-stage ts-reveal"
                    style={{ "--i": i, "--d": `${0.7 + i * 0.1}s` } as React.CSSProperties}
                  >
                    <a
                      ref={(el) => {
                        itemsRef.current[i] = el;
                      }}
                      href={item.href}
                      tabIndex={i === lit ? 0 : -1}
                      data-lit={i === lit ? "true" : "false"}
                      data-text={item.label}
                      className="ts-item"
                      onMouseEnter={() => setLit(i)}
                      onFocus={() => setLit(i)}
                      onClick={(e) => {
                        e.preventDefault();
                        goTo(item.href);
                      }}
                    >
                      <span className="ts-item-code tag" aria-hidden>
                        {chapter?.code ?? `0${i + 1}`}
                      </span>
                      <span className="ts-item-label">{item.label}</span>
                      <span className="ts-item-sub">{item.sub}</span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        <div className="ts-foot">
          <div className="ts-card ts-reveal" style={{ "--d": "1.2s" } as React.CSSProperties}>
            <span className="ts-card-tag tag">{t.hero.player}</span>
            <span className="flex items-center gap-2 text-sm text-fg">
              <span className={cn("ts-lamp")} aria-hidden />
              {profile.status}
            </span>
            <span className="text-sm text-fg/80">{profile.degree}</span>
          </div>
          <span className="ts-hint micro ts-reveal" style={{ "--d": "1.3s" } as React.CSSProperties}>
            <span className="hidden md:inline">{t.hero.selectKey}</span>
            <span className="md:hidden">{t.hero.selectTap}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
