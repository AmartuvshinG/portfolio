# NEXUS — Cyberpunk Neo-Futuristic Portfolio

A premium, "alive-when-idle" portfolio built around a cyberpunk / HUD art direction
(deep-black canvas, electric-cyan + purple accents, holographic grid, scanlines, glitch,
telemetry overlays) with a WebGL hero artifact and a scroll-driven "boot sequence" feature.

Personalised for **Amara** with placeholder content — everything is edited in one file.

## Stack

- **Next.js 16** (App Router, React 19, React Compiler) + **TypeScript** (strict)
- **Tailwind CSS v4** — design tokens live in `src/app/globals.css` (`@theme`)
- **Lenis** smooth scrolling, driven from the **GSAP** ticker
- **GSAP + ScrollTrigger** — pinned boot sequence + horizontal project rail
- **Framer Motion** — reveals, magnetic buttons, carousels, route transitions
- **React Three Fiber + drei + postprocessing** — WebGL hero (bloom / RGB-shift / scanlines),
  lazy-loaded and reduced-motion aware
- **next/font** (Saira Condensed · Space Grotesk · JetBrains Mono), **next/image**

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint (React Compiler rules enabled)
```

## Editing content

All copy, projects, stats, timeline, testimonials and links live in **`src/lib/content.ts`**.
Change your name, role, projects, etc. there and it propagates across the whole site,
including the statically-generated `/work/[slug]` case-file pages.

Placeholder imagery uses `picsum.photos` (configured in `next.config.ts` → `images.remotePatterns`).
Swap the `image` URLs in `content.ts` for your own — add the host to `remotePatterns` if needed.

## Structure

```
src/
  app/            layout, page assembly, template (route transition), work/[slug], globals.css
  components/
    layout/       SmoothScroll, Preloader, Navbar, Footer, AmbientOverlay
    sections/     Hero, About, Capabilities, SelectedWork, Stats, Timeline, Testimonials, Contact
    three/        WebGL hero scene + dynamic loader
    hud/          HUD frames, telemetry, data graph, cursor, audio toggle
    motion/       Reveal, ScrambleText, GlitchText, Magnetic / ControlPanel buttons, counters
  hooks/          useReducedMotion
  lib/            content.ts (source of truth), gsap.ts, motion.ts, utils.ts
```

## Accessibility & performance

- Full **`prefers-reduced-motion`** path — WebGL, particles, glitch, parallax and auto-play all
  disable; a static poster replaces the 3D scene and content stays fully legible.
- Skip link, visible focus rings, semantic landmarks, labelled icon buttons, form labels +
  inline validation, neon reserved for large/glow text (body copy stays high-contrast).
- WebGL and heavy sections are code-split; images are optimised via `next/image`; animations are
  transform/opacity only.
