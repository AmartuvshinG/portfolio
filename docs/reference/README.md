# Reference material

Source material the site was built from. **Nothing here is imported by the
app** — these are notes, kept for provenance. The briefs that drove each rebuild
live in `docs/briefs/` — including `list-of-changes.txt` and
`hero-and-dock-notes.txt`, the two most recent rounds of requests.

## `video/`

`ref1.mp4`, `ref2.mp4`, `ref3.mp4` — the three capture references.

- **ref1** and **ref3** are the targets: cut panels, iridescent atmosphere,
  oversized display type.
- **ref2** is the Lando Norris site and is a **negative** reference. An earlier
  build drifted so close to it — lime accents, patterned light theme,
  topographic contours — that it was scrapped. If something starts looking like
  ref2, that is the signal to stop.

## The two art-direction briefs

Both still apply; they were written for different rebuilds and neither
supersedes the other.

- **`reference.txt`** — "Cyberpunk neo-futuristic". The ROG-hardware-showcase
  register: cut panels, machined chrome, technical micro-type.
- **`../briefs/creative-direction.txt`** — "Awwwards-level WebGL portfolio". The
  digital-art-installation register: it is where the demand for a single
  continuous cinematic scroll comes from.

## Component references → what they became

These were used as **mechanical references only**. Each was rebuilt in this
project's own design language, palette and dependencies.

| Reference | Became | Notes |
| --- | --- | --- |
| `aurora-background.txt` | `components/backdrop/Aurora.tsx` | The single site-wide background since 2026-09-27. Rebuilt CSS-only: soft radial blobs with no blur filter, box-shadow stars, transform/opacity keyframes, all paused while Lenis reports a scroll (`lib/scrollPause.ts`). |
| `enter-animation.txt` | `components/ui/GlowHorizon.tsx` | The entrance vocabulary, at three scales: the preloader hand-off, every section seam (`chrome/ChapterSeam.tsx`, scrubbed by scroll), and the route wipe in `app/template.tsx`. Recoloured to the spectrum ramp. |
| `liquid-glass-carousel.txt` | *retired* — `components/craft/CraftTrack.tsx` replaced it | Built as a WebGL carousel for Craft, then dropped: text painted into a texture and bent through a lens is never sharp, and arrow-clicking was the wrong interaction. Craft is now a real-DOM track driven by page scroll. The cheap/refracting glass split it prompted survives as the `liquid-glass` and `liquid-glass-live` utilities. |
| `dock-tabs.txt` | `components/chrome/Navbar.tsx`, `chrome/NavGlyphs.tsx` | The capsule nav: sliding droplet indicator and a glyph per section beside its label. |
| `hover-gradient.txt` | `components/motion/HoverBorderGradient.tsx` | Recoloured; pill silhouette replaced with the site's chamfer. |
| `background-shader.txt`, `aurora.txt` | *retired* | Drove the WebGL `NeuralNoise` backdrop and the `AuroraVeil` over it; both deleted when the background became one CSS aurora. |
| `parallax.txt`, `3d-marquee.txt`, `hero-carousel.txt` | *retired* | Drove `ZoomParallax`, `Lab` and `Lookbook`, cut when the template content was replaced — they had no real material to show. |
| `scroll-locked-video-hero.txt`, `stack-interactor.txt` | *not used* | Hero-entrance candidates; the hero stayed type-led. |
| `hero.txt` | *not built* | The dot-matrix depth scan. WebGPU/TSL only as written, and it needs a portrait plus a depth map. Two bugs to fix on the way in: `PostProcessing` snapshots `uScanProgress.value` at graph-build time so the scan overlay never moves, and the fade-in lerp has no epsilon so opacity never reaches 1. |
| `portrait.txt` | *not usable* | A `<video>` hotlinking a baked ASCII clip from `assets.21st.dev`. Same category as the Aceternity assets below — the technique is free, the CDN file is not ours to ship. |

## Aceternity components

`card.txt`, `carousel.txt`, `dock.txt`, `fey-card.txt`, `hero-parallax.txt`,
`layout.txt`, `poster.txt`, `resizable-navbar.txt`, `timeline.txt`,
`tracingbeam.txt` — saved as reference during the NEXUS build.

| Reference | Became |
| --- | --- |
| `resizable-navbar.txt` | `components/chrome/Navbar.tsx` |
| `card.txt` | `components/work/CaseFile.tsx` (via the retired `ProjectDossier`) |
| `timeline.txt` | `components/sections/Timeline.tsx` |
| `tracingbeam.txt` | the travelling beam inside `Timeline.tsx` |
| `poster.txt`, `dock.txt`, `fey-card.txt`, `layout.txt` | *retired* — these drove `PosterReveal`, `ConsoleDock`, `CapabilityDeck` and `HeadlineFlip`, all of which were deleted in the SPECTRUM rebuild |
| `carousel.txt`, `hero-parallax.txt` | *not used* |

## Assets: do not ship

The reference files point at `assets.aceternity.com` and `assets.21st.dev`.
**None of those URLs are used by this project, and none should be.**

- `assets.aceternity.com/gta6/*.webp` (referenced by `poster.txt`) are the
  Grand Theft Auto VI key art sliced into layers — Rockstar / Take-Two
  copyright, and the GTA and VI marks are trademarks. Shipping them on a
  portfolio would be straightforward infringement, quite apart from hotlinking
  someone else's CDN.
- `assets.aceternity.com/labs/*`, `/demos/*` and `logo-dark.png`, and the
  `assets.21st.dev` clip in `portrait.txt`, are demo placeholders that likewise
  aren't licensed to us.

The *techniques* are not protectable and were taken freely. Every pixel this
site renders for them is generated in-repo: inline SVG, CSS and GLSL, with no
image requests at all.
