"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { FrameLock } from "@/components/motion/FrameLock";

/**
 * A missing page as one printed panel: the same frame lock and ramp rule as
 * the chapter cards, with a real heading and the existing route home.
 */
export default function NotFound() {
  const { t } = useI18n();
  return (
    <section
      data-act="deck"
      className="lf-not-found relative flex min-h-dvh items-center justify-center px-6 py-28 text-center"
    >
      <FrameLock on className="lf-404-card">
        <p className="fl-in tag text-[var(--color-rim)]" style={{ "--i": 0 } as React.CSSProperties}>{t.notFound.eyebrow}</p>
        <h1 className="fl-in display-caps text-fg" style={{ "--i": 1, fontSize: "clamp(7rem, 25vw, 18rem)", lineHeight: 0.9 } as React.CSSProperties}>404<span className="sr-only"> — {t.notFound.eyebrow}</span></h1>
        <span aria-hidden className="spectrum-rule h-0.5 w-full" />
        <p className="fl-in relative max-w-md font-tech text-2xl leading-snug text-fg" style={{ "--i": 2 } as React.CSSProperties}>{t.notFound.body}</p>

      <Link
        href="/"
        style={{ backgroundImage: "var(--gradient-spectrum)" }}
        className="chamfer-sm relative mt-10 inline-flex items-center gap-3 px-7 py-3.5 font-mono text-[0.9375rem] uppercase tracking-[0.14em] text-void transition-transform duration-300 hover:scale-[1.03]"
      >
        <ArrowLeft size={14} /> {t.notFound.back}
      </Link>
      </FrameLock>
    </section>
  );
}
