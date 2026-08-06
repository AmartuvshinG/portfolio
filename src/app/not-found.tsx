import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Contour } from "@/components/layout/Contour";

export default function NotFound() {
  return (
    <section
      data-act="paper"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-6 text-center"
    >
      <Contour
        className="pointer-events-none absolute inset-0 h-full w-full text-ink"
      />

      <span className="micro relative mb-6">Page not found</span>
      <h1
        className="display-caps relative text-fg"
        style={{ fontSize: "clamp(5rem, 22vw, 18rem)" }}
      >
        404
      </h1>
      <p className="relative mt-6 max-w-md font-editorial text-2xl leading-snug text-fg">
        This page doesn&apos;t exist — or it did, and doesn&apos;t any more.
      </p>

      <Link
        href="/"
        className="relative mt-10 inline-flex items-center gap-3 rounded-full bg-ink px-7 py-3.5 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-paper transition-transform duration-300 hover:scale-[1.03]"
      >
        <ArrowLeft size={14} /> Back to the index
      </Link>
    </section>
  );
}
