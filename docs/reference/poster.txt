"use client";

import {
  motion,
  type TargetAndTransition,
  type Transition,
} from "motion/react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type SVGProps,
} from "react";

const ASSET_BASE_URL = "https://assets.aceternity.com/gta6";
const DEFAULT_DURATION = 3.6;

type LayerDef = {
  file: string;
  name: string;
  initialScale: number;
  revealDelay: number;
  initial?: TargetAndTransition;
  animate?: TargetAndTransition;
  transition?: Transition;
};

type SpringConfig = {
  type: "spring";
  bounce?: number;
  visualDuration?: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
};

export type GtaViPosterProps = {
  duration?: number;
  cameraScale?: number;
  fit?: number;
  depth?: number;
  logoBlur?: number;
  posterRadius?: number;
  background?: string;
  showReplay?: boolean;
  logoSpring?: SpringConfig;
  className?: string;
};

const LAYERS: LayerDef[] = [
  {
    file: "01-jl.webp",
    name: "J and L",
    initialScale: 1.234,
    revealDelay: 0.46,
  },
  {
    file: "06-gator.webp",
    name: "Gator",
    initialScale: 1.318,
    revealDelay: 0.56,
  },
  {
    file: "04-boobie.webp",
    name: "Boobie",
    initialScale: 1.403,
    revealDelay: 0.65,
  },
  { file: "03-gal.webp", name: "Gal", initialScale: 1.518, revealDelay: 0.74 },
  {
    file: "02-biker.webp",
    name: "Biker",
    initialScale: 1.646,
    revealDelay: 0.84,
  },
  {
    file: "00-heli.webp",
    name: "Helicopter",
    initialScale: 1.797,
    revealDelay: 0.93,
  },
  {
    file: "07-raul.webp",
    name: "Raul",
    initialScale: 1.98,
    revealDelay: 1.02,
  },
  {
    file: "05-lambo.webp",
    name: "Lambo",
    initialScale: 2.186,
    revealDelay: 1.11,
  },
  {
    file: "08-speedboat.webp",
    name: "Speedboat",
    initialScale: 2.42,
    revealDelay: 1.21,
  },
  {
    file: "09-logohole.webp",
    name: "Logo hole",
    initialScale: 2.446,
    revealDelay: 1.9,
  },
  {
    file: "10-vilogo.webp",
    name: "VI logo",
    initialScale: 2.446,
    revealDelay: 0.5,
  },
  {
    file: "11-gtalogo.webp",
    name: "GTA logo",
    initialScale: 3.306,
    revealDelay: 0.8,
    initial: {
      opacity: 1,
      clipPath: "inset(0% 0% 100% 0%)",
    },
    animate: { clipPath: "inset(0% 0% 0% 0%)" },
  },
];

const DEFAULT_LOGO_SPRING: SpringConfig = {
  type: "spring",
  visualDuration: 4,
  bounce: 0.5,
};

export const controls = {
  duration: [3.6, 1, 8, 0.1],
  cameraScale: [1.14, 1, 1.8, 0.01],
  fit: [0.96, 0.5, 1, 0.01],
  depth: [1, 0, 1.6, 0.01],
  logoBlur: [4, 0, 16, 0.5],
  posterRadius: [0, 0, 48, 1],
  background: "radial-gradient(circle at 50% 28%, #2a1133, #080611 72%)",
  showReplay: true,
  logoSpring: DEFAULT_LOGO_SPRING,
};

export function GtaViPoster({
  duration = DEFAULT_DURATION,
  cameraScale = 1.14,
  fit = 0.96,
  depth = 1,
  logoBlur = 4,
  posterRadius = 0,
  background = "radial-gradient(circle at 50% 28%, #2a1133, #080611 72%)",
  showReplay = true,
  logoSpring = DEFAULT_LOGO_SPRING,
  className,
}: GtaViPosterProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(0);
  const [playKey, setPlayKey] = useState(0);
  const timeScale = duration / DEFAULT_DURATION;

  useLayoutEffect(() => {
    const element = stageRef.current;
    if (!element) return;

    const update = () => {
      const bounds = element.getBoundingClientRect();
      setSize(Math.min(bounds.width, bounds.height) * fit);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [fit]);

  const logoTransition: Transition = {
    clipPath: { ...logoSpring, delay: 0.8 * timeScale },
    filter: { ...logoSpring, delay: 0.8 * timeScale },
  };

  return (
    <div
      ref={stageRef}
      className={`relative flex h-dvh w-full items-center justify-center overflow-hidden ${className ?? ""}`}
      style={{ background }}
    >
      {size > 0 ? (
        <motion.div
          key={playKey}
          className="relative"
          style={{
            width: size,
            height: size,
            borderRadius: posterRadius,
            transformOrigin: "center",
          }}
          initial={{ scale: cameraScale, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration, ease: [0.33, 0, 0.2, 1] }}
        >
          {LAYERS.map((layer, index) => {
            const isGtaLogo = layer.name === "GTA logo";
            const scale = 1 + (layer.initialScale - 1) * depth;
            const initialFilter = isGtaLogo ? `blur(${logoBlur}px)` : undefined;
            const animateFilter = isGtaLogo ? "blur(0px)" : undefined;

            return (
              <motion.img
                key={layer.file}
                src={`${ASSET_BASE_URL}/${layer.file}`}
                alt={layer.name}
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full select-none"
                style={
                  {
                    zIndex: index,
                    transformOrigin: "center",
                    willChange: "transform, opacity, filter, clip-path",
                  } as CSSProperties
                }
                initial={{
                  opacity: 0,
                  scale,
                  filter: initialFilter,
                  ...layer.initial,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  filter: animateFilter,
                  ...layer.animate,
                }}
                transition={{
                  scale: { duration, ease: [0.16, 1, 0.3, 1] },
                  opacity: {
                    duration: 0.7 * timeScale,
                    delay: layer.revealDelay * timeScale,
                    ease: "easeOut",
                  },
                  ...(isGtaLogo ? logoTransition : layer.transition),
                }}
              />
            );
          })}
        </motion.div>
      ) : null}

      {showReplay ? (
        <button
          type="button"
          onClick={() => setPlayKey((key) => key + 1)}
          aria-label="Replay poster intro"
          className="absolute top-4 left-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20 active:scale-[0.98]"
        >
          <ReplayIcon className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

const ReplayIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M19.933 13.041a8 8 0 1 1 -9.925 -8.788c3.899 -1 7.935 1.007 9.425 4.747" />
      <path d="M20 4v5h-5" />
    </svg>
  );
};

export default function GtaViPosterDemo(props: GtaViPosterProps) {
  return <GtaViPoster {...props} />;
}
