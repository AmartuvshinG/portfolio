import { ArrowUpRight } from "lucide-react";
import { contact, socials, profile } from "@/lib/content";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "@/components/motion/Reveal";
import { GlitchText } from "@/components/motion/GlitchText";
import { HudFrame } from "@/components/hud/HudFrame";
import { ContactForm } from "./ContactForm";

export function Contact() {
  return (
    <section id="contact" className="relative border-t border-line py-24 md:py-36">
      <div className="mx-auto max-w-[1600px] px-5 md:px-8">
        <SectionHeader
          index="05"
          label="ESTABLISH UPLINK"
          title="Contact"
        />

        <div className="mt-16 grid gap-12 md:grid-cols-2 md:gap-20">
          {/* Left: pitch + channels */}
          <div>
            <Reveal>
              <GlitchText
                text={contact.heading}
                as="p"
                className="font-display text-4xl font-black uppercase text-cyan md:text-6xl"
              />
              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
                {contact.lead}
              </p>
            </Reveal>

            <Reveal className="mt-10 flex flex-col gap-6" delay={0.1}>
              <div>
                <span className="hud-label">DIRECT CHANNEL</span>
                <a
                  href={`mailto:${contact.email}`}
                  className="mt-2 block w-fit border-b border-cyan/40 pb-1 font-display text-2xl uppercase text-fg transition-colors hover:border-cyan hover:text-cyan md:text-3xl"
                >
                  {contact.email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 animate-blink bg-cyan" />
                <span className="hud-label text-cyan">
                  {profile.status} — {contact.availability}
                </span>
              </div>
            </Reveal>

            {/* Social nodes */}
            <Reveal className="mt-10 grid grid-cols-2 gap-px border border-line bg-line" delay={0.15}>
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between bg-bg px-4 py-4 transition-colors hover:bg-surface-2"
                >
                  <span className="font-mono text-xs uppercase tracking-widest text-muted transition-colors group-hover:text-fg">
                    {s.label}
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="text-faint transition-colors group-hover:text-cyan"
                  />
                </a>
              ))}
            </Reveal>
          </div>

          {/* Right: form */}
          <Reveal delay={0.1}>
            <HudFrame label="TRANSMISSION CONSOLE" readout="ENCRYPTED" className="glass">
              <div className="p-6 md:p-8">
                <ContactForm />
              </div>
            </HudFrame>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
