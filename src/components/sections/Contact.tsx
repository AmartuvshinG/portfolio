import { contact, profile } from "@/lib/content";
import { ContactForm } from "./ContactForm";
import { SocialFan } from "./SocialFan";
import { Reveal } from "@/components/motion/Reveal";

/**
 * The closing block: back to black, with the lime rising off the bottom edge.
 *
 * The page opened on paper and spent its middle there, so ending dark closes
 * the loop the work world opened rather than introducing a third idea. The
 * gradient is the one place the acid green is allowed to take real estate —
 * it's a fill behind everything, never a colour anything is set in.
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
                    className="signal-underline font-display text-xl font-semibold text-fg md:text-2xl"
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

      {/* --- The fan, over the lime wash --- */}
      <div className="relative mt-24 pb-24 md:mt-32">
        {/* Sits behind the fan and bleeds off the bottom of the page. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%]"
          style={{
            background:
              "linear-gradient(0deg, rgba(198,255,61,0.75) 0%, rgba(198,255,61,0.18) 45%, transparent 100%)",
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
