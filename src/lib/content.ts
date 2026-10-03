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

import type { TechKey } from "@/components/ui/TechMarks";
import type { StopKey } from "@/lib/routeGeo";
import type { PhotoCrop, PhotoKey } from "@/lib/pathPhotos";

export type AccentKey = "accent" | "accent-2" | "alert";

export interface NavLink {
  label: string;
  href: string;
  code: string;
  /** The chapter's name in Mongol script, hung beside its masthead. Locale-free. */
  script?: string;
}

export interface Capability {
  code: string;
  title: string;
  description: string;
  tags: string[];
  /** Which lucide glyph the card carries. Locale-free. */
  icon: "layers" | "brain" | "braces" | "pen" | "checks" | "shield";
  /** The case file that shows this in practice — opened from the card. */
  proof?: string;
  /** Wide card in the bento. */
  feature?: boolean;
  /** A screenshot from `public/work/` that shows this skill in the proof
   *  project. Craft's index shows it; without one it draws a schematic. */
  shot?: string;
  /** Tools named in the description or tags, shown as marks. Locale-free. */
  stack: TechKey[];
  /** Transcript course codes behind this skill (see `courses`). Locale-free. */
  courses?: string[];
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
   * monitor and at the top of the case file. Optional: a project without one
   * renders its generated `ProjectVisual` instead and never
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

/** A point on the timeline: a year, and the month (1–12) or season within it. */
export interface Stamp {
  year: number;
  month?: number;
  season?: "summer";
}

export type OrgMarkKey = "must" | "gannon" | "chickfila" | "oyutolgoi";

export interface TimelineEntry {
  /** When it began — or, for a single moment (a graduation), when it was. */
  start: Stamp;
  /** When it ended, if it was a span. */
  end?: Stamp;
  /** A word that qualifies the date, set beside it: "Graduated". */
  note?: "graduated";
  /** The same season in two separate years ("Summers 2022 & 2023"), not a
      span: the stamp joins the years with "·" rather than an arrow. */
  repeat?: boolean;
  /** The dates as a phrase — what a screen reader announces in place of the
      animated stamp: "May 2025 – Apr 2026". */
  period: string;
  kind: "work" | "education" | "project";
  /** Where it happened: the Path draws the journey between these. */
  stop: StopKey;
  /** Something the Path shows beside this entry: the GPA on the degree, the
      measured figures and the case file on the capstone. Locale-free. */
  extra?: "gpa" | "spotfixes";
  /** The organisation's logo, drawn white beside the entry (ui/OrgMark). For a
      role through a contractor it is the place worked at, which is the name
      people know; the org line still says who the employer was. */
  mark?: OrgMarkKey;
  /** The photo that lands from the city's lamp on the Path (lib/pathPhotos):
      the place itself, not a logo. Locale-free. */
  photo?: PhotoKey;
  /** The same photo as the entry before, reframed: the camera walks on. */
  crop?: PhotoCrop;
  title: string;
  org: string;
  description: string;
}

export interface SocialLink {
  label: string;
  handle: string;
  href: string;
  /** Two-letter HUD glyph used by the console dock. */
  code: string;
  /** The service's own mark, drawn large on its Signal panel. */
  mark?: "github" | "linkedin";
  /** A screenshot, shown in a browser frame on its Signal panel (live sites). */
  shot?: string;
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

export const profile = {
  wordmark: "AMARTUVSHIN",
  fullName: "Amartuvshin Ganzorig",
  role: "Software Engineer",
  discipline: "Full-stack · Machine Learning · UI/UX",
  location: "Ulaanbaatar, Mongolia · GMT+8",
  status: "OPEN TO ENTRY-LEVEL SOFTWARE ENGINEERING ROLES",
  /** Set in the editorial serif under the name. */
  heroLead: "Hi, I'm Amartuvshin. Welcome to my portfolio.",
  /**
   * The same line, broken for the hero's word-by-word arrival.
   *
   * Two lines rather than one because the reference clip's headline lands as
   * two — the second starting a beat behind the first. `heroLead` stays as the
   * flat string for anywhere that needs one (metadata, reduced motion).
   */
  heroLeadLines: ["Hi, I'm Amartuvshin.", "Welcome to my portfolio."],
  heroSub:
    "Software engineering graduate. I build full-stack web apps and machine learning tools, most recently an AI bug triage platform trained on 222,000+ Mozilla Firefox bug reports.",
  kicker: "PORTFOLIO — 2026",
  /**
   * The name in classical Mongolian script (Mongol bichig), set vertically as
   * the hero's neon sign. Spelling confirmed by Amartuvshin (2026-09-30):
   * ᠠᠮᠠᠷ (amar) + ᠲᠦᠪᠰᠢᠨ (tübshin), and the ü must show its extra stroke
   * under the loop — it must not read as a plain u.
   *
   * In a joined word Noto Sans Mongolian draws a non-first-syllable ü as a
   * bare loop, identical to u. The `᠋` after ᠦ is Mongolian Free
   * Variation Selector 1, which selects the form with the extra stroke —
   * verified against the standalone ᠲᠦᠪᠰᠢᠨ. It is invisible: don't delete it.
   * Decorative only (aria-hidden). app/layout.tsx subsets the font to exactly
   * these glyphs, from this string.
   */
  nameScript: "ᠠᠮᠠᠷᠲᠦ\u180Bᠪᠰᠢᠨ",
};

/**
 * The section map.
 *
 * Seven chapters, ordered for a recruiter with a minute to spare: who, where to
 * find him, what he built, what he can do, how the capstone works inside,
 * where he's been, how to reach him.
 * Work sits ahead of Craft on purpose — the evidence before the claims.
 */
/*
 * The chapters' names in traditional script, read top to bottom. Checked
 * against Amartuvshin's Cyrillic→Mongol bichig screenshots (2026-10-03), which
 * corrected Craft's ур to ᠤᠷ᠎ᠠ (ur-a). Path (зам) had no screenshot and is
 * still Claude's spelling. U+180E (MVS) is written as an escape before a
 * detached final ᠠ.
 *
 *   About    танилцуулга   Projects ажил    Skills ур чадвар
 *   Capstone бүтэц         Journey  зам     Contact  холбоо
 *
 * Links has none: Signal's дохио no longer fits the name, and a new spelling
 * waits for Amartuvshin's screenshot rather than a guess.
 */
export const navLinks: NavLink[] = [
  { label: "Home", href: "#hero", code: "00" },
  { label: "About", href: "#about", code: "01", script: "ᠲᠠᠨᠢᠯᠴᠠᠭᠤᠯᠭ\u180Eᠠ" },
  { label: "Links", href: "#connect", code: "02" },
  { label: "Projects", href: "#work", code: "03", script: "ᠠᠵᠢᠯ" },
  { label: "Skills", href: "#capabilities", code: "04", script: "ᠤᠷ᠎ᠠ ᠴᠢᠳᠠᠪᠤᠷᠢ" },
  { label: "Capstone", href: "#anatomy", code: "05", script: "ᠪᠦᠲᠦᠴᠡ" },
  { label: "Journey", href: "#timeline", code: "06", script: "ᠵᠠᠮ" },
  { label: "Contact", href: "#contact", code: "07", script: "ᠬᠣᠯᠪᠣᠭ\u180Eᠠ" },
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
  heading: "ABOUT ME",
  lead: "Gannon University graduate, now back home in Ulaanbaatar.",
  paragraphs: [
    "I graduated from Gannon University (Erie, Pennsylvania) in May 2026 with a B.S. in Software Engineering. My capstone, Spotfixes, is a live web platform that predicts how serious a software bug is and finds duplicate reports, built on real Mozilla Firefox data with feedback from Firefox developers. I led its UI/UX and usability testing.",
    "I work mainly in Java, Python and React, and I care about the parts of software people notice: clear interfaces, reliable behaviour, and testing that catches problems before users do. I'm back in Ulaanbaatar, fluent in Mongolian and English, and looking for my first full-time software engineering role.",
  ],
  signature: [
    { k: "FOCUS", v: "Full-stack · ML" },
    { k: "STACK", v: "Java · Python · React" },
    { k: "DEGREE", v: "B.S. SE · Dean's List ×3" },
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
    stack: ["react", "fastapi", "postgresql", "supabase"],
    courses: ["CIS 255", "CIS 390", "CIS 240"],
    icon: "layers",
    proof: "spotfixes",
    shot: "/work/spotfixes-stack.webp",
    feature: true,
  },
  {
    code: "SYS/02",
    title: "Machine Learning",
    description:
      "Text classification with scikit-learn (TF-IDF + Random Forest) and retrieval-augmented similarity search with ChromaDB.",
    tags: ["scikit-learn", "RAG", "ChromaDB"],
    stack: ["scikitlearn", "python", "chromadb"],
    courses: ["CIS 457", "CIS 458"],
    icon: "brain",
    proof: "spotfixes",
    shot: "/work/spotfixes-accuracy.webp",
    feature: true,
  },
  {
    code: "SYS/03",
    title: "Java & Core Programming",
    description:
      "Java as my strongest language, plus Python, JavaScript, SQL and C++; Android apps in Android Studio.",
    tags: ["Java", "Python", "C++"],
    stack: ["java", "python", "javascript", "cpp", "androidstudio"],
    courses: ["CIS 182", "CSC 220", "CIS 377"],
    icon: "braces",
  },
  {
    code: "SYS/04",
    title: "UI/UX & Usability",
    description:
      "Led UI/UX for Spotfixes; planned and ran usability tests, logged findings, and turned them into fixes.",
    tags: ["UI/UX", "Usability testing", "Accessibility"],
    stack: ["usability", "accessibility"],
    courses: ["CIS 239", "CIS 240"],
    icon: "pen",
    proof: "spotfixes",
    shot: "/work/spotfixes-capabilities.webp",
  },
  {
    code: "SYS/05",
    title: "Testing & QA",
    description:
      "Test case design, defect tracking and QA reporting across the software development lifecycle.",
    tags: ["QA", "Test cases", "SDLC"],
    stack: ["testcases", "defects", "sdlc"],
    courses: ["SOFT 310", "CIS 326", "CIS 350"],
    icon: "checks",
    proof: "spotfixes",
  },
  {
    code: "SYS/06",
    title: "DevOps & Security",
    description:
      "Docker on Ubuntu, GitHub Actions CI/CD, and authentication with OAuth2, JWT, MFA and row-level security.",
    tags: ["Docker", "CI/CD", "OAuth2"],
    stack: ["docker", "ubuntu", "githubactions", "jwt"],
    courses: ["CIS 387", "SOFT 410", "CIS 219", "CSC 330"],
    icon: "shield",
    proof: "spotfixes",
  },
];

/**
 * Everything in the Skills dock, in reading order: languages, front end, back
 * end and data, ML, infrastructure, tools. Each is named in the resume or in a
 * project's own stack on this page.
 */
export const techStack: TechKey[] = [
  "java", "python", "javascript", "typescript", "cpp", "html5", "css",
  "react", "nextjs", "tailwind", "gsap", "threejs",
  "fastapi", "postgresql", "mysql", "supabase", "chromadb",
  "scikitlearn",
  "docker", "ubuntu", "linux", "githubactions", "jwt",
  "git", "github", "androidstudio", "intellij", "claude",
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
      "89% severity-prediction accuracy (final report); 97.6% when scored across the full dataset, training data included",
      "Multi-tenant: three roles, each company's data isolated at the database row level",
      "Duplicate detection by meaning, not keywords (ChromaDB + RAG)",
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
        alt: "This site's path section: an LED globe zoomed onto the Great Lakes, a lit route arriving at Erie from over the pole, and a route log with the 2022 entry open.",
        caption: "The route",
      },
    ],
  },
];

/**
 * The journey, in the order it happened: the Path reads forward. Each entry
 * says where it was (`stop`); the Path flies the route between them.
 *
 * Dates from the Gannon transcript (docs/private/Transcript.pdf): classes
 * began 10 Jan 2022, so the flight to Erie lands in January 2022. The two 2024
 * coursework rows are the resume's, dated by the terms the transcript gives
 * those courses (CIS 377 Spring 2024, SOFT 310 Fall 2024).
 */
export const timeline: TimelineEntry[] = [
  {
    start: { year: 2020 },
    end: { year: 2021 },
    period: "2020 – 2021",
    kind: "education",
    stop: "ub",
    mark: "must",
    photo: "must",
    title: "Mongolian University of Science and Technology",
    org: "MUST · Ulaanbaatar",
    description:
      "Started university in Ulaanbaatar and completed 21 credits before moving to the US to study software engineering.",
  },
  {
    start: { year: 2022, month: 1 },
    period: "January 2022",
    kind: "education",
    stop: "erie",
    mark: "gannon",
    photo: "gannon",
    title: "Began B.S. Software Engineering",
    org: "Gannon University · Erie, PA",
    description:
      "First semester in Erie: problem solving and programming, an introduction to networks, and Calculus 1.",
  },
  {
    start: { year: 2022, season: "summer" },
    end: { year: 2023, season: "summer" },
    repeat: true,
    period: "Summers 2022 & 2023",
    kind: "work",
    stop: "erie",
    mark: "gannon",
    photo: "gannon",
    crop: { x: 0.48, y: 0.6, scale: 1.3 },
    title: "Summer Student Conference Assistant",
    org: "Auxiliary Services · Gannon University",
    description: "Prepared residence halls and supported conference guests, tracking workflows in Excel and Word.",
  },
  {
    start: { year: 2023, month: 8 },
    end: { year: 2024, month: 5 },
    period: "Aug 2023 – May 2024",
    kind: "work",
    stop: "erie",
    mark: "gannon",
    photo: "gannon",
    crop: { x: 0.6, y: 0.36, scale: 1.6 },
    title: "Front Desk Student Attendant",
    org: "Office of Residence Life · Gannon University",
    description:
      "Maintained student housing records in StarRez and resolved resident inquiries by phone, email and in person.",
  },
  {
    start: { year: 2024, month: 1 },
    end: { year: 2024, month: 5 },
    period: "Spring 2024",
    kind: "project",
    stop: "erie",
    mark: "gannon",
    photo: "zurn",
    title: "Android Apps · Mobile App Development II",
    org: "Gannon University · Coursework",
    description: "Built Android apps in Android Studio with real-time device simulations and APIs.",
  },
  {
    start: { year: 2024, month: 8 },
    end: { year: 2024, month: 12 },
    period: "Fall 2024",
    kind: "project",
    stop: "erie",
    mark: "gannon",
    photo: "zurn",
    crop: { x: 0.35, y: 0.5, scale: 1.45 },
    title: "Test Suite · Software Testing & QA",
    org: "Gannon University · Coursework",
    description:
      "Designed and ran test cases for a Java calculator app, resolving the bugs they found through GitHub collaboration.",
  },
  {
    start: { year: 2025, month: 5 },
    end: { year: 2026, month: 4 },
    period: "May 2025 – Apr 2026",
    kind: "work",
    stop: "erie",
    mark: "chickfila",
    photo: "chickfila",
    title: "Foodservice Student Worker",
    org: "Metz Culinary Management · Chick-fil-A",
    description: "High-volume food preparation and inventory restocking at peak hours, to food safety standards.",
  },
  {
    start: { year: 2025, month: 8 },
    end: { year: 2026, month: 5 },
    period: "Aug 2025 – May 2026",
    kind: "project",
    stop: "erie",
    extra: "spotfixes",
    mark: "gannon",
    photo: "zurn",
    title: "Spotfixes · Senior Design Capstone",
    org: "Gannon University · Team of 3",
    description:
      "A live platform that predicts bug severity, trained on 222,000+ Mozilla Firefox bug records. I led the React UI/UX and the usability testing and QA.",
  },
  {
    start: { year: 2026, month: 5 },
    note: "graduated",
    period: "Graduated May 2026",
    kind: "education",
    stop: "erie",
    extra: "gpa",
    mark: "gannon",
    photo: "victor",
    title: "B.S. Software Engineering",
    org: "Gannon University",
    description:
      "137 credits. Dean's List, College of Engineering and Business, in Fall 2024, Spring 2025 and Spring 2026.",
  },
  {
    start: { year: 2026, month: 6 },
    end: { year: 2026, month: 9 },
    period: "Jun – Sep 2026",
    kind: "work",
    stop: "ub",
    mark: "oyutolgoi",
    photo: "monnis",
    title: "Corporate Logistics Coordinator",
    org: "Oyu Tolgoi LLC · Contractor, Khanbogd Khurd",
    description:
      "Central contact for freight and transport between the Ulaanbaatar headquarters and the mine site, across teams and contractors; monitored logistics data for routing inefficiencies under strict safety standards.",
  },
];

/**
 * The degree, as the transcript prints it. `gpaRecent` is the final four
 * semesters (Fall 2024 – Spring 2026: 218.0 grade points over 59 credits =
 * 3.69); `gpaOverall` is the transcript's cumulative 3.3241. Per-course grades
 * are never shown.
 */
export const education = {
  gpaRecent: 3.69,
  gpaOverall: 3.32,
  credits: 137,
  deansList: 3,
};

export interface Course {
  code: string;
  title: string;
  /** The term it was taken, from the transcript. */
  term: { season: "spring" | "fall"; year: number };
  /** Tools the course worked in, shown as small marks. Only where obvious. */
  tools?: TechKey[];
}

/** Upper-level and relevant courses from the transcript. Names only, no grades. */
export const courses: Course[] = [
  { code: "CIS 182", title: "Object-Oriented Programming", term: { season: "fall", year: 2022 }, tools: ["java"] },
  { code: "CIS 219", title: "Linux Programming", term: { season: "spring", year: 2023 }, tools: ["linux"] },
  { code: "CIS 255", title: "Database Management Systems", term: { season: "spring", year: 2023 }, tools: ["mysql"] },
  { code: "CSC 220", title: "Data Structures & Algorithms", term: { season: "fall", year: 2023 }, tools: ["java"] },
  { code: "CIS 239", title: "The User Experience", term: { season: "fall", year: 2023 } },
  { code: "CIS 277", title: "Mobile App Development I", term: { season: "fall", year: 2023 }, tools: ["androidstudio"] },
  { code: "CIS 377", title: "Mobile App Development II", term: { season: "spring", year: 2024 }, tools: ["androidstudio"] },
  { code: "SOFT 320", title: "Software Architecture", term: { season: "spring", year: 2024 } },
  { code: "ECE 337", title: "Computer Architecture", term: { season: "spring", year: 2024 } },
  { code: "SOFT 310", title: "Software Testing & QA", term: { season: "fall", year: 2024 }, tools: ["java", "github"] },
  { code: "CIS 326", title: "Formal Methods in Software Development", term: { season: "fall", year: 2024 } },
  { code: "CIS 387", title: "System & Network Security", term: { season: "fall", year: 2024 }, tools: ["linux"] },
  { code: "SPCH 111", title: "Public Speaking", term: { season: "fall", year: 2024 } },
  { code: "LHES 240", title: "Leadership Seminar", term: { season: "spring", year: 2025 } },
  { code: "CIS 350", title: "Requirements & Project Management", term: { season: "fall", year: 2025 } },
  { code: "CIS 457", title: "Senior Design 1", term: { season: "fall", year: 2025 } },
  { code: "CSC 330", title: "Operating Systems", term: { season: "fall", year: 2025 }, tools: ["linux"] },
  { code: "SOFT 410", title: "Software Maintenance & Deployment", term: { season: "fall", year: 2025 }, tools: ["docker"] },
  { code: "CIS 240", title: "Web Design", term: { season: "spring", year: 2026 }, tools: ["html5", "css"] },
  { code: "CIS 390", title: "Distributed Programming", term: { season: "spring", year: 2026 } },
  { code: "CIS 458", title: "Senior Design 2", term: { season: "spring", year: 2026 } },
];

/** The degree's headline courses, shown on its Journey row. */
export const degreeCourses = ["SOFT 320", "SOFT 310", "CIS 387", "CSC 330", "CIS 390", "SOFT 410", "CIS 350", "CSC 220", "CIS 255", "CIS 239"];

export function getCourse(code: string): Course | undefined {
  return courses.find((c) => c.code === code);
}

export const contact = {
  heading: "CONTACT",
  lead: "Want to talk about a role or a project? Email me and I'll reply within 48 hours.",
  email: "amaraajunior@gmail.com",
  availability: "OPEN · AVAILABLE NOW",
};

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
    label: "SPOTFIXES",
    handle: "spotfixes.com · live",
    href: "https://spotfixes.com",
    code: "LV",
    shot: "/work/spotfixes.webp",
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
  timeline: TimelineEntry[];
  contact: typeof contact;
  socials: SocialLink[];
  navLinks: NavLink[];
}

export const en: SiteContent = {
  profile,
  about,
  capabilities,
  projects,
  timeline,
  contact,
  socials,
  navLinks,
};

/* The per-locale table is assembled in lib/i18n.tsx rather than here: the
   Mongolian content is built from the English (same hrefs, images, numbers),
   so it imports this file — and this file importing it back would be a cycle. */

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
  accent: "#ff3b30", // coral red
  "accent-2": "#ff8a6b", // salmon
  alert: "#9fe3ec", // ice teal
};

/**
 * An accent lifted toward white for use as *text*. Pure violet on the void
 * measures under 4.5:1 at small sizes; a third white clears it and still reads
 * as the same hue. Fills and glows keep the pure stop.
 */
export function readable(accent: string): string {
  return `color-mix(in srgb, ${accent} 66%, #ffffff)`;
}
