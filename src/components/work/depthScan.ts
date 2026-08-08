import * as THREE from "three";

/**
 * The depth scan — `hero.txt`'s effect, ported to the work cards.
 *
 * A narrow band sweeps through the image's depth (not down its screen space),
 * and everywhere the band lands it lights a dot-matrix grid: the picture appears
 * to be resolved by a scanner passing through it. The pointer also parallaxes
 * the colour sample against the depth, so the card has a little volume.
 *
 * Two deviations from the reference, both deliberate:
 *
 *  1. **GLSL, not TSL/WebGPU.** The reference is `three/webgpu` only. This site
 *     already runs a WebGL renderer for the work world and a second raw-WebGL
 *     context for the backdrop; adding a WebGPU renderer would mean a third
 *     graphics backend on one page, and would render nothing at all in Firefox.
 *     The maths is small enough that the WebGL port is the same picture rather
 *     than a reduced one.
 *
 *  2. **Depth is derived, not supplied.** The reference needs an authored depth
 *     map alongside every image. These cards are generated at runtime from
 *     project data, so depth comes from the map's own luminance — crude as a
 *     depth map, but a scan band only needs a field to sweep through, and it
 *     tracks the card's composition correctly.
 *
 * The reference also has two bugs which are not reproduced here. Its
 * `PostProcessing` pass snapshots `uScanProgress.value` when the node graph is
 * built, and the graph is memoised — so the scan overlay is baked to zero and
 * never moves. And its fade-in lerps opacity with no epsilon, so it asymptotes
 * and never actually reaches 1.
 */

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uMap;
uniform float uProgress;   /* scan position through the depth, 0-1 */
uniform float uHover;      /* 0-1, eases with the hover state */
uniform vec2  uPointer;    /* -1..1 */
uniform vec3  uTint;

/* Cheap cell noise: hash the cell, keep the brightest of nine neighbours.
   Stands in for the reference's mx_cell_noise_float, which is a TSL builtin
   with no WebGL equivalent. */
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float cellNoise(vec2 p) {
  vec2 i = floor(p);
  float best = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      best = max(best, hash(i + vec2(float(x), float(y))));
    }
  }
  return best;
}

void main() {
  /* Pointer parallax: offset the colour sample by the local depth, so nearer
     parts of the card shift further. This is the reference's tDepthMap.r
     multiplied into the uv, at the same strength. */
  vec4 base = texture2D(uMap, vUv);
  float depth = dot(base.rgb, vec3(0.299, 0.587, 0.114));

  vec2 parallax = uPointer * depth * 0.012 * uHover;
  vec4 map = texture2D(uMap, vUv + parallax);
  float d = dot(map.rgb, vec3(0.299, 0.587, 0.114));

  /* The dot grid. Tiled far finer than the card so individual dots stay
     sub-pixel-ish at rest and only resolve where the band lights them. */
  vec2 tiled = vUv * vec2(150.0, 94.0);
  vec2 cell = fract(tiled) * 2.0 - 1.0;
  float dot_ = smoothstep(0.55, 0.45, length(cell)) * cellNoise(tiled);

  /* The band. Narrow, and travelling through *depth* rather than down the
     card — which is the whole idea, and why it follows the composition. */
  float band = 1.0 - smoothstep(0.0, 0.045, abs(d - uProgress));

  vec3 scan = uTint * dot_ * band * 2.6 * uHover;

  /* Screen blend, so the scan only ever adds light and can never darken the
     screenshot underneath it. */
  vec3 col = 1.0 - (1.0 - map.rgb) * (1.0 - scan);

  gl_FragColor = vec4(col, map.a);
}
`;

export interface DepthScanUniforms {
  uMap: { value: THREE.Texture | null };
  uProgress: { value: number };
  uHover: { value: number };
  uPointer: { value: THREE.Vector2 };
  uTint: { value: THREE.Color };
}

/**
 * One material per card — `uniforms` is per-instance state, so a shared
 * material would make every card scan in lockstep with the last one hovered.
 */
export function createDepthScanMaterial(
  map: THREE.Texture,
  tint: THREE.Color
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    toneMapped: false,
    uniforms: {
      uMap: { value: map },
      uProgress: { value: 0 },
      uHover: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
      uTint: { value: tint },
    } satisfies DepthScanUniforms,
  });
}
