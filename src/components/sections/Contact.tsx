import { contact, profile } from "@/lib/content";
import { ContactForm } from "./ContactForm";
import { SocialFan } from "./SocialFan";
import { Reveal } from "@/components/motion/Reveal";

/**
 * The closing block: the base void, with the ramp rising off the bottom edge.
 *
 * The page opened on the void and lifted through its middle, so dropping back
 * to it here closes the loop the work world opened rather than introducing a
 * third idea. This bloom is the one place the ramp is allowed real estate — it
 * is a wash behind everything, never a colour anything is set in.
 */
export function Contact() {
  return (
    <section
      id="contact"
      data-act="void"
      data-chapter="CONTACT"
      className="relative overflow-hidden bg-bg pt-24 md:pt-36"
      aria-label="Contact"
    >
      <div className="relative mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
        <Reveal className="flex flex-col gap-4">
          <span className="micro">07 — {contact.heading}</span>
          <h2 className="display-caps text-[clamp(3rem,11vw,11rem)] text-fg">
            Let&apos;s build
          </h2>
          <p className="max-w-lg font-editorial text-2xl leading-snug text-fg md:text-3xl">
            {contact.lead}
          </p>
        </Reveal>

        <div className="mt-16 grid gap-14 border-t border-line pt-14 md:grid-cols-12">
          <Reveal className="md:col-span-5">
            <dl className="space-y-8">
              <div>
                <dt className="micro">Email</dt>
                <dd className="mt-2">
                  <a
                    href={`mailto:${contact.email}`}
                    className="spectrum-underline font-display text-xl font-semibold text-fg md:text-2xl"
                  >
                    {contact.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="micro">Availability</dt>
                <dd className="mt-2 font-display text-xl font-semibold uppercase text-fg">
                  {contact.availability}
                </dd>
              </div>
              <div>
                <dt className="micro">Based</dt>
                <dd className="mt-2 font-display text-xl font-semibold uppercase text-fg">
                  {profile.location}
                </dd>
              </div>
            </dl>
          </Reveal>

          <Reveal className="md:col-span-7" delay={0.1}>
            <ContactForm />
          </Reveal>
        </div>
      </div>

      {/* --- The fan, over the spectrum bloom --- */}
      <div className="relative mt-24 pb-24 md:mt-32">
        {/* Sits behind the fan and bleeds off the bottom of the page. The whole
            ramp is spread across the width here rather than stacked, so the
            page closes on the full accent instead of on one stop of it — this
            is the largest chromatic area on the site and the only place the
            ramp is allowed to read as a field. */}
        <div
          aria-hidden
          className="spectrum-bloom pointer-events-none absolute inset-x-0 bottom-0 h-[85%] blur-[40px]"
          style={{
            maskImage: "linear-gradient(0deg, #000 55%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(0deg, #000 55%, transparent 100%)",
          }}
        />

        <div className="relative mx-auto max-w-[1800px] px-5 md:px-8 lg:px-16">
          <SocialFan />
          <p className="mt-12 text-center font-editorial text-3xl text-fg md:text-4xl">
            Find me elsewhere
          </p>
        </div>
      </div>
    </section>
  );
}
