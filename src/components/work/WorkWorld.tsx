"use client";

/* eslint-disable react-hooks/immutability --
 * `useFrame` mutating the camera and the group transforms it was handed is not
 * an escape hatch here, it *is* the r3f render loop: these are scene-graph
 * objects read by the renderer each frame, not React values, and writing them
 * cannot affect React's output. Driving them through state instead would mean
 * re-rendering the tree at 60fps to move a camera. Scoped to this file only.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { projects, type Project } from "@/lib/content";
import { accentColor } from "@/lib/content";
import { buildCardTexture } from "@/components/work/cardTexture";
import { createDepthScanMaterial } from "./depthScan";
import { RUNOUT, SPACING, START_Z, travelFor } from "./worldLayout";
import { srand } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  The work world.                                                           */
/*                                                                            */
/*  Projects float as planes in dark space and the camera dollies past them as */
/*  you scroll. The subject is the work itself — that distinction matters here:*/
/*  an abstract sculpture in this slot is decoration, whereas this is the      */
/*  browsing surface for the actual portfolio, and every frame is showing      */
/*  something the visitor came to see.                                        */
/*                                                                            */
/*  Deliberately plain WebGL (no post-processing chain): bloom on a dark scene */
/*  full of bright screenshots washes the screenshots out, which defeats the   */
/*  point of putting real work in the frame.                                   */
/* -------------------------------------------------------------------------- */

/* SPACING, RUNOUT and START_Z now live in `worldLayout.ts`. They are imported
   above rather than declared here because `SelectedWork` has to derive scroll
   positions from the same geometry, and this module cannot be imported from a
   server component — it is the one that pulls in three.js. */

/** Lateral spread. Cards alternate sides so the camera weaves between them. */
const SWING = 3.4;

export interface CardHit {
  project: Project;
  rect: DOMRect;
}

/** Reused across frames — allocating a Vector3 per card per frame is garbage. */
const scratch = new THREE.Vector3();

interface WorkWorldProps {
  /** Scroll progress through the pinned section, 0–1. */
  progress: React.RefObject<number>;
  /**
   * Index of the card the keyboard roster currently has focus on, or `-1`.
   *
   * A ref, not a prop value, for the same reason `progress` is one: it is read
   * inside `useFrame` and must not re-render the tree. Without it, tabbing the
   * roster dollies the camera to a card that lights up no differently from its
   * neighbours — the movement happens and nothing says which card it was for,
   * which reads as the control being broken.
   */
  activeIndex: React.RefObject<number>;
  onSelect: (hit: CardHit) => void;
  onHover: (project: Project | null) => void;
}

/* -------------------------------------------------------------------------- */

function layout(i: number) {
  const side = i % 2 === 0 ? -1 : 1;
  return new THREE.Vector3(
    side * SWING * (0.6 + srand(i * 3) * 0.5),
    (srand(i * 7) - 0.5) * 2.4,
    -i * SPACING
  );
}

function Card({
  project,
  index,
  activeIndex,
  onSelect,
  onHover,
}: {
  project: Project;
  index: number;
  activeIndex: React.RefObject<number>;
  onSelect: (hit: CardHit) => void;
  onHover: (project: Project | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const rim = useRef<THREE.MeshBasicMaterial>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const [hovered, setHovered] = useState(false);
  const { gl, camera, size } = useThree();

  const position = useMemo(() => layout(index), [index]);
  const tint = useMemo(
    () => new THREE.Color(accentColor[project.accent]),
    [project.accent]
  );

  useEffect(() => {
    let cancelled = false;
    buildCardTexture(project).then((t) => {
      if (cancelled) t.dispose();
      else setTexture(t);
    });
    return () => {
      cancelled = true;
    };
  }, [project]);

  useEffect(() => {
    return () => texture?.dispose();
  }, [texture]);

  useEffect(() => {
    gl.domElement.style.cursor = hovered ? "pointer" : "";
  }, [hovered, gl]);

  /* One material per card: the scan's progress and hover level are per-instance
     uniforms, so a shared material would make every card in the world scan in
     lockstep with whichever one was hovered last. */
  const material = useMemo(
    () => (texture ? createDepthScanMaterial(texture, tint) : null),
    [texture, tint]
  );
  useEffect(() => () => material?.dispose(), [material]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    const t = state.clock.getElapsedTime();
    /* Pointer hover and keyboard focus are the same state as far as the card is
       concerned. Read from the ref rather than from React so a Tab through the
       roster costs no renders — this runs every frame. */
    const lit = hovered || activeIndex.current === index;

    // Slow independent drift, so the field never looks like a fixed diorama.
    g.position.y = position.y + Math.sin(t * 0.35 + index) * 0.16;

    // Turn slightly toward the camera — enough to catch it, not so much that
    // the cards become a billboard wall and the depth reads flat.
    const toCamera = Math.atan2(
      camera.position.x - g.position.x,
      camera.position.z - g.position.z
    );
    const targetY = toCamera * 0.45 + Math.sin(t * 0.25 + index) * 0.05;
    const targetScale = lit ? 1.06 : 1;

    const k = 1 - Math.pow(0.0015, delta);
    g.rotation.y += (targetY - g.rotation.y) * k;
    g.scale.lerp(scratch.setScalar(targetScale), k);

    /* The rim plate eases here rather than switching in render. It used to be
       `opacity={hovered ? …}`, which cannot see the focus ref at all — and
       eased, it now matches the scale and the scan instead of snapping ahead
       of them. */
    if (rim.current) {
      rim.current.opacity += ((lit ? 0.42 : 0.16) - rim.current.opacity) * k;
    }

    /* Drive the depth scan. The band runs on a sine so it sweeps in and back
       out through the card's depth rather than snapping from far to near, and
       `uHover` eases on the same curve as everything else here so the scan
       fades up rather than switching on. */
    if (material) {
      const u = material.uniforms;
      u.uProgress.value = Math.sin(t * 0.5 + index) * 0.5 + 0.5;
      u.uHover.value += ((lit ? 1 : 0) - u.uHover.value) * k;
      u.uPointer.value.set(state.pointer.x, state.pointer.y);
    }
  });

  if (!texture || !material) return null;

  return (
    <group ref={group} position={position}>
      {/* Rim plate: a marginally larger accent plane behind the card. Cheaper
          than a glow pass and it survives on integrated GPUs.

          Kept to a few percent oversize and low opacity on purpose — additive
          blending on a plane much bigger than the card stops reading as a rim
          and turns into a colour wash over the whole frame. */}
      <mesh position={[0, 0, -0.02]} scale={[6.62, 4.14, 1]}>
        <planeGeometry />
        <meshBasicMaterial
          ref={rim}
          color={tint}
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh
        scale={[6.4, 4, 1]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(project);
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          // Project the card's centre back to screen space so the dossier can
          // expand out of exactly where the card appears to be. The overlay
          // animates a DOMRect, so the 3D world hands it one and the two
          // systems need to know nothing else about each other.
          const world = new THREE.Vector3();
          group.current?.getWorldPosition(world);
          const projected = world.clone().project(camera);
          const w = size.width * 0.34;
          const h = w * 0.625;
          const cx = ((projected.x + 1) / 2) * size.width;
          const cy = ((1 - projected.y) / 2) * size.height;
          onSelect({
            project,
            rect: new DOMRect(cx - w / 2, cy - h / 2, w, h),
          });
        }}
      >
        <planeGeometry />
        {/* The depth scan replaces a plain textured plane. See work/depthScan.ts
            — this is the one place on the site the real screenshots are shown
            large, so it is where the treatment earns its cost. */}
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Sparse point field. Purely a depth cue — without something static between the
 * cards there is no parallax reference and the dolly reads as the cards moving
 * rather than the camera travelling.
 */
function Dust({ count = 420 }: { count?: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const depth = projects.length * SPACING + RUNOUT * 2;
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (srand(i * 11) - 0.5) * 34;
      arr[i * 3 + 1] = (srand(i * 13) - 0.5) * 20;
      arr[i * 3 + 2] = -srand(i * 17) * depth;
    }
    return arr;
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#eceefb"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */

function Rig({ progress }: { progress: React.RefObject<number> }) {
  const { camera } = useThree();
  // Ends the same distance in front of the last card as it started from the
  // first, so the closing frame is composed rather than jammed against a plane.
  // `cardProgress` inverts this exact relation — keep them in one place.
  const travel = travelFor(projects.length);
  const current = useRef(0);

  useFrame((state, delta) => {
    // Ease toward the scroll target rather than tracking it exactly: Lenis is
    // already smoothing the scroll, and a second, slower spring here is what
    // makes the camera feel like it has mass.
    const target = (progress.current ?? 0) * travel;
    current.current += (target - current.current) * (1 - Math.pow(0.002, delta));
    camera.position.z = START_Z - current.current;

    // A touch of drift from the pointer, so the world responds when the page
    // is not scrolling at all.
    const { x, y } = state.pointer;
    camera.position.x += (x * 1.1 - camera.position.x) * 0.04;
    camera.position.y += (y * 0.6 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, camera.position.z - 8);
  });

  return null;
}

/* -------------------------------------------------------------------------- */

export default function WorkWorld({
  progress,
  activeIndex,
  onSelect,
  onHover,
}: WorkWorldProps) {
  return (
    <Canvas
      /* Out of the accessibility tree entirely. Every card in here is a
         three.js `<mesh>` — no DOM node, no name, no tab stop — so the scene
         could only ever have been an unlabelled interactive black hole. The
         case-file roster in `SelectedWork` is its accessible representation;
         this is the picture.

         Note where these land: r3f spreads unrecognised props onto its own
         wrapper `<div>`, not onto the `<canvas>` inside it. That is the right
         element anyway — `aria-hidden` on the wrapper hides the whole subtree,
         and a bare `<canvas>` is not in the tab order to begin with. */
      aria-hidden
      tabIndex={-1}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6], fov: 42, near: 0.1, far: 120 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor("#05060d");
        scene.fog = new THREE.Fog("#05060d", 18, 46);
      }}
    >
      <Rig progress={progress} />
      <Dust />
      {projects.map((project, i) => (
        <Card
          key={project.slug}
          project={project}
          index={i}
          activeIndex={activeIndex}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </Canvas>
  );
}
