"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { profile, contact } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useQuality } from "@/hooks/useQuality";
import { setBackdropIntensity } from "@/lib/backdrop";
import { GlitchText } from "@/components/motion/GlitchText";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { WordReveal } from "@/components/motion/WordReveal";
import { Plate, type PlateSpec } from "@/components/hero/Plate";
import { Skyline } from "@/components/hero/Skyline";
import { PointCloud } from "@/components/hero/PointCloud";
import { EntranceArc, Focus } from "@/components/hero/Entrance";
import {
  Blimp,
  Fog,
  Parapet,
  Rain,
  Sky,
  SunDisc,
  WetGround,
} from "@/components/hero/Atmosphere";

/**
 * The opening frame — a city seen through eight planes of depth, with the name
 * buried in the middle of them.
 *
 * The whole section is one idea: **the wordmark is not on top of the
 * background, it is inside it.** Plates 10–38 sit behind the type, plates 50–80
 * in front, and as you scroll the near ones travel further and grow faster, so
 * the skyline, the rain and finally the rooftop edge rise up and cut across the
 * letterforms until the frame is gone. That is the mechanic every one of the
 * reference clips is built on; ours is a skyline where theirs is a mountain
 * ridge, but the geometry is the same.
 *
 * Read the JSX in order — it *is* the depth order, back to front, which is the
 * one property of this component that must never be refactored into something
 * cleverer. A z-index split across two files is a z-index nobody can reason
 * about.
 *
 * Three beats, matched to the three reference clips:
 *   enter   the arc blows out and collapses; the type resolves from blur
 *   rest    the point cloud dollies in and occludes the middle of the lead
 *   exit    the plate stack separates on scroll and the foreground closes
 */

/* Travel is in vh over the full run; scale is where the plate ends up. The
   spread between these numbers is the depth — measured off `parallax-2.mp4`
   frames 0 → 9, then scaled to this section's runway. */
const P = {
  sky: { travel: -4, z: 10 },
  far: { travel: -14, z: 20 },
  air: { travel: -24, z: 30 },
  /* The wordmark is one of only two plates that grows, and the growth is the
     point: without it the stack reads as a slideshow of layers sliding past
     rather than as a camera moving through them. */
  mark: { travel: -38, scale: 1.28, z: 40 },
  arc: { travel: -42, z: 45 },
  mid: { travel: -58, z: 60 },
  /* In front of the city, not between it and the name. Slotted behind the mid
     skyline first, which put a tower squarely over it and hid two thirds of the
     object — the centrepiece cannot be the thing being occluded. It still
     crosses the wordmark, which is all the depth sandwich actually requires, and
     travelling faster than the skyline is what a near object should do. */
  core: { travel: -64, scale: 1.5, z: 68 },
  rain: { travel: -74, z: 70 },
  wet: { travel: -92, z: 75 },
  near: { travel: -104, z: 80 },
} satisfies Record<string, PlateSpec>;

/* Twelve plates became ten, and the two that went were pure cost: a separate
   plate for the searchlight and a second for the warm fog were each a
   full-viewport gradient surface being transformed every frame, for a depth
   difference of 6vh that nobody can perceive. Both are now children of `air`.

   Only `mark` and `core` scale — see the note in Plate.tsx. Everything else
   translates, which is what the depth is actually made of.

   The rule this leaves behind: a new atmospheric effect belongs on an existing
   plate unless it genuinely needs to move at a different rate, and it does not
   get a `scale` unless you can point at what visibly grows. */

/** Scroll runway. Long enough that the separation is legible, short enough that
 *  nobody thinks the page has stopped. */
const RUN_VH = 220;

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  /* `lite` keeps the whole composition and drops only the weather — see
     useQuality for what that buys and why the line is drawn there. */
  const full = useQuality() === "full";
  const [active, setActive] = useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  /* One observer drives two things: whether the plates are promoted, and
     whether the site backdrop steps aside. Both want the same answer — is this
     section what the viewer is currently looking at — so they share the
     callback rather than each mounting their own. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setActive(entry.isIntersecting);
        /* The hero is now a full composition in its own right; a live shader
           field behind eight plates is two full-screen visuals competing, and
           the field is invisible under the sky plate anyway. */
        setBackdropIntensity(entry.intersectionRatio > 0.5 ? 0.25 : 1);
      },
      { threshold: [0, 0.5, 1] }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      setBackdropIntensity(1);
    };
  }, []);

  /* The close. The near plate is near-black and travelling fastest, but it
     cannot cover a whole viewport on its own without becoming enormous — so the
     last quarter of the run also ramps a void veil, and the hero resolves to
     black before handing off to About. A cut, not a fade. */
  const closeOpacity = useTransform(scrollYProgress, [0.72, 1], [0, 1]);
  /* Copy clears out well before the foreground reaches it. */
  const copyOpacity = useTransform(scrollYProgress, [0.28, 0.52], [1, 0]);
  const copyY = useTransform(scrollYProgress, [0, 1], ["0vh", "-34vh"]);

  const plate = (spec: PlateSpec, children: React.ReactNode, className?: string) => (
    <Plate
      spec={spec}
      progress={scrollYProgress}
      active={active}
      reduced={reduced}
      className={className}
    >
      {children}
    </Plate>
  );

  return (
    <section
      ref={ref}
      id="hero"
      data-act="void"
      data-chapter="INDEX"
      className={reduced ? "relative" : "relative"}
      style={{ height: reduced ? undefined : `${RUN_VH}vh` }}
      aria-label="Introduction"
    >
      <div
        className={
          reduced
            ? "relative flex min-h-dvh w-full flex-col justify-end overflow-hidden"
            : "sticky top-0 h-dvh w-full overflow-hidden"
        }
      >
        {/* ---- BEHIND THE NAME ---------------------------------------- */}

        {plate(P.sky, <Sky />)}

        {plate(P.far, (
          <>
            <SunDisc />
            <Skyline variant="far" className="absolute inset-0 h-full w-full" />
          </>
        ))}

        {plate(P.air, (
          <>
            <Fog beam={full} />
            {full && <Blimp />}
          </>
        ))}

        {/* The name. Painted *between* the far city and the near one — this
            plate is the reason the whole stack exists. */}
        {plate(
          P.mark,
          <div className="pointer-events-none absolute inset-x-0 top-[17vh] flex justify-center md:top-[15vh]">
            <Focus delay={0.45} amount={26} duration={0.95}>
              <h1 className="display-caps flex overflow-hidden text-[15vw] leading-[0.95] text-fg md:text-[13vw]">
                <motion.span
                  initial={reduced ? false : { y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  className="pointer-events-auto block"
                  style={{ paddingBottom: "0.08em" }}
                >
                  <GlitchText text={profile.wordmark} />
                </motion.span>
              </h1>
            </Focus>
          </div>
        )}

        {/* The horizon, cresting through the letters. Unchanged in role from the
            previous hero — it is still the site's entrance vocabulary — but it
            now arrives via the reference's bloom-collapse instead of a fade.

            Inset rather than full-bleed, and this matters more than it looks:
            `GlowHorizon`'s arcs are sized as a percentage of their container, so
            an `inset-0` container makes the crown a viewport-wide dome that eats
            the entire composition. Held to the lower two thirds it reads as what
            it is — a horizon behind a city. */}
        {plate(
          P.arc,
          <EntranceArc delay={0.35} />,
          /* inset-x-0 is spelled out so tailwind-merge drops the base
             `inset-0` cleanly rather than leaving a half-overridden box. */
          "inset-x-0 bottom-[-20vh] top-[34vh]"
        )}

        {/* ---- IN FRONT OF THE NAME ----------------------------------- */}

        {plate(
          P.mid,
          <Skyline variant="mid" className="absolute inset-0 h-full w-full" />
        )}

        {plate(P.core, <PointCloud progress={scrollYProgress} active={active} />)}

        {full && plate(P.rain, <Rain />)}

        {full && plate(P.wet, <WetGround />)}

        {plate(P.near, <Parapet />)}

        {/* ---- CHROME -------------------------------------------------- */}

        {/* Legibility scrim, small screens only. On desktop the copy sits in the
            margins either side of the composition; a phone has no margins, and
            the lead lands directly on the light. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[85] h-[62%] md:hidden"
          style={{
            background:
              "linear-gradient(0deg, var(--color-void) 22%, color-mix(in srgb, var(--color-void) 82%, transparent) 55%, transparent 100%)",
          }}
        />

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[88] bg-void"
          style={reduced ? { opacity: 0 } : { opacity: closeOpacity }}
        />

        <motion.div
          className="absolute inset-x-0 bottom-0 z-[90] mx-auto flex w-full max-w-[1800px] flex-col gap-10 px-5 pb-8 md:px-8 md:pb-10 lg:px-16"
          style={reduced ? undefined : { opacity: copyOpacity, y: copyY }}
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="notch-card-sm w-fit border border-line bg-deck/80 px-5 py-4 backdrop-blur-md"
            >
              <span className="micro">Currently</span>
              <p className="mt-2 max-w-[15rem] font-tech text-sm font-semibold uppercase leading-tight text-fg">
                {profile.status}
              </p>
              <a
                href={`mailto:${contact.email}`}
                className="spectrum-underline mt-3 inline-block font-mono text-[0.6875rem] lowercase tracking-wider text-fg"
              >
                {contact.email}
              </a>
            </motion.div>

            <div className="max-w-md md:text-right">
              {/* The lead, arriving a word at a time behind the point cloud —
                  the reference's "BUILD YOUR DREAMS" beat. Chakra Petch rather
                  than the display face: Michroma is unreadable at this size. */}
              <WordReveal
                text={profile.heroLead}
                delay={1.15}
                className="font-tech text-3xl font-medium leading-[1.12] text-fg md:text-4xl"
              />
              <motion.p
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4 text-sm leading-relaxed text-muted"
              >
                {profile.heroSub}
              </motion.p>
            </div>
          </div>

          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.7, duration: 1 }}
            className="flex items-center justify-between border-t border-line pt-4"
          >
            <ScrambleText text={profile.kicker} immediate className="micro" />
            <span className="micro hidden md:block">{profile.location}</span>
            <span className="micro flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 animate-blink rounded-full"
                style={{ background: "var(--color-hazard)" }}
              />
              Scroll
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
