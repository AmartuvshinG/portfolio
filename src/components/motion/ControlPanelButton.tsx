"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { MagneticButton } from "./MagneticButton";
import { useSmoothScroll } from "@/components/layout/SmoothScroll";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost";

interface ControlPanelButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  icon?: ReactNode;
  magnetic?: boolean;
  ariaLabel?: string;
}

const base =
  "group relative inline-flex items-center gap-3 chamfer-sm px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] transition-colors duration-300 select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-cyan text-bg hover:bg-cyan/90 [--scan:rgba(255,255,255,0.35)]",
  outline:
    "border border-line-strong text-fg hover:text-cyan [--scan:rgba(0,229,255,0.18)]",
  ghost: "text-muted hover:text-fg [--scan:rgba(0,229,255,0.12)]",
};

/**
 * Futuristic "control panel" CTA: chamfered, bracketed, with a diagonal scan
 * sweep on hover and a magnetic pull. Renders as an in-page smooth-scroll
 * anchor, a Next route link, an external link, or a button depending on props.
 */
export function ControlPanelButton({
  children,
  href,
  onClick,
  variant = "primary",
  className,
  icon,
  magnetic = true,
  ariaLabel,
}: ControlPanelButtonProps) {
  const { scrollTo } = useSmoothScroll();
  const classes = cn(base, variants[variant], className);

  const inner = (
    <>
      {/* diagonal scan sweep */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(115deg,transparent,var(--scan),transparent)] transition-transform duration-500 ease-out group-hover:translate-x-full"
      />
      <span aria-hidden className="relative text-current opacity-60">
        [
      </span>
      <span className="relative flex items-center gap-2">
        {children}
        {icon}
      </span>
      <span aria-hidden className="relative text-current opacity-60">
        ]
      </span>
    </>
  );

  let node: ReactNode;

  if (href?.startsWith("#")) {
    node = (
      <a
        href={href}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.preventDefault();
          scrollTo(href);
          onClick?.();
        }}
        className={classes}
      >
        {inner}
      </a>
    );
  } else if (href?.startsWith("http")) {
    node = (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        onClick={onClick}
        className={classes}
      >
        {inner}
      </a>
    );
  } else if (href) {
    node = (
      <Link href={href} aria-label={ariaLabel} onClick={onClick} className={classes}>
        {inner}
      </Link>
    );
  } else {
    node = (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={classes}>
        {inner}
      </button>
    );
  }

  return magnetic ? <MagneticButton strength={0.25}>{node}</MagneticButton> : node;
}
