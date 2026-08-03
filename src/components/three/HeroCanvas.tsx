"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// WebGL scene is client-only and code-split so it never blocks first paint.
const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => <ArtifactPoster />,
});

/**
 * Static, GPU-free stand-in for the WebGL artifact. Shown while the scene
 * loads and as the permanent visual for reduced-motion users.
 */
function ArtifactPoster() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative h-[min(70vw,520px)] w-[min(70vw,520px)]">
        <div className="holo-grid absolute inset-0 rounded-full opacity-20" />
        <div
          className="absolute inset-[12%] rounded-full border border-cyan/30"
          style={{ boxShadow: "0 0 80px rgba(0,229,255,0.25), inset 0 0 60px rgba(139,92,246,0.2)" }}
        />
        <div className="absolute inset-[28%] rounded-full border border-purple/40" />
        <div
          className="absolute inset-[40%] rounded-full bg-cyan/10"
          style={{ boxShadow: "0 0 60px rgba(0,229,255,0.35)" }}
        />
      </div>
    </div>
  );
}

export function HeroCanvas() {
  const reduced = useReducedMotion();

  return (
    <div className="absolute inset-0" aria-hidden>
      {reduced ? <ArtifactPoster /> : <HeroScene />}
    </div>
  );
}
