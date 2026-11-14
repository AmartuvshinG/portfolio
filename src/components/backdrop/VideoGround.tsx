"use client";

import { useEffect, useRef, useState } from "react";
import { useBootReady } from "@/hooks/useBootReady";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePointerDrift } from "@/hooks/usePointerDrift";
import { groundCovered, isLowPower, markLowPower, onCover, onStrike, setDive } from "@/lib/groundBus";

/**
 * The site's ground: three loops of footage, a dive and a drift.
 *
 *   city     a violet megastructure under a vast moon, the camera pushing
 *            down the avenue. Behind the title screen, the profile and Links.
 *   hole     a black hole's lavender accretion ring. Behind the work: the
 *            camera has gone *into* the moon.
 *   galaxy   a slow purple nebula. Behind Journey and Contact, where the page
 *            gets calm again.
 *
 * **The dive.** As Work's top edge rises from the bottom of the screen to 20%
 * up, the city plate scales about the moon, and the black hole opens through
 * a circle at that same point, its dark core sliding into place on the moon's.
 * The moon turns into the hole, not a wipe.
 *
 * **The drift.** As Journey's top climbs from 100% to 35% of the screen, the
 * galaxy fades in over the hole.
 *
 * Both are pure functions of `scrollY`: a deep link, a nav jump or a climb
 * back up shows exactly the frame that belongs there.
 *
 * **Cost.** One clip plays at a time (two only inside a transition). Later
 * clips aren't fetched until their chapter is within three screens. All stop
 * for a hidden tab, the curtain, and anything opaque over the screen
 * (lib/groundBus `cover`). Transforms are written only inside the dive range.
 *
 * **Grade.** All three clips are already violet. A fixed wash pulls them into
 * the hood palette: crimson pooled low on the left, web-blue on the right, the
 * way the reference is lit. It's one static layer, composited, never animated.
 *
 * Reduced motion: posters only, and the dive is a plain dissolve.
 *
 * Footage (credited in the footer): "Futuristic City Background Video 4K VJ
 * Loop", Infinite Visual; "Black Hole Live Wallpaper", 3rdeyeview; "Purple
 * Classic Galaxy", AA-VFX.
 */

type Plate = "city" | "hole" | "galaxy";
const PLATES: Plate[] = ["city", "hole", "galaxy"];
const src = (p: Plate, phone: boolean) => `/ground/${p}-${phone ? 720 : 1080}.mp4`;
const poster = (p: Plate) => `/ground/${p}-poster.jpg`;

const ASPECT = 16 / 9;
/** The moon on the city plate, in source fractions. */
const MOON = { x: 0.5, y: 0.36 };
/** The black hole's dark core on its plate, in source fractions. */
const CORE = { x: 0.74, y: 0.47 };
/** The hole's first circle as a fraction of the plate's width: the moon's disc. */
const DISC = 0.12;
const DEPTH = 4.2;
const DIVE_INTO = "#work";
const DRIFT_INTO = "#timeline";

/**
 * The dim over the footage, keyed through the page. `at` is a section, `edge`
 * how far through it; a key lands when that point crosses mid-screen. Light
 * where the footage is the point (the title screen, the dive, the opening of
 * Journey), heavier under copy.
 */
const VEIL: { at: string; edge: number; veil: number }[] = [
  { at: "#hero", edge: 0, veil: 0.34 },
  { at: "#hero", edge: 0.7, veil: 0.4 },
  { at: "#about", edge: 0.15, veil: 0.6 },
  { at: "#connect", edge: 0.8, veil: 0.62 },
  { at: "#work", edge: 0.02, veil: 0.32 },
  { at: "#work", edge: 0.2, veil: 0.48 },
  { at: "#capabilities", edge: 0.1, veil: 0.66 },
  { at: "#anatomy", edge: 0.5, veil: 0.72 },
  { at: "#timeline", edge: 0.05, veil: 0.38 },
  { at: "#timeline", edge: 0.6, veil: 0.52 },
  { at: "#contact", edge: 0.3, veil: 0.48 },
  { at: "end", edge: 1, veil: 0.58 },
];

const REST = 1.04;
const ARRIVE_FROM = { transform: "scale(1.18)", filter: "blur(10px)" };
const DRIFT = 14;
const CAST = 0.45;

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function VideoGround() {
  const vids = useRef<Record<Plate, HTMLVideoElement | null>>({ city: null, hole: null, galaxy: null });
  const layers = useRef<Record<Plate, HTMLDivElement | null>>({ city: null, hole: null, galaxy: null });
  const veilRef = useRef<HTMLDivElement>(null);
  const arriveRef = useRef<HTMLDivElement>(null);
  const castRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const drift = usePointerDrift(DRIFT);
  const booted = useBootReady();
  const reduced = useReducedMotion();
  const [phone, setPhone] = useState(false);
  const [want, setWant] = useState<Record<Plate, boolean>>({ city: true, hole: false, galaxy: false });
  const shown = useRef<Record<Plate, boolean>>({ city: true, hole: false, galaxy: false });
  const syncRef = useRef<() => void>(() => {});

  useEffect(() => {
    setPhone(window.matchMedia("(max-width: 768px), (pointer: coarse)").matches);
  }, []);

  /* --- Scroll → dive, drift and veil. ------------------------------------ */
  useEffect(() => {
    const city = layers.current.city;
    const hole = layers.current.hole;
    const galaxy = layers.current.galaxy;
    const veil = veilRef.current;
    if (!city || !hole || !galaxy || !veil) return;

    let W = 0;
    let H = 0;
    let ox = 0;
    let oy = 0;
    let shiftX = 0;
    let shiftY = 0;
    let disc = 0;
    let reach = 0;
    let diveTop = 0;
    let driftTop = 0;
    let heroEnd = 0;
    let keys: { y: number; veil: number }[] = [];
    let raf = 0;
    let lastDive = -1;
    let lastDrift = -1;
    let lastVeil = "";
    let lastUp = "";

    const measure = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      const s = Math.max(W / (H * ASPECT), 1);
      const dw = H * ASPECT * s;
      const dh = H * s;
      const left = (W - dw) / 2;
      const top = (H - dh) / 2;
      ox = left + MOON.x * dw;
      oy = top + MOON.y * dh;
      // Where the hole's core sits unshifted, and how far it must slide to the moon.
      shiftX = ox - (left + CORE.x * dw);
      shiftY = oy - (top + CORE.y * dh);
      disc = DISC * dw;
      reach = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy));
      city.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`;
      hole.style.transformOrigin = city.style.transformOrigin;

      const sy = window.scrollY;
      const top0 = (sel: string) => {
        const el = document.querySelector<HTMLElement>(sel);
        return el ? el.getBoundingClientRect().top + sy : 1e9;
      };
      diveTop = top0(DIVE_INTO);
      driftTop = top0(DRIFT_INTO);
      const heroEl = document.querySelector<HTMLElement>("#hero");
      heroEnd = heroEl ? heroEl.getBoundingClientRect().bottom + sy : H;
      const end = document.documentElement.scrollHeight - H;
      const boost = W < 768 ? 0.08 : 0;
      keys = VEIL.map((k) => {
        const v = k.veil >= 0.45 ? Math.min(0.9, k.veil + boost) : k.veil;
        if (k.at === "end") return { y: end, veil: v };
        const el = document.querySelector<HTMLElement>(k.at);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { y: r.top + sy + r.height * k.edge - H / 2, veil: v };
      })
        .filter((k): k is { y: number; veil: number } => k !== null)
        .sort((a, b) => a.y - b.y);
      lastDive = lastDrift = -1;
      lastVeil = lastUp = "";
    };

    const veilAt = (y: number) => {
      if (!keys.length) return 0.4;
      if (y <= keys[0].y) return keys[0].veil;
      for (let i = 1; i < keys.length; i++) {
        const a = keys[i - 1];
        const b = keys[i];
        if (y <= b.y) return a.veil + (b.veil - a.veil) * clamp((y - a.y) / Math.max(1, b.y - a.y));
      }
      return keys[keys.length - 1].veil;
    };

    const show = (next: Record<Plate, boolean>) => {
      if (PLATES.some((p) => next[p] !== shown.current[p])) {
        shown.current = next;
        syncRef.current();
      }
    };

    const paint = () => {
      raf = 0;
      const y = window.scrollY;
      const p = clamp((y + H - diveTop) / (H * 0.8));
      const q = clamp((y + H - driftTop) / (H * 0.65));
      const v = veilAt(y).toFixed(3);
      if (v !== lastVeil) veil.style.opacity = lastVeil = v;
      const up = clamp(1 - y / Math.max(1, heroEnd - H * 0.5)).toFixed(3);
      if (up !== lastUp && castRef.current) castRef.current.style.opacity = lastUp = up;
      setDive(p);
      show({ city: p < 1, hole: p > 0 && q < 1, galaxy: q > 0 });

      if (q !== lastDrift) {
        lastDrift = q;
        galaxy.style.visibility = q > 0 ? "visible" : "hidden";
        galaxy.style.opacity = easeInOut(q).toFixed(3);
      }
      if (p === lastDive) return;
      lastDive = p;
      const e = easeInOut(p);
      city.style.visibility = p < 1 ? "visible" : "hidden";
      hole.style.visibility = p > 0 ? "visible" : "hidden";
      if (reduced) {
        hole.style.opacity = e.toFixed(3);
        return;
      }
      const depth = 1 + (DEPTH - 1) * e;
      city.style.transform = p > 0 ? `scale(${depth.toFixed(4)})` : "";
      hole.style.opacity = clamp(p / 0.2).toFixed(3);
      // The core starts on the moon and slides home as the hole fills the frame.
      const k = 1 - e;
      hole.style.transform =
        p < 1 ? `translate(${(shiftX * k).toFixed(1)}px, ${(shiftY * k).toFixed(1)}px) scale(${(1.5 - 0.5 * e).toFixed(4)})` : "";
      const r = disc * depth;
      hole.style.clipPath = r >= reach || p >= 1 ? "" : `circle(${r.toFixed(1)}px at ${ox.toFixed(1)}px ${oy.toFixed(1)}px)`;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    measure();
    paint();
    let t: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        measure();
        paint();
      }, 200);
    });
    ro.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

  /* --- The arrival: settle from pushed-in and soft to rest, once. --------- */
  useEffect(() => {
    const el = arriveRef.current;
    if (!el || reduced || !booted) return;
    const anim = el.animate([ARRIVE_FROM, { transform: `scale(${REST})`, filter: "blur(0px)" }], {
      duration: 2800,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "forwards",
    });
    anim.onfinish = () => {
      el.style.transform = `scale(${REST})`;
      el.style.filter = "";
      anim.cancel();
    };
    return () => anim.cancel();
  }, [booted, reduced]);

  /* --- The name's light: when the title fills, it throws a cast. ---------- */
  useEffect(() => {
    const el = lightRef.current;
    if (!el) return;
    if (reduced) {
      el.style.opacity = String(CAST);
      return;
    }
    let anim: Animation | null = null;
    const off = onStrike(() => {
      anim = el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: CAST }], {
        duration: 2200,
        easing: "cubic-bezier(0.33, 0, 0.2, 1)",
        fill: "forwards",
      });
      anim.onfinish = () => {
        el.style.opacity = String(CAST);
        anim?.cancel();
      };
    });
    return () => {
      off();
      anim?.cancel();
    };
  }, [reduced]);

  /* --- Fetch the later plates once their chapter is within three screens. -- */
  useEffect(() => {
    if (reduced) return;
    const near = () => {
      const within = (sel: string) => {
        const el = document.querySelector<HTMLElement>(sel);
        return !!el && el.getBoundingClientRect().top <= window.innerHeight * 3;
      };
      setWant((w) => {
        const hole = w.hole || within(DIVE_INTO);
        const galaxy = w.galaxy || within(DRIFT_INTO);
        return hole === w.hole && galaxy === w.galaxy ? w : { city: true, hole, galaxy };
      });
    };
    window.addEventListener("scroll", near, { passive: true });
    near();
    return () => window.removeEventListener("scroll", near);
  }, [reduced]);

  /* --- Play only what is on screen. -------------------------------------- */
  useEffect(() => {
    if (reduced) return;
    const sync = () => {
      const live = booted && document.visibilityState === "visible" && !groundCovered();
      for (const p of PLATES) {
        const v = vids.current[p];
        if (!v || (!v.currentSrc && !v.getAttribute("src"))) continue;
        const on = live && shown.current[p];
        if (on && v.paused)
          v.play().catch((e: unknown) => {
            if (e instanceof DOMException && e.name === "NotAllowedError") markLowPower();
          });
        else if (!on && !v.paused) v.pause();
      }
    };
    /* Warm a plate while it's still off screen: one play and pause, so its
       decoder is up before the transition reaches it. */
    const warmers = PLATES.map((p) => {
      const v = vids.current[p];
      if (!v || p === "city") return () => {};
      let warmed = false;
      const warm = () => {
        if (warmed || shown.current[p] || !booted || isLowPower()) return sync();
        warmed = true;
        v.play()
          .then(() => {
            if (!shown.current[p]) v.pause();
          })
          .catch(() => {});
      };
      v.addEventListener("loadeddata", warm);
      if (v.readyState >= 2) warm();
      return () => v.removeEventListener("loadeddata", warm);
    });
    syncRef.current = sync;
    sync();
    const city = vids.current.city;
    document.addEventListener("visibilitychange", sync);
    const unCover = onCover(sync);
    city?.addEventListener("loadeddata", sync);
    return () => {
      syncRef.current = () => {};
      document.removeEventListener("visibilitychange", sync);
      unCover();
      city?.removeEventListener("loadeddata", sync);
      warmers.forEach((w) => w());
    };
  }, [booted, reduced, want]);

  const video = (p: Plate) =>
    reduced ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={poster(p)} alt="" className="h-full w-full object-cover" />
    ) : (
      <video
        ref={(el) => {
          vids.current[p] = el;
        }}
        className="h-full w-full object-cover"
        src={want[p] ? src(p, phone) : undefined}
        poster={poster(p)}
        muted
        loop
        playsInline
        preload={want[p] ? "auto" : "none"}
      />
    );

  return (
    <>
      <div
        ref={(el) => {
          layers.current.city = el;
        }}
        className="absolute inset-0 will-change-transform"
      >
        {reduced ? (
          video("city")
        ) : (
          <div ref={arriveRef} className="absolute inset-0" style={ARRIVE_FROM}>
            <div ref={drift} className="absolute inset-0">
              {video("city")}
            </div>
          </div>
        )}
      </div>
      <div
        ref={(el) => {
          layers.current.hole = el;
        }}
        className="absolute inset-0 will-change-transform"
        style={{ visibility: "hidden", opacity: 0 }}
      >
        {video("hole")}
      </div>
      <div
        ref={(el) => {
          layers.current.galaxy = el;
        }}
        className="absolute inset-0 will-change-[opacity]"
        style={{ visibility: "hidden", opacity: 0 }}
      >
        {video("galaxy")}
      </div>
      {/* The grade: the hood's light. Static, so it costs one composite. */}
      <div
        className="absolute inset-0 mix-blend-soft-light"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 0% 100%, rgb(255 31 61 / 0.55), transparent 70%), radial-gradient(ellipse 55% 65% at 100% 20%, rgb(86 100 255 / 0.45), transparent 70%)",
        }}
      />
      <div ref={veilRef} className="absolute inset-0 bg-void will-change-[opacity]" style={{ opacity: 0.3 }} />
      {/* The title's light, centred on the name, fading with the hero. */}
      <div ref={castRef} className="pointer-events-none absolute inset-0 mix-blend-screen will-change-[opacity]">
        <div
          ref={lightRef}
          className="absolute inset-0"
          style={{
            opacity: 0,
            background:
              "radial-gradient(ellipse 58% 26% at 38% 46%, rgb(232 28 200 / 0.42), rgb(255 31 61 / 0.16) 50%, transparent 80%)",
          }}
        />
      </div>
      {/* The floor of the frame darkens, so the menu always stands on ground. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[45vh]"
        style={{
          background: "linear-gradient(180deg, transparent, color-mix(in srgb, var(--color-void) 70%, transparent))",
        }}
      />
    </>
  );
}
