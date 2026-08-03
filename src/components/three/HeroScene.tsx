"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
import { Icosahedron, Torus, MeshDistortMaterial } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

/* -------------------------------------------------------------------------- */
/*  The artifact: a distorting inner core, a counter-rotating wireframe shell, */
/*  orbiting rings and a drifting particle field.                             */
/* -------------------------------------------------------------------------- */

function Core() {
  const group = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    // Gentle pointer-follow parallax
    if (group.current) {
      const px = state.pointer.x * 0.4;
      const py = state.pointer.y * 0.4;
      group.current.rotation.y += (px - group.current.rotation.y) * 0.04;
      group.current.rotation.x += (-py - group.current.rotation.x) * 0.04;
      group.current.position.y = Math.sin(t * 0.6) * 0.08;
    }
    if (shell.current) shell.current.rotation.z += delta * 0.12;
    if (ringA.current) {
      ringA.current.rotation.x += delta * 0.4;
      ringA.current.rotation.y += delta * 0.2;
    }
    if (ringB.current) {
      ringB.current.rotation.y -= delta * 0.3;
      ringB.current.rotation.z += delta * 0.15;
    }
  });

  return (
    <group ref={group}>
      {/* Inner distorting core */}
      <Icosahedron args={[1, 4]}>
        <MeshDistortMaterial
          color="#04141a"
          emissive="#00e5ff"
          emissiveIntensity={0.6}
          roughness={0.15}
          metalness={0.9}
          distort={0.32}
          speed={1.6}
        />
      </Icosahedron>

      {/* Counter-rotating wireframe shell */}
      <Icosahedron ref={shell} args={[1.7, 1]}>
        <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.35} />
      </Icosahedron>

      {/* Orbiting rings */}
      <Torus ref={ringA} args={[2.4, 0.008, 16, 120]}>
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.5} />
      </Torus>
      <Torus ref={ringB} args={[2.9, 0.006, 16, 120]}>
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.4} />
      </Torus>
    </group>
  );
}

// Deterministic pseudo-random (pure) — avoids Math.random() during render.
function srand(n: number) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function ParticleField({ count = 900 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distribute deterministically in a spherical shell
      const r = 3 + srand(i * 3) * 6;
      const theta = srand(i * 3 + 1) * Math.PI * 2;
      const phi = Math.acos(2 * srand(i * 3 + 2) - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.03;
      ref.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#00e5ff"
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function Lights(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 3, 5]} intensity={40} color="#00e5ff" />
      <pointLight position={[-5, -2, 2]} intensity={30} color="#8b5cf6" />
      <pointLight position={[0, 0, 3]} intensity={12} color="#ffffff" />
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
    >
      <Lights />
      <Core />
      <ParticleField />

      <EffectComposer>
        <Bloom
          intensity={1.15}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <ChromaticAberration
          offset={new THREE.Vector2(0.0006, 0.0009)}
          blendFunction={BlendFunction.NORMAL}
          radialModulation={false}
          modulationOffset={0}
        />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.16} />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}
