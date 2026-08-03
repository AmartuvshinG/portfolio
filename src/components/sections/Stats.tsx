import { stats } from "@/lib/content";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { RevealStagger, Reveal } from "@/components/motion/Reveal";
import { DataGraph } from "@/components/hud/DataGraph";
import { scaleIn } from "@/lib/motion";

export function Stats() {
  return (
    <section className="relative border-t border-line py-20 md:py-28">
      <div className="mx-auto max-w-[1600px] px-5 md:px-8">
        <div className="mb-12 flex items-center justify-between">
          <span className="hud-label text-cyan/70">{"// SYSTEM METRICS"}</span>
          <div className="hidden w-40 md:block">
            <DataGraph bars={24} />
          </div>
        </div>

        <RevealStagger className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
          {stats.map((stat) => (
            <Reveal key={stat.label} asChild variants={scaleIn}>
              <div className="group relative bg-bg p-6 md:p-8">
                <span className="absolute right-4 top-4 h-2 w-2 bg-cyan/30 transition-colors group-hover:bg-cyan" />
                <div className="font-display text-6xl font-black leading-none text-fg md:text-7xl">
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    unit={stat.unit}
                  />
                </div>
                <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-muted">
                  {stat.label}
                </p>
              </div>
            </Reveal>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
