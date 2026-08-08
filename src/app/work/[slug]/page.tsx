import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { projects, getProject } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";

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
  if (!project) return { title: "Case file not found" };
  return {
    title: `${project.title} — Case File`,
    description: project.summary,
  };
}

/**
 * The full case file. Lifted to the deck, unlike the work world it is reached from — this is
 * the reading surface, and long-form copy set on black is a worse experience
 * than the atmosphere is worth.
 */
export default async function WorkDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const idx = projects.findIndex((p) => p.slug === slug);
  const next = projects[(idx + 1) % projects.length];

  return (
    <article
      data-act="deck"
      className="relative pb-28 pt-28 md:pt-36"
    >
      <div className="relative mx-auto max-w-[1400px] px-5 md:px-8 lg:px-16">
        <Link
          href="/#work"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft size={14} /> Back to work
        </Link>

        <header className="mt-10 border-b border-line pb-10">
          <div className="flex items-center gap-4">
            <span className="micro tabular">{project.index}</span>
            <span className="h-px w-10 bg-current opacity-25" />
            <span className="micro">{project.category}</span>
          </div>
          <h1
            className="display-caps mt-6 text-fg"
            style={{ fontSize: "clamp(1.9rem, 6vw, 5.5rem)" }}
          >
            {project.title}
          </h1>
          <p className="mt-6 max-w-2xl font-tech text-2xl leading-snug text-fg md:text-3xl">
            {project.summary}
          </p>

          <dl className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { k: "Role", v: project.role },
              { k: "Year", v: project.year },
              { k: "Category", v: project.category },
              { k: "Status", v: "Shipped" },
            ].map((row) => (
              <div key={row.k}>
                <dt className="micro">{row.k}</dt>
                <dd className="mt-2 font-tech text-lg font-semibold uppercase text-fg">
                  {row.v}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <Reveal className="mt-12">
          <div className="notch-card relative aspect-[16/9] w-full overflow-hidden bg-surface">
            <Image
              src={project.image}
              alt={`${project.title} — project visual`}
              fill
              priority
              sizes="(max-width: 1400px) 100vw, 1400px"
              className="object-cover"
            />
          </div>
        </Reveal>

        <div className="mt-20 grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <Reveal>
              <h2 className="micro mb-5">Overview</h2>
              <p className="text-lg leading-relaxed text-fg md:text-xl">
                {project.description}
              </p>
            </Reveal>

            <Reveal className="mt-14">
              <h2 className="micro mb-5">Key outcomes</h2>
              <ul>
                {project.highlights.map((h) => (
                  <li
                    key={h}
                    className="flex items-start gap-4 border-b border-line py-4 text-lg text-muted"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                    {h}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <aside className="md:col-span-5">
            <Reveal className="notch-card bg-surface p-7 ring-1 ring-inset ring-line">
              <h2 className="micro mb-5">Stack</h2>
              <div className="flex flex-wrap gap-2">
                {project.stack.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-fg"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-7">
                {project.metrics.map((m) => (
                  <div key={m.label}>
                    <span className="micro">{m.label}</span>
                    <p className="tabular mt-2 font-display text-xl text-fg">
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </aside>
        </div>

        <Link
          href={`/work/${next.slug}`}
          className="group mt-24 flex items-center justify-between border-t border-line pt-10"
        >
          <div>
            <span className="micro">Next case file</span>
            <p className="display-caps mt-3 text-2xl text-fg md:text-4xl">
              {next.title}
            </p>
          </div>
          <ArrowRight
            size={40}
            className="shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-2"
          />
        </Link>
      </div>
    </article>
  );
}
