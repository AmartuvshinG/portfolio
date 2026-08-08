"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One depth plane in the hero stack.
 *
 * The whole hero is a stack of these, each handed the *same* scroll progress and
 * differing only in how far it travels and how much it grows. That difference is
 * the entire effect: the reference clips read as depth not because anything is
 * actually in 3D, but because the near plates move further and grow faster than
 * the far ones, and the near plates are painted over the wordmark so they cut
 * across the letterforms.
 *
 * Two rules this component exists to enforce:
 *
 * 1. **Transform only.** `translate3d` and `scale`, nothing else. A plate that
 *    animates a filter, a blur or a background-position is a plate that
 *    re-rasterises a viewport-sized surface every frame — the exact class of bug
 *    that made this site's scroll laggy before (see the About bloom and the
 *    aurora veil in the perf pass).
 * 2. **`will-change` is not free.** Eight permanently promoted full-bleed layers
 *    is memory the rest of the page needs, so the promotion is owned by the
 *    stack and dropped the moment the hero leaves the viewport — hence `active`
 *    rather than a static class.
 */
export interface PlateSpec {
  /** Travel over the full scroll run, in vh. Negative travels up the screen. */
  travel: number;
  /** Scale at the end of the run. 1 = no growth. */
  scale: number;
  /** Paint order. Higher is nearer the viewer, and occludes what is below it. */
  z: number;
}

export function Plate({
  spec,
  progress,
  active,
  reduced,
  className,
  children,
}: {
  spec: PlateSpec;
  progress: MotionValue<number>;
  /** Hero is on screen — promote. Cleared on exit to hand the memory back. */
  active: boolean;
  reduced: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const y = useTransform(progress, [0, 1], ["0vh", `${spec.travel}vh`]);
  const scale = useTransform(progress, [0, 1], [1, spec.scale]);

  return (
    <motion.div
      aria-hidden={!children ? true : undefined}
      className={cn("absolute inset-0", className)}
      style={
        reduced
          ? { zIndex: spec.z }
          : {
              y,
              scale,
              zIndex: spec.z,
              willChange: active ? "transform" : "auto",
            }
      }
    >
      {children}
    </motion.div>
  );
}
