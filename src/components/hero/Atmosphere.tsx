/**
 * The hero's weather.
 *
 * Six small pieces that share one contract, which is why they share a file
 * rather than sitting in six thirty-line modules: each renders a purely
 * decorative layer, each animates `transform` or `opacity` and nothing else, and
 * each is composed into the plate stack by `HeroStack` rather than positioning
 * itself. Read them as one system — the difference between "a dark site" and
 * "a wet street at night" is entirely here.
 *
 * The perf rule they all obey: a gradient is cheap to rasterise *once*. So every
 * texture below is a static gradient on a layer that only ever translates. The
 * failure mode being avoided is the one already documented in the perf pass —
 * animating `background-position` (a paint property) or re-blurring a surface
 * every frame.
 */

/* -------------------------------------------------------------------------
   Sky — the deepest plate. The only one that paints a ground, because it *is*
   the ground; everything above it must stay transparent to layer.
   ---------------------------------------------------------------------- */
export function Sky() {
  return (
    <div
      aria-hidden
      /* Taller than its plate on purpose. Every plate translates *up* as you
         scroll, so a plate-sized layer drags its own bottom edge into frame and
         leaves a band of nothing under it. Bleeding past the bottom is the
         cheapest fix and costs one stretched gradient. */
      className="absolute inset-x-0 top-0 h-[135%]"
      style={{
        background: [
          /* Sodium haze low on the horizon, cool ramp above it. The warm/cool
             split across the horizon line is the whole colour idea. */
          "radial-gradient(120% 62% at 50% 96%, color-mix(in srgb, var(--color-hazard) 26%, transparent) 0%, transparent 62%)",
          "radial-gradient(90% 55% at 22% 88%, color-mix(in srgb, var(--spectrum-1) 30%, transparent) 0%, transparent 68%)",
          "radial-gradient(80% 50% at 82% 78%, color-mix(in srgb, var(--spectrum-3) 22%, transparent) 0%, transparent 66%)",
          "linear-gradient(180deg, #04050a 0%, #070818 46%, #120a24 74%, #1a0d2e 100%)",
        ].join(", "),
      }}
    />
  );
}

/* -------------------------------------------------------------------------
   Sun disc + god rays. The reference's sun sits high and small and is the one
   hard-edged bright thing in the frame — it is what the eye uses to judge how
   far the far plate has travelled.
   ---------------------------------------------------------------------- */
export function SunDisc() {
  return (
    <div aria-hidden className="absolute inset-0">
      <div
        className="absolute left-1/2 top-[16%] h-[7vmin] w-[7vmin] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, #fff 0%, color-mix(in srgb, var(--spectrum-2) 70%, #fff) 38%, transparent 72%)",
          boxShadow:
            "0 0 8vmin 3vmin color-mix(in srgb, var(--spectrum-2) 34%, transparent), 0 0 22vmin 9vmin color-mix(in srgb, var(--spectrum-1) 16%, transparent)",
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
   Fog + searchlight, on one layer.

   These began as three separate plates — cool fog, warm fog, and a swept beam —
   and together they were the most expensive thing in the hero: ~83ms of a
   183ms frame at 6x throttle. Not because any one of them is costly, but
   because each was a full-viewport gradient surface being rescaled every frame
   by its plate. Three surfaces became one, the god rays (a full-bleed conic
   gradient, and invisible in every screenshot taken of this hero) were dropped
   outright, and the warm and cool pockets are now stops in a single paint.

   The lesson is the one the site already learned about filters: the count of
   full-bleed surfaces is the budget, and the cheapest surface is the one that
   was merged into its neighbour.
   ---------------------------------------------------------------------- */
export function Fog({ beam = true }: { beam?: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: [
            /* Sodium pockets low and left, cool haze high and right — the warm
               against cool split is the whole point of the layer. */
            "radial-gradient(46% 26% at 24% 74%, color-mix(in srgb, var(--color-hazard) 20%, transparent) 0%, transparent 72%)",
            "radial-gradient(34% 20% at 66% 84%, color-mix(in srgb, var(--color-hazard) 13%, transparent) 0%, transparent 70%)",
            "radial-gradient(40% 24% at 78% 58%, color-mix(in srgb, var(--spectrum-3) 12%, transparent) 0%, transparent 70%)",
            "radial-gradient(36% 22% at 14% 46%, color-mix(in srgb, var(--spectrum-2) 10%, transparent) 0%, transparent 72%)",
          ].join(", "),
        }}
      />

      {/* The spinner's beam. Kept because it is the one moving light in the
          frame, narrowed because its cost is its painted area, and dropped
          entirely on the lite tier — it is the most expensive thing here and
          the least load-bearing. */}
      {beam && (
      <div
        className="absolute left-1/2 top-[-60%] h-[170%] w-[24vw] -translate-x-1/2"
        style={{
          transformOrigin: "50% 0%",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-hazard) 20%, transparent) 0%, color-mix(in srgb, #eceefb 7%, transparent) 34%, transparent 74%)",
          clipPath: "polygon(46% 0, 54% 0, 100% 100%, 0 100%)",
          animation: "hero-sweep 19s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Rain. Two layers at different scales and speeds — one set of streaks reads as
   a texture, two read as volume.

   Streaks come from a repeating gradient; the *breaks* come from a mask at a
   different angle, which is what turns continuous lines into falling drops. The
   tile is 200% tall and travels exactly half its height, so the loop seam never
   lands inside the viewport.
   ---------------------------------------------------------------------- */
function RainLayer({
  angle,
  gap,
  speed,
  opacity,
}: {
  angle: number;
  gap: number;
  speed: number;
  opacity: number;
}) {
  return (
    <div
      className="absolute inset-x-0 top-0 h-[200%] w-full"
      style={{
        opacity,
        backgroundImage: `repeating-linear-gradient(${angle}deg, transparent 0 ${gap}px, rgba(236,238,251,0.5) ${gap}px ${gap + 1}px, transparent ${gap + 1}px ${gap * 2.4}px)`,
        maskImage: `repeating-linear-gradient(${angle - 90}deg, transparent 0 14px, #000 14px 44px, transparent 44px 66px)`,
        WebkitMaskImage: `repeating-linear-gradient(${angle - 90}deg, transparent 0 14px, #000 14px 44px, transparent 44px 66px)`,
        animation: `hero-rain ${speed}s linear infinite`,
        willChange: "transform",
      }}
    />
  );
}

export function Rain() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <RainLayer angle={99} gap={13} speed={0.62} opacity={0.16} />
      <RainLayer angle={102} gap={27} speed={1.05} opacity={0.1} />
    </div>
  );
}

/* -------------------------------------------------------------------------
   The off-world blimp. Forty seconds apart, and gone in eight — the point is
   that most people never see it, and the ones who watch the hero twice do.
   ---------------------------------------------------------------------- */
export function Blimp() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div
        className="absolute left-0 top-[12%] h-[2.1vmin] w-[9vmin]"
        style={{
          animation: "hero-blimp 44s linear infinite",
          willChange: "transform",
        }}
      >
        <div
          className="h-full w-full"
          style={{
            background: "#04050a",
            borderRadius: "50%",
            boxShadow:
              "0 0 2vmin 0.2vmin color-mix(in srgb, var(--spectrum-2) 30%, transparent)",
          }}
        />
        {/* The advertising crawl, as a lit strip. At this size it is two pixels
            of moving colour, which is exactly as much as it should be. */}
        <div
          className="absolute left-[18%] top-1/2 h-[0.5vmin] w-[64%] -translate-y-1/2"
          style={{
            backgroundImage: "var(--gradient-spectrum)",
            opacity: 0.85,
            filter: "blur(0.2vmin)",
          }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   The parapet — the nearest plate, and the one doing the most work.

   In the reference this role is played by a hill and a figure: near-black, no
   internal detail, travelling faster than everything else and eventually
   swallowing the frame. Detail here would be a mistake — the foreground's job is
   to be an *edge*, and an edge with texture stops reading as near.
   ---------------------------------------------------------------------- */
export function Parapet() {
  return (
    /* 170vh tall, not "to the bottom of the plate". This is the fastest-moving
       plate in the stack — it travels 104vh — so anything sized to the plate
       lifts its own bottom edge a full viewport up the screen and opens a black
       band under the city. The mass has to keep going down long after the top
       edge has climbed out of frame. */
    <div aria-hidden className="absolute inset-x-0 top-[74%] h-[170vh]">
      {/* Rim light picking out the top edge. Sodium, because this is the only
          surface close enough for a street lamp to be lighting it. */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-hazard) 70%, transparent) 22%, color-mix(in srgb, var(--spectrum-1) 60%, transparent) 68%, transparent)",
        }}
      />
      {/* Railing. A repeating gradient rather than elements — forty balusters
          are forty boxes for the layout engine and one paint for the GPU. */}
      <div
        className="absolute inset-x-0 top-0 h-[2.4vmin]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #04050a 0 3px, transparent 3px 26px)",
          maskImage: "linear-gradient(180deg, #000 0%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, #000 0%, transparent 100%)",
        }}
      />
      <div className="absolute inset-0 bg-[#04050a]" />
    </div>
  );
}

/* -------------------------------------------------------------------------
   Wet ground. The city, upside down, in standing water.

   Blurred **once** as a static filter on a layer that thereafter only ever
   translates and scales with its plate. Re-blurring per frame is perf-pass item
   2 and is what this is written to avoid; the horizontal band mask does the
   work that an animated ripple would otherwise be asked to do.
   ---------------------------------------------------------------------- */
export function WetGround() {
  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 top-[62%] overflow-hidden">
      {/* Reflected neon, generated.

          This began as a real mirror: a second `<Skyline>` flipped on Y under a
          `blur(5px)`. It looked right and cost far too much — a whole second
          copy of a twenty-tower SVG, re-rasterised through a filter every time
          its plate rescaled, which is every scroll frame.

          Standing water does not return a legible image anyway; it returns
          smeared vertical columns of colour with the horizontal chop of the
          surface cut through them. That is two gradients, and it reads *better*
          than the mirror did — a sharp reflection is what makes CGI water look
          like a mirror instead of like water. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "repeating-linear-gradient(90deg, transparent 0 38px, color-mix(in srgb, var(--spectrum-1) 26%, transparent) 38px 46px, transparent 46px 104px)",
            "repeating-linear-gradient(90deg, transparent 0 71px, color-mix(in srgb, var(--spectrum-3) 20%, transparent) 71px 76px, transparent 76px 173px)",
            "repeating-linear-gradient(90deg, transparent 0 122px, color-mix(in srgb, var(--color-hazard) 24%, transparent) 122px 131px, transparent 131px 268px)",
          ].join(", "),
          /* One mask, not two composited. `mask-composite: intersect` needs
             both masks rasterised and then combined — the surface chop is
             folded into the single gradient's stops instead. */
          maskImage:
            "linear-gradient(180deg, #000 0%, rgba(0,0,0,0.55) 34%, rgba(0,0,0,0.25) 60%, transparent 84%)",
          WebkitMaskImage:
            "linear-gradient(180deg, #000 0%, rgba(0,0,0,0.55) 34%, rgba(0,0,0,0.25) 60%, transparent 84%)",
          opacity: 0.5,
        }}
      />

      {/* Specular sheen on the standing water, and the near edge going dark. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, #04050a 0%, transparent 58%), radial-gradient(70% 40% at 50% 0%, color-mix(in srgb, var(--color-hazard) 12%, transparent) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
