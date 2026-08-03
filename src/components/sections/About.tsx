import Image from "next/image";
import { about, profile } from "@/lib/content";
import { SectionHeader } from "./SectionHeader";
import { Reveal, RevealStagger } from "@/components/motion/Reveal";
import { DataConduit } from "@/components/motion/DataConduit";
import { HudFrame } from "@/components/hud/HudFrame";
import { DataGraph } from "@/components/hud/DataGraph";
import { fadeUp } from "@/lib/motion";

export function About() {
  return (
    <section id="about" className="relative border-t border-line py-24 md:py-36">
      <div className="mx-auto max-w-[1600px] px-5 md:px-8">
        <SectionHeader
          index="01"
          label="OPERATOR PROFILE"
          title="Profile"
          description={about.lead}
        />

        <div className="mt-16 grid gap-12 md:grid-cols-12">
          {/* Narrative */}
          <DataConduit className="md:col-span-7" label="TRACE / 01">
            <RevealStagger className="space-y-6">
              {about.paragraphs.map((p, i) => (
                <Reveal key={i} asChild variants={fadeUp}>
                  <p className="text-lg leading-relaxed text-muted md:text-xl">
                    {p}
                  </p>
                </Reveal>
              ))}
            </RevealStagger>

            <Reveal className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-8">
              {about.signature.map((s) => (
                <div key={s.k} className="flex flex-col gap-2">
                  <span className="hud-label text-cyan/70">{s.k}</span>
                  <span className="font-display text-lg uppercase text-fg md:text-xl">
                    {s.v}
                  </span>
                </div>
              ))}
            </Reveal>
          </DataConduit>

          {/* ID card */}
          <Reveal className="md:col-span-5" variants={fadeUp} delay={0.15}>
            <HudFrame
              label={`ID // ${profile.wordmark}`}
              readout="SEC-A / VERIFIED"
              className="glass"
            >
              <div className="p-4">
                <div className="relative aspect-[4/5] w-full overflow-hidden">
                  <Image
                    src="https://picsum.photos/seed/amara-operator/900/1120"
                    alt={`Portrait of ${profile.fullName}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 40vw"
                    className="object-cover grayscale contrast-125"
                  />
                  {/* Cyber tint + scanlines */}
                  <div
                    className="pointer-events-none absolute inset-0 mix-blend-color"
                    style={{ background: "rgba(0,229,255,0.25)" }}
                  />
                  <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(0deg, rgba(5,5,5,0.9), transparent 55%)",
                    }}
                  />
                  {/* Corner ticks */}
                  <span className="absolute left-2 top-2 h-3 w-3 border-l border-t border-cyan" />
                  <span className="absolute right-2 top-2 h-3 w-3 border-r border-t border-cyan" />

                  {/* Overlaid identity */}
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
                    <div>
                      <p className="font-display text-2xl font-bold uppercase text-fg">
                        {profile.fullName}
                      </p>
                      <p className="hud-label mt-1 text-cyan">{profile.role}</p>
                    </div>
                    <span className="hud-label animate-blink text-cyan">●REC</span>
                  </div>
                </div>

                {/* Telemetry strip */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="hud-label">CLEARANCE</span>
                    <span className="font-mono text-sm text-fg">LEVEL 09</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="hud-label">SIGNAL</span>
                    <DataGraph bars={18} className="h-6" />
                  </div>
                </div>
              </div>
            </HudFrame>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
