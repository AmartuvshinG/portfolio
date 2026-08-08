"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * How much atmosphere this machine should be asked to render.
 *
 * The hero is a ten-plane depth stack with weather on it, and measured against
 * the flat hero it replaced it costs roughly 1.5x the frame at a 6x CPU
 * throttle. On a desktop that is invisible. On a four-core laptop or a phone it
 * is the difference between a scroll that glides and one that does not — and
 * this site has already been reported as laggy once, which is a mistake worth
 * not repeating.
 *
 * So the expensive half is conditional. `full` gets rain, standing water, the
 * searchlight and the blimp; `lite` keeps every plate, the city, the point cloud
 * and the whole depth effect, and drops only the things that are atmosphere
 * rather than composition. Nobody gets a broken picture; some people get a
 * quieter one.
 *
 * Three inputs, in order of how much they are trusted:
 *
 *   1. `<html data-power="low">` — an explicit choice, and it always wins.
 *   2. `prefers-reduced-motion` — already means "stop moving things at me".
 *   3. Device hints — core count, memory, and whether there is a fine pointer.
 *      Crude, widely lied about, and still a better guess than assuming every
 *      visitor is on the machine this was built on.
 *
 * SSR returns `lite`, so first paint is never the heavy path and the upgrade
 * happens once the client knows what it is running on.
 */
export type Quality = "full" | "lite";

interface NavigatorWithHints extends Navigator {
  deviceMemory?: number;
}

function measure(): Quality {
  if (typeof window === "undefined") return "lite";

  if (document.documentElement.dataset.power === "low") return "lite";

  const nav = navigator as NavigatorWithHints;
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (!finePointer) return "lite";
  if (cores <= 4) return "lite";
  if (memory <= 4) return "lite";
  return "full";
}

export function useQuality(): Quality {
  const reduced = useReducedMotion();
  const [quality, setQuality] = useState<Quality>("lite");

  useEffect(() => {
    const update = () => setQuality(measure());
    update();

    /* The low-power toggle writes to <html>, so watch it rather than routing
       the value through React state that half the tree would have to thread. */
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-power"],
    });

    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    mq.addEventListener("change", update);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);

  return reduced ? "lite" : quality;
}
