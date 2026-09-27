# Amartuvshin Ganzorig — portfolio

The personal site of Amartuvshin Ganzorig, software engineer (Gannon University,
B.S. Software Engineering, 2026). One page, in English and Mongolian, built
around a single continuous scroll: a dark aurora ground, liquid-glass chrome,
and a spectrum ramp (magenta → violet → cyan) as the only colour.

## Stack

- **Next.js 16** (App Router, React 19, React Compiler) + **TypeScript** (strict)
- **Tailwind CSS v4** — tokens and utilities live in `src/app/globals.css`
- **Lenis** smooth scroll on the **GSAP** ticker; **Framer Motion** for
  scroll-linked and entrance motion
- **simple-icons** for tool marks, **lucide-react** for glyphs
- No WebGL: the background is CSS, and the one WebGL section (Craft) was
  replaced by a DOM scroll track

## Getting started

```bash
npm install
npm run dev          # dev server, opens the browser
npm run dev:no-open  # dev server only
npm run build        # production build
npm run start        # serve the production build
npm run lint         # ESLint (React Compiler rules on)
npm run typecheck    # tsc --noEmit
npm run axe          # WCAG 2.1 A/AA sweep: 3 acts × 2 motion modes × EN/MN
```

`npm run axe` expects a running server (`AXE_BASE`, default
`http://localhost:3000`).

## Editing content

Every fact on the page is in **`src/lib/content.ts`** (English), and the
Mongolian overrides are in **`src/lib/content.mn.ts`**. Interface strings are
in `src/lib/ui.ts`. Everything there is sourced — résumé, the Spotfixes report,
transcript, LinkedIn — and nothing should be added that isn't.

- Résumés and their preview images: `public/resume/`
- Project screenshots: `public/work/`
- The Signal panel's GitHub numbers are fetched live (`src/lib/github.ts`,
  refreshed daily) and fall back to the handle if GitHub is unreachable.

## Structure

```
src/
  app/              layout, the one page, route template, share image, globals.css
  components/
    sections/       Hero, About, Connect (Signal), SelectedWork, Capabilities (Craft),
                    Timeline (Path), Contact — in page order
    chrome/         Navbar, Footer, Preloader, SmoothScroll, ChapterSeam, command palette,
                    chapter HUD, language toggle, act theming
    backdrop/       SiteBackdrop: the aurora and grain behind the whole document
    craft/          CraftTrack, the scroll-driven capability row
    hero/           the hero's entrance sequence
    work/           case files and project visuals
    ui/             shared pieces: section header, cards, tool marks, channel fields,
                    glow horizon, glass filter
    motion/         reveals, counters, text effects, glare and magnetic interactions
  hooks/            reduced motion, overlays, scroll lock, quality, pointer drift
  lib/              content (EN/MN), i18n, ui strings, motion presets, GitHub fetch, utils
public/             resume PDFs, project screenshots, brand marks
scripts/            axe sweep, screenshot capture, résumé preview rendering, dev launcher
docs/
  HANDOFF.md        how to use the verification harness (browser checks, axe, CI)
  briefs/           the requests that drove each rebuild, newest in list-of-changes.txt
  reference/        component and art-direction references, with an index of what each
                    became (reference clips in reference/video/ are kept out of git)
```

## Accessibility & performance

- A full `prefers-reduced-motion` path: no pinning, no scrubbed motion, static
  layouts, native scrolling.
- CI (`.github/workflows/ci.yml`) runs typecheck, lint, build and the axe
  sweep on every push; the sweep is clean in every act, both motion modes and
  both languages.
- Motion is transform and opacity only. The aurora pauses while the page is
  scrolling, and blurred layers are mounted only near the viewport.
