import type { Variants, Transition } from "framer-motion";

/**
 * Shared Framer Motion presets. Every animated component pulls from here so
 * the whole site shares one rhythm (easing + durations). Enter animations use
 * expo-out; exits are ~65% of enter duration per motion best practice.
 */

export const EASE_EXPO: Transition["ease"] = [0.16, 1, 0.3, 1];
export const EASE_POWER: Transition["ease"] = [0.7, 0, 0.3, 1];
/** Heavy start, long settle: things with weight arriving (the develop line,
 *  title cards). */
export const EASE_DEVELOP: Transition["ease"] = [0.22, 1, 0.36, 1];

/**
 * The four durations, seconds (the handoff's motion system). Pick one of
 * these rather than inventing a fifth.
 *   micro      hover and press feedback
 *   short      small state changes, label swaps
 *   medium     a block arriving
 *   cinematic  title cards, overlays, the intro's exits
 */
export const DUR = { micro: 0.15, short: 0.32, medium: 0.7, cinematic: 1.2 } as const;

/**
 * The develop reveal — the site's one entrance. Content resolves top to
 * bottom, the way the intro's brush writes the name, behind a travelling
 * sodium line (the `.develop-front` child that Reveal adds).
 *
 * The clip opens past the box on every side (−12%) so glows and focus rings
 * are not cut while it runs, and is removed outright once it lands: a clip
 * left in place would crop every hover glow inside for good.
 */
export const develop: Variants = {
  hidden: { opacity: 0, y: 12, clipPath: "inset(0% -12% 100% -12%)" },
  show: {
    opacity: 1,
    y: 0,
    clipPath: "inset(-12% -12% -12% -12%)",
    transition: { duration: DUR.medium, ease: EASE_DEVELOP, opacity: { duration: 0.35 } },
    transitionEnd: { clipPath: "none" },
  },
};

/** The develop line itself: down the box, then gone. */
export const developFront: Variants = {
  hidden: { y: "-100%", opacity: 0 },
  show: {
    y: "0%",
    opacity: [0, 1, 1, 0],
    transition: { duration: DUR.medium, ease: EASE_DEVELOP, opacity: { duration: DUR.medium, times: [0, 0.1, 0.75, 1] } },
  },
};

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
