"use client";

/* eslint-disable react-hooks/refs --
 * TSL uniforms are GPU handles, not React values. They are long-lived state
 * that outlives any one image and gets mutated every frame by useFrame, which
 * is r3f's whole programming model. Holding them in a ref trips `refs`, but
 * mutating a uniform's `.value` cannot affect React's output, so the rule is
 * not protecting anything here. Scoped to this file only.
 */

import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three/webgpu";
import { float, texture, uniform, uv } from "three/tsl";
import { buildDepthTexture } from "@/lib/depth";

/* -------------------------------------------------------------------------- */
/*  Depth-parallax portrait.                                                   */
/*                                                                            */
/*  Pointer movement displaces the image by its own depth, so the face swims   */
/*  very slightly against its own background and the cutout stops reading as   */
/*  a flat sticker on the paper. That displacement is the whole effect now.    */
/*                                                                            */
/*  This scene used to be the hero itself: a magenta cell-noise dot grid with  */
/*  a scan sweep and a bloom pipeline. All of that was a dark-act effect —      */
/*  glow does not read on bone paper — so it is gone, along with the           */
/*  RenderPipeline pass it needed. What survives is the part that was always   */
/*  the good idea, and `lib/depth.ts` still derives the map from any photo at  */
/*  load time, so dropping in a new portrait needs no second asset.            */
/*                                                                            */
/*  Runs on WebGPU where available and falls back to three's WebGL2 backend    */
/*  otherwise — the TSL graph below compiles to either.                        */
/* -------------------------------------------------------------------------- */

// Registers three/webgpu's classes (incl. the node materials) with R3F's
// JSX catalogue. Must happen once, at module scope. The namespace is wider
// than R3F's Catalogue type allows, hence the cast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
extend(THREE as any);

/** Portion of viewport height the portrait occupies. */
const COVER = 0.92;
/**
 * Peak UV displacement. Deliberately tiny: past ~0.02 the parallax stops
 * reading as depth and starts reading as the image wobbling.
 */
const SHIFT = 0.014;

/* -------------------------------------------------------------------------- */

interface Maps {
  raw: THREE.Texture;
  depth: THREE.DataTexture;
  aspect: number;
}

// Inferred from the factory rather than declared: TSL's node types are
// generic in their payload, and writing `ReturnType<typeof uniform>` by hand
// widens them to `unknown`, which breaks every downstream `.mul`/`.sub`.
function createUniforms() {
  return { uPointer: uniform(new THREE.Vector2(0)) };
}
type Uniforms = ReturnType<typeof createUniforms>;

function Portrait({ src, onError }: { src: string; onError: () => void }) {
  const [maps, setMaps] = useState<Maps | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const pointer = useRef(new THREE.Vector2(0, 0));
  const { viewport } = useThree();

  // Uniforms are long-lived, per-frame-mutable GPU state — they outlive any
  // one image and must not live inside a useMemo, or the React Compiler
  // (correctly) flags every frame update as mutating a memoized value.
  const uniformsRef = useRef<Uniforms | null>(null);
  uniformsRef.current ??= createUniforms();

  useEffect(() => {
    let cancelled = false;
    const img = new window.Image();
    // Required to read pixels back out for the depth pass.
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      const raw = new THREE.Texture(img);
      raw.colorSpace = THREE.SRGBColorSpace;
      raw.needsUpdate = true;
      setMaps({
        raw,
        depth: buildDepthTexture(img),
        aspect: img.naturalWidth / img.naturalHeight,
      });
    };
    img.onerror = onError;
    img.src = src;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onError]);

  const material = useMemo(() => {
    if (!maps) return null;
    const { uPointer } = uniformsRef.current!;

    // Displace the colour lookup by depth — near pixels travel further.
    // `.r` explicitly: the depth texture is single-channel, so sampling the
    // whole vec4 would drag g/b (always 0) into the term.
    const tDepth = texture(maps.depth);
    const offset = tDepth.r.mul(uPointer).mul(float(SHIFT));
    const tMap = texture(maps.raw, uv().add(offset));

    return new THREE.MeshBasicNodeMaterial({
      colorNode: tMap,
      // Carries the cutout's alpha channel through, which is what lets the
      // wordmark behind the portrait show between the shoulders.
      opacityNode: tMap.a,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
  }, [maps]);

  useEffect(() => {
    if (!material || !maps) return;
    return () => {
      material.dispose();
      maps.raw.dispose();
      maps.depth.dispose();
    };
  }, [material, maps]);

  useFrame(({ pointer: p }, delta) => {
    const u = uniformsRef.current;
    if (!u) return;

    // Ease the pointer so the parallax glides instead of snapping. The
    // frame-rate-independent form: 0.001 is the fraction still remaining
    // after a full second, so the feel holds at 30fps and at 144.
    pointer.current.lerp(p, 1 - Math.pow(0.001, delta));
    u.uPointer.value = pointer.current;

    // Fade in once the depth bake has landed.
    const mat = meshRef.current?.material as THREE.Material | undefined;
    if (mat) mat.opacity = THREE.MathUtils.lerp(mat.opacity, 1, 0.06);
  });

  const scale = useMemo<[number, number, number]>(() => {
    if (!maps) return [1, 1, 1];
    const h = viewport.height * COVER;
    return [h * maps.aspect, h, 1];
  }, [maps, viewport.height]);

  if (!material) return null;

  return (
    <mesh ref={meshRef} scale={scale} material={material}>
      <planeGeometry />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */

export default function PortraitScene({
  src,
  onError,
}: {
  src: string;
  onError: () => void;
}) {
  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={async (props) => {
        const renderer = new THREE.WebGPURenderer({
          ...(props as ConstructorParameters<typeof THREE.WebGPURenderer>[0]),
          // Transparent clear: the paper (and the wordmark on it) has to show
          // through everywhere the cutout's alpha is zero.
          alpha: true,
          antialias: true,
          // Choose the WebGL2 backend deliberately when WebGPU is absent,
          // rather than letting init() discover it the hard way. ("gpu" in
          // navigator rather than navigator.gpu — TS's DOM lib has no WebGPU.)
          forceWebGL: typeof navigator !== "undefined" && !("gpu" in navigator),
        });
        await renderer.init();
        return renderer;
      }}
    >
      <Portrait src={src} onError={onError} />
    </Canvas>
  );
}
