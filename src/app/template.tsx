"use client";

import { motion } from "framer-motion";

/**
 * Per-route enter transition. A cyan panel wipes away from the top while the
 * new route fades in. IMPORTANT: the content wrapper animates opacity only —
 * never transform — so it doesn't create a containing block that would break
 * GSAP ScrollTrigger's position-fixed pinning. The wipe is a fixed sibling,
 * not an ancestor of the content. Reduced-motion is handled by MotionConfig.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[110] bg-cyan"
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "top" }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
}
