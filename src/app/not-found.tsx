"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { NeonWord, useDisplayFont } from "@/components/ui/NeonWord";

/**
 * The page that isn't there: "404" condensing out of the rain, holding a
 * moment, and falling apart again, forever — a signal that keeps almost
 * arriving. The same engine as the case-file gate (ui/NeonWord), in loop
 * mode. The heading is real text for assistive tech; the word is decoration.
 */
export default function NotFound() {
  const { t } = useI18n();
  const font = useDisplayFont();
  return (
    <section
      data-act="deck"
      className="relative flex min-h-dvh flex-col items-center justify-end overflow-hidden px-6 pb-[14vh] text-center"
    >
      <h1 className="sr-only">404 — {t.notFound.eyebrow}</h1>
      <div aria-hidden className="absolute inset-x-0 top-0 h-[64vh]">
        {font && (
          <NeonWord word="404" label={t.notFound.eyebrow} caption="404" font={font} weight="400" loop durationMs={3200} />
        )}
      </div>

      <p className="relative max-w-md font-tech text-2xl leading-snug text-fg">{t.notFound.body}</p>

      <Link
        href="/"
        style={{ backgroundImage: "var(--gradient-spectrum)" }}
        className="chamfer-sm relative mt-10 inline-flex items-center gap-3 px-7 py-3.5 font-mono text-[0.9375rem] uppercase tracking-[0.14em] text-void transition-transform duration-300 hover:scale-[1.03]"
      >
        <ArrowLeft size={14} /> {t.notFound.back}
      </Link>
    </section>
  );
}
