"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { WARP_EVENT, type WarpDetail } from "@/lib/warp";

/**
 * The warp's title card: on every chapter jump (the menu, the hero's stages,
 * the palette), the destination's number and name flash up in the middle of
 * the screen while light streaks past in the direction of travel, the way a
 * game titles a level as it loads it. SmoothScroll announces the jump
 * (lib/warp); this listens, inside the locale, so the name is the reader's
 * language. It plays once per jump, in under a second, and is gone; transform
 * and opacity only. Reduced motion: nothing (the jump itself is instant).
 */
export function WarpCard() {
  const { c } = useI18n();
  const [jump, setJump] = useState<(WarpDetail & { n: number }) | null>(null);

  useEffect(() => {
    let n = 0;
    let hide = 0;
    const on = (e: Event) => {
      const d = (e as CustomEvent<WarpDetail>).detail;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      n += 1;
      setJump({ ...d, n });
      window.clearTimeout(hide);
      hide = window.setTimeout(() => setJump(null), 1100);
    };
    window.addEventListener(WARP_EVENT, on);
    return () => {
      window.removeEventListener(WARP_EVENT, on);
      window.clearTimeout(hide);
    };
  }, []);

  if (!jump) return null;
  const link = c.navLinks.find((l) => l.href === jump.href);
  if (!link) return null;

  return (
    <div key={jump.n} aria-hidden className="warp" data-dir={jump.dir} data-far={jump.far ? "true" : "false"}>
      <span className="warp-streaks">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span key={i} style={{ "--s": i } as React.CSSProperties} />
        ))}
      </span>
      <span className="warp-card">
        <span className="warp-code display-caps tabular">{link.code}</span>
        <span className="warp-label display-caps">{link.label}</span>
      </span>
    </div>
  );
}
