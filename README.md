# amartuvshin.work

The portfolio of Amartuvshin Ganzorig, software engineer (B.S. Software Engineering, Gannon University, 2026).

**Live: [amartuvshin.work](https://amartuvshin.work)**

It's one page, in English and Mongolian, told as a single continuous scroll. The ground is film: a sakura cliff under a blue moon, which the camera dives into to reach a red tunnel. Over it sit neon type, a scroll-driven projects stage, a WebGL globe that flies the route from Ulaanbaatar to Erie and back, and a spine down the right edge that stands in for the scrollbar.

Built with AI assistance: Claude Code, directed and reviewed by me. The commits carry its co-author line.

## Stack

- **Next.js 16** (App Router, React 19, React Compiler) and **TypeScript** (strict), exported as a static site
- **Tailwind CSS v4**; design tokens live in `src/app/globals.css`
- **Lenis** smooth scroll on the **GSAP** ticker. Scroll-linked motion runs on CSS scroll timelines where the browser has them, with **Framer Motion** as the fallback. Far chapter jumps use the View Transitions API.
- **WebGL** (hand-written shaders, no three.js) for the intro and the route globe; shaders compile off the main thread where `KHR_parallel_shader_compile` exists
- Hosted on **Cloudflare** (Workers Static Assets). `main` is production, and every other branch gets a preview URL.

## Getting started

```bash
npm install
npm run dev          # dev server, opens the browser
npm run build        # static export to out/
npm run start        # serve out/ locally with wrangler
npm run lint         # ESLint (React Compiler rules on)
npm run typecheck    # tsc --noEmit
npm run axe          # accessibility sweep against a running server (AXE_BASE)
```

`node scripts/perf-phone.mjs <url>` measures scroll frame times in an iPhone-sized, CPU-throttled Chromium. Point it at a production build, not the dev server.

## Content

Every fact on the page is in **`src/lib/content.ts`** (English), with the Mongolian in **`src/lib/content.mn.ts`** and interface strings in `src/lib/ui.ts`. All of it comes from the résumé, the Spotfixes final report, the transcript or LinkedIn. Nothing is added that those don't support.

## Structure

```
src/
  app/            layout, the page, share image, globals.css
  components/
    sections/     Hero, About, Connect, SelectedWork, Capabilities, Anatomy, Timeline, Contact
    chrome/       navbar, footer, preloader, smooth scroll, chapter frame and spine, palette
    backdrop/     the fixed video ground and grain behind the whole page
    hero/ work/ craft/ anatomy/ path/   each section's own parts
    ui/ motion/   shared components and motion primitives
  hooks/ lib/     reduced motion, scroll timelines, i18n, content, shaders
public/           footage, project screenshots, photos, cursors, brand marks
scripts/          image and asset bakes, axe sweep, screenshots, phone perf harness
```

## Accessibility and performance

- There's a full `prefers-reduced-motion` path: no pinning, no scrubbed motion, posters instead of footage, and native scrolling.
- CI (`.github/workflows/ci.yml`) runs the typecheck, lint, build and axe sweep on every push.
- Motion is transform and opacity. Idle loops pause off screen and while scrolling, and frame times are measured on a throttled phone profile before changes ship.
