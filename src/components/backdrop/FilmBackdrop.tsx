"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { FILM, clamp, easeInOut, loadWhole, seeker } from "@/lib/film";
import { createFilmRenderer } from "@/lib/filmShader";

/**
 * The film as the site's one ground.
 *
 * Two reels — subway doors onto a night city, then a space-station hatch onto
 * Earth — scrubbed by the page's own scroll, behind every section. There is no
 * lock and no input capture: the frame is a pure function of `scrollY`, so a
 * deep link, a nav jump, a pinned section or a climb back to the top simply
 * shows the frame that belongs there. That is what makes it hitch-free; there
 * is no state to get out of step.
 *
 * The film moves in *beats at the joins*: it plays as one section hands over
 * to the next — where ChapterSeam already draws its hairline — and all but
 * holds while a section is being read. Two interludes (FilmInterlude) give the
 * biggest moments empty screen: the doors, and the porthole iris between Work
 * and Craft.
 *
 * Both reels share one timeline value `f`:
 *
 *   0 … 8     city seconds
 *   8 … 9     the iris: the city climbs into its sky, a porthole opens on the
 *             station hatch (a match cut — both are centred circles)
 *   9 … 19    station seconds
 *
 * **The signal grade.** Where WebGL is available the reels are not shown as
 * videos at all: they are texture sources for one shader pass (lib/filmShader)
 * that does the crop, the iris, the ramp grade, scanlines, and — only while
 * the film is actually moving — a chromatic split and a few sheared bands.
 * Without WebGL, or if the context is lost, the videos show directly with the
 * CSS transforms and SVG ring below, exactly as before.
 *
 * Replaces the aurora (SiteBackdrop). Mounted only with motion allowed.
 */

const CITY_LEN = 8;
/** How often the rain advances. Half display rate: rain reads as rain at 30. */
const RAIN_FPS = 30;
const IRIS_END = 9;

/**
 * The beat map. `at` is a section, `edge` how far through it (0 top, 1
 * bottom); the key lands when that point crosses mid-screen. `veil` is how far
 * the picture is dimmed there — heavy under copy, light where the film is the
 * point. Between keys, `f` eases and `veil` runs linearly.
 *
 * The veils under copy are set by measurement, not taste: body text must clear
 * 4.5:1 against the 95th-percentile brightest pixel behind it (street lights,
 * the daylit Earth), at 1440 and 390. Lower one and re-measure.
 */
const KEYS: { at: string; edge: number; f: number; veil: number }[] = [
  { at: "#hero", edge: 0, f: 0, veil: 0.35 },
  { at: "#hero", edge: 0.75, f: 0.3, veil: 0.35 },
  // The doors part and the camera pushes through the car.
  { at: "#interlude-doors", edge: 0.2, f: 0.6, veil: 0.1 },
  { at: "#interlude-doors", edge: 0.9, f: 3.8, veil: 0.12 },
  // Through the door frame; near-hold under the profile.
  { at: "#about", edge: 0.15, f: 4.0, veil: 0.76 },
  { at: "#about", edge: 0.7, f: 4.6, veil: 0.76 },
  // Out over the street.
  { at: "#connect", edge: 0.2, f: 6.2, veil: 0.55 },
  { at: "#connect", edge: 0.7, f: 6.8, veil: 0.55 },
  // The full skyline, held behind the case files.
  { at: "#work", edge: 0.12, f: 7.96, veil: 0.68 },
  { at: "#work", edge: 0.9, f: 7.96, veil: 0.68 },
  // The porthole.
  { at: "#interlude-airlock", edge: 0.15, f: 8, veil: 0.2 },
  { at: "#interlude-airlock", edge: 0.5, f: 9, veil: 0.2 },
  { at: "#interlude-airlock", edge: 0.9, f: 9, veil: 0.3 },
  // The closed hatch — a white interior, so the heaviest veil on the page.
  { at: "#capabilities", edge: 0.1, f: 9, veil: 0.66 },
  { at: "#capabilities", edge: 0.85, f: 10, veil: 0.66 },
  // The hatch swings open into the dark module; near-hold under the ledger.
  { at: "#timeline", edge: 0.2, f: 13.2, veil: 0.66 },
  { at: "#timeline", edge: 0.75, f: 14.4, veil: 0.66 },
  // Out through the porthole to Earth, and the astronaut.
  // Contact and the footer carry small type over a daylit Earth and the
  // astronaut, so the veil climbs as the copy gets smaller.
  { at: "#contact", edge: 0.3, f: 17.6, veil: 0.82 },
  { at: "end", edge: 1, f: 18.96, veil: 0.84 },
];

export function FilmBackdrop() {
  const rampId = useId();
  const cityRef = useRef<HTMLVideoElement>(null);
  const issLayerRef = useRef<HTMLDivElement>(null);
  const issRef = useRef<HTMLVideoElement>(null);
  const ringRef = useRef<SVGGElement>(null);
  const tintRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const earthRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLSpanElement>(null);
  const [cityReady, setCityReady] = useState(false);
  const [issReady, setIssReady] = useState(false);
  /* Whether the shader is drawing. The videos then stay invisible sources. */
  const [glOn, setGlOn] = useState(false);

  /* --- Loading: the city first (it is on screen), then the station. ------ */
  useEffect(() => {
    const city = cityRef.current;
    const iss = issRef.current;
    if (!city || !iss) return;
    const set = window.matchMedia("(max-width: 768px)").matches ? FILM.phone : FILM.desktop;
    const ac = new AbortController();
    const urls: string[] = [];
    (async () => {
      urls.push(await loadWhole(city, set.city, ac.signal));
      urls.push(await loadWhole(iss, set.iss, ac.signal));
    })().catch((err) => {
      if (ac.signal.aborted) return;
      // A failed fetch still leaves a film: stream it the old way.
      console.warn("[film] whole-file load failed, streaming instead", err);
      if (!city.src) city.src = set.city;
      if (!iss.src) iss.src = set.iss;
    });
    return () => {
      ac.abort();
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, []);

  /* --- The scrub -------------------------------------------------------- */
  useEffect(() => {
    const city = cityRef.current;
    const iss = issRef.current;
    if (!city || !iss) return;

    const citySeek = seeker(city);
    const issSeek = seeker(iss);

    const canvas = canvasRef.current;
    let renderer = canvas ? createFilmRenderer(canvas, city, iss) : null;
    setGlOn(!!renderer);
    const onLost = (e: Event) => {
      e.preventDefault();
      renderer = null;
      setGlOn(false);
      dirty = true;
    };
    canvas?.addEventListener("webglcontextlost", onLost);
    /* Bumped whenever a reel has a new frame, so the shader re-uploads only
       then; and when each reel first had one, for its fade-in. */
    let cityVersion = 0;
    let issVersion = 0;
    let cityAt = 0;
    let issAt = 0;
    let fPrev = -1;
    let speed = 0;
    let hudText = "";
    /* While the city is on screen it is raining, and rain moves: the shader
       then draws at RAIN_FPS even when nothing else has changed. */
    let raining = false;
    let lastRain = 0;
    let cityDur = 0;
    let issDur = 0;
    let ys: number[] = [];
    let w = window.innerWidth;
    let h = window.innerHeight;
    let rMax = Math.hypot(w / 2, h / 2) + 4;
    let dirty = true;
    let rafId = 0;

    /** Resolve every key to the scrollY at which it lands. Keys whose section
     *  is missing borrow their neighbour's position, so the map never breaks. */
    function measure() {
      w = window.innerWidth;
      h = window.innerHeight;
      rMax = Math.hypot(w / 2, h / 2) + 4;
      const maxY = document.documentElement.scrollHeight - h;
      let prev = 0;
      ys = KEYS.map((k) => {
        let y: number;
        if (k.at === "end") y = maxY;
        else {
          const el = document.querySelector<HTMLElement>(k.at);
          if (!el) return prev;
          const top = el.getBoundingClientRect().top + window.scrollY;
          y = top + k.edge * el.offsetHeight - h / 2;
        }
        y = clamp(y, prev, Math.max(prev, maxY));
        prev = y;
        return y;
      });
      dirty = true;
    }

    /** Where the film is at a given scroll position. */
    function sample(y: number) {
      if (!ys.length || y <= ys[0]) return { f: KEYS[0].f, veil: KEYS[0].veil };
      for (let i = 1; i < ys.length; i++) {
        if (y <= ys[i]) {
          const span = ys[i] - ys[i - 1];
          const t = span > 0 ? (y - ys[i - 1]) / span : 1;
          const a = KEYS[i - 1];
          const b = KEYS[i];
          return { f: a.f + (b.f - a.f) * easeInOut(t), veil: a.veil + (b.veil - a.veil) * t };
        }
      }
      const last = KEYS[KEYS.length - 1];
      return { f: last.f, veil: last.veil };
    }

    function paint() {
      const { f, veil } = sample(window.scrollY);
      /* How fast the film is moving, not the page: |df| per frame, smoothed.
         Zero while a section is read (the beat map holds there), and it
         decays to exactly zero at rest, so a still frame is always clean. */
      const df = fPrev < 0 ? 0 : Math.abs(f - fPrev);
      fPrev = f;
      speed = speed * 0.8 + Math.min(1, df * 7) * 0.2;
      if (speed < 0.003) speed = 0;
      else dirty = true;
      const cityT = Math.min(f, CITY_LEN);
      const iris = easeInOut(clamp(f - CITY_LEN));
      const issT = Math.max(0, f - IRIS_END);

      // Only the reel that can be seen seeks.
      if (cityDur > 0 && iris < 1) citySeek.to(Math.min(cityT, cityDur - 0.04));
      if (issDur > 0 && f > CITY_LEN) issSeek.to(Math.min(issT, issDur - 0.04));

      writeHud(f);
      if (veilRef.current) veilRef.current.style.opacity = String(veil);
      /* The daylit Earth fills the left half of the last shots, exactly where
         Contact and the footer set their small type. A uniform veil dark
         enough for that would bury the astronaut; this darkens only the
         bright side, and only once Earth is in frame. */
      if (earthRef.current) earthRef.current.style.opacity = String(clamp((issT - 5) / 2.5));

      const cityScale = 1 + (cityT / CITY_LEN) * 0.06 + iris * 0.22;
      const issScale = 1.25 - iris * 0.25 + (issT / 10) * 0.05;
      /* On a portrait screen the astronaut, right of centre in the landscape
         master, would fall out of frame; the crop drifts after him. */
      const issPosX = h > w ? 0.5 + clamp((issT - 6) / 4) * 0.16 : 0.5;

      if (renderer) {
        const now = performance.now();
        const cityOn = cityAt ? clamp((now - cityAt) / 800) : 0;
        const issOn = issAt ? clamp((now - issAt) / 600) : 0;
        if ((cityAt && cityOn < 1) || (issAt && issOn < 1)) dirty = true;
        raining = iris < 1 && cityOn > 0;
        renderer.draw(
          {
            time: (now % 600000) * 0.001,
            rain: (1 - iris) * cityOn,
            /* Thickest at street level, thinning as the camera climbs. */
            haze: (1 - iris) * (1 - (cityT / CITY_LEN) * 0.7),
            cityScale,
            cityShift: iris * 0.07,
            issScale,
            issPosX,
            iris,
            tint: 0.42 - iris * 0.28,
            speed,
            cityOn,
            issOn,
          },
          cityVersion,
          issVersion
        );
        return;
      }

      /* City: a slow push as it plays, then the climb into the sky as the
         porthole opens. Hidden outright once the iris covers it. */
      city!.style.transform = `translate3d(0, ${iris * 7}%, 0) scale(${cityScale})`;
      city!.style.visibility = iris >= 1 ? "hidden" : "visible";

      const layer = issLayerRef.current;
      if (layer) {
        layer.style.visibility = iris <= 0 ? "hidden" : "visible";
        layer.style.clipPath = iris >= 1 ? "none" : `circle(${iris * rMax}px at 50% 50%)`;
      }
      iss!.style.transform = `scale(${issScale})`;
      iss!.style.objectPosition = `${issPosX * 100}% 50%`;

      const ring = ringRef.current;
      if (ring) {
        const on = iris > 0 && iris < 1;
        ring.style.opacity = on ? String(1 - clamp((iris - 0.7) / 0.3)) : "0";
        if (on) for (const el of ring.children) el.setAttribute("r", String(iris * rMax));
      }

      /* The grade: neo-Tokyo magenta/cyan over the city, barely there over the
         station, whose white interior would otherwise go pink. */
      if (tintRef.current) tintRef.current.style.opacity = String(0.42 - iris * 0.28);
    }

    /** The reel readout: reel, mm:ss:ff at 24fps, and the frame number. */
    function writeHud(f: number) {
      const el = hudRef.current;
      if (!el) return;
      const reel = f < IRIS_END ? 1 : 2;
      const t = reel === 1 ? Math.min(f, CITY_LEN) : f - IRIS_END;
      const frames = Math.round(t * 24);
      const two = (n: number) => String(n).padStart(2, "0");
      const text = `REEL ${two(reel)} · ${two(Math.floor(frames / 1440))}:${two(Math.floor(frames / 24) % 60)}:${two(frames % 24)} · F ${String(Math.round(f * 24)).padStart(4, "0")}`;
      if (text !== hudText) {
        hudText = text;
        el.textContent = text;
      }
    }

    /* Duration is known at metadata; each picture is shown on its first frame
       that can paint (`loadeddata` fires once per load, so `seeked` and
       `canplay` count too). */
    const onCityMeta = () => {
      cityDur = city.duration || 0;
      dirty = true;
    };
    const onIssMeta = () => {
      issDur = iss.duration || 0;
      dirty = true;
    };
    const onCityFrame = () => {
      cityVersion++;
      if (!cityAt) cityAt = performance.now();
      dirty = true;
      setCityReady(true);
    };
    const onIssFrame = () => {
      issVersion++;
      if (!issAt) issAt = performance.now();
      dirty = true;
      setIssReady(true);
    };
    const FRAME_EVENTS = ["loadeddata", "canplay", "seeked"] as const;
    if (city.readyState >= 1) onCityMeta();
    if (iss.readyState >= 1) onIssMeta();
    if (city.readyState >= 2) onCityFrame();
    if (iss.readyState >= 2) onIssFrame();
    city.addEventListener("loadedmetadata", onCityMeta);
    iss.addEventListener("loadedmetadata", onIssMeta);
    for (const ev of FRAME_EVENTS) {
      city.addEventListener(ev, onCityFrame);
      iss.addEventListener(ev, onIssFrame);
    }

    /* Re-measure when the page's geometry changes: pin spacers are inserted on
       ScrollTrigger refresh, and fonts, images and the case theatre all shift
       heights after first paint. Debounced like ActTheme's observer. */
    let debounce = 0;
    const remeasure = () => {
      renderer?.resize();
      dirty = true;
      clearTimeout(debounce);
      debounce = window.setTimeout(measure, 250);
    };
    const ro = new ResizeObserver(remeasure);
    ro.observe(document.body);
    ScrollTrigger.addEventListener("refresh", measure);
    window.addEventListener("resize", remeasure);
    const onScroll = () => {
      dirty = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    measure();
    const frame = (now: number) => {
      if (raining && now - lastRain >= 1000 / RAIN_FPS) {
        lastRain = now;
        dirty = true;
      }
      if (dirty) {
        dirty = false;
        paint();
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(debounce);
      ro.disconnect();
      ScrollTrigger.removeEventListener("refresh", measure);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", onScroll);
      city.removeEventListener("loadedmetadata", onCityMeta);
      iss.removeEventListener("loadedmetadata", onIssMeta);
      for (const ev of FRAME_EVENTS) {
        city.removeEventListener(ev, onCityFrame);
        iss.removeEventListener(ev, onIssFrame);
      }
      citySeek.dispose();
      issSeek.dispose();
      canvas?.removeEventListener("webglcontextlost", onLost);
      renderer?.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0">
      {/* No `src`: the loading effect hands each video a blob URL. */}
      <video
        ref={cityRef}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: cityReady && !glOn ? 1 : 0,
          transition: "opacity 0.8s ease",
          transformOrigin: "50% 20%",
          willChange: "transform",
        }}
      />

      <div ref={issLayerRef} className="invisible absolute inset-0">
        <video
          ref={issRef}
          poster={FILM.poster}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: issReady && !glOn ? 1 : 0,
            transition: "opacity 0.6s ease",
            willChange: "transform",
          }}
        />
      </div>

      {/* The shader's picture, CSS-upscaled from a capped buffer. */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ visibility: glOn ? "visible" : "hidden" }}
      />

      {/* The porthole's rim: a ramp ring at the iris edge. SVG so the stroke
          stays 3px at every radius — a scaled div would thin it to nothing. */}
      <svg className="absolute inset-0 h-full w-full" style={{ display: glOn ? "none" : undefined }}>
        <defs>
          <linearGradient id={rampId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--spectrum-1)" />
            <stop offset="0.5" stopColor="var(--spectrum-2)" />
            <stop offset="1" stopColor="var(--spectrum-3)" />
          </linearGradient>
        </defs>
        <g ref={ringRef} style={{ opacity: 0 }} fill="none" stroke={`url(#${rampId})`}>
          <circle cx="50%" cy="50%" r="0" strokeWidth="22" strokeOpacity="0.18" />
          <circle cx="50%" cy="50%" r="0" strokeWidth="8" strokeOpacity="0.35" />
          <circle cx="50%" cy="50%" r="0" strokeWidth="2.5" />
        </g>
      </svg>

      {/* The grade. The ramp as a gradient, never a flat fill. */}
      <div
        ref={tintRef}
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(160deg, var(--spectrum-1), var(--spectrum-2) 50%, var(--spectrum-3))",
          mixBlendMode: "soft-light",
          opacity: 0.42,
          display: glOn ? "none" : undefined,
        }}
      />
      {/* The veil: how far the film steps back behind the copy at this point. */}
      <div ref={veilRef} className="absolute inset-0 bg-[#05060d]" style={{ opacity: 0.35 }} />
      <div
        ref={earthRef}
        className="absolute inset-0"
        style={{
          opacity: 0,
          background:
            "linear-gradient(90deg, rgba(5,6,13,0.72) 0%, rgba(5,6,13,0.5) 38%, rgba(5,6,13,0) 62%)",
        }}
      />
      {/* Top and bottom falloff, so the navbar and the fold never fight the sky. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,6,13,0.5), rgba(5,6,13,0) 22%, rgba(5,6,13,0) 68%, rgba(5,6,13,0.72))",
        }}
      />
      {/* The reel readout: which reel, where in it. Set vertically in the
          right gutter, where no copy runs. Written straight to textContent
          from the paint loop, never re-rendered. */}
      <span
        ref={hudRef}
        data-film-hud
        className="absolute bottom-8 right-3 hidden rotate-180 font-mono text-[11px] tabular tracking-[0.2em] text-[color-mix(in_srgb,var(--color-hazard)_70%,transparent)] [writing-mode:vertical-rl] md:block"
      />
    </div>
  );
}
