"use client";

import { forwardRef, type ReactNode } from "react";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { IconArrowLeft, IconArrowRight, IconExternal } from "@/components/ui/HudIcons";
import { useScramble } from "@/hooks/useScramble";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The site's one button.
 *
 * Every call-to-action used to be styled inline at its call site — a gradient
 * chamfer here, a glass pill there, a bordered square somewhere else — and
 * they only ever scaled 3% on hover. Now there is one control in three cuts:
 *
 *   primary    the spectrum ramp, dark label (bone on magenta is ~3:1)
 *   secondary  a hairline frame with HUD corners
 *   icon       a 44px square, for prev / next / close
 *
 * and one behaviour, engineered rather than decorative:
 *
 *   hover      a light curtain crosses the control from the left with a hot
 *              leading edge (transform only); the label decodes through its
 *              own script; the arrow slides on and leaves a ghost behind; the
 *              icon strokes redraw; the whole control leans toward the cursor
 *   press      a 0.97 "thunk" and a flash, 150 ms
 *   focus      the site's unlayered focus ring, untouched
 *
 * `href` renders a link (with `external`, a new tab and the sr-only notice);
 * otherwise a button. Label text must be a plain string so it can decode;
 * `icon` adds a leading glyph.
 */
type Common = {
  variant?: "primary" | "secondary" | "icon";
  /** The visible label (and the accessible name, unless `aria-label`). */
  label?: string;
  /** Leading glyph. */
  icon?: ReactNode;
  /** Trailing arrow: "right" (default for primary), "left", "external", or none. */
  arrow?: "right" | "left" | "external" | null;
  className?: string;
  "aria-label"?: string;
  /** Off for controls inside a moving layout (a pinned track), where the lean
   *  would fight the layout's own transform. */
  magnetic?: boolean;
};
type AsLink = Common & { href: string; external?: boolean; onClick?: () => void };
type AsButton = Common & {
  href?: undefined;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
};

export const Cta = forwardRef<HTMLAnchorElement | HTMLButtonElement, AsLink | AsButton>(function Cta(props, ref) {
  const { t } = useI18n();
  const { variant = "primary", label, icon, className, magnetic = true } = props;
  const arrow = props.arrow === undefined ? (props.href && "external" in props && props.external ? "external" : variant === "primary" ? "right" : null) : props.arrow;
  const { ref: labelRef, run } = useScramble(label ?? "");

  const Arrow = arrow === "left" ? IconArrowLeft : arrow === "external" ? IconExternal : arrow === "right" ? IconArrowRight : null;

  const body = (
    <>
      {/* The light curtain: a wash with a hot leading edge, parked off the
          left side, sliding across on hover. */}
      <span aria-hidden className="cta-curtain" />
      {icon}
      {label && (
        <>
          <span className="sr-only">{label}</span>
          <span ref={labelRef} aria-hidden className="relative inline-block whitespace-nowrap">
            {label}
          </span>
        </>
      )}
      {Arrow && (
        <span aria-hidden className="cta-arrow relative inline-flex">
          <Arrow className="cta-arrow-ghost absolute inset-0" size={15} />
          <Arrow className="cta-arrow-lead relative" size={15} />
        </span>
      )}
      {"external" in props && props.external && <span className="sr-only">{t.common.newTab}</span>}
    </>
  );

  const cls = cn("cta group", `cta-${variant}`, className);
  const onEnter = () => label && run();

  const control =
    props.href !== undefined ? (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={props.href}
        className={cls}
        onMouseEnter={onEnter}
        onFocus={onEnter}
        onClick={props.onClick}
        aria-label={props["aria-label"]}
        {...(props.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {body}
      </a>
    ) : (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={props.type ?? "button"}
        className={cls}
        onMouseEnter={onEnter}
        onFocus={onEnter}
        onClick={props.onClick}
        disabled={props.disabled}
        aria-label={props["aria-label"]}
      >
        {body}
      </button>
    );

  return magnetic ? <MagneticButton strength={variant === "icon" ? 0.25 : 0.14}>{control}</MagneticButton> : control;
});
