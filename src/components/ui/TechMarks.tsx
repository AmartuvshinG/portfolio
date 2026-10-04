import {
  siAndroidstudio,
  siClaude,
  siCplusplus,
  siCss,
  siDocker,
  siFastapi,
  siGit,
  siGithub,
  siGithubactions,
  siGsap,
  siHtml5,
  siIntellijidea,
  siJavascript,
  siJsonwebtokens,
  siLinux,
  siMysql,
  siNextdotjs,
  siOpenjdk,
  siPostgresql,
  siPython,
  siReact,
  siScikitlearn,
  siSupabase,
  siTailwindcss,
  siThreedotjs,
  siTypescript,
  siUbuntu,
  type SimpleIcon,
} from "simple-icons";
import {
  Accessibility,
  Bug,
  ClipboardCheck,
  Database,
  GitBranch,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { iconStroke } from "@/lib/icon";

/**
 * The tools a capability names, as small marks.
 *
 * Brand marks come from simple-icons (CC0 paths, imported one by one so only
 * these ship). Where there is no mark — ChromaDB — or where the card
 * names practices rather than tools (UI/UX, QA), a lucide glyph stands in, and
 * the label beside it says what it is. Nothing here is decorative filler: every
 * key is a tool or practice already named in that card's own copy.
 *
 * Marks are single-colour `currentColor` by default. The one exception to the
 * site's one-ramp colour rule is the logo dock (ui/LogoDock), where each mark
 * sits on its own tile in its brand colour (`brandTile`) so it is known at a
 * glance, as an app icon is. Every tool here is named in the resume.
 */
const BRANDS = {
  react: siReact,
  fastapi: siFastapi,
  postgresql: siPostgresql,
  supabase: siSupabase,
  scikitlearn: siScikitlearn,
  python: siPython,
  java: siOpenjdk,
  javascript: siJavascript,
  cpp: siCplusplus,
  androidstudio: siAndroidstudio,
  docker: siDocker,
  ubuntu: siUbuntu,
  githubactions: siGithubactions,
  jwt: siJsonwebtokens,
  linux: siLinux,
  mysql: siMysql,
  git: siGit,
  github: siGithub,
  html5: siHtml5,
  css: siCss,
  intellij: siIntellijidea,
  nextjs: siNextdotjs,
  typescript: siTypescript,
  tailwind: siTailwindcss,
  threejs: siThreedotjs,
  gsap: siGsap,
  claude: siClaude,
} satisfies Record<string, SimpleIcon>;

const GLYPHS = {
  chromadb: { icon: Database, title: "ChromaDB" },
  usability: { icon: Users, title: "Usability testing" },
  accessibility: { icon: Accessibility, title: "Accessibility" },
  testcases: { icon: ClipboardCheck, title: "Test cases" },
  defects: { icon: Bug, title: "Defect tracking" },
  sdlc: { icon: GitBranch, title: "SDLC" },
} satisfies Record<string, { icon: LucideIcon; title: string }>;

/** Short labels where the brand's registered title is a mouthful. */
const LABELS: Partial<Record<TechKey, string>> = {
  java: "Java",
  jwt: "JWT",
  githubactions: "Actions",
  androidstudio: "Android",
  cpp: "C++",
  html5: "HTML",
  intellij: "IntelliJ",
  tailwind: "Tailwind",
  claude: "Claude Code",
};

export type TechKey = keyof typeof BRANDS | keyof typeof GLYPHS;
export type GlyphKey = keyof typeof GLYPHS;

/** Brand names are never translated; practice names come from the locale. */
export function techLabel(key: TechKey, labels?: Partial<Record<GlyphKey, string>>): string {
  if (key in GLYPHS) return labels?.[key as GlyphKey] ?? GLYPHS[key as GlyphKey].title;
  return LABELS[key] ?? BRANDS[key as keyof typeof BRANDS].title;
}

/**
 * An app-icon tile for a mark: the brand colour on a dark tile, or — for the
 * near-black brands (GitHub, Next.js, IntelliJ) — black on a light one, as
 * the reference dock does. Practice glyphs are fg on the dark tile.
 */
export function brandTile(key: TechKey): { tile: string; ink: string } {
  if (key in GLYPHS) return { tile: DARK_TILE, ink: "#e9eef2" };
  const hex = `#${BRANDS[key as keyof typeof BRANDS].hex}`;
  /* Whichever tile the brand colour reads on better, by WCAG contrast — the
     dark blues (PostgreSQL, MySQL, C++) vanish on the dark tile. */
  return contrast(hex, DARK_TILE) >= 4.5 ? { tile: DARK_TILE, ink: hex } : { tile: LIGHT_TILE, ink: hex };
}

const DARK_TILE = "#16191f";
const LIGHT_TILE = "#eceef1";

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export function TechMark({ name, size = 20, className }: { name: TechKey; size?: number; className?: string }) {
  if (name in GLYPHS) {
    const Icon = GLYPHS[name as keyof typeof GLYPHS].icon;
    return <Icon size={size} strokeWidth={iconStroke(size)} aria-hidden className={cn("shrink-0", className)} />;
  }
  const icon = BRANDS[name as keyof typeof BRANDS];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <path d={icon.path} />
    </svg>
  );
}

/** A row of marks with their names, as chips. */
export function TechStrip({
  stack,
  labels,
  className,
}: {
  stack: TechKey[];
  labels?: Partial<Record<GlyphKey, string>>;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {stack.map((key) => (
        <li
          key={key}
          className="tech-chip flex items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3.5 text-sm font-medium text-fg/90"
        >
          <TechMark name={key} size={18} />
          {techLabel(key, labels)}
        </li>
      ))}
    </ul>
  );
}
