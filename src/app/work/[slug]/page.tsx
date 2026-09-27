import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { projects, getProject } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { ShotImage } from "@/components/work/ShotImage";

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
            style={{
              fontSize: "clamp(1.9rem, 6vw, 5.5rem)",
              viewTransitionName: `vt-title-${slug}`,
            }}
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
              { k: "Status", v: project.status },
            ].map((row) => (
              <div key={row.k}>
                <dt className="micro">{row.k}</dt>
                <dd className="mt-2 font-tech text-lg font-semibold uppercase text-fg">
                  {row.v}
                </dd>
              </div>
            ))}
          </dl>

          {project.links?.length ? (
            <ul className="mt-10 flex flex-wrap gap-3">
              {project.links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chamfer-sm group inline-flex items-center gap-2 border border-line-strong px-5 py-3 font-mono text-[0.8125rem] uppercase tracking-[0.2em] text-fg transition-colors hover:border-fg"
                  >
                    {l.label}
                    <ArrowUpRight
                      size={14}
                      aria-hidden
                      className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </header>

        <Reveal className="mt-12">
          <div
            className="notch-card relative aspect-[16/9] w-full overflow-hidden bg-surface"
            style={{ viewTransitionName: `vt-shot-${slug}` }}
          >
            {/* The generated visual stands in until a real screenshot is
                dropped into public/work/ — see ShotImage. */}
            <ShotImage
              project={project}
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

              {project.metrics.length > 0 && (
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
              )}
            </Reveal>
          </aside>
        </div>

        {project.gallery?.length ? (
          <section className="mt-24" aria-label="Gallery">
            <Reveal>
              <h2 className="micro mb-8">Gallery</h2>
            </Reveal>
            <div className="grid gap-x-6 gap-y-12 md:grid-cols-2">
              {project.gallery.map((g, i) => (
                <Reveal key={g.src} delay={(i % 2) * 0.08}>
                  <figure>
                    <div className="notch-card relative overflow-hidden bg-surface ring-1 ring-inset ring-line">
                      <Image
                        src={g.src}
                        alt={g.alt}
                        width={2000}
                        height={1250}
                        sizes="(max-width: 768px) 100vw, (max-width: 1400px) 50vw, 680px"
                        className="h-auto w-full"
                      />
                    </div>
                    {g.caption && (
                      <figcaption className="micro mt-3">{g.caption}</figcaption>
                    )}
                  </figure>
                </Reveal>
              ))}
            </div>
          </section>
        ) : null}

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
