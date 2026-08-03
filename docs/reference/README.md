# Reference material

Source material the NEXUS v2 interaction work was built from. **Nothing here is
imported by the app** — these are notes, kept for provenance.

## `reference.txt`

The original art-direction brief (cyberpunk neo-futuristic). Still the guiding
document for the site's visual language.

## The component files

`card.txt`, `carousel.txt`, `dock.txt`, `fey-card.txt`, `hero-parallax.txt`,
`layout.txt`, `poster.txt`, `resizable-navbar.txt`, `timeline.txt`,
`tracingbeam.txt` — Aceternity UI components, saved as reference.

They were used as **mechanical references only**. Each was rebuilt in this
project's own design language and dependencies:

| Reference | Became |
| --- | --- |
| `poster.txt` | `src/components/layout/PosterReveal.tsx` + `PosterLayers.tsx` |
| `resizable-navbar.txt` | `src/components/layout/Navbar.tsx` |
| `dock.txt` | `src/components/layout/ConsoleDock.tsx` |
| `card.txt` | `src/components/sections/ProjectDossier.tsx` |
| `tracingbeam.txt` | `src/components/motion/DataConduit.tsx` |
| `timeline.txt` | `src/components/sections/Timeline.tsx` |
| `layout.txt` | `src/components/motion/HeadlineFlip.tsx` |
| `fey-card.txt` | `src/components/sections/CapabilityDeck.tsx` |
| `carousel.txt` | *not used* — `WorkRail` already covers horizontal browsing |
| `hero-parallax.txt` | *not used* — `FeaturedProject` already owns the pinned scroll moment |

## Assets: do not ship

The reference files point at `assets.aceternity.com`. **None of those URLs are
used by this project, and none should be.**

- `assets.aceternity.com/gta6/*.webp` (referenced by `poster.txt`) are the
  Grand Theft Auto VI key art sliced into layers — Rockstar / Take-Two
  copyright, and the GTA and VI marks are trademarks. Shipping them on a
  portfolio would be straightforward infringement, quite apart from hotlinking
  someone else's CDN.
- `assets.aceternity.com/labs/*`, `/demos/*` and `logo-dark.png` are demo
  placeholders that likewise aren't licensed to us.

The *techniques* — a layered depth stack, a camera dolly-out, staggered
per-layer reveals, a clip-path logo wipe, pointer-distance magnification — are
not protectable and were taken freely. Every pixel this site renders for them
is generated in `PosterLayers.tsx` and friends: inline SVG and CSS, no image
requests at all.
