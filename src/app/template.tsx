"use client";

import { motion } from "framer-motion";
import { GlowHorizon } from "@/components/ui/GlowHorizon";

/**
 * Per-route enter transition.
 *
 * An ink panel wipes away from the top with a glow horizon riding its trailing
 * edge, so navigating to a case file speaks the same arc language as scrolling
 * into a section or arriving from the preloader. A plain colour wipe here was
 * the one entrance on the site that said nothing.
 *
 * IMPORTANT: the content wrapper animates opacity only — never transform — so
 * it doesn't create a containing block that would break GSAP ScrollTrigger's
 * position-fixed pinning. Both the wipe and the horizon are fixed siblings, not
 * ancestors of the content. Reduced motion is handled by MotionConfig.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[110] overflow-hidden bg-void"
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "top" }}
      >
        {/* Counter-scaled so the horizon keeps its shape while the panel above
            it collapses — inheriting the scaleY would flatten the arcs into a
            line before they ever read as arcs. */}
        <motion.div
          className="absolute inset-0"
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 40 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: "bottom" }}
        >
          <GlowHorizon variant="bottom" intensity={0.75} />
        </motion.div>
      </motion.div>

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
