import type { Variants, Transition } from "framer-motion";

/**
 * Shared Framer Motion presets. Every animated component pulls from here so
 * the whole site shares one rhythm (easing + durations). Enter animations use
 * expo-out; exits are ~65% of enter duration per motion best practice.
 */

export const EASE_EXPO: Transition["ease"] = [0.16, 1, 0.3, 1];
export const EASE_POWER: Transition["ease"] = [0.7, 0, 0.3, 1];

/** Fade + rise, used for most block-level reveals. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_EXPO },
  },
};

/** Fade only. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: EASE_EXPO } },
};

/** Scale-in for cards / stat tiles. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 16 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.42, ease: EASE_EXPO },
  },
};

/** Parent container that staggers its children on enter. */
export const staggerParent = (stagger = 0.06, delay = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

/** Clip-based reveal (wipe from left). */
export const clipReveal: Variants = {
  hidden: { clipPath: "inset(0 100% 0 0)" },
  show: {
    clipPath: "inset(0 0% 0 0)",
    transition: { duration: 0.55, ease: EASE_EXPO },
  },
};

/** Default viewport config for whileInView usage. */
export const inView = { once: true, margin: "0px 0px -6% 0px" } as const;
