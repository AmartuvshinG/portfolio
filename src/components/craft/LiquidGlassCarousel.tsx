"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { caseHash, openCase } from "@/lib/caseFile";
import { EASE_EXPO } from "@/lib/motion";
import { ICONS } from "@/components/ui/CapabilityCard";
import { drawPanels, type PanelSpec } from "./panelTexture";
import { createCarousel, type EngineHandle } from "./carouselEngine";
import { pad } from "@/lib/utils";

/**
 * Craft, as a liquid-glass carousel of the six capability cards.
 *
 * Each card is typeset onto a canvas (`panelTexture.ts`) and carried by the
 * WebGL engine (`carouselEngine.ts`), whose lens bends and fringes whatever
 * slides under the centre. Clicking the centred card lifts it and drops the
 * rest away; a glass bar then offers the case file that proves the skill.
 *
 * The canvas is not readable by assistive tech, so the same content is in a
 * visually hidden list, and every control (previous, next, open, close) is a
 * real button. `onFail` hands the section back to the static bento if WebGL
 * cannot start.
 */
export function LiquidGlassCarousel({ onFail }: { onFail: () => void }) {
  const { c, t, locale } = useI18n();
  const items = c.capabilities;
  const mountRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const iconsRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const onFailRef = useRef(onFail);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [ready, setReady] = useState(false);
  /* Phones get a larger type scale baked into the panels. */
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const labelId = useId();

  useEffect(() => {
    onFailRef.current = onFail;
  }, [onFail]);

  const current = items[active] ?? items[0];
  const proof = current.proof ? c.projects.find((p) => p.slug === current.proof) : undefined;

  /* Build the panels, then the engine. Rebuilt on a language or layout
     change, because the text is baked into the textures. */
  useEffect(() => {
    const mount = mountRef.current;
    const iconHost = iconsRef.current;
    if (!mount || !iconHost) return;
    let cancelled = false;
    let engine: EngineHandle | null = null;

    const specs: PanelSpec[] = items.map((item, i) => {
      const svg = iconHost.children[i]?.outerHTML ?? "";
      const pr = item.proof ? c.projects.find((p) => p.slug === item.proof) : undefined;
      return {
        code: item.code,
        title: item.title,
        description: item.description,
        tags: item.tags,
        iconSvg: svg.includes("xmlns") ? svg : svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"'),
        proofLabel: pr ? t.craft.proven : undefined,
        proofTitle: pr?.title,
      };
    });

    drawPanels(specs, compact).then((canvases) => {
      if (cancelled) return;
      engine = createCarousel(mount, cursorRef.current, {
        items: canvases.map((canvas) => ({ canvas })),
        panelHeight: 600,
        gap: 18,
        entry: true,
        onActiveChange: setActive,
        onFocusChange: setFocused,
        onEntryDone: setReady,
      });
      if (!engine) {
        onFailRef.current();
        return;
      }
      engineRef.current = engine;
    });

    return () => {
      cancelled = true;
      engine?.destroy();
      engineRef.current = null;
      setFocused(false);
    };
    /* `c` and `t` change identity with `locale`; the locale is the real key. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, compact]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const eng = engineRef.current;
    if (!eng) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      eng.next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      eng.previous();
    } else if (e.key === "Escape") {
      if (focused) e.preventDefault();
      eng.closeFocus();
    } else if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
      e.preventDefault();
      eng.openCentered();
    }
  };

  return (
    <div
      className="relative h-[min(72vh,640px)] w-full sm:h-[min(86vh,820px)]"
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
      onKeyDown={onKeyDown}
    >
      <p id={labelId} className="sr-only">
        {t.craft.carousel}. {t.craft.hint}.
      </p>
      <p className="sr-only" aria-live="polite">
        {current.title}, {t.craft.position(active + 1, items.length)}
        {focused ? `, ${t.craft.focused}` : ""}
      </p>
      <ul className="sr-only">
        {items.map((item) => (
          <li key={item.code}>
            {item.title}. {item.description} {item.tags.join(", ")}
          </li>
        ))}
      </ul>

      {/* The icons, rendered once so their SVG can be serialised into the
          panel textures. Stroke is set explicitly: `currentColor` has nothing
          to resolve against inside an image. */}
      <div ref={iconsRef} aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          return <Icon key={item.code} size={48} strokeWidth={1.6} color="#eceefb" />;
        })}
      </div>

      <div ref={mountRef} className="absolute inset-0" />

      {/* Counter and steppers, under the row. */}
      <div
        className="absolute inset-x-0 bottom-[3%] flex items-center justify-center gap-4 transition-opacity duration-300"
        style={{ opacity: ready && !focused ? 1 : 0, pointerEvents: ready && !focused ? "auto" : "none" }}
      >
        <button
          type="button"
          onClick={() => engineRef.current?.previous()}
          aria-label={t.craft.prev}
          className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-fg transition-transform duration-200 hover:scale-105"
        >
          <ArrowLeft size={18} aria-hidden />
        </button>
        <span className="font-mono text-sm tabular text-muted">
          {pad(active + 1)} / {pad(items.length)}
        </span>
        <button
          type="button"
          onClick={() => engineRef.current?.next()}
          aria-label={t.craft.next}
          className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-fg transition-transform duration-200 hover:scale-105"
        >
          <ArrowRight size={18} aria-hidden />
        </button>
      </div>

      {/* The focused card's footer: the case file, and a way out. */}
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: EASE_EXPO }}
            style={{ x: "-50%" }}
            className="liquid-glass-live liquid-glass absolute bottom-[3%] left-1/2 flex w-[min(92%,34rem)] items-center justify-between gap-4 rounded-full py-2 pl-6 pr-2"
          >
            {proof ? (
              <a
                href={caseHash(proof.slug)}
                onClick={(e) => {
                  e.preventDefault();
                  openCase(proof.slug);
                }}
                className="group flex min-w-0 items-center gap-3"
              >
                <span className="micro shrink-0">{t.craft.proven}</span>
                <span className="truncate font-tech text-base font-semibold uppercase text-fg">{proof.title}</span>
                <ArrowRight
                  size={16}
                  aria-hidden
                  className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-fg"
                />
              </a>
            ) : (
              <span className="micro">{current.code}</span>
            )}
            <button
              type="button"
              onClick={() => engineRef.current?.closeFocus()}
              className="liquid-glass flex h-10 shrink-0 items-center gap-2 rounded-full px-4 font-mono text-xs uppercase tracking-[0.16em] text-fg"
            >
              <X size={14} aria-hidden />
              {t.craft.close}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The pointer's "View" tag. */}
      <div
        ref={cursorRef}
        aria-hidden
        className="liquid-glass pointer-events-none absolute left-0 top-0 z-20 rounded-full px-3 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-fg opacity-0"
      >
        {t.craft.view}
      </div>
    </div>
  );
}
