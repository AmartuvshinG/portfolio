"use client";

import { useEffect, useRef, useState } from "react";
import { useBootReady } from "@/hooks/useBootReady";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePointerDrift } from "@/hooks/usePointerDrift";
import { groundCovered, onCover, onStrike, setDive } from "@/lib/groundBus";
import { NeonGround } from "./NeonGround";

/**
 * The site's ground: two loops of footage, and one dive between them.
 *
 *   sakura   a blossoming tree on a cliff against a blue full moon. Behind the
 *            hero, About, Links and Projects: who he is, where to find
 *            him, what he built.
 *   tunnel   a red hexagonal corridor flying forward. Behind Skills,
 *            Capstone, Journey and Contact: the machine room.
 *
 * **The dive.** As Skills' top edge rises from the bottom of the screen to 20%
 * up, the camera pushes into the moon and the corridor opens out of it: the
 * sakura plate scales about a point on the moon's clear face, and the tunnel
 * shows through a circle at that same point that grows with it. A circle in a
 * circle becomes a hexagon in a hexagon. The circle starts as the moon's
 * own disc, so the eye reads the moon *turning into* the tunnel, not a wipe.
 *
 * Progress is a pure function of `scrollY` (the film's rule): a deep link, a
 * nav jump or a climb back up shows exactly the frame that belongs there, and
 * there is no state to get out of step. Nothing here listens to time except
 * the videos themselves, which simply loop.
 *
 * **Cost.** One clip plays at a time: the tunnel is paused (and not even
 * fetched until Work is near) while the cliff is the ground, the cliff is
 * paused once the dive is through. Both stop for a hidden tab, the intro
 * curtain, and anything opaque over the screen (lib/groundBus `cover`). The
 * transforms are written per scroll frame only inside the dive range.
 *
 * **The arrival.** The cliff is not simply there when the curtain lifts: it
 * starts pushed in and out of focus and settles over ~3.2s, a camera pulling
 * back to find the frame as the name rises into it. Blur is costly on a
 * fullscreen video, so it runs once and the filter is then removed outright.
 *
 * **The sign's light.** When the hero name strikes (groundBus `strike`), its
 * sodium light spills onto the cliff and the moon: a warm cast centred on the
 * name, stuttering in step with the tube (the same keyframes as
 * `neon-strike`), then holding low. It fades with the hero, like the scrim,
 * and sits under the scrim, so it never lifts the floor the copy stands on.
 *
 * **Depth.** The cliff drifts a little against the cursor, at under half the
 * name's travel, so the frame has two planes before anyone scrolls. The plate
 * rests at 1.03× so the drift never shows an edge.
 *
 * The rain (NeonGround) is the tunnel's weather: it fades in with the dive and
 * draws nothing before it. Reduced motion: posters only, and the dive is a
 * plain dissolve.
 *
 * Footage: "Sakura On The Cliff In Blue Moon Night" and "Red Future Tunnel",
 * Infinite Visual (youtube.com/@infinite.visual) — credited in the footer.
 */

const SET = {
  desktop: { sakura: "/ground/sakura-1080.mp4", tunnel: "/ground/tunnel-1080.mp4" },
  phone: { sakura: "/ground/sakura-720.mp4", tunnel: "/ground/tunnel-720.mp4" },
  poster: { sakura: "/ground/sakura-poster.jpg", tunnel: "/ground/tunnel-poster.jpg" },
} as const;

/** Source aspect of both clips. */
const ASPECT = 16 / 9;
/** Where the camera dives, in source fractions: the moon's clear right half,
 *  clear of the tree. The moon itself is centred ≈ (0.52, 0.49), r ≈ 0.205w. */
const DIVE_AT = { x: 0.57, y: 0.47 };
/** The tunnel's first circle, as a fraction of the plate's width: inside the
 *  moon from the dive point. */
const DISC = 0.15;
/** Horizontal crop anchor. On a portrait phone `cover` shows ~a quarter of the
 *  frame; 46% keeps the tree's crown and the moon both in it. */
const POS_X = 0.46;
/** How deep the sakura plate scales by the end of the dive. */
const DEPTH = 5;
/** The section the camera dives at. Projects stays on the cliff: the sakura
 *  plate is the site's face, and the tunnel had most of the page. */
const DIVE_INTO = "#capabilities";

/**
 * The dim over the footage, keyed through the page. `at` is a section, `edge`
 * how far through it (0 top, 1 bottom); a key lands when that point crosses
 * mid-screen and the veil runs linearly between keys. Light where the footage
 * is the point (the hero, the dive), heavy under copy — measured against the
 * brightest pixels behind the text, not chosen.
 */
const VEIL: { at: string; edge: number; veil: number }[] = [
  { at: "#hero", edge: 0, veil: 0.3 },
  { at: "#hero", edge: 0.7, veil: 0.36 },
  { at: "#about", edge: 0.1, veil: 0.76 },
  { at: "#connect", edge: 0.8, veil: 0.78 },
  { at: "#work", edge: 0.05, veil: 0.76 },
  { at: "#work", edge: 0.94, veil: 0.76 },
  { at: "#capabilities", edge: 0, veil: 0.4 },
  { at: "#capabilities", edge: 0.08, veil: 0.6 },
  { at: "#timeline", edge: 0.5, veil: 0.62 },
  { at: "#contact", edge: 0.3, veil: 0.7 },
  { at: "end", edge: 1, veil: 0.74 },
];

/** The plate's resting scale: margin for the drift to travel into. */
const REST = 1.03;
/** Where the arrival starts: pushed in and soft. */
const ARRIVE_FROM = { transform: "scale(1.16)", filter: "blur(9px)" };
/** The cliff's drift at full deflection, px. The name's is 30. */
const DRIFT = 13;
/** The sign's light once it holds, as a fraction of its peak. */
const CAST = 0.5;
/** `neon-strike` (globals.css) as WAAPI keyframes over the same 0.9s. */
const STRIKE: Keyframe[] = [
  { opacity: 0.05, offset: 0 },
  { opacity: 1, offset: 0.06 },
  { opacity: 0.25, offset: 0.1 },
  { opacity: 1, offset: 0.18 },
  { opacity: 0.35, offset: 0.22 },
  { opacity: 1, offset: 0.34 },
  { opacity: 0.65, offset: 0.4 },
  { opacity: 1, offset: 0.46 },
  { opacity: 1, offset: 1 },
];

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function VideoGround() {
  const sakuraRef = useRef<HTMLVideoElement>(null);
  const tunnelRef = useRef<HTMLVideoElement>(null);
  const sakuraLayer = useRef<HTMLDivElement>(null);
  const tunnelLayer = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const arriveRef = useRef<HTMLDivElement>(null);
  const castRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const drift = usePointerDrift(DRIFT);
  const booted = useBootReady();
  const reduced = useReducedMotion();
  const [phone, setPhone] = useState(false);
  const [wantTunnel, setWantTunnel] = useState(false);
  /* Which plates are showing, written by the dive and read by playback. */
  const shown = useRef({ sakura: true, tunnel: false });
  const syncRef = useRef<() => void>(() => {});

  useEffect(() => {
    // Read once on mount: a desktop resized narrow keeps the set it loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhone(window.matchMedia("(max-width: 768px)").matches);
  }, []);

  /* --- Scroll → dive and veil. --------------------------------------------- */
  useEffect(() => {
    const sak = sakuraLayer.current;
    const tun = tunnelLayer.current;
    const veil = veilRef.current;
    if (!sak || !tun || !veil) return;

    let W = 0;
    let H = 0;
    /* The dive point and the first disc, in viewport px. */
    let ox = 0;
    let oy = 0;
    let disc = 0;
    let reach = 0;
    let diveTop = 0;
    let heroEnd = 0;
    let keys: { y: number; veil: number }[] = [];
    let raf = 0;
    let lastP = -1;

    const measure = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      // object-fit: cover, object-position: POS_X 50%
      const s = Math.max(W / (H * ASPECT), 1);
      const dw = H * ASPECT * s;
      const dh = H * s;
      const left = (W - dw) * POS_X;
      const top = (H - dh) / 2;
      ox = left + DIVE_AT.x * dw;
      oy = top + DIVE_AT.y * dh;
      disc = DISC * dw;
      reach = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy));
      sak.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`;
      tun.style.transformOrigin = sak.style.transformOrigin;

      const sy = window.scrollY;
      const dive = document.querySelector<HTMLElement>(DIVE_INTO);
      diveTop = dive ? dive.getBoundingClientRect().top + sy : 1e9;
      const hero = document.querySelector<HTMLElement>("#hero");
      heroEnd = hero ? hero.getBoundingClientRect().bottom + sy : H;
      const end = document.documentElement.scrollHeight - H;
      /* A portrait crop is mostly moon: the keys under copy go a step darker
         on a phone (Connect's lead measured 3.8:1 without it). */
      const boost = W < 768 ? 0.08 : 0;
      keys = VEIL.map((k) => {
        const veil = k.veil >= 0.5 ? Math.min(0.9, k.veil + boost) : k.veil;
        if (k.at === "end") return { y: end, veil };
        const el = document.querySelector<HTMLElement>(k.at);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        // the point lands at mid-screen
        return { y: r.top + sy + r.height * k.edge - H / 2, veil };
      })
        .filter((k): k is { y: number; veil: number } => k !== null)
        .sort((a, b) => a.y - b.y);
      lastP = -1;
    };

    const veilAt = (y: number) => {
      if (!keys.length) return 0.5;
      if (y <= keys[0].y) return keys[0].veil;
      for (let i = 1; i < keys.length; i++) {
        const a = keys[i - 1];
        const b = keys[i];
        if (y <= b.y) return a.veil + (b.veil - a.veil) * clamp((y - a.y) / Math.max(1, b.y - a.y));
      }
      return keys[keys.length - 1].veil;
    };

    const paint = () => {
      raf = 0;
      const y = window.scrollY;
      // The dive section's top: at the bottom of the screen → 20% up.
      const p = clamp((y + H - diveTop) / (H * 0.8));
      veil.style.opacity = veilAt(y).toFixed(3);
      const heroUp = clamp(1 - y / Math.max(1, heroEnd - H * 0.5)).toFixed(3);
      if (scrimRef.current) scrimRef.current.style.opacity = heroUp;
      if (castRef.current) castRef.current.style.opacity = heroUp;
      setDive(p);
      if (p === lastP) return;
      lastP = p;
      const sakuraOn = p < 1;
      const tunnelOn = p > 0;
      if (sakuraOn !== shown.current.sakura || tunnelOn !== shown.current.tunnel) {
        shown.current = { sakura: sakuraOn, tunnel: tunnelOn };
        syncRef.current();
      }
      const e = easeInOut(p);
      if (reduced) {
        tun.style.opacity = e.toFixed(3);
        tun.style.visibility = tunnelOn ? "visible" : "hidden";
        sak.style.visibility = sakuraOn ? "visible" : "hidden";
        return;
      }
      const depth = 1 + (DEPTH - 1) * e;
      sak.style.transform = p > 0 ? `scale(${depth.toFixed(4)})` : "";
      sak.style.visibility = sakuraOn ? "visible" : "hidden";
      tun.style.visibility = tunnelOn ? "visible" : "hidden";
      // The corridor glows up inside the moon first, then the disc opens.
      tun.style.opacity = clamp(p / 0.22).toFixed(3);
      tun.style.transform = p < 1 ? `scale(${(1.35 - 0.35 * e).toFixed(4)})` : "";
      const r = disc * depth;
      tun.style.clipPath = r >= reach || p >= 1 ? "" : `circle(${r.toFixed(1)}px at ${ox.toFixed(1)}px ${oy.toFixed(1)}px)`;
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

  /* --- The arrival: settle from pushed-in and soft to rest. ---------------- */
  useEffect(() => {
    const el = arriveRef.current;
    if (!el || reduced || !booted) return;
    const anim = el.animate([ARRIVE_FROM, { transform: `scale(${REST})`, filter: "blur(0px)" }], {
      duration: 3200,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "forwards",
    });
    /* Commit the end state with no filter at all: a filter left on a
       fullscreen video, even blur(0), keeps it on the slow path. */
    anim.onfinish = () => {
      el.style.transform = `scale(${REST})`;
      el.style.filter = "";
      anim.cancel();
    };
    return () => anim.cancel();
  }, [booted, reduced]);

  /* --- The sign's light: stutter with the tube, then hold low. ------------ */
  useEffect(() => {
    const el = lightRef.current;
    if (!el) return;
    if (reduced) {
      el.style.opacity = String(CAST);
      return;
    }
    const running: Animation[] = [];
    const off = onStrike(() => {
      const strike = el.animate(STRIKE, { duration: 900, fill: "forwards" });
      running.push(strike);
      strike.onfinish = () => {
        const settle = el.animate([{ opacity: 1 }, { opacity: CAST }], {
          duration: 1600,
          easing: "cubic-bezier(0.33, 0, 0.2, 1)",
          fill: "forwards",
        });
        running.push(settle);
        settle.onfinish = () => {
          el.style.opacity = String(CAST);
          running.forEach((a) => a.cancel());
        };
      };
    });
    return () => {
      off();
      running.forEach((a) => a.cancel());
    };
  }, [reduced]);

  /* --- Fetch the tunnel only once the dive is within three screens. --------- */
  useEffect(() => {
    if (reduced) return;
    const near = () => {
      const dive = document.querySelector<HTMLElement>(DIVE_INTO);
      const top = dive ? dive.getBoundingClientRect().top : 0;
      if (top <= window.innerHeight * 3) {
        window.removeEventListener("scroll", near);
        setWantTunnel(true);
      }
    };
    window.addEventListener("scroll", near, { passive: true });
    near();
    return () => window.removeEventListener("scroll", near);
  }, [reduced]);

  /* --- Play only what is on screen. ---------------------------------------- */
  useEffect(() => {
    const sakura = sakuraRef.current;
    const tunnel = tunnelRef.current;
    if (reduced || !sakura || !tunnel) return;
    const sync = () => {
      const live = booted && document.visibilityState === "visible" && !groundCovered();
      const set = (v: HTMLVideoElement, on: boolean) => {
        if (!v.currentSrc && !v.getAttribute("src")) return;
        if (on && v.paused) v.play().catch(() => {});
        else if (!on && !v.paused) v.pause();
      };
      set(sakura, live && shown.current.sakura);
      set(tunnel, live && shown.current.tunnel);
    };
    syncRef.current = sync;
    sync();
    document.addEventListener("visibilitychange", sync);
    const unCover = onCover(sync);
    sakura.addEventListener("loadeddata", sync);
    tunnel.addEventListener("loadeddata", sync);
    return () => {
      syncRef.current = () => {};
      document.removeEventListener("visibilitychange", sync);
      unCover();
      sakura.removeEventListener("loadeddata", sync);
      tunnel.removeEventListener("loadeddata", sync);
    };
  }, [booted, reduced, wantTunnel]);

  const src = phone ? SET.phone : SET.desktop;
  const fit = { objectPosition: `${POS_X * 100}% 50%` } as const;

  return (
    <>
      {/* Three planes, one transform each: the dive (scroll), the arrival
          (once, on boot) and the drift (pointer). On one element they would
          overwrite each other. */}
      <div ref={sakuraLayer} className="absolute inset-0 will-change-transform">
        {reduced ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={SET.poster.sakura} alt="" className="h-full w-full object-cover" style={fit} />
        ) : (
          /* Held at the arrival's first frame until boot, so what the lifting
             curtain uncovers is already the start of the move. */
          <div ref={arriveRef} className="absolute inset-0" style={ARRIVE_FROM}>
            <div ref={drift} className="absolute inset-0">
              <video
                ref={sakuraRef}
                className="h-full w-full object-cover"
                style={fit}
                src={src.sakura}
                poster={SET.poster.sakura}
                muted
                loop
                playsInline
                preload="auto"
              />
            </div>
          </div>
        )}
      </div>
      <div
        ref={tunnelLayer}
        className="absolute inset-0 will-change-transform"
        style={{ visibility: "hidden", opacity: 0 }}
      >
        {reduced ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={SET.poster.tunnel} alt="" className="h-full w-full object-cover" style={fit} />
        ) : (
          <video
            ref={tunnelRef}
            className="h-full w-full object-cover"
            style={fit}
            src={wantTunnel ? src.tunnel : undefined}
            poster={SET.poster.tunnel}
            muted
            loop
            playsInline
            preload={wantTunnel ? "auto" : "none"}
          />
        )}
      </div>
      {/* The veil: the ground's own colour, so the footage sinks into the
          page rather than going grey. */}
      <div ref={veilRef} className="absolute inset-0 bg-void" style={{ opacity: 0.5 }} />
      {/* The sign's light, centred on the name (≈31% down on a phone, 43%
          from md) and wide and low like a tube's spill. `screen` adds light
          rather than tinting: the moon warms, the shadows stay dark. The
          outer layer fades with the hero; the inner one strikes. */}
      <div ref={castRef} className="pointer-events-none absolute inset-0">
        <div
          ref={lightRef}
          className="absolute inset-0 mix-blend-screen [--cast-y:31%] md:[--cast-y:43%]"
          style={{
            opacity: 0,
            background:
              "radial-gradient(ellipse 62% 30% at 50% var(--cast-y), rgb(255 106 61 / 0.78), rgb(255 106 61 / 0.3) 46%, transparent 80%)",
          }}
        />
      </div>
      {/* The hero's copy sits over the lit moon (3.2:1 on desktop once the
          lead rises to mid-screen, 3.5:1 on a portrait phone), so the floor
          of the frame darkens under it — and only while the hero is up. */}
      <div
        ref={scrimRef}
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 38%, color-mix(in srgb, var(--color-void) 72%, transparent) 62%, color-mix(in srgb, var(--color-void) 88%, transparent) 100%)",
        }}
      />
      <NeonGround />
    </>
  );
}
