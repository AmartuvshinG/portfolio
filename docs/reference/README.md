# Reference material

Source material the site was built from. **Nothing here is imported by the
app** — these are notes, kept for provenance. The briefs that drove each rebuild
live in `docs/briefs/`.

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
| `background-shader.txt` | `components/backdrop/NeuralNoise.tsx` | The single site-wide background. Rewritten in strict TS with a cancellable frame loop, a visibility gate and a resolution budget; `highp` with a wrapped time uniform (the reference's raw `performance.now()` in milliseconds breaks wherever `mediump` is honoured as fp16). Extended with scroll, act and burst uniforms. |
| `enter-animation.txt` | `components/ui/GlowHorizon.tsx` | The site's entrance vocabulary, reused at four scales — preloader hand-off, hero, every section seam (`chrome/ChapterSeam.tsx`), and the route wipe in `app/template.tsx`. Recoloured to the spectrum ramp. |
| `parallax.txt` | `components/sections/ZoomParallax.tsx` | The Work → Archive transition. Placement rewritten from the reference's single unreadable `!`-flagged class string into a data table, which lifts the seven-panel cap. |
| `3d-marquee.txt` | `components/sections/Lab.tsx` | The isometric drifting plane. Grid lines recoloured to `--color-line`; tiles draw real project data rather than remote images. |
| `aurora.txt` | `components/backdrop/AuroraVeil.tsx` | Recoloured to the ramp and demoted to a thin veil over the shader rather than a background in its own right. |
| `hover-gradient.txt` | `components/motion/HoverBorderGradient.tsx` | Recoloured; pill silhouette replaced with the site's chamfer. |
| `hero.txt` | *not yet built* | The dot-matrix depth scan. WebGPU/TSL only as written, and it needs a portrait plus a depth map. Two bugs to fix on the way in: `PostProcessing` snapshots `uScanProgress.value` at graph-build time so the scan overlay never moves, and the fade-in lerp has no epsilon so opacity never reaches 1. |
| `portrait.txt` | *not usable* | A `<video>` hotlinking a baked ASCII clip from `assets.21st.dev`. Same category as the Aceternity assets below — the technique is free, the CDN file is not ours to ship. |

## Aceternity components

`card.txt`, `carousel.txt`, `dock.txt`, `fey-card.txt`, `hero-parallax.txt`,
`layout.txt`, `poster.txt`, `resizable-navbar.txt`, `timeline.txt`,
`tracingbeam.txt` — saved as reference during the NEXUS build.

| Reference | Became |
| --- | --- |
| `resizable-navbar.txt` | `components/chrome/Navbar.tsx` |
| `card.txt` | `components/work/ProjectDossier.tsx` |
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
