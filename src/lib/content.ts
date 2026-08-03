/**
 * ============================================================================
 * SINGLE SOURCE OF TRUTH for all portfolio content.
 * Edit anything here — copy, projects, stats — and it propagates everywhere.
 * (Placeholder content personalised for Amara; swap in real details anytime.)
 * ============================================================================
 */

export type AccentKey = "cyan" | "purple" | "red";

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
  metrics: { label: string; value: string }[];
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

export const profile = {
  wordmark: "AMARA",
  fullName: "Amara Junior",
  role: "Creative Technologist",
  discipline: "Interface Engineering · Motion · Real-time Graphics",
  location: "Remote · GMT+0",
  status: "AVAILABLE FOR SELECT PROJECTS",
  version: "SYS.v9.0",
  heroLines: ["BUILDING", "THE FUTURE", "INTERFACE"],
  /** Rotated in place on the third hero line by <HeadlineFlip>. */
  heroFlipWords: ["INTERFACE", "SYSTEMS", "MOTION", "GRAPHICS"],
  heroSub:
    "I design and engineer next-generation digital experiences — where cinematic motion, real-time graphics and obsessive performance converge into interfaces that feel alive.",
  kicker: "NEXT-GENERATION DIGITAL CRAFT",
};

export const navLinks: NavLink[] = [
  { label: "Index", href: "#hero", code: "00" },
  { label: "Profile", href: "#about", code: "01" },
  { label: "Systems", href: "#capabilities", code: "02" },
  { label: "Work", href: "#work", code: "03" },
  { label: "Log", href: "#timeline", code: "04" },
  { label: "Contact", href: "#contact", code: "05" },
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
    accent: "cyan",
    image: "https://picsum.photos/seed/helix-os/1600/1000",
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
    accent: "purple",
    image: "https://picsum.photos/seed/neon-atlas/1600/1000",
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
    accent: "red",
    image: "https://picsum.photos/seed/cipher-grid/1600/1000",
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
    accent: "cyan",
    image: "https://picsum.photos/seed/vantablack/1600/1000",
    metrics: [
      { label: "TEAMS", value: "6" },
      { label: "COMPONENTS", value: "180" },
      { label: "ADOPTION", value: "94%" },
    ],
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

/** Accent → CSS custom property colour, for inline styling by data. */
export const accentColor: Record<AccentKey, string> = {
  cyan: "var(--color-cyan)",
  purple: "var(--color-purple-bright)",
  red: "var(--color-red)",
};
