/**
 * ============================================================================
 * SINGLE SOURCE OF TRUTH for all portfolio content.
 * Edit anything here — copy, projects, stats — and it propagates everywhere.
 *
 * Every fact below is sourced: the resume (EN/MN PDFs), the Spotfixes senior
 * design final report and README, the Gannon transcript and LinkedIn. If a
 * field needs a value those sources don't have, leave it out and ask — never
 * fill it with something plausible.
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
}

export interface Project {
  slug: string;
  index: string;
  title: string;
  category: string;
  year: string;
  role: string;
  /** Printed in the case file's fact row, e.g. "Live", "Completed". */
  status: string;
  summary: string;
  description: string;
  stack: string[];
  highlights: string[];
  accent: AccentKey;
  /**
   * Real screenshot (2000×1250 webp in `public/work/`), shown on the work
   * monitor and at the top of the case file. Optional: a project without one —
   * coursework, today — renders its generated `ProjectVisual` instead and never
   * requests a file that isn't there.
   */
  shot?: string;
  /** Measured figures only. Empty is fine — the strip is hidden. */
  metrics: { label: string; value: string }[];
  /** Outbound links shown on the case file and dossier (live site, code). */
  links?: { label: string; href: string }[];
  /**
   * Further screenshots for the case file, at the same 2000×1250 spec as
   * `shot`. Captured from the live sites by `scripts/capture-shots.mjs`.
   */
  gallery?: { src: string; alt: string; caption?: string }[];
  /** True for the portfolio itself — its address is wherever it is served. */
  self?: boolean;
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

export interface SocialLink {
  label: string;
  handle: string;
  href: string;
  /** Two-letter HUD glyph used by the console dock. */
  code: string;
  /** The service's own mark, drawn large on its Signal panel. */
  mark?: "github" | "linkedin";
  /** A rendered page, shown as a sheet on its Signal panel (resumes). */
  preview?: string;
}

/* -------------------------------------------------------------------------- */

/**
 * The canonical URL. The deploy domain isn't decided yet, so it comes from the
 * environment rather than being written down: an explicit
 * `NEXT_PUBLIC_SITE_URL` wins, then Vercel's production host, then localhost.
 * Only the server reads this (metadata), so the non-public env var is fine.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const site = {
  name: "AMARTUVSHIN",
  title: "Amartuvshin Ganzorig · Software Engineer",
  description:
    "Portfolio of Amartuvshin Ganzorig, a software engineering graduate (B.S., Gannon University, 2026) building full-stack and machine learning applications. Based in Ulaanbaatar, Mongolia.",
  url: siteUrl,
};

/**
 * Portrait cutout for the hero. Wants a **background-removed** PNG, ≥1400px
 * tall: the whole effect is the wordmark passing behind the shoulders, which a
 * rectangular photo cannot do. Until the file exists the hero renders the
 * generated silhouette treatment instead.
 */
export const PORTRAIT = "/portrait.png";

export const profile = {
  wordmark: "AMARTUVSHIN",
  fullName: "Amartuvshin Ganzorig",
  role: "Software Engineer",
  discipline: "Full-stack · Machine Learning · UI/UX",
  location: "Ulaanbaatar, Mongolia · GMT+8",
  status: "OPEN TO ENTRY-LEVEL SOFTWARE ENGINEERING ROLES",
  /** Set in the editorial serif under the name. */
  heroLead: "Software that sorts the signal from the noise.",
  /**
   * The same line, broken for the hero's word-by-word arrival.
   *
   * Two lines rather than one because the reference clip's headline lands as
   * two — the second starting a beat behind the first. `heroLead` stays as the
   * flat string for anywhere that needs one (metadata, reduced motion).
   */
  heroLeadLines: ["Software that sorts", "the signal from the noise."],
  heroSub:
    "Software engineering graduate. I build full-stack web apps and machine learning tools, most recently an AI bug triage platform trained on 222,000+ Mozilla Firefox bug reports.",
  kicker: "PORTFOLIO — 2026",
};

/**
 * The section map.
 *
 * Seven chapters, ordered for a recruiter with a minute to spare: who, where to
 * find him, what he built, what he can do, where he's been, how to reach him.
 * Work sits ahead of Craft on purpose — the evidence before the claims.
 */
export const navLinks: NavLink[] = [
  { label: "Index", href: "#hero", code: "00" },
  { label: "Profile", href: "#about", code: "01" },
  { label: "Signal", href: "#connect", code: "02" },
  { label: "Work", href: "#work", code: "03" },
  { label: "Craft", href: "#capabilities", code: "04" },
  { label: "Path", href: "#timeline", code: "05" },
  { label: "Contact", href: "#contact", code: "06" },
];

/**
 * The on-page index for a section, by its anchor.
 *
 * Every section masthead used to carry its number as a string literal, and the
 * two lists drifted apart. Deriving them from `navLinks` makes that class of
 * drift impossible: the numbering has exactly one source, and adding a section
 * to the nav renumbers the page. `--` rather than a throw for an unknown
 * anchor — a wrong number is a bug, a missing one is only a gap, and this must
 * never take the page down.
 */
export function sectionIndex(href: string): string {
  return navLinks.find((l) => l.href === href)?.code ?? "--";
}

export const about = {
  heading: "OPERATOR PROFILE",
  lead: "I'm a software engineer who likes turning messy, real-world data into tools people actually use.",
  paragraphs: [
    "I graduated from Gannon University (Erie, Pennsylvania) in May 2026 with a B.S. in Software Engineering. My capstone, Spotfixes, is a live web platform that predicts how serious a software bug is and finds duplicate reports, built on real Mozilla Firefox data with feedback from Firefox developers. I led its UI/UX and usability testing.",
    "I work mainly in Java, Python and React, and I care about the parts of software people notice: clear interfaces, reliable behaviour, and testing that catches problems before users do. I'm back in Ulaanbaatar, fluent in Mongolian and English, and looking for my first full-time software engineering role.",
  ],
  signature: [
    { k: "FOCUS", v: "Full-stack · ML" },
    { k: "STACK", v: "Java · Python · React" },
    { k: "BASE", v: "Ulaanbaatar, MN" },
  ],
};

/** No self-rated proficiency numbers: a 0–100 bar reads as padding. */
export const capabilities: Capability[] = [
  {
    code: "SYS/01",
    title: "Full-stack Web",
    description:
      "React frontends on FastAPI backends with PostgreSQL (Supabase), REST APIs, and multi-tenant data isolation.",
    tags: ["React", "FastAPI", "PostgreSQL"],
  },
  {
    code: "SYS/02",
    title: "Machine Learning",
    description:
      "Text classification with scikit-learn (TF-IDF + Random Forest) and retrieval-augmented similarity search with ChromaDB.",
    tags: ["scikit-learn", "RAG", "ChromaDB"],
  },
  {
    code: "SYS/03",
    title: "Java & Core Programming",
    description:
      "Java as my strongest language, plus Python, JavaScript, SQL and C++; Android apps in Android Studio.",
    tags: ["Java", "Python", "C++"],
  },
  {
    code: "SYS/04",
    title: "UI/UX & Usability",
    description:
      "Led UI/UX for Spotfixes; planned and ran usability tests, logged findings, and turned them into fixes.",
    tags: ["UI/UX", "Usability testing", "Accessibility"],
  },
  {
    code: "SYS/05",
    title: "Testing & QA",
    description:
      "Test case design, defect tracking and QA reporting across the software development lifecycle.",
    tags: ["QA", "Test cases", "SDLC"],
  },
  {
    code: "SYS/06",
    title: "DevOps & Security",
    description:
      "Docker on Ubuntu, GitHub Actions CI/CD, and authentication with OAuth2, JWT, MFA and row-level security.",
    tags: ["Docker", "CI/CD", "OAuth2"],
  },
];

export const projects: Project[] = [
  {
    slug: "spotfixes",
    index: "01",
    title: "SPOTFIXES",
    category: "AI Bug Triage Platform",
    year: "2026",
    role: "UI/UX Lead & QA · Team of 3",
    status: "Live",
    summary:
      "A live web platform that predicts software bug severity and finds duplicate reports, trained on 222,000+ Mozilla Firefox bugs.",
    description:
      "Spotfixes was our year-long senior design capstone at Gannon University (Fall 2025 – Spring 2026), built with feedback from Mozilla Firefox developers and our faculty mentor. It predicts a bug's severity (S1–S4) with a TF-IDF + Random Forest model plus a critical-keyword rule engine, and uses RAG similarity search to surface the three most similar past bugs. Companies get isolated workspaces (multi-tenant, Supabase row-level security), can bulk-upload their own bugs, and retrain the model on them. I led the React UI/UX, ran usability testing and QA logging, and assessed the Docker deployment on Ubuntu.",
    stack: ["React", "FastAPI", "Python", "scikit-learn", "ChromaDB", "Supabase", "Docker"],
    highlights: [
      "89% severity-prediction accuracy",
      "3.4 s average prediction, 1.2 s similarity search (target: under 5 s)",
      "Usability testing found duplicate-admin and retraining-progress bugs, both fixed",
      "Deployed live at spotfixes.com with GitHub Actions CI/CD",
    ],
    accent: "accent",
    shot: "/work/spotfixes.webp",
    metrics: [
      { label: "ACCURACY", value: "89%" },
      { label: "BUG RECORDS", value: "222K+" },
      { label: "PREDICTION", value: "3.4s" },
    ],
    links: [
      { label: "Live site", href: "https://spotfixes.com" },
      { label: "Code", href: "https://github.com/tajmilur-rahman/senior-design-2025" },
    ],
    gallery: [
      {
        src: "/work/spotfixes-capabilities.webp",
        alt: "Spotfixes landing page: six capability cards — ML classification, semantic search, tenant isolation, role-based permissions, CSV and JSON import, fix surfacing.",
        caption: "Core platform · public landing page, team project",
      },
      {
        src: "/work/spotfixes-accuracy.webp",
        alt: "Spotfixes landing page: the adaptive ML engine section — TF-IDF feature extraction, vector RAG duplicate detection, feedback-driven retraining, 222k+ Firefox training records.",
        caption: "ML engine · public landing page, team project",
      },
      {
        src: "/work/spotfixes-stack.webp",
        alt: "Spotfixes landing page: infrastructure section with a row-level security status badge and a technology matrix of stack logos.",
        caption: "Infrastructure · public landing page, team project",
      },
    ],
  },
  {
    slug: "web-design",
    index: "02",
    title: "WEB DESIGN LAB",
    category: "Concept Sites · Coursework",
    year: "2026",
    role: "Designer & Developer · AI-assisted",
    status: "Live",
    summary:
      "Two concept websites for fictional brands, KRYOS and VOIDGATE, built for Gannon's website design course.",
    description:
      "Classwork for the website design course at Gannon University (Spring 2026). KRYOS is a fictional game studio and VOIDGATE a fictional sci-fi storytelling universe; both brands, and everything they claim, are invented for the brief. I designed and built both sites with AI assistance, working in Claude Code in VS Code with MCP servers for research (Firecrawl), image generation (Gemini Nano Banana) and UI generation (Magic, Google Stitch), then directing, editing and deploying the results.",
    stack: ["HTML/CSS/JS", "React", "Next.js", "Three.js", "GSAP", "Claude Code"],
    highlights: [
      "Two complete concept sites, both deployed",
      "AI-assisted workflow: Claude Code with Firecrawl, Nano Banana, Magic and Stitch",
      "Fictional brands — the studio, universe and claims are part of the design brief",
    ],
    accent: "accent-2",
    shot: "/work/web-design.webp",
    metrics: [],
    links: [
      { label: "KRYOS", href: "https://kryos.amartuvshin.work" },
      { label: "VOIDGATE", href: "https://voidgate.amartuvshin.work" },
    ],
    gallery: [
      {
        src: "/work/kryos.webp",
        alt: "KRYOS hero: the headline “Worlds that remember you” over a faceted crystal, framed by a game-HUD overlay.",
        caption: "KRYOS · fictional game studio",
      },
      {
        src: "/work/kryos-works.webp",
        alt: "KRYOS works section: large cards for two invented games, Project Halcyon and Nightfold, with generated key art.",
        caption: "KRYOS · works",
      },
      {
        src: "/work/voidgate.webp",
        alt: "VOIDGATE hero: glowing wordmark, a command-line input, and a framed image of a server-room console.",
        caption: "VOIDGATE · fictional sci-fi storyworld",
      },
      {
        src: "/work/voidgate-archive.webp",
        alt: "VOIDGATE archive section: lore text, a protocol status table and faction cards beside a generated image of a data vault.",
        caption: "VOIDGATE · the archive",
      },
    ],
  },
  {
    slug: "portfolio",
    index: "03",
    self: true,
    title: "THIS SITE",
    category: "Personal Portfolio",
    year: "2026",
    role: "Designer & Developer",
    status: "In progress",
    summary:
      "The site you're on: a cinematic, scroll-driven portfolio built in Next.js with an accessibility check in CI.",
    description:
      "Designed and built from scratch with Next.js 16, React 19, TypeScript, Tailwind CSS v4, GSAP and Framer Motion. Every push runs type-checking, linting, a production build and an automated axe accessibility sweep in GitHub Actions, and every animation has a reduced-motion fallback.",
    stack: ["Next.js", "TypeScript", "Tailwind", "GSAP", "GitHub Actions"],
    highlights: [
      "Automated accessibility sweep (axe) in CI",
      "Full reduced-motion path",
      "Responsive from 390px phones to desktop",
    ],
    accent: "alert",
    shot: "/work/portfolio.webp",
    // Only put numbers here once they are measured on the deployed site.
    metrics: [],
    gallery: [
      {
        src: "/work/portfolio-work.webp",
        alt: "This site's work section: case-file cards floating in a scroll-driven 3D world, with a roster of project links.",
        caption: "The work world",
      },
      {
        src: "/work/portfolio-path.webp",
        alt: "This site's ledger section: four headline figures above a career timeline with a glowing rail.",
        caption: "The ledger",
      },
    ],
  },
  {
    slug: "coursework",
    index: "04",
    title: "JAVA & ANDROID",
    category: "Java QA · Android",
    year: "2024",
    role: "Student Developer",
    status: "Completed",
    summary:
      "Test-case design for a Java calculator app, and Android apps with real-time device simulation and API integration.",
    description:
      "Software Testing & Quality Assurance (Fall 2024): designed and ran test cases for a Java calculator application, found and resolved defects, and collaborated through GitHub. Mobile Application Development II (Spring 2024): built Android apps in Android Studio, ran real-time simulations on devices, and integrated external APIs.",
    stack: ["Java", "Android Studio", "GitHub"],
    highlights: [
      "Test case design and defect resolution",
      "Android apps with external API integration",
    ],
    accent: "accent",
    metrics: [],
  },
];

/** Real numbers only. Each one is sourced in the resume or the Spotfixes report. */
export const stats: Stat[] = [
  { label: "BUG RECORDS TRAINED ON", value: 222, suffix: "K+" },
  { label: "MODEL ACCURACY", value: 89, unit: "%" },
  { label: "GPA, FINAL FOUR SEMESTERS", value: 3.68, unit: "/4" },
  { label: "LANGUAGES SPOKEN", value: 2 },
];

export const timeline: TimelineEntry[] = [
  {
    year: "2026",
    title: "Corporate Logistics Coordinator (Contractor, Khanbogd Khurd)",
    org: "OYU TOLGOI LLC",
    description:
      "Coordinated freight and transportation between the Ulaanbaatar headquarters and the mine site, and monitored logistics data to find routing inefficiencies. Jun – Sep 2026.",
    status: "ARCHIVED",
  },
  {
    year: "2026",
    title: "B.S. Software Engineering",
    org: "GANNON UNIVERSITY",
    description:
      "Erie, Pennsylvania, USA. Graduated May 2026. Dean's List, College of Engineering and Business (Fall 2024, Spring 2025). Capstone: Spotfixes.",
    status: "ONLINE",
  },
  {
    year: "2025",
    title: "Foodservice Student Worker",
    org: "METZ CULINARY · CHICK-FIL-A",
    description:
      "High-volume food preparation and inventory during peak campus hours. May 2025 – Apr 2026.",
    status: "ARCHIVED",
  },
  {
    year: "2023",
    title: "Front Desk Student Attendant",
    org: "GANNON RESIDENCE LIFE",
    description:
      "Maintained student housing records in StarRez and resolved resident inquiries. Aug 2023 – May 2024.",
    status: "ARCHIVED",
  },
  {
    year: "2022",
    title: "Summer Student Conference Assistant",
    org: "GANNON AUXILIARY SERVICES",
    description:
      "Prepared residence halls and supported conference guests. Summers 2022 and 2023.",
    status: "ARCHIVED",
  },
];

export const contact = {
  heading: "INITIALIZE CONTACT",
  lead: "Hiring for a software engineering role? Send me a message and I'll reply within 48 hours.",
  email: "amaraajunior@gmail.com",
  availability: "OPEN · AVAILABLE NOW",
};

export const RESUME_EN = "/resume/Amartuvshin-Ganzorig-Resume.pdf";
export const RESUME_MN = "/resume/Amartuvshin-Ganzorig-Resume-MN.pdf";

export const socials: SocialLink[] = [
  {
    label: "GITHUB",
    handle: "@amartuvshing",
    href: "https://github.com/amartuvshing",
    code: "GH",
    mark: "github",
  },
  {
    label: "LINKEDIN",
    handle: "in/amartuvshinganzorig",
    href: "https://www.linkedin.com/in/amartuvshinganzorig/",
    code: "IN",
    mark: "linkedin",
  },
  {
    label: "RESUME",
    handle: "PDF · English",
    href: RESUME_EN,
    code: "CV",
    preview: "/resume/Amartuvshin-Ganzorig-Resume-preview.webp",
  },
  {
    label: "RESUME (MN)",
    handle: "PDF · Монгол",
    href: RESUME_MN,
    code: "MN",
    preview: "/resume/Amartuvshin-Ganzorig-Resume-MN-preview.webp",
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

/* -------------------------------------------------------------------------- */
/* Locales                                                                     */
/* -------------------------------------------------------------------------- */

export type Locale = "en" | "mn";

/**
 * Everything a visitor reads, as one object per language. Components take it
 * from `useI18n().c` rather than importing the named exports above, which stay
 * as the English source (and for the few server-side readers, like metadata).
 */
export interface SiteContent {
  profile: typeof profile;
  about: typeof about;
  capabilities: Capability[];
  projects: Project[];
  stats: Stat[];
  timeline: TimelineEntry[];
  contact: typeof contact;
  socials: SocialLink[];
  navLinks: NavLink[];
}

const en: SiteContent = {
  profile,
  about,
  capabilities,
  projects,
  stats,
  timeline,
  contact,
  socials,
  navLinks,
};

/** A locale is offered only once both its content and its UI table exist. */
export const content: { en: SiteContent; mn?: SiteContent } = { en };

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
