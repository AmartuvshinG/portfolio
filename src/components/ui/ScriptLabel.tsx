"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { navLinks } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * A chapter's name in Mongol script, hung in the page's left gutter beside its
 * masthead like a banner: read top to bottom, as the script is written.
 *
 * Pearl lettering rises into place once as the masthead arrives. Under
 * reduced motion it is drawn at rest.
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
        animate={{ opacity: reduced || seen ? 1 : 0, y: reduced || seen ? 0 : 10 }}
        transition={reduced ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className={cn(GLYPHS, "text-[var(--color-rim)]")}>{text}</span>
      </motion.span>
    </span>
  );
}
