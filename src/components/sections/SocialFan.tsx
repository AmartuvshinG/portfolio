"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { socials } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The fanned arc — Lando's closing move.
 *
 * Cards are splayed along a shallow arc, each rotated to its own tangent and
 * dropped by the cosine of its offset so the row curves. Hovering one lifts it
 * clear of its neighbours.
 *
 * The geometry has to be derived rather than hand-tuned per card: with hardcoded
 * rotations the arc breaks the moment a social link is added or removed, and
 * this list is exactly the kind of thing that changes.
 */

/** Total sweep across the fan, degrees. */
const SPREAD = 26;
/** Vertical drop from centre card to outermost, px. */
const ARC = 34;

export function SocialFan() {
  const reduced = useReducedMotion();
  const mid = (socials.length - 1) / 2;

  return (
    <ul className="flex items-end justify-center">
      {socials.map((social, i) => {
        // -1 at the left edge, 0 at centre, +1 at the right.
        const t = mid === 0 ? 0 : (i - mid) / mid;
        const rotate = t * (SPREAD / 2);
        const drop = (1 - Math.cos(t * 1.1)) * ARC * 3;

        return (
          <motion.li
            key={social.label}
            style={{
              rotate,
              marginTop: drop,
              // Overlap so the cards read as one deck rather than a row.
              marginLeft: i === 0 ? 0 : "-2.5rem",
              zIndex: socials.length - Math.abs(i - mid),
            }}
            whileHover={reduced ? undefined : { y: -22, rotate: rotate * 0.4 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <a
              href={social.href}
              target="_blank"
              rel="noreferrer noopener"
              className="notch-card-sm block w-24 overflow-hidden bg-void-2 ring-1 ring-inset ring-white/15 sm:w-32 md:w-40"
            >
              <div className="relative aspect-[3/4] w-full">
                <Image
                  src={`https://picsum.photos/seed/social-${social.code}/400/533`}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-3 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-paper">
                  {social.label}
                </span>
              </div>
            </a>
          </motion.li>
        );
      })}
    </ul>
  );
}
