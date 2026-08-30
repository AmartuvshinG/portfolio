/**
 * ============================================================================
 * SINGLE SOURCE OF TRUTH for all portfolio content.
 * Edit anything here — copy, projects, stats — and it propagates everywhere.
 * (Placeholder content personalised for Amara; swap in real details anytime.)
 * ============================================================================
 */

export type AccentKey = "accent" | "accent-2" | "alert";

export interface NavLink {
  label: string;
  href: string;
  code: string;
}

export interface Capability {
  code: string;
  title: string;
  description: string;
  tags: string[];
  /** 0–100 proficiency, drives the HUD micro-graph */
  level: number;
}

export interface Project {
  slug: string;
  index: string;
  title: string;
  category: string;
  year: string;
  role: string;
  summary: string;
  description: string;
  stack: string[];
  highlights: string[];
  accent: AccentKey;
  /** Remote image used on the detail page only (homepage uses generated visuals). */
  image: string;
  /**
   * Real screenshot, textured onto this project's card in the 3D work world.
   * Drop the file at the path below; while it's missing the world falls back to
   * the generated `ProjectVisual` for this project, with no layout shift.
   */
  shot: string;
  metrics: { label: string; value: string }[];
}

export interface GalleryImage {
  src: string;
  alt: string;
  /** Intrinsic size — drives the srcset and the scattered layout's aspect box. */
  width: number;
  height: number;
  /**
   * Scatter placement, in the tall gallery canvas's own coordinate space:
   * `x` is a viewport fraction (0–1), `y` a multiple of viewport height, `w` a
   * viewport-width fraction. Hand-placed rather than generated — the whole
   * effect depends on the rhythm of the gaps, which random scatter never finds.
   */
  x: number;
  y: number;
  w: number;
  /** Parallax strength. 0 pins to the page, 1 drifts a full viewport height. */
  depth: number;
  caption?: string;
}

export interface TimelineEntry {
  year: string;
  title: string;
  org: string;
  description: string;
  status: "ONLINE" | "ARCHIVED" | "ACTIVE";
}

export interface Stat {
  label: string;
  value: number;
  suffix?: string;
  unit?: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  org: string;
}

export interface SocialLink {
  label: string;
  handle: string;
  href: string;
  /** Two-letter HUD glyph used by the console dock. */
  code: string;
}

/* -------------------------------------------------------------------------- */

export const site = {
  name: "AMARA",
  title: "AMARA — Creative Technologist",
  description:
    "Portfolio of Amara — creative technologist engineering immersive, high-performance digital interfaces at the intersection of design, motion and code.",
  url: "https://amara.dev",
};

/**
 * Portrait cutout for the hero. Wants a **background-removed** PNG, ≥1400px
 * tall: the whole effect is the wordmark passing behind the shoulders, which a
 * rectangular photo cannot do. Until the file exists the hero renders the
 * generated silhouette treatment instead.
 */
export const PORTRAIT = "/portrait.png";

export const profile = {
  wordmark: "AMARA",
  fullName: "Amara Junior",
  role: "Creative Technologist",
  discipline: "Interface Engineering · Motion · Real-time Graphics",
  location: "Remote · GMT+0",
  status: "AVAILABLE FOR SELECT PROJECTS",
  /** The hero wordmark, split so the portrait can sit between the two halves. */
  heroName: ["AMA", "RA"],
  /** Set in the editorial serif under the name. */
  heroLead: "Interfaces that feel like hardware.",
  /**
   * The same line, broken for the hero's word-by-word arrival.
   *
   * Two lines rather than one because the reference clip's headline lands as
   * two — the second starting a beat behind the first — and a single five-word
   * line has nowhere for that lag to live. `heroLead` stays as the flat string
   * for anywhere that needs one (metadata, reduced motion).
   */
  heroLeadLines: ["Interfaces that feel", "like hardware."],
  heroSub:
    "Creative technologist. I design and engineer the web at the seam where cinematic motion, real-time graphics and obsessive performance meet.",
  kicker: "PORTFOLIO — 2026",
};

/**
 * The section map.
 *
 * Voices and Path are listed even though they were not before: the nav jumped
 * straight from Archive to Contact across two full chapters, which is why that
 * stretch read as a gap in the page rather than as two sections the map had
 * simply failed to mention.
 */
export const navLinks: NavLink[] = [
  { label: "Index", href: "#hero", code: "00" },
  { label: "Profile", href: "#about", code: "01" },
  { label: "Signal", href: "#connect", code: "02" },
  { label: "Craft", href: "#capabilities", code: "03" },
  { label: "Work", href: "#work", code: "04" },
  { label: "Lab", href: "#lab", code: "05" },
  { label: "Lookbook", href: "#lookbook", code: "06" },
  { label: "Archive", href: "#gallery", code: "07" },
  { label: "Voices", href: "#testimonials", code: "08" },
  { label: "Path", href: "#timeline", code: "09" },
  { label: "Contact", href: "#contact", code: "10" },
];

/**
 * The on-page index for a section, by its anchor.
 *
 * Every section masthead used to carry its number as a string literal, and the
 * two lists had drifted apart: the page ran `00,01,02,03,04,05,06,–,08,09,10`
 * while the nav said Voices `07`, Path `08`, Contact `09`. Voices printed no
 * index at all, the ledger spent two on its two internal blocks, and Contact
 * showed `10` for a nav code of `09` — so the last four sections disagreed with
 * the navigation about what they were called.
 *
 * Deriving them from `navLinks` makes that class of drift impossible: the
 * numbering has exactly one source, and adding a section to the nav renumbers
 * the page. `--` rather than a throw for an unknown anchor — a wrong number is
 * a bug, a missing one is only a gap, and this must never take the page down.
 */
export function sectionIndex(href: string): string {
  return navLinks.find((l) => l.href === href)?.code ?? "--";
}

/**
 * Which section a non-home route belongs to.
 *
 * On `/work/helix-os` there is no `#work` element to observe, so the navbar has
 * nothing to highlight and used to leave INDEX lit — telling the visitor they
 * were at the top of the home page while they read a case file. Matching the
 * pathname instead gives the right answer, and an unmatched route correctly
 * gets no highlight at all rather than a wrong one.
 */
export const routeSections: { prefix: string; href: string }[] = [
  { prefix: "/work", href: "#work" },
];

export const about = {
  heading: "OPERATOR PROFILE",
  lead: "I turn ambitious ideas into interfaces that feel engineered — precise, kinetic and impossibly smooth.",
  paragraphs: [
    "For the last eight years I've worked at the seam between design and engineering, building digital products for studios, startups and global brands. My obsession is the moment an interface stops feeling like a webpage and starts feeling like a machine — responsive, tactile, alive.",
    "I write production-grade code and choreograph motion at the frame level. WebGL, shaders, scroll systems, design systems — I treat the whole stack as one medium. Nothing ships until it holds 60fps and reads clean on a phone.",
  ],
  signature: [
    { k: "FOCUS", v: "Immersive Web" },
    { k: "STACK", v: "React · WebGL · GSAP" },
    { k: "MODE", v: "Design + Engineering" },
  ],
};

export const capabilities: Capability[] = [
  {
    code: "SYS/01",
    title: "Interface Engineering",
    description:
      "Production React & Next.js architectures — typed, tested, and tuned for Core Web Vitals without compromising on ambition.",
    tags: ["React", "Next.js", "TypeScript"],
    level: 96,
  },
  {
    code: "SYS/02",
    title: "Real-time Graphics",
    description:
      "WebGL and shader work with Three.js / R3F — particle systems, post-processing and 3D product moments that stay performant.",
    tags: ["Three.js", "R3F", "GLSL"],
    level: 88,
  },
  {
    code: "SYS/03",
    title: "Motion Design",
    description:
      "Scroll choreography, micro-interactions and page transitions built on GSAP and Framer Motion with reduced-motion baked in.",
    tags: ["GSAP", "Framer Motion", "Lenis"],
    level: 93,
  },
  {
    code: "SYS/04",
    title: "Design Systems",
    description:
      "Token-driven design systems and component libraries that scale across teams while keeping a razor-sharp visual identity.",
    tags: ["Tokens", "Figma", "Tailwind"],
    level: 90,
  },
  {
    code: "SYS/05",
    title: "Creative Direction",
    description:
      "Art direction and prototyping from zero — concept, narrative and interaction language for award-calibre launches.",
    tags: ["Concept", "Prototyping", "Brand"],
    level: 85,
  },
  {
    code: "SYS/06",
    title: "Performance",
    description:
      "Deep-dive profiling, bundle surgery and rendering optimisation. Fast is a feature; I treat it like one.",
    tags: ["Profiling", "CWV", "A11y"],
    level: 94,
  },
];

export const projects: Project[] = [
  {
    slug: "helix-os",
    index: "01",
    title: "HELIX OS",
    category: "Product Platform",
    year: "2025",
    role: "Lead Interface Engineer",
    summary:
      "A real-time operating console for autonomous fleet infrastructure, rebuilt as a single fluid WebGL surface.",
    description:
      "Helix OS reimagines the command console for autonomous logistics. I led the front-end architecture — a fully GPU-accelerated dashboard streaming thousands of live telemetry nodes at 60fps, with a custom motion system that makes dense data feel calm rather than chaotic.",
    stack: ["Next.js", "WebGL", "WebSockets", "Rust API"],
    highlights: [
      "Rendered 10k live nodes at a locked 60fps",
      "Custom instanced-particle telemetry layer",
      "Zero-jank virtualised data grids",
    ],
    accent: "accent",
    image: "https://picsum.photos/seed/helix-os/1600/1000",
    shot: "/work/helix-os.webp",
    metrics: [
      { label: "FPS", value: "60" },
      { label: "NODES", value: "10K" },
      { label: "LCP", value: "0.9s" },
    ],
  },
  {
    slug: "neon-atlas",
    index: "02",
    title: "NEON ATLAS",
    category: "Immersive Site",
    year: "2024",
    role: "Creative Technologist",
    summary:
      "An award-winning launch experience for a synth hardware brand — a scrollable 3D city of sound.",
    description:
      "A cinematic product launch built as an explorable neon metropolis. Users scroll through a volumetric city while the featured device assembles in mid-air. Shipped with a full reduced-motion path and still scored 98 on Lighthouse.",
    stack: ["R3F", "GLSL", "GSAP", "Lenis"],
    highlights: [
      "Scroll-driven 3D assembly sequence",
      "Hand-written fog + bloom shaders",
      "FWA Site of the Day",
    ],
    accent: "accent-2",
    image: "https://picsum.photos/seed/neon-atlas/1600/1000",
    shot: "/work/neon-atlas.webp",
    metrics: [
      { label: "LIGHTHOUSE", value: "98" },
      { label: "AWARDS", value: "3" },
      { label: "BUILD", value: "6wk" },
    ],
  },
  {
    slug: "cipher-grid",
    index: "03",
    title: "CIPHER GRID",
    category: "Data Visualisation",
    year: "2024",
    role: "Front-end Lead",
    summary:
      "A live threat-intelligence surface visualising global network anomalies as a breathing HUD.",
    description:
      "Cipher Grid turns raw security telemetry into an intuitive, cinematic HUD. I built the visualisation engine and interaction model — an animated globe, real-time anomaly streams and a keyboard-first command layer used by analysts daily.",
    stack: ["React", "D3", "WebGL", "GraphQL"],
    highlights: [
      "Real-time anomaly stream visualiser",
      "Keyboard-first analyst command layer",
      "Accessible colour-blind-safe palette",
    ],
    accent: "alert",
    image: "https://picsum.photos/seed/cipher-grid/1600/1000",
    shot: "/work/cipher-grid.webp",
    metrics: [
      { label: "EVENTS/S", value: "4K" },
      { label: "UPTIME", value: "99.9%" },
      { label: "USERS", value: "1.2K" },
    ],
  },
  {
    slug: "vantablack",
    index: "04",
    title: "VANTABLACK",
    category: "Design System",
    year: "2023",
    role: "Systems Architect",
    summary:
      "A dark-first design system and component engine powering a fintech suite across web and native.",
    description:
      "Vantablack is a token-driven design system engineered for a multi-product fintech. I architected the theming engine, motion primitives and documentation platform — one source of truth shipping to six product teams.",
    stack: ["Design Tokens", "Tailwind", "Storybook"],
    highlights: [
      "Powering 6 product teams",
      "Fully themeable token engine",
      "Interactive motion documentation",
    ],
    accent: "accent",
    image: "https://picsum.photos/seed/vantablack/1600/1000",
    shot: "/work/vantablack.webp",
    metrics: [
      { label: "TEAMS", value: "6" },
      { label: "COMPONENTS", value: "180" },
      { label: "ADOPTION", value: "94%" },
    ],
  },
  {
    slug: "signal-drift",
    index: "05",
    title: "SIGNAL DRIFT",
    category: "Audio-Reactive",
    year: "2023",
    role: "Creative Technologist",
    summary:
      "A generative visual instrument that renders a live audio stream as a drifting particle field.",
    description:
      "Signal Drift turns a live audio feed into a continuously evolving field of light. FFT bands drive a compute-shader particle system; the whole thing runs in a browser tab at 120fps and has been used as the stage visual for three touring sets.",
    stack: ["WebGL", "Web Audio", "GLSL", "TypeScript"],
    highlights: [
      "120fps on integrated graphics",
      "FFT-driven compute particle field",
      "Used live on a three-city tour",
    ],
    accent: "accent-2",
    image: "https://picsum.photos/seed/signal-drift/1600/1000",
    shot: "/work/signal-drift.webp",
    metrics: [
      { label: "FPS", value: "120" },
      { label: "PARTICLES", value: "260K" },
      { label: "SHOWS", value: "12" },
    ],
  },
  {
    slug: "meridian-freight",
    index: "06",
    title: "MERIDIAN",
    category: "Logistics Platform",
    year: "2022",
    role: "Front-end Architect",
    summary:
      "A freight-planning interface that made a spreadsheet workflow feel like a control surface.",
    description:
      "Meridian replaced a decade of spreadsheets with a single planning surface. The hard part was density: every screen holds thousands of rows and still has to feel calm. I built the virtualised grid, the routing map and the keyboard model the planners actually live in.",
    stack: ["React", "MapLibre", "Web Workers", "Postgres"],
    highlights: [
      "40k-row grids at 60fps",
      "Keyboard-first planning model",
      "Cut plan time by 62%",
    ],
    accent: "alert",
    image: "https://picsum.photos/seed/meridian-freight/1600/1000",
    shot: "/work/meridian.webp",
    metrics: [
      { label: "ROWS", value: "40K" },
      { label: "PLAN TIME", value: "-62%" },
      { label: "SEATS", value: "340" },
    ],
  },
];

/**
 * The scattered archive. Deliberately *not* a grid: items sit at wildly
 * different scales across a canvas several viewports tall and drift at
 * different rates, so the section reads as a spread rather than a gallery.
 *
 * Two rules make it work, and breaking either collapses it back into a grid:
 * no two neighbours share a width, and `depth` alternates so adjacent items
 * separate as you scroll instead of travelling together.
 *
 * Swap `src` for files in `/gallery/` — mixed aspect ratios are better here.
 */
export const gallery: GalleryImage[] = [
  {
    src: "https://picsum.photos/seed/amara-a/1400/1750",
    alt: "Helix OS — console detail",
    width: 1400,
    height: 1750,
    x: 0.06,
    y: 0.12,
    w: 0.24,
    depth: 0.55,
    caption: "HELIX OS, 2025",
  },
  {
    src: "https://picsum.photos/seed/amara-b/1600/1000",
    alt: "Motion choreography boards",
    width: 1600,
    height: 1000,
    x: 0.46,
    y: 0.34,
    w: 0.38,
    depth: 0.18,
    caption: "PROCESS",
  },
  {
    src: "https://picsum.photos/seed/amara-c/1200/1200",
    alt: "Shader research — volumetric studies",
    width: 1200,
    height: 1200,
    x: 0.2,
    y: 0.78,
    w: 0.16,
    depth: 0.85,
    caption: "SHADER STUDY",
  },
  {
    src: "https://picsum.photos/seed/amara-d/1400/1750",
    alt: "Neon Atlas — launch sequence",
    width: 1400,
    height: 1750,
    x: 0.66,
    y: 0.95,
    w: 0.3,
    depth: 0.4,
    caption: "NEON ATLAS, 2024",
  },
  {
    src: "https://picsum.photos/seed/amara-e/1600/1000",
    alt: "Cipher Grid — anomaly stream",
    width: 1600,
    height: 1000,
    x: 0.04,
    y: 1.34,
    w: 0.42,
    depth: 0.25,
    caption: "CIPHER GRID",
  },
  {
    src: "https://picsum.photos/seed/amara-f/1200/1500",
    alt: "Interface studies — archive sheet",
    width: 1200,
    height: 1500,
    x: 0.58,
    y: 1.62,
    w: 0.2,
    depth: 0.7,
    caption: "ARCHIVE",
  },
  {
    src: "https://picsum.photos/seed/amara-g/1800/1000",
    alt: "Vantablack — token documentation",
    width: 1800,
    height: 1000,
    x: 0.24,
    y: 2.02,
    w: 0.5,
    depth: 0.12,
    caption: "VANTABLACK, 2023",
  },
  {
    src: "https://picsum.photos/seed/amara-h/1200/1200",
    alt: "Studio — workstation",
    width: 1200,
    height: 1200,
    x: 0.82,
    y: 2.3,
    w: 0.14,
    depth: 0.9,
  },
  {
    src: "https://picsum.photos/seed/amara-i/1500/1000",
    alt: "Signal Drift — particle field study",
    width: 1500,
    height: 1000,
    x: 0.1,
    y: 2.58,
    w: 0.34,
    depth: 0.2,
    caption: "SIGNAL DRIFT, 2023",
  },
  {
    src: "https://picsum.photos/seed/amara-j/1100/1400",
    alt: "Type specimen sheets",
    width: 1100,
    height: 1400,
    x: 0.62,
    y: 2.86,
    w: 0.18,
    depth: 0.75,
    caption: "SPECIMEN",
  },
  {
    src: "https://picsum.photos/seed/amara-k/1800/1100",
    alt: "Meridian — routing surface",
    width: 1800,
    height: 1100,
    x: 0.2,
    y: 3.2,
    w: 0.46,
    depth: 0.15,
    caption: "MERIDIAN, 2022",
  },
  {
    src: "https://picsum.photos/seed/amara-l/1200/1200",
    alt: "Grid studies",
    width: 1200,
    height: 1200,
    x: 0.76,
    y: 3.5,
    w: 0.22,
    depth: 0.62,
  },
  /* --- The tail.
     Four more, authored down to y 4.3. The scatter used to stop at 3.5 and
     the canvas ran to 5.1, so the last screen and a half of the archive was
     empty — the "gap before Contact". The canvas is measured now
     (see ScatterGallery), but a chapter that thins out to one item and stops
     still reads as running out of material, so it is given something to
     finish on. Both authoring rules still hold: no two neighbours share a
     width, and `depth` alternates. */
  {
    src: "https://picsum.photos/seed/amara-m/1400/900",
    alt: "Helix OS — telemetry overlay",
    width: 1400,
    height: 900,
    x: 0.08,
    y: 3.74,
    w: 0.4,
    depth: 0.18,
    caption: "HELIX OS, 2025",
  },
  {
    src: "https://picsum.photos/seed/amara-n/1000/1300",
    alt: "Shader study — refraction tests",
    width: 1000,
    height: 1300,
    x: 0.58,
    y: 3.92,
    w: 0.16,
    depth: 0.84,
    caption: "REFRACTION",
  },
  {
    src: "https://picsum.photos/seed/amara-o/1600/1000",
    alt: "Neon Atlas — map compositing",
    width: 1600,
    height: 1000,
    x: 0.3,
    y: 4.16,
    w: 0.28,
    depth: 0.3,
    caption: "NEON ATLAS, 2024",
  },
  {
    src: "https://picsum.photos/seed/amara-p/1300/1300",
    alt: "Process — pinned board",
    width: 1300,
    height: 1300,
    x: 0.78,
    y: 4.3,
    w: 0.2,
    depth: 0.7,
  },
];

export const stats: Stat[] = [
  { label: "PROJECTS DEPLOYED", value: 74, suffix: "+" },
  { label: "YEARS IN FIELD", value: 8 },
  { label: "AWARDS & MENTIONS", value: 12 },
  { label: "AVG LIGHTHOUSE", value: 98, unit: "/100" },
];

export const timeline: TimelineEntry[] = [
  {
    year: "2025",
    title: "Independent Creative Technologist",
    org: "SELF-DIRECTED",
    description:
      "Partnering with studios and founders on immersive, high-performance web experiences and product interfaces.",
    status: "ACTIVE",
  },
  {
    year: "2022",
    title: "Principal Front-end Engineer",
    org: "AXIOM STUDIO",
    description:
      "Led the interface engineering guild — motion systems, WebGL pipelines and the studio's award-winning launch work.",
    status: "ONLINE",
  },
  {
    year: "2019",
    title: "Senior Web Engineer",
    org: "HALO LABS",
    description:
      "Shipped real-time dashboards and data-heavy products; established the performance culture and component library.",
    status: "ONLINE",
  },
  {
    year: "2017",
    title: "Interface Developer",
    org: "MERIDIAN",
    description:
      "Cut my teeth building responsive marketing sites and design systems for global consumer brands.",
    status: "ARCHIVED",
  },
];

export const testimonials: Testimonial[] = [
  {
    quote:
      "Amara operates on another level. The build felt less like a website and more like a piece of hardware — every interaction had weight, and it never dropped a frame.",
    author: "Dr. Lena Okafor",
    role: "Head of Product",
    org: "HELIX SYSTEMS",
  },
  {
    quote:
      "We briefed the impossible and got back something better. Rigorous engineering under genuinely beautiful design direction — a rare combination.",
    author: "Marcus Vane",
    role: "Creative Director",
    org: "AXIOM STUDIO",
  },
  {
    quote:
      "The most performance-obsessed engineer I've worked with. Our Core Web Vitals went green and stayed there while the site got dramatically more ambitious.",
    author: "Priya Nair",
    role: "VP Engineering",
    org: "CIPHER",
  },
];

export const contact = {
  heading: "INITIALIZE CONTACT",
  lead: "Have a system worth building? Transmit the brief — I reply within 48 hours.",
  email: "amaraajunior@gmail.com",
  availability: "OPEN · Q3 2026",
};

export const socials: SocialLink[] = [
  { label: "GITHUB", handle: "@amara", href: "https://github.com", code: "GH" },
  { label: "LINKEDIN", handle: "in/amara", href: "https://linkedin.com", code: "IN" },
  { label: "X / TWITTER", handle: "@amara", href: "https://x.com", code: "TW" },
  { label: "DRIBBBLE", handle: "amara", href: "https://dribbble.com", code: "DR" },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

/**
 * Per-project tint — the three stops of the spectrum ramp, used individually.
 *
 * These are not UI colours. They are rim lights in the 3D work world and wash
 * tints on the generated visuals, which is the one place several projects
 * genuinely need to be told apart at a glance. Because they are the same three
 * stops the ramp is built from, a project lit by one of them still reads as
 * part of the same system rather than as a fourth palette.
 *
 * Literal hex, not tokens: three.js needs a real colour, not a CSS variable.
 * Keep these in sync with --spectrum-1/2/3 in globals.css.
 */
export const accentColor: Record<AccentKey, string> = {
  accent: "#ff2d8f", // magenta
  "accent-2": "#7b5cff", // violet
  alert: "#22e0ff", // cyan
};
