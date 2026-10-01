import { cn } from "@/lib/utils";

/**
 * The HUD's own icons: square caps, mitred joins, one 1.5 stroke weight, drawn
 * on a 20-unit grid so they sit on the mono labels' cap height.
 *
 * Every path has `pathLength={1}`, so the `.hud-ico` rule in globals.css can
 * redraw the strokes whenever a `group` ancestor is hovered or focused — the
 * icon traces itself again, quickly, the way a HUD redraws a reticle when it
 * acquires something. At rest they are simply drawn. Decorative: aria-hidden;
 * the control carries the name.
 */

type IconProps = { className?: string; size?: number };

function Svg({ className, size = 16, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={cn("hud-ico shrink-0", className)}
    >
      {children}
    </svg>
  );
}

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path pathLength={1} d="M3 10h13" />
    <path pathLength={1} d="M11 5l5 5-5 5" />
  </Svg>
);

export const IconArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <path pathLength={1} d="M17 10H4" />
    <path pathLength={1} d="M9 5l-5 5 5 5" />
  </Svg>
);

/** Leaves the site: an arrow out of a corner bracket. */
export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path pathLength={1} d="M8 4H4v12h12v-4" />
    <path pathLength={1} d="M11 4h5v5" />
    <path pathLength={1} d="M16 4l-7 7" />
  </Svg>
);

export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <path pathLength={1} d="M3 5h14v10H3z" />
    <path pathLength={1} d="M3 5l7 6 7-6" />
  </Svg>
);

export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <path pathLength={1} d="M7 7h10v10H7z" />
    <path pathLength={1} d="M13 3H3v10" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path pathLength={1} d="M4 10.5l4 4 8-9" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path pathLength={1} d="M5 5l10 10" />
    <path pathLength={1} d="M15 5L5 15" />
  </Svg>
);

export const IconReplay = (p: IconProps) => (
  <Svg {...p}>
    <path pathLength={1} d="M15.5 10a5.5 5.5 0 1 1-1.6-3.9" />
    <path pathLength={1} d="M14.5 2.5v4h-4" />
  </Svg>
);

export const IconArrowUp = (p: IconProps) => (
  <Svg {...p}>
    <path pathLength={1} d="M10 17V4" />
    <path pathLength={1} d="M5 9l5-5 5 5" />
  </Svg>
);
