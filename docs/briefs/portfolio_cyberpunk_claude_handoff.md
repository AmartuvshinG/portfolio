# Portfolio Website Upgrade — Blade Runner / Cyberpunk / Neo-Tokyo Art Direction
## Claude Code Handoff Reference + Creative Implementation Plan

> **Purpose:** Transform the existing portfolio website into a highly art-directed, cinematic cyberpunk / sci-fi / Neo-Tokyo experience with the polish, motion quality, visual hierarchy, and interaction design expected from an Awwwards-level creative developer portfolio.
>
> **Important:** This document is a **creative + technical handoff reference**, not a request to blindly rebuild the entire site. Claude Code should first inspect the existing project, preserve working functionality, and then upgrade the experience systematically.

---

# 1. Core Creative Direction

## Primary aesthetic

The website should feel like:

- **Blade Runner-inspired future city atmosphere**
- **Neo-Tokyo at night**
- Dense urban scale, rain, reflections, signage, holographic interfaces
- High-end sci-fi interface design rather than a stereotypical "gaming RGB" website
- Cinematic, mysterious, premium, technological
- Futuristic but believable
- Strong sense of depth, atmosphere, motion, and physical space
- A portfolio that feels like entering a world rather than browsing a resume

### Desired emotional response

The first impression should communicate:

> "This person builds things at the intersection of software, visuals, interaction, and technology."

It should feel memorable within the first 3–5 seconds.

The website should have a distinct visual identity even when all text and project thumbnails are removed.

---

# 2. What to Avoid

Do **not** turn this into:

- A generic purple AI/SaaS landing page
- A simple black background with neon text
- An overused "cyberpunk template"
- Excessive RGB/glow effects
- A space/galaxy website
- A dashboard pretending to be a portfolio
- A collection of disconnected animations
- Constant screen shake or excessive distortion
- Huge text everywhere with no hierarchy
- Excessive glassmorphism
- Excessive rounded cards
- Random particles with no visual purpose
- Fake futuristic terminology
- Decorative effects that reduce readability
- Heavy WebGL that destroys mobile performance

### Design principle

**Atmosphere first, gimmicks second.**

Every visual effect should support one of these:

1. depth
2. storytelling
3. navigation
4. hierarchy
5. immersion
6. technological identity

If an effect does none of these, remove it.

---

# 3. Art Direction

## Color system

Use an intentionally restrained palette.

### Base
- Near-black / charcoal
- Slightly blue-tinted blacks
- Cool gray typography

### Accent system
Use a primary accent around:

- electric cyan
- cool teal
- restrained magenta/red as a secondary accent

Do not make every element glow.

### Suggested conceptual palette

```text
Void Black        #050608
Deep Charcoal     #0B0F14
Steel Gray        #3C4652
Soft White        #E8EDF2
Cold Cyan         #4DEBFF
Electric Teal     #00B8C8
Neon Magenta      #FF3EA5
Signal Red        #FF4F5E
```

These are references, not mandatory exact values.

### Lighting rule

Think like a cinematographer:

- dark environment
- selective highlights
- large areas of visual silence
- localized neon
- atmospheric bloom
- reflective surfaces
- occasional red/cyan contrast

The website should not look uniformly neon.

---

# 4. Typography Direction

The typography should feel futuristic without sacrificing usability.

## Recommended structure

### Display typography
Use a contemporary geometric / grotesk / techno-inspired display face for:

- hero headline
- section titles
- large labels

### Body typography
Use a highly legible modern sans-serif for:

- descriptions
- project details
- navigation
- technical information

### Micro typography

Introduce small uppercase technical labels such as:

```text
SYSTEM / 01
PROJECT / 03
LOCATION / ULAANBAATAR
STATUS / ONLINE
STACK / REACT • THREE.JS • FASTAPI
```

Use this language sparingly.

## Typography behavior

Experiment with:

- huge but controlled hero type
- stretched tracking for labels
- very tight display line-height
- monospaced accents for metadata
- dynamic text reveal
- subtle letter-spacing animations

Do not sacrifice readability for style.

---

# 5. Overall Experience Concept

Imagine the website as a **virtual Neo-Tokyo district**.

The user is not simply scrolling through sections.

Instead, scrolling should feel like moving through an environment.

Possible progression:

```text
ENTRY
  ↓
CITY / HERO
  ↓
IDENTITY
  ↓
PROJECT DISTRICT
  ↓
CASE STUDIES
  ↓
TECH / EXPERIMENTS
  ↓
ABOUT / PROFILE
  ↓
CONTACT / SIGNAL
```

The transitions between sections should visually connect.

Avoid the feeling of:

```text
Hero
↓
normal section
↓
normal cards
↓
normal footer
```

Everything should feel like part of the same world.

---

# 6. Hero Section — Most Important Area

The hero should carry most of the visual identity.

## Concept

A cinematic Neo-Tokyo environment at night.

Possible environment:

- towering futuristic buildings
- distant skyscrapers
- illuminated windows
- animated advertisements/signage
- wet streets
- atmospheric fog
- rain
- subtle particles
- reflective surfaces
- volumetric light
- moving traffic far in the background
- layered depth
- slow environmental motion

The foreground should remain relatively clean so the portfolio identity remains readable.

## Hero composition

Potential hierarchy:

```text
[small technical label]

AMARTUVSHIN
GANZORIG

Software Engineer
Creative Developer / Builder / Technologist

[VIEW PROJECTS]
[ENTER EXPERIENCE]

                    atmospheric city environment
                    / animated skyline /
                    / holographic elements /
```

Do not copy this literally. Use the existing site's identity and content.

## Hero interaction

Possible effects:

- mouse-driven environmental parallax
- camera depth shift
- subtle perspective movement
- cursor light
- reactive holographic panels
- particles reacting to pointer movement
- slowly animated skyline
- scanline / CRT influence at very low intensity

The environment should move **slowly**.

The text should remain stable enough to read.

---

# 7. WebGL / Three.js Direction

Three.js/WebGL can provide the biggest differentiator, but it must be used intentionally.

## Recommended approach

Do not build the entire website inside a giant WebGL canvas.

Instead:

```text
DOM / React UI
        +
Three.js environmental layer
        +
CSS compositing / overlays
```

Use WebGL for:

- environment
- atmospheric effects
- shaders
- depth
- particles
- lighting
- procedural surfaces
- transitions

Use regular HTML/CSS for:

- text
- navigation
- buttons
- project descriptions
- accessibility
- semantic structure

This gives the website both visual freedom and reliable UX.

---

# 8. WebGL Scene Concepts

## A. Neo-Tokyo skyline

Create a stylized procedural skyline instead of relying completely on downloaded models.

Use:

- instanced buildings
- emissive windows
- varying building heights
- billboard planes
- fog layers
- distant silhouettes
- animated signage

The skyline should feel dense rather than like five isolated buildings.

## B. Holographic advertisements

Small panels can display:

```text
PROJECT / 04
SYSTEM ONLINE
WEBGL / ACTIVE
BUILD 2026
```

These should exist in the environment rather than becoming the main UI.

## C. Rain

Rain should be subtle.

Possible implementation:

- GPU particles
- sprite particles
- shader-driven streaks

Avoid huge white lines falling across the entire screen.

## D. Atmospheric fog

Use depth and layered haze to create:

- foreground
- midground
- background

This is one of the easiest ways to create cinematic depth.

## E. Reflective surfaces

Where possible, use restrained reflections for:

- wet street surfaces
- metallic structures
- glass
- UI panels

Do not make everything mirror-like.

---

# 9. Shader Ideas

Use shaders where they provide a real visual improvement.

### Possible effects

- animated holographic gradients
- RGB chromatic offset
- subtle scanline distortion
- procedural noise
- film grain
- heat/haze distortion
- animated emissive signage
- dithering
- digital interference
- atmospheric color variation
- water/rain ripple distortion
- portal-like transitions between sections

### Rule

Shader effects should generally be:

```text
subtle at rest
stronger during interaction
strong during transitions
```

This creates visual rhythm.

---

# 10. Navigation Concept

The navigation should feel like an interface inside the world.

Possible treatment:

```text
01 / WORK
02 / EXPERIMENTS
03 / ABOUT
04 / CONTACT
```

Potential layout:

- minimal fixed navigation
- transparent / dark HUD-style layer
- thin separators
- tiny metadata labels
- animated active state
- small vertical progress indicator

Avoid a large conventional SaaS navbar.

## Optional navigation interaction

On hover:

- label expands
- thin line travels
- local glow appears
- corresponding scene element reacts

The interaction should be fast and restrained.

---

# 11. Scroll Experience

Scrolling should be treated as an animation timeline.

## Important principle

Do not animate every element independently.

Instead, compose larger sequences.

Example:

```text
Section enters
→ environment changes
→ lighting shifts
→ headline reveals
→ project object moves into position
→ content stabilizes
→ next transition begins
```

This creates cinematic continuity.

## Scroll behavior

Potential techniques:

- Lenis or equivalent smooth-scroll solution
- GSAP ScrollTrigger where appropriate
- camera movement tied to scroll
- environment transformation
- masked transitions
- pinned scenes
- horizontal project sequences
- depth-based parallax

Use scroll hijacking carefully.

Native usability still matters.

---

# 12. Projects Section

Projects should not just be cards.

## Preferred concept

Treat each project as a **scene / object / case file**.

Possible presentation:

```text
PROJECT 01

BUG PRIORITIZATION
SYSTEM

Machine Learning
React
FastAPI
PostgreSQL

[VIEW CASE STUDY]
```

Then reveal:

- large image/render
- project metadata
- short objective
- interesting technical detail
- result/outcome
- technology stack

## Visual treatment

Potentially use:

- large immersive image
- masked image transitions
- cursor-following preview
- depth zoom
- image displacement shader
- subtle scanline effect on hover

Do not make every project identical.

Create visual variation while maintaining one system.

---

# 13. Project Hover Interaction

A strong interaction target:

```text
Normal state
    ↓
Cursor enters project
    ↓
image becomes active
    ↓
project preview follows cursor
    ↓
metadata brightens
    ↓
environment reacts subtly
```

Possible visual response:

- image displacement
- slight chromatic aberration
- directional image movement
- title letter-spacing shift
- thin neon line expansion

Keep the response immediate.

---

# 14. Case Study Experience

For important projects, use an immersive detail page.

Suggested structure:

```text
TITLE
Short statement

HERO VISUAL

CONTEXT
What problem existed?

SYSTEM
How was it built?

TECHNICAL ARCHITECTURE
How the components interact.

KEY CHALLENGE
What was difficult?

SOLUTION
What changed?

RESULT
What was achieved?

SELECTED SCREENSHOTS / VISUALS

NEXT PROJECT
```

The case study should feel editorial, not like a documentation dump.

---

# 15. About Section

Avoid a standard:

> "Hi, I'm X. I am a software engineer..."

Instead, make it feel like a profile dossier.

Example structure:

```text
PROFILE / 01

SOFTWARE ENGINEER
CREATIVE DEVELOPER

Based in Ulaanbaatar

Focus
Software
Interactive Experiences
3D / WebGL
AI / Systems

CURRENT SIGNAL
Building / learning / experimenting
```

Use actual personal information from the existing site rather than inventing futuristic lore.

---

# 16. Skills / Technology Section

Do not use generic skill bars.

Avoid:

```text
JavaScript 90%
React 85%
Python 80%
```

Instead use an editorial system:

```text
CORE
React
TypeScript
Python

SYSTEMS
FastAPI
PostgreSQL
Supabase

INTERACTIVE
Three.js
WebGL
GSAP

TOOLS
Git
Docker
Blender
```

Potentially visualize relationships between technologies with subtle lines or nodes.

Avoid turning this into a dashboard.

---

# 17. Experimental / Playground Section

This could become one of the signature parts of the site.

Show:

- WebGL experiments
- shader experiments
- procedural graphics
- 3D experiments
- creative coding
- small interaction prototypes

Possible presentation:

```text
EXPERIMENTS / ARCHIVE

[ SHADER 001 ]
[ CITY 002 ]
[ PARTICLES 003 ]
[ UI 004 ]
```

Each experiment can behave like a miniature interactive exhibit.

---

# 18. Cursor Design

A custom cursor can significantly improve the experience.

Possible states:

### Default
Small dot / ring.

### Link
Ring expands.

### Project
Cursor displays:

```text
VIEW
```

### Image
Cursor becomes a small preview control.

### Drag
Cursor changes to:

```text
DRAG
```

Do not make the cursor huge or annoying.

Always disable custom cursor behavior on touch devices.

---

# 19. Microinteractions

Use microinteractions throughout the site.

Examples:

### Buttons

Rest:

```text
VIEW PROJECT →
```

Hover:

- border shifts
- arrow moves
- subtle glow
- background fill travels across

### Links

- underline draws from left to right
- text moves by 1–2px
- optional accent light

### Images

- slight scale
- image displacement
- brightness shift

### Metadata

- numbers increment
- status indicator pulses
- active state changes

Microinteractions should feel engineered rather than decorative.

---

# 20. Visual Texture

The page should have physicality.

Consider very subtle layers:

- film grain
- noise
- scanlines
- dust
- rain haze
- vignette
- bloom
- soft chromatic aberration
- glass reflections
- atmospheric fog

These should usually sit at low opacity.

A useful hierarchy is:

```text
Primary content
    ↓
environment
    ↓
lighting
    ↓
texture
```

Never reverse the hierarchy.

---

# 21. Image Strategy

Do not depend entirely on static screenshots.

For important project visuals consider:

- short looping WebM videos
- lightweight MP4/WebM
- animated WebP
- interactive Three.js scenes
- shader-driven image transitions

Potential pipeline:

```text
Source image/video
        ↓
optimized WebP/WebM
        ↓
React component
        ↓
shader / transform / overlay
```

Images should be compressed and lazy-loaded where possible.

---

# 22. Motion System

Create a consistent motion language.

## Timing

Use a small set of durations rather than random values.

Example conceptual system:

```text
micro      120–180ms
short      250–400ms
medium     500–800ms
cinematic  900–1600ms
```

## Easing

Prefer:

- smooth cubic-bezier curves
- spring-like interactions where appropriate
- slow ease-outs for cinematic entrances

Avoid constant linear movement except for intentional ambient effects.

---

# 23. Sound

Optional.

If audio is introduced, it should be:

- muted by default
- user-controlled
- extremely subtle
- never necessary to understand the site

Possible sounds:

- UI confirmation
- soft futuristic ambience
- environmental city noise

Do not autoplay loud music.

---

# 24. Loading / Entry Experience

Consider a short cinematic initialization sequence.

Example:

```text
INITIALIZING EXPERIENCE

GRAPHICS ........ ONLINE
SYSTEM .......... ONLINE
PORTFOLIO ....... ONLINE
```

Then transition into the hero.

However:

**Do not make the user stare at a loading screen.**

Target a very short perceived entry.

Also make the loader skippable or eliminate it on slower devices.

---

# 25. Responsive Design

Desktop can carry the most ambitious WebGL environment.

Mobile must remain a first-class experience.

### Desktop

Potentially enable:

- full WebGL environment
- mouse parallax
- advanced shader effects
- richer transitions
- hover effects

### Tablet

Reduce:

- particle count
- shader complexity
- animation density

### Mobile

Prefer:

- simplified environment
- no custom cursor
- reduced particles
- minimal heavy post-processing
- touch-friendly navigation
- stable text layout

The mobile experience should still feel intentional, not like the desktop version after everything broke.

---

# 26. Performance Requirements

This is critical.

Awwwards-level visual quality means nothing if the page stutters.

## Targets

Aim for:

- smooth scrolling
- stable animation timing
- fast initial content
- responsive input
- minimal main-thread blocking
- GPU-aware effects

## Techniques

Use:

- lazy loading
- code splitting
- dynamic imports
- instancing for repeated objects
- texture compression
- reasonable texture resolutions
- object pooling
- GPU particle systems where appropriate
- `requestAnimationFrame`
- adaptive quality
- device capability detection
- reduced post-processing on weaker hardware

Avoid creating hundreds of React re-renders from animation state.

Use refs or dedicated animation systems for high-frequency updates.

---

# 27. Reduced Motion / Accessibility

Respect:

```css
prefers-reduced-motion
```

When reduced motion is enabled:

- disable heavy camera movement
- disable aggressive transitions
- reduce parallax
- remove unnecessary distortion
- keep content fully accessible

Also maintain:

- keyboard navigation
- semantic HTML
- visible focus states
- adequate contrast
- accessible buttons/links
- meaningful image alt text

A futuristic portfolio still needs to be a professional website.

---

# 28. Technical Architecture

Claude Code should inspect the existing stack before changing anything.

Possible structure:

```text
src/
  components/
    Navigation/
    Hero/
    Projects/
    About/
    Contact/
    UI/
  scenes/
    CityScene/
    Particles/
    Holograms/
  shaders/
    hologram/
    distortion/
    atmosphere/
  hooks/
  animations/
  data/
  styles/
```

This is only a reference.

Adapt the structure to the actual repository.

## Separation of concerns

Prefer:

```text
UI logic
≠
animation logic
≠
WebGL scene logic
≠
content data
```

Do not bury all creative logic inside one massive component.

---

# 29. Suggested Dependencies

Only add dependencies when they genuinely improve the experience.

Potential tools:

- **Three.js**
- **React Three Fiber** if the project is React-based
- **@react-three/drei**
- **GSAP**
- **Lenis**
- shader utilities where needed

Do not install a large collection of libraries just because they are popular.

First inspect the existing project.

---

# 30. Asset Strategy

Before creating complex 3D content:

1. inspect existing assets
2. preserve useful assets
3. identify missing hero visuals
4. determine what should be procedural
5. determine what should be rendered/video-based
6. optimize assets before integrating them

Prefer a limited number of high-quality assets over dozens of mediocre assets.

---

# 31. Page Transition Concept

Transitions should feel like crossing through a futuristic city.

Possible techniques:

### Light sweep
A bright vertical/circular light briefly travels across the scene.

### Digital wipe
A mask reveals the next section.

### Camera tunnel
Camera moves through a dark environmental passage.

### Scan transition
Subtle scanline distortion reveals the next visual.

### Atmospheric dissolve
Fog/light expands while the next scene becomes visible.

Do not use a different transition for every section.

Choose one main transition language and establish variations.

---

# 32. Footer / Contact

The end of the site should feel like the end of a cinematic sequence.

Potential concept:

```text
CONNECTION TERMINAL

LET'S BUILD SOMETHING
WORTH EXPLORING.

EMAIL
LINKEDIN
GITHUB
```

Large negative space.

Minimal navigation.

A final atmospheric background.

The footer should feel like a conclusion, not a pile of links.

---

# 33. Easter Eggs

Use very small hidden interactions.

Examples:

- pressing a keyboard key reveals diagnostics
- clicking a hidden city sign changes the environment
- hovering a technical label reveals a small data panel
- an alternate visual state after long scrolling
- subtle terminal-like interaction

Easter eggs should reward exploration without becoming necessary.

---

# 34. Brand Language

Avoid fake corporate copy.

Use concise, confident language.

Possible tone:

```text
BUILD SYSTEMS.
CREATE EXPERIENCES.
EXPLORE THE INTERFACE BETWEEN CODE AND VISUALS.
```

But preserve the user's actual identity and work.

Do not manufacture impressive-sounding claims.

---

# 35. Reference Quality Bar

Use the following categories as quality references rather than copying individual websites:

### Awwwards-level interaction
Look for:

- strong art direction
- smooth transitions
- sophisticated typography
- unusual navigation
- cohesive motion system

### High-end creative developer portfolios
Look for:

- experimental WebGL
- immersive project presentation
- storytelling through interaction
- excellent image direction

### Cyberpunk / Neo-Tokyo references
Use for:

- environmental mood
- signage
- rain
- scale
- lighting
- atmosphere
- architecture

### Blade Runner influence
Take inspiration from:

- cinematic contrast
- rain-soaked surfaces
- giant urban scale
- atmospheric haze
- warm/cool lighting tension
- dense architectural layers

Do **not** copy copyrighted characters, logos, scenes, typography, or exact visual compositions.

The goal is **original work influenced by the visual language**, not a replica.

---

# 36. Recommended Creative Composition

A strong overall layout could look like:

```text
┌──────────────────────────────────────────────┐
│ FIXED HUD NAV                                │
│                                              │
│               NEO-TOKYO ENVIRONMENT          │
│                                              │
│      SOFTWARE ENGINEER                       │
│      CREATIVE DEVELOPER                      │
│                                              │
│      SHORT INTRO                              │
│                                              │
│      [VIEW WORK]                             │
│                                              │
│                              SYSTEM / 001    │
├──────────────────────────────────────────────┤
│                                              │
│ ABOUT / IDENTITY                             │
│                                              │
│ Large editorial text + environmental motion  │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ SELECTED WORK                               │
│                                              │
│ PROJECT 01                                   │
│ immersive visual                             │
│                                              │
│ PROJECT 02                                   │
│ immersive visual                             │
│                                              │
│ PROJECT 03                                   │
│ immersive visual                             │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ EXPERIMENTS / PLAYGROUND                     │
│                                              │
│ interactive miniature scenes                 │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ ABOUT / PROFILE                              │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│ CONTACT / CONNECTION TERMINAL                │
│                                              │
└──────────────────────────────────────────────┘
```

This is a conceptual structure, not a mandatory wireframe.

---

# 37. Claude Code Workflow

## Phase 1 — Audit

Before modifying files:

- inspect the entire repository
- identify framework
- identify routing
- identify current components
- identify animation libraries
- identify existing 3D/WebGL code
- inspect image/video assets
- inspect typography
- inspect responsive behavior
- identify reusable components
- identify technical debt
- identify what must not be broken

Produce a concise internal assessment before implementation.

## Phase 2 — Visual System

Establish:

- typography
- spacing
- colors
- surfaces
- borders
- glow rules
- grid
- motion principles
- navigation language

Do this before creating dozens of individual effects.

## Phase 3 — Hero Prototype

Build the hero first.

The hero should answer:

> "Does this now feel like a completely different, high-end portfolio?"

If not, improve the hero before spreading the visual treatment across the entire website.

## Phase 4 — Motion System

Create reusable:

- reveal animations
- hover behavior
- page transitions
- image transitions
- scroll sequences
- cursor states

Avoid duplicating animation logic.

## Phase 5 — WebGL

Add the environmental scene.

Start with:

1. composition
2. depth
3. lighting
4. atmosphere
5. movement
6. shader detail

Do not start with complicated shaders before composition works.

## Phase 6 — Projects

Transform current project content into immersive presentations.

Preserve factual project details.

## Phase 7 — Responsive + Accessibility

Test:

- desktop
- laptop
- tablet
- mobile
- reduced motion
- keyboard interaction

## Phase 8 — Performance

Profile the website.

Reduce:

- draw calls
- texture sizes
- unnecessary DOM animation
- React re-renders
- shader complexity
- particle count

## Phase 9 — Final Polish

Perform a visual QA pass for:

- typography
- alignment
- spacing
- motion consistency
- hover timing
- section transitions
- mobile behavior
- loading behavior
- contrast
- broken links
- overflow
- performance

---

# 38. Claude Code Behavioral Rules

When implementing this design:

### DO

- inspect before editing
- reuse existing architecture where reasonable
- preserve existing content and functionality
- make reusable components
- use progressive enhancement
- test changes frequently
- prioritize visual hierarchy
- keep animations coherent
- optimize WebGL
- make mobile intentional
- keep accessibility intact
- remove effects that do not improve the experience

### DO NOT

- rewrite the whole project unnecessarily
- replace working functionality without reason
- introduce dependencies without justification
- create one giant component
- make everything glow
- animate everything constantly
- make the site difficult to navigate
- use fake statistics
- invent achievements
- replace actual project descriptions with futuristic filler
- prioritize screenshots/mockups over real UX
- sacrifice performance for visual effects
- create a giant loading screen
- use copyrighted Blade Runner assets as if they are original branding

---

# 39. Definition of "Awwwards-Level"

Do not interpret "Awwwards-level" as "add more animations."

The quality bar should come from the combination of:

```text
ART DIRECTION
      +
TYPOGRAPHY
      +
LAYOUT
      +
MOTION
      +
INTERACTION
      +
3D / WEBGL
      +
STORYTELLING
      +
PERFORMANCE
      +
RESPONSIVE DESIGN
      +
POLISH
```

A website with impressive WebGL but weak typography is not finished.

A website with beautiful typography but generic interaction is not finished.

A website with amazing animation but poor UX is not finished.

The goal is **cohesion**.

---

# 40. Final Creative North Star

The website should feel like:

> **A futuristic city interface built by a software engineer who cares about visual craft.**

Not:

> "A normal portfolio with a cyberpunk theme applied to it."

The visitor should experience:

```text
curiosity
   ↓
immersion
   ↓
discovery
   ↓
understanding
   ↓
confidence
   ↓
contact
```

Every visual choice should support that progression.

---

# 41. Final Instruction to Claude Code

When beginning implementation, treat this file as the creative north star.

First inspect the existing site and determine:

1. what already works
2. what should be preserved
3. what visually limits the current experience
4. which sections deserve the biggest redesign
5. what WebGL/Three.js additions provide the highest visual return
6. what can be achieved without unnecessary dependency or architectural changes

Then implement the redesign in focused stages.

Do **not** merely add neon colors and animations.

Create a unified visual world with:

- cinematic Neo-Tokyo atmosphere
- Blade Runner-inspired lighting language
- premium futuristic typography
- immersive project storytelling
- sophisticated motion
- carefully chosen WebGL effects
- restrained cyberpunk interface elements
- excellent responsive behavior
- strong performance

The finished result should feel like an original, premium creative technology portfolio — not a template.
