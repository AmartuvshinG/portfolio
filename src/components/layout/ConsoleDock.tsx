"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Eye, EyeOff, Layers, Volume2, VolumeX } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";
import { usePref, usePrefsHydration, setPref } from "@/hooks/usePrefs";
import { socials } from "@/lib/content";
import { cn } from "@/lib/utils";

/* Magnification profile: an item at the pointer grows to MAX, falling off to
   REST over FALLOFF px either side. */
const REST = 38;
const MAX = 62;
const FALLOFF = 130;

interface DockItem {
  key: string;
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Renders the item in the "engaged" accent state. */
  active?: boolean;
}

/**
 * Outbound links use a two-letter mono glyph rather than a brand mark. Lucide
 * v1 dropped brand icons, and a HUD code reads more like the rest of the
 * system than a logo would — plus there's no third-party mark to license.
 */
function SocialGlyph({ code }: { code: string }) {
  return (
    <span className="font-mono text-[0.7rem] font-medium tracking-[0.05em]">
      {code}
    </span>
  );
}

/**
 * Floating console dock.
 *
 * Deliberately *not* a second navigation — the command bar owns section links.
 * This consolidates the site's scattered chrome (ambient audio, HUD reticle,
 * ambient texture) plus outbound profiles into one instrument panel, so the
 * viewport corners stay clean.
 *
 * The magnification is the dock's signature: pointer distance drives each
 * item's size through a spring. It's switched off wholesale for coarse
 * pointers and reduced motion, where it's noise rather than delight.
 */
export function ConsoleDock() {
  usePrefsHydration();
  const reduced = useReducedMotion();
  const audio = useAmbientAudio();
  const cursorOn = usePref("cursor");
  const ambientOn = usePref("ambient");
  const [open, setOpen] = useState(false);

  const mouseX = useMotionValue(Number.POSITIVE_INFINITY);

  const items: DockItem[] = [
    {
      key: "audio",
      label: audio.on ? "Ambient audio · on" : "Ambient audio · off",
      icon: audio.on ? <Volume2 size={16} /> : <VolumeX size={16} />,
      onClick: audio.toggle,
      active: audio.on,
    },
    {
      key: "cursor",
      label: cursorOn ? "HUD reticle · on" : "HUD reticle · off",
      icon: cursorOn ? <Eye size={16} /> : <EyeOff size={16} />,
      onClick: () => setPref("cursor", !cursorOn),
      active: cursorOn,
    },
    {
      key: "ambient",
      label: ambientOn ? "Ambient texture · on" : "Ambient texture · off",
      icon: <Layers size={16} />,
      onClick: () => setPref("ambient", !ambientOn),
      active: ambientOn,
    },
    ...socials.map((s) => ({
      key: s.label,
      label: `${s.label} — ${s.handle}`,
      icon: <SocialGlyph code={s.code} />,
      href: s.href,
    })),
  ];

  return (
    <>
      {/* Desktop / fine pointer */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[70] hidden justify-center md:flex">
        <motion.div
          onMouseMove={(e) => mouseX.set(e.clientX)}
          onMouseLeave={() => mouseX.set(Number.POSITIVE_INFINITY)}
          className="chamfer-lg glass pointer-events-auto flex items-end gap-2 px-3 pb-2.5 pt-2"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {items.map((item, i) => (
            <DockButton
              key={item.key}
              item={item}
              mouseX={mouseX}
              magnify={!reduced}
              // Visual break between the toggles and the outbound links.
              separatorBefore={i === 3}
            />
          ))}
        </motion.div>
      </div>

      {/* Coarse pointer: a single collapsed control that fans upward */}
      <div className="fixed bottom-5 right-5 z-[70] md:hidden">
        <AnimatePresence>
          {open && (
            <motion.ul className="absolute inset-x-0 bottom-full mb-2 flex flex-col items-center gap-2">
              {items.map((item, i) => (
                <motion.li
                  key={item.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10, transition: { delay: i * 0.03 } }}
                  transition={{ delay: (items.length - 1 - i) * 0.03 }}
                >
                  <StaticDockButton item={item} />
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close console" : "Open console"}
          className="chamfer-sm glass flex h-11 w-11 items-center justify-center text-cyan"
        >
          <Layers size={17} />
        </button>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function DockButton({
  item,
  mouseX,
  magnify,
  separatorBefore,
}: {
  item: DockItem;
  mouseX: MotionValue<number>;
  magnify: boolean;
  separatorBefore?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return Number.POSITIVE_INFINITY;
    return val - bounds.x - bounds.width / 2;
  });

  const sizeTarget = useTransform(
    distance,
    [-FALLOFF, 0, FALLOFF],
    [REST, MAX, REST]
  );
  const size = useSpring(sizeTarget, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const surfaceClass = cn(
    "chamfer-sm flex h-full w-full items-center justify-center border transition-colors",
    item.active
      ? "border-cyan/50 bg-cyan/10 text-cyan"
      : "border-line bg-surface-2/60 text-muted hover:border-cyan/50 hover:text-cyan"
  );

  const surfaceProps = {
    "aria-label": item.label,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setHovered(true),
    onBlur: () => setHovered(false),
    className: surfaceClass,
  };

  return (
    <>
      {separatorBefore && (
        <span aria-hidden className="mb-3 h-6 w-px shrink-0 bg-line" />
      )}
      <motion.div
        ref={ref}
        style={magnify ? { width: size, height: size } : { width: REST, height: REST }}
        className="relative flex shrink-0 items-end"
      >
        <AnimatePresence>
          {hovered && (
            <motion.span
              initial={{ opacity: 0, y: 6, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 4, x: "-50%" }}
              className="pointer-events-none absolute -top-9 left-1/2 whitespace-nowrap border border-line bg-bg/95 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-fg backdrop-blur"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {item.href ? (
          <a
            {...surfaceProps}
            href={item.href}
            target="_blank"
            rel="noreferrer noopener"
          >
            {item.icon}
          </a>
        ) : (
          <button
            {...surfaceProps}
            type="button"
            onClick={item.onClick}
            aria-pressed={item.active}
          >
            {item.icon}
          </button>
        )}
      </motion.div>
    </>
  );
}

/** Non-magnifying variant for the mobile fan and reduced motion. */
function StaticDockButton({ item }: { item: DockItem }) {
  const className = cn(
    "chamfer-sm flex h-11 w-11 items-center justify-center border backdrop-blur transition-colors",
    item.active
      ? "border-cyan/50 bg-cyan/10 text-cyan"
      : "border-line bg-surface-2/80 text-muted"
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={item.label}
        className={className}
      >
        {item.icon}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={item.onClick}
      aria-label={item.label}
      aria-pressed={item.active}
      className={className}
    >
      {item.icon}
    </button>
  );
}
