import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { projects, getProject, accentColor } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { ScrambleText } from "@/components/motion/ScrambleText";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: "Case File Not Found" };
  return {
    title: `${project.title} — Case File`,
    description: project.summary,
  };
}

export default async function WorkDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const color = accentColor[project.accent];
  const idx = projects.findIndex((p) => p.slug === slug);
  const next = projects[(idx + 1) % projects.length];

  return (
    <article className="relative pb-28 pt-28 md:pt-36">
      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <Link
          href="/#work"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted transition-colors hover:text-cyan"
        >
          <ArrowLeft size={14} /> Return to archive
        </Link>

        {/* Header */}
        <header className="mt-10 border-b border-line pb-10">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs" style={{ color }}>
              CASE FILE / {project.index}
            </span>
            <span className="h-px w-10 bg-line-strong" />
            <ScrambleText
              text={project.category.toUpperCase()}
              immediate
              className="hud-label"
            />
          </div>
          <h1
            className="mt-6 font-display font-black uppercase leading-[0.9] text-fg"
            style={{ fontSize: "clamp(3rem, 9vw, 8rem)" }}
          >
            {project.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">{project.summary}</p>

          <dl className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { k: "ROLE", v: project.role },
              { k: "YEAR", v: project.year },
              { k: "CATEGORY", v: project.category },
              { k: "STATUS", v: "DEPLOYED" },
            ].map((row) => (
              <div key={row.k}>
                <dt className="hud-label">{row.k}</dt>
                <dd className="mt-1.5 font-display text-lg uppercase text-fg">
                  {row.v}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        {/* Hero image */}
        <Reveal className="mt-10">
          <div className="relative aspect-[16/9] w-full overflow-hidden border border-line">
            <Image
              src={project.image}
              alt={`${project.title} — project visual`}
              fill
              priority
              sizes="(max-width: 1400px) 100vw, 1400px"
              className="object-cover"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(0deg, rgba(5,5,5,0.6), transparent 60%)",
              }}
            />
            <div className="scanlines pointer-events-none absolute inset-0 opacity-25" />
            <span className="hud-label absolute left-4 top-4 text-cyan">
              VISUAL / RENDER 4K
            </span>
          </div>
        </Reveal>

        {/* Body */}
        <div className="mt-16 grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <Reveal>
              <h2 className="hud-label mb-5 text-cyan/70">OVERVIEW</h2>
              <p className="text-lg leading-relaxed text-fg/90 md:text-xl">
                {project.description}
              </p>
            </Reveal>

            <Reveal className="mt-12">
              <h2 className="hud-label mb-5 text-cyan/70">KEY OUTCOMES</h2>
              <ul className="space-y-4">
                {project.highlights.map((h) => (
                  <li
                    key={h}
                    className="flex items-start gap-4 border-b border-line pb-4 text-lg text-muted"
                  >
                    <span className="mt-1.5 font-mono text-xs" style={{ color }}>
                      →
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Sidebar */}
          <aside className="md:col-span-5">
            <Reveal className="border border-line bg-surface/40 p-6">
              <h2 className="hud-label mb-5 text-cyan/70">STACK / SYSTEMS</h2>
              <div className="flex flex-wrap gap-2">
                {project.stack.map((s) => (
                  <span
                    key={s}
                    className="border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-fg"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6">
                {project.metrics.map((m) => (
                  <div key={m.label}>
                    <span className="hud-label">{m.label}</span>
                    <p
                      className="mt-1 font-display text-2xl font-bold tabular"
                      style={{ color }}
                    >
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </aside>
        </div>

        {/* Next project */}
        <Link
          href={`/work/${next.slug}`}
          className="group mt-20 flex items-center justify-between border-t border-line-strong pt-10"
        >
          <div>
            <span className="hud-label text-muted">NEXT CASE FILE</span>
            <p className="mt-2 font-display text-4xl font-black uppercase text-fg transition-colors group-hover:text-cyan md:text-6xl">
              {next.title}
            </p>
          </div>
          <ArrowRight
            size={40}
            className="shrink-0 text-muted transition-all group-hover:translate-x-2 group-hover:text-cyan"
          />
        </Link>
      </div>
    </article>
  );
}
