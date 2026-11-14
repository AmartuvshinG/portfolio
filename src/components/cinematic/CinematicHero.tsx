"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useBootReady } from "@/hooks/useBootReady";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { MARK_D, MARK_T } from "@/components/chrome/NavGlyphs";
import { GlassIconReveal } from "./GlassLogoReveal";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useScrollTimelines } from "@/hooks/useScrollTimelines";

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="white" d="${MARK_D}" transform="${MARK_T}"/></svg>`;

export function CinematicHero() {
  const { c, t } = useI18n();
  const ready = useBootReady();
  const reduced = useReducedMotion();
  const pinned = useMediaQuery("(min-width:1024px) and (min-height:900px)") && !reduced;
  const native = useScrollTimelines() && pinned;
  const { goTo } = useSmoothScroll();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, (p) => Math.max(0, 1 - Math.max(0, p - 0.2) / 0.7));
  const [glassDone, setGlassDone] = useState(false);
  const onLogoComplete = useCallback(() => setGlassDone(true), []);
  useEffect(() => {
    if (!ready || reduced) return;
    const timer = setTimeout(() => setGlassDone(true), 1600);
    return () => clearTimeout(timer);
  }, [ready, reduced]);
  const destinations = ["#work", "#timeline", "#contact"];
  return <section ref={ref} className="cin-hero">
    <div className="cin-hero-frame">
      <motion.div className="cin-hero-content" data-native={native} style={pinned && !native ? { y, opacity } : undefined}>
        <div className="cin-hero-slate"><span>{c.profile.kicker}</span><span>{c.profile.location}</span></div>
        <h1 className="cin-name"><span className="sr-only">{c.profile.wordmark}</span>
          <motion.span aria-hidden initial={reduced ? false : { y: "110%" }} animate={{ y: ready || reduced ? "0%" : "110%" }} transition={{ duration: 1.2, delay: .15, ease: [.16, 1, .3, 1] }}>{c.profile.wordmark}</motion.span>
        </h1>
        <div className="cin-hero-lower">
          <motion.div className="cin-intro" initial={reduced ? false : { opacity: 0, y: 24 }} animate={{ opacity: ready || reduced ? 1 : 0, y: ready || reduced ? 0 : 24 }} transition={{ duration: .7, delay: .55 }}>
            <div className="cin-seal" aria-hidden>
              {ready && !reduced && !glassDone ? <GlassIconReveal logo={LOGO} label="" look="dark" background="#060610" logoColor="#f0f2ff" tileSize={155} logoScale={.85} iconPlate={false} loop={false} play={ready} onComplete={onLogoComplete} speed={2.2} tuning={{ dispersion: 1.5, present: 1.4, glide: 1.1 }} /> : <svg viewBox="0 0 32 32"><path d={MARK_D} transform={MARK_T} fill="currentColor" /></svg>}
            </div>
            <p className="cin-intro-lead">{c.profile.heroLead}</p>
            <p>{c.profile.heroSub}</p>
          </motion.div>
          <nav className="cin-title-menu" aria-label={t.nav.siteMenu}>
            {destinations.map((href, index) => {
              const link = c.navLinks.find((item) => item.href === href)!;
              return <motion.a key={href} href={href} onClick={(event) => { event.preventDefault(); goTo(href); }}
                initial={reduced ? false : { x: 70, opacity: 0 }} animate={{ x: ready || reduced ? 0 : 70, opacity: ready || reduced ? 1 : 0 }}
                transition={{ duration: .7, delay: .7 + index * .12, ease: [.16, 1, .3, 1] }}>
                <span className="tag">0{index + 1}</span><strong>{link.label}</strong><ArrowUpRight aria-hidden />
              </motion.a>;
            })}
          </nav>
        </div>
        <div className="cin-hero-foot"><span>{c.profile.role}</span><a href="#about" onClick={(event) => { event.preventDefault(); goTo("#about"); }}>{t.hero.scroll}<ArrowDown size={18} /></a></div>
      </motion.div>
    </div>
  </section>;
}
