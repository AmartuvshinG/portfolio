"use client";

import * as React from "react";
import { motion, MotionConfig, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The hover slider: a list of titles whose letters roll over on activation,
 * beside a stack of panels that wipe in from the top.
 *
 * Adapted from the 21st.dev "animated slideshow" block. What changed:
 * - `framer-motion` rather than `motion/react` — the same v12 library, already
 *   installed.
 * - Controllable: pass `active` + `onActiveChange` and something other than the
 *   pointer (the page scroll, in Craft) can drive it. Uncontrolled still works.
 * - Titles activate on focus as well as hover, and are real buttons, so the
 *   keyboard gets the same slideshow the mouse does.
 * - The rolling glyphs are `aria-hidden`; the label is read once, whole.
 * - Panels take any children, not just an `<img>`.
 */

interface HoverSliderContextValue {
  activeSlide: number;
  /** The slide that was active before this one; it stays up under the wipe. */
  prevSlide: number;
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
  /* Remember the outgoing slide, so it can sit fully shown under the incoming
     wipe. Letting it retract while the new one extends leaves a band of empty
     frame between the two edges. (State adjusted during render, not in an
     effect, so there is no frame where both are wrong.) */
  const [shown, setShown] = React.useState(activeSlide);
  const [prevSlide, setPrevSlide] = React.useState(-1);
  if (shown !== activeSlide) {
    setPrevSlide(shown);
    setShown(activeSlide);
  }
  return (
    <HoverSliderContext.Provider
      value={{ activeSlide, prevSlide, changeSlide }}
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
}: {
  text: string;
  index: number;
  stagger?: number;
  /** Opacity of the resting (inactive) glyphs. */
  dim?: number;
  className?: string;
  onClick?: (index: number) => void;
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
      onMouseEnter={() => changeSlide(index)}
      onFocus={() => changeSlide(index)}
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

export const clipPathVariants = {
  visible: { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
  hidden: { clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)" },
};

/** Stacks every panel in one grid cell, so they overlap without absolute boxes. */
export function HoverSliderImageWrap({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid overflow-hidden [&>*]:col-start-1 [&>*]:col-end-1 [&>*]:row-start-1 [&>*]:row-end-1 [&>*]:size-full",
        className,
      )}
      {...props}
    />
  );
}

/**
 * One panel. The active one wipes down into view over the one it replaces,
 * which holds still underneath; every other panel is already gone.
 */
export function HoverSliderPanel({
  index,
  className,
  children,
  ...props
}: HTMLMotionProps<"div"> & { index: number }) {
  const { activeSlide, prevSlide } = useHoverSliderContext();
  const isActive = activeSlide === index;
  const isPrev = prevSlide === index;
  return (
    <motion.div
      aria-hidden={!isActive}
      inert={!isActive}
      className={cn("relative", className)}
      style={{ zIndex: isActive ? 3 : isPrev ? 2 : 1 }}
      transition={
        isActive || isPrev
          ? { ease: [0.33, 1, 0.68, 1], duration: 0.8 }
          : { duration: 0 }
      }
      variants={clipPathVariants}
      initial={false}
      animate={isActive || isPrev ? "visible" : "hidden"}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function HoverSliderImage({
  index,
  className,
  ...props
}: HTMLMotionProps<"img"> & { index: number }) {
  const { activeSlide } = useHoverSliderContext();
  return (
    <motion.img
      className={cn("inline-block align-middle", className)}
      transition={{ ease: [0.33, 1, 0.68, 1], duration: 0.8 }}
      variants={clipPathVariants}
      initial={false}
      animate={activeSlide === index ? "visible" : "hidden"}
      {...props}
    />
  );
}
