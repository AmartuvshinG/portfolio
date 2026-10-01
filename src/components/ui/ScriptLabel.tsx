"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { navLinks } from "@/lib/content";
import { strike } from "@/lib/neonStrike";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * A chapter's name in Mongol script, hung in the page's left gutter beside its
 * masthead like a banner: read top to bottom, as the script is written.
 *
 * It writes itself once, the first time it is seen — revealed top to bottom
 * the way the intro's brush moves — then strikes on as a sodium neon tube
 * (lib/neonStrike), the street's voice for words. Under reduced motion it is
 * simply lit.
 *
 * It lives in the gutter (absolute, lg+) so it can never push or collide with
 * the masthead's own type; below lg there is no gutter, and it is not shown.
 * Decoration: the chapter's name is the heading beside it.
 */
const GLYPHS = "font-script block text-[1.5rem] leading-none [writing-mode:vertical-lr]";

export function ScriptLabel({ href, className }: { href: string; className?: string }) {
  const text = navLinks.find((l) => l.href === href)?.script;
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  if (!text) return null;

  return (
    <span
      ref={ref}
      aria-hidden
      lang="mn-Mong"
      className={cn(
        "pointer-events-none absolute -left-9 top-0 hidden select-none lg:block",
        className
      )}
    >
      <motion.span
        className="relative block"
        initial={false}
        animate={{ clipPath: reduced || seen ? "inset(0% 0% 0% 0%)" : "inset(0% 0% 100% 0%)" }}
        transition={reduced ? { duration: 0 } : { duration: 1.1, ease: [0.45, 0, 0.25, 1] }}
      >
        {/* The unlit tube: what the reveal writes. */}
        <span className={cn(GLYPHS, "text-[color-mix(in_srgb,var(--color-hazard)_30%,transparent)]")}>{text}</span>
        {/* The lit tube over it, struck once the word is written. */}
        <motion.span
          className={cn(GLYPHS, "absolute inset-0 text-[var(--color-hazard)]")}
          style={{
            textShadow:
              "0 0 14px color-mix(in srgb, var(--color-hazard) 55%, transparent), 0 0 2px color-mix(in srgb, var(--color-hazard) 70%, white)",
          }}
          initial={false}
          {...strike(seen, reduced, 1.0, 0.6)}
        >
          {text}
        </motion.span>
      </motion.span>
    </span>
  );
}
