"use client";

import * as React from "react";
import { motion, MotionConfig } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The hover slider: a list of titles whose letters roll over on activation.
 * (The panels it used to wipe in went with Skills' drum, craft/CraftIndex,
 * which drives these titles from the same active index.)
 *
 * Adapted from the 21st.dev "animated slideshow" block. What changed:
 * - `framer-motion` rather than `motion/react` — the same v12 library, already
 *   installed.
 * - Controllable: pass `active` + `onActiveChange` and something other than the
 *   pointer (the page scroll, in Craft) can drive it. Uncontrolled still works.
 * - Titles activate on focus as well as hover, and are real buttons, so the
 *   keyboard gets the same slideshow the mouse does.
 * - The rolling glyphs are `aria-hidden`; the label is read once, whole.
 */

interface HoverSliderContextValue {
  activeSlide: number;
  changeSlide: (index: number) => void;
}

const HoverSliderContext = React.createContext<
  HoverSliderContextValue | undefined
>(undefined);

function useHoverSliderContext() {
  const context = React.useContext(HoverSliderContext);
  if (!context)
    throw new Error("useHoverSliderContext must be used within a HoverSlider");
  return context;
}

export function HoverSlider({
  active,
  onActiveChange,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  active?: number;
  onActiveChange?: (index: number) => void;
}) {
  const [own, setOwn] = React.useState(0);
  const activeSlide = active ?? own;
  const changeSlide = React.useCallback(
    (index: number) => {
      if (active === undefined) setOwn(index);
      onActiveChange?.(index);
    },
    [active, onActiveChange],
  );
  return (
    <HoverSliderContext.Provider
      value={{ activeSlide, changeSlide }}
    >
      <div className={className} {...props}>
        {children}
      </div>
    </HoverSliderContext.Provider>
  );
}

/** Per-glyph roll: the dim copy leaves upward as the lit copy arrives. */
export function TextStaggerHover({
  text,
  index,
  stagger = 0.02,
  dim = 0.2,
  className,
  onClick,
  hoverActivates = true,
}: {
  text: string;
  index: number;
  stagger?: number;
  /** Opacity of the resting (inactive) glyphs. */
  dim?: number;
  className?: string;
  onClick?: (index: number) => void;
  /** False: the pointer resting on a title changes nothing — only focus
   *  and click do. For sliders the page scroll also drives. */
  hoverActivates?: boolean;
}) {
  const { activeSlide, changeSlide } = useHoverSliderContext();
  const isActive = activeSlide === index;
  /* Words stay whole and may wrap; each glyph carries a running index so the
     stagger flows across word breaks. */
  const words = text.split(" ");
  let n = 0;

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onMouseEnter={hoverActivates ? () => changeSlide(index) : undefined}
      /* With hover off, a click is a request to glide there (onClick), not to
         jump: only keyboard focus turns it directly. */
      onFocus={(e) => {
        if (hoverActivates || e.currentTarget.matches(":focus-visible")) changeSlide(index);
      }}
      onClick={() => onClick?.(index)}
      className={cn(
        "relative inline-block cursor-pointer text-left",
        className,
      )}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden className="relative inline">
        {words.map((word, w) => (
          <React.Fragment key={w}>
            {w > 0 && " "}
            <span className="inline-block whitespace-nowrap">
              {Array.from(word).map((char) => {
                const i = n++;
                return (
                  <span
                    key={i}
                    className="relative inline-block overflow-hidden align-bottom"
                  >
                    <MotionConfig
                      transition={{
                        delay: i * stagger,
                        duration: 0.3,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                    >
                      <motion.span
                        className="inline-block"
                        style={{ opacity: dim }}
                        initial={false}
                        animate={{ y: isActive ? "-110%" : "0%" }}
                      >
                        {char}
                      </motion.span>
                      <motion.span
                        className="absolute left-0 top-0 inline-block"
                        initial={false}
                        animate={{ y: isActive ? "0%" : "110%" }}
                      >
                        {char}
                      </motion.span>
                    </MotionConfig>
                  </span>
                );
              })}
            </span>
          </React.Fragment>
        ))}
      </span>
    </button>
  );
}
