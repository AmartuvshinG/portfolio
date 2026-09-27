import {
  siAndroidstudio,
  siCplusplus,
  siDocker,
  siFastapi,
  siGithubactions,
  siJavascript,
  siJsonwebtokens,
  siOpenjdk,
  siPostgresql,
  siPython,
  siReact,
  siScikitlearn,
  siSupabase,
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

/**
 * The tools a capability names, as small marks.
 *
 * Brand marks come from simple-icons (CC0 paths, imported one by one so only
 * these fourteen ship). Where there is no mark — ChromaDB — or where the card
 * names practices rather than tools (UI/UX, QA), a lucide glyph stands in, and
 * the label beside it says what it is. Nothing here is decorative filler: every
 * key is a tool or practice already named in that card's own copy.
 *
 * Marks are single-colour `currentColor`, never brand hex: the site's colour
 * rule is one spectrum ramp, and fourteen flat brand fills would break it.
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
};

export type TechKey = keyof typeof BRANDS | keyof typeof GLYPHS;
export type GlyphKey = keyof typeof GLYPHS;

/** Brand names are never translated; practice names come from the locale. */
export function techLabel(key: TechKey, labels?: Partial<Record<GlyphKey, string>>): string {
  if (key in GLYPHS) return labels?.[key as GlyphKey] ?? GLYPHS[key as GlyphKey].title;
  return LABELS[key] ?? BRANDS[key as keyof typeof BRANDS].title;
}

export function TechMark({ name, size = 20, className }: { name: TechKey; size?: number; className?: string }) {
  if (name in GLYPHS) {
    const Icon = GLYPHS[name as keyof typeof GLYPHS].icon;
    return <Icon size={size} strokeWidth={1.7} aria-hidden className={cn("shrink-0", className)} />;
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
