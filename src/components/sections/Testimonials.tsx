"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { testimonials } from "@/lib/content";
import { SectionHeader } from "./SectionHeader";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

export function Testimonials() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = testimonials.length;

  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);

  useEffect(() => {
    if (reduced || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(id);
  }, [reduced, paused, count]);

  const active = testimonials[index];

  return (
    <section className="relative border-t border-line py-24 md:py-36">
      <div className="mx-auto max-w-[1600px] px-5 md:px-8">
        <SectionHeader
          index="TX"
          label="INCOMING TRANSMISSIONS"
          title="Signals"
        />

        <div
          className="mt-14 border border-line bg-surface/40"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Transmission header */}
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="hud-label flex items-center gap-2 text-cyan">
              <span className="h-1.5 w-1.5 animate-blink bg-cyan" />
              SIGNAL LOCKED — CH.{String(index + 1).padStart(2, "0")}
            </span>
            <span className="hud-label tabular text-muted">
              {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </span>
          </div>

          {/* Body */}
          <div className="relative min-h-[19rem] p-6 md:min-h-[16rem] md:p-12">
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={index}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="max-w-4xl font-display text-2xl font-medium uppercase leading-tight text-fg md:text-4xl">
                  <span className="text-cyan">“</span>
                  {active.quote}
                  <span className="text-cyan">”</span>
                </p>
                <footer className="mt-8 flex items-center gap-4">
                  <span className="h-px w-10 bg-cyan" />
                  <div>
                    <ScrambleText
                      text={active.author}
                      immediate
                      className="block font-mono text-sm uppercase tracking-widest text-fg"
                    />
                    <span className="mt-1 block font-mono text-xs uppercase tracking-widest text-muted">
                      {active.role} — {active.org}
                    </span>
                  </div>
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Show transmission ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-1.5 transition-all",
                    i === index ? "w-8 bg-cyan" : "w-4 bg-surface-2 hover:bg-muted"
                  )}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Previous transmission"
                onClick={() => go(-1)}
                className="flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors hover:border-cyan hover:text-cyan"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Next transmission"
                onClick={() => go(1)}
                className="flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors hover:border-cyan hover:text-cyan"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
