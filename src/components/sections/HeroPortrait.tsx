"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { PORTRAIT } from "@/lib/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Stand-in until a real cutout exists. See `PORTRAIT` in lib/content.ts. */
const PLACEHOLDER = "https://picsum.photos/seed/amara-operator/900/1120";

// Client-only and code-split — three/webgpu never lands on the critical path.
const PortraitScene = dynamic(() => import("@/components/three/PortraitScene"), {
  ssr: false,
  loading: () => <PortraitPoster />,
});

/* -------------------------------------------------------------------------- */

/**
 * GPU-free stand-in, and the permanent treatment whenever `portrait.png` is
 * absent. Shown while the scene loads, for reduced-motion users, on small
 * screens, and if the renderer or image fails outright.
 *
 * The arch crop is doing real work: a rectangular photo dropped onto paper
 * reads as a placeholder, whereas an arch is a deliberate editorial device, so
 * the no-asset state looks like a decision rather than a missing file. Once a
 * transparent cutout lands, the scene above supersedes this entirely.
 */
function PortraitPoster() {
  return (
    <div className="absolute inset-0 flex items-end justify-center">
      <div
        className="relative h-[86%] w-[min(78vw,520px)] overflow-hidden"
        style={{ borderRadius: "min(50vw, 260px) min(50vw, 260px) 0 0" }}
      >
        <Image
          src={PLACEHOLDER}
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 78vw, 520px"
          className="object-cover"
        />
        {/* Warms the photo into the paper so it doesn't sit on top of the
            palette as a foreign rectangle of colour. */}
        <div
          className="pointer-events-none absolute inset-0 mix-blend-multiply"
          style={{ background: "rgba(233, 231, 225, 0.28)" }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * A WebGPU init failure or a TSL compile error surfaces as a render throw from
 * inside the Canvas. Without a boundary that takes down the whole page, so the
 * hero degrades to the poster instead.
 */
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* -------------------------------------------------------------------------- */

export function HeroPortrait() {
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const handleError = useCallback(() => setFailed(true), []);

  /* WebGPU on phones is inconsistent and this is an expensive first-viewport
     effect, so small screens get the poster. Gated in JS rather than with a
     `hidden md:block` wrapper: CSS only stops it being *painted* — the canvas
     still mounts, compiles the shader graph and holds a GPU context on exactly
     the devices that can least afford it. Defaults to the poster so SSR and
     first paint never assume a GPU. */
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const poster = reduced || failed || !wide;

  return (
    <div aria-hidden className="absolute inset-0">
      {poster ? (
        <PortraitPoster />
      ) : (
        <SceneBoundary fallback={<PortraitPoster />}>
          <PortraitScene src={PORTRAIT} onError={handleError} />
        </SceneBoundary>
      )}
    </div>
  );
}
