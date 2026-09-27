"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <section
      data-act="deck"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      <span className="micro relative mb-6">{t.notFound.eyebrow}</span>
      <h1
        className="display-caps relative text-fg"
        style={{ fontSize: "clamp(3rem, 13vw, 11rem)" }}
      >
        404
      </h1>
      <p className="relative mt-6 max-w-md font-tech text-2xl leading-snug text-fg">
        {t.notFound.body}
      </p>

      <Link
        href="/"
        style={{ backgroundImage: "var(--gradient-spectrum)" }}
        className="chamfer-sm relative mt-10 inline-flex items-center gap-3 px-7 py-3.5 font-mono text-[0.8125rem] uppercase tracking-[0.2em] text-void transition-transform duration-300 hover:scale-[1.03]"
      >
        <ArrowLeft size={14} /> {t.notFound.back}
      </Link>
    </section>
  );
}
