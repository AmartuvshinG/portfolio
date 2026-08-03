import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="holo-grid absolute inset-0 opacity-10" aria-hidden />

      <span className="hud-label mb-6 animate-blink text-red">
        ● SIGNAL LOST
      </span>
      <h1
        className="font-display font-black uppercase leading-none text-fg"
        style={{ fontSize: "clamp(5rem, 20vw, 16rem)" }}
      >
        4<span className="text-glow-cyan">0</span>4
      </h1>
      <p className="mt-4 max-w-md font-mono text-sm uppercase tracking-widest text-muted">
        The coordinates you requested are outside known space. This node does
        not exist.
      </p>

      <Link
        href="/"
        className="group mt-10 inline-flex items-center gap-3 chamfer-sm bg-cyan px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-bg transition-colors hover:bg-cyan/90"
      >
        <ArrowLeft size={14} /> [ Return to base ]
      </Link>
    </section>
  );
}
