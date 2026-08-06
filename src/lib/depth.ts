import * as THREE from "three/webgpu";

/**
 * ============================================================================
 * Runtime depth-map synthesis.
 *
 * The hero's displacement shader needs a grayscale depth map alongside the
 * photo (white = near, black = far). Authoring one per photo means a second
 * asset to keep in sync, so instead we derive a plausible one from the image
 * itself at load time — any photo dropped in just works.
 *
 * Luminance alone is not depth: a white collar would read as nearer than the
 * nose. What makes it hold up is step 3 — a radial falloff that pushes the
 * frame edges back. Portraits are centre-weighted, so that single term buys
 * real subject/background separation regardless of what the subject wears.
 * ============================================================================
 */

const SAMPLE_W = 256;
/** Box-blur passes. Enough to erase skin texture, few enough to keep the face. */
const BLUR_PASSES = 3;
const BLUR_RADIUS = 6;
/** How hard the frame edges are pushed away. 0 = pure luminance, 1 = full vignette. */
const RADIAL_WEIGHT = 0.55;

/** Separable box blur over a single-channel float buffer, in place. */
function blur(buf: Float32Array, w: number, h: number, radius: number) {
  const tmp = new Float32Array(buf.length);

  // Horizontal
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k++) {
        const sx = x + k;
        if (sx < 0 || sx >= w) continue;
        sum += buf[row + sx];
        count++;
      }
      tmp[row + x] = sum / count;
    }
  }

  // Vertical
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k++) {
        const sy = y + k;
        if (sy < 0 || sy >= h) continue;
        sum += tmp[sy * w + x];
        count++;
      }
      buf[y * w + x] = sum / count;
    }
  }
}

/** A featureless mid-grey map: the scan still sweeps, there's just no parallax. */
function flatDepth(): THREE.DataTexture {
  const data = new Uint8Array([128]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RedFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Build a depth texture from a loaded image.
 *
 * Never throws: a cross-origin host that omits CORS headers taints the canvas
 * and makes `getImageData` raise `SecurityError`. That degrades to a flat map
 * rather than taking the whole hero down.
 */
export function buildDepthTexture(img: HTMLImageElement): THREE.DataTexture {
  const w = SAMPLE_W;
  const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return flatDepth();

  ctx.drawImage(img, 0, 0, w, h);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, w, h).data;
  } catch {
    // Tainted canvas — the image host sent no Access-Control-Allow-Origin.
    return flatDepth();
  }

  // 1. Luminance
  const depth = new Float32Array(w * h);
  for (let i = 0; i < depth.length; i++) {
    const p = i * 4;
    depth[i] =
      (0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2]) / 255;
  }

  // 2. Blur away surface detail so depth reads as form, not texture
  for (let i = 0; i < BLUR_PASSES; i++) blur(depth, w, h, BLUR_RADIUS);

  // 3. Radial falloff — the term that actually creates subject separation
  const cx = w / 2;
  const cy = h / 2;
  const maxDist = Math.hypot(cx, cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy) / maxDist;
      // smoothstep(1 -> 0) across the frame, biased to hold the centre flat
      const falloff = 1 - d * d;
      const i = y * w + x;
      depth[i] = depth[i] * (1 - RADIAL_WEIGHT) + depth[i] * falloff * RADIAL_WEIGHT;
    }
  }

  // 4. Normalise to full range so the scan sweep always crosses the subject
  let min = Infinity;
  let max = -Infinity;
  for (const v of depth) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;

  const out = new Uint8Array(w * h);
  for (let i = 0; i < depth.length; i++) {
    out[i] = Math.round(((depth[i] - min) / span) * 255);
  }

  const tex = new THREE.DataTexture(out, w, h, THREE.RedFormat);
  // Depth is data, not colour — an sRGB transfer here would skew every
  // displacement sample toward the dark end.
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
