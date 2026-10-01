/**
 * The Studio: the intro's brush, handed to the visitor.
 *
 * The intro writes from a bake — a texture whose red channel is the signed
 * distance to the stroke's edge (128 = the edge). The Studio builds the same
 * kind of texture live, as you draw, and draws it in the same room with the
 * same paper (the room's GLSL is shared with lib/inkShader).
 *
 * **How a stroke becomes a distance field.** Every dab of the brush is
 * stamped into the ink texture as a little cone: 0.5 at its rim, rising
 * inside, falling outside, clamped ±`spread`. Stamped with MAX blending, the
 * union of the cones is the distance field of the union of the dabs — so a
 * stroke made of hundreds of dabs has one clean edge, and the paper shader can
 * feather, bleed and light it exactly as it does the baked name.
 *
 * **What the brush does** (the same rules the bake's brush follows):
 *   nib      width follows the direction of travel: a flat brush held at
 *            −38°, thickest across it, thinnest along it
 *   speed    fast strokes thin out; a pen's pressure overrides that
 *   landing  where the brush lands it presses, and the ink pools (blue
 *            channel), darker, and stays wet longer
 *   dry      the bristles run dry along a stroke: streaks open up in the
 *            direction of travel, more at the edges and on fast strokes.
 *            The streak pattern is fixed per stroke in the brush's own
 *            across-axis, so consecutive dabs line their gaps up into streaks
 *   lift     a quick flick off the paper leaves a tapering tail
 *   wet      fresh ink is glossy (green channel) and dries matte over
 *            ~2.4 s — a subtractive pass, only while anything is wet
 *
 * **Let the brush write** streams the intro's own bake into the same texture,
 * revealing it by its arrival channel over 4.5 s: the name, written by the
 * intro's hand, on your paper.
 *
 * **Cost.** Nothing runs while the paper is still. A frame is drawn when the
 * brush moves, while ink is drying, while the scroll unrolls, or while the
 * brush writes; then the loop stops (see `busy`).
 */

import { INK_GLSL_LIB } from "@/lib/inkShader";
import { INK_NAME } from "@/lib/inkName";

/** Seconds for fresh ink to dry matte. */
const DRY_SECS = 2.4;
/** The flat nib's angle. */
const NIB = (-38 * Math.PI) / 180;
/** The distance field's reach either side of an edge, CSS px. */
const SPREAD_CSS = 8;
/** Hard ceiling on the room's drawing buffer; CSS upscales the rest. */
const MAX_PIXELS = 1_000_000;
/** The ink texture's long side, at most. */
const INK_MAX = 1600;
/** The writing replays at the intro's pace. */
export const WRITE_SECS = 4.5;
const UNROLL_SECS = 0.85;

type Box = { x: number; y: number; w: number; h: number };

export interface StudioLayout {
  /** The paper (the drawing surface): CSS px within the canvas. */
  paper: Box;
  /** The silk mount either side of it. */
  mount: { x0: number; x1: number };
  rollerY: number;
  rollerFrom: number;
  rollerR: number;
  /** Where the name sits when traced or written. */
  name: Box;
  /** The seal's size, CSS px. */
  seal: number;
}

/**
 * A hanging scroll in a box: the paper hangs from above the frame (as in the
 * intro) and ends at a roller near the bottom. Narrow enough to read as a
 * scroll, wide enough to write on.
 */
export function studioLayout(cw: number, ch: number): StudioLayout {
  const h = ch * 0.84;
  const w = Math.min(h * 0.7, cw * 0.74);
  const x = (cw - w) / 2;
  const y = -10;
  const rollerR = Math.max(5, w * 0.035);
  const nameH = (h + y) * 0.84;
  const nameW = (nameH * INK_NAME.width) / INK_NAME.height;
  return {
    paper: { x, y, w, h: h - y },
    mount: { x0: x - w * 0.11, x1: x + w * 1.11 },
    rollerY: h + 14 + rollerR,
    rollerFrom: rollerR + 2,
    rollerR,
    name: { x: cw / 2 - nameW / 2, y: (h - nameH) / 2, w: nameW, h: nameH },
    seal: Math.max(28, w * 0.15),
  };
}

/* ---- shaders -------------------------------------------------------------- */

const PRECISION = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

const QUAD_VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

/** One dab of the brush: a cone of distance, in the ink texture's px (y down). */
const DAB_VERT = `
attribute vec2 aCorner;
attribute vec2 aCenter;
attribute float aR;
attribute vec2 aDir;
attribute float aDry;
attribute float aPool;
attribute float aSeed;
uniform vec2 uSize;
uniform float uSpread;
varying vec2 vLocal;
varying float vR;
varying vec2 vDir;
varying float vDry;
varying float vPool;
varying float vSeed;
void main() {
  float ext = aR + uSpread + 1.0;
  vLocal = aCorner * ext;
  vec2 p = aCenter + vLocal;
  vR = aR;
  vDir = aDir;
  vDry = aDry;
  vPool = aPool;
  vSeed = aSeed;
  gl_Position = vec4(p.x / uSize.x * 2.0 - 1.0, 1.0 - p.y / uSize.y * 2.0, 0.0, 1.0);
}`;

const DAB_FRAG = `${PRECISION}
${INK_GLSL_LIB}
uniform float uSpread;
varying vec2 vLocal;
varying float vR;
varying vec2 vDir;
varying float vDry;
varying float vPool;
varying float vSeed;
void main() {
  float d = vR - length(vLocal);
  // The bristles: a pattern across the brush, fixed for the stroke, so the
  // gaps of one dab line up with the next and run as streaks.
  vec2 perp = vec2(-vDir.y, vDir.x);
  float across = dot(vLocal, perp) / max(vR, 1.0);
  float b = vnoise(vec2(across * 7.0 + vSeed * 13.0, vSeed * 3.1)) * 0.7
          + vnoise(vec2(across * 19.0 - vSeed * 5.0, vSeed * 1.7)) * 0.3;
  float thr = vDry * (0.15 + 0.85 * clamp(abs(across), 0.0, 1.0));
  float gap = 1.0 - smoothstep(thr - 0.05, thr + 0.05, b);
  d -= gap * (vR + uSpread);
  float r = clamp(0.5 + d / (2.0 * uSpread), 0.0, 1.0);
  if (r <= 0.0) discard;
  float wet = smoothstep(-uSpread * 0.6, 0.0, d);
  float pool = vPool * smoothstep(-1.5, 1.5, d);
  gl_FragColor = vec4(r, wet, pool, 1.0);
}`;

/** Drying: a constant taken off the wet channel (blended REVERSE_SUBTRACT). */
const DRY_FRAG = `${PRECISION}
uniform float uAmt;
void main() { gl_FragColor = vec4(0.0, uAmt, 0.0, 0.0); }`;

/** The intro's bake, revealed into the ink texture up to arrival uT1. */
const WRITE_FRAG = `${PRECISION}
uniform sampler2D uBake;
uniform vec2 uSize;
uniform vec4 uName;         // the name's box, ink texture px (y down)
uniform float uBakeH;
uniform float uBakeSpread;
uniform float uSpread;
uniform float uT0;
uniform float uT1;
void main() {
  vec2 px = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y);
  vec2 nuv = (px - uName.xy) / uName.zw;
  if (nuv.x < 0.0 || nuv.x > 1.0 || nuv.y < 0.0 || nuv.y > 1.0) discard;
  vec4 s = texture2D(uBake, nuv);
  if (s.g > uT1) discard;
  float d = (s.r - 0.5) * 2.0 * uBakeSpread * (uName.w / uBakeH);
  float r = clamp(0.5 + d / (2.0 * uSpread), 0.0, 1.0);
  float fresh = step(uT0, s.g) * step(-uSpread * 0.6, d);
  gl_FragColor = vec4(r, fresh, s.b * step(0.0, d), 1.0);
}`;

/** The room, the scroll, the paper and the ink: the intro's scene, still. */
const ROOM_FRAG = `${PRECISION}
uniform vec2 uRes;
uniform float uPx;
uniform sampler2D uInk;
uniform vec2 uInkSize;
uniform float uSpread;      // ink texture px
uniform vec4 uPaper;        // x0, y0, x1, y1 (buffer px, y down)
uniform vec4 uMount;        // x0, y0, x1, y1
uniform float uRollerY;
uniform float uRollerR;
uniform float uTime;
uniform sampler2D uBake;
uniform vec2 uBakeSize;
uniform float uBakeSpread;
uniform vec4 uName;         // x, y, w, h (buffer px)
uniform float uTrace;
uniform sampler2D uSeal;
uniform vec4 uSealBox;      // x, y, size, on
uniform vec3 uSealCol;
uniform vec3 uSodium;
uniform vec3 uMagenta;
uniform vec3 uTeal;

${INK_GLSL_LIB}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float u = uPx;
  vec2 ps = frag;
  vec2 q = frag / uRes;

  /* ---- light (as the intro's, lamp and neon fully up) ------------------ */
  vec2 lampPos = vec2(uRes.x * 0.16, -uRes.y * 0.3);
  float ld = length(frag - lampPos) / uRes.y;
  float lamp = 1.25 / (1.0 + ld * ld * 2.6);
  float wx = q.x - 0.16 * q.y;
  float win = smoothstep(0.56, 0.62, wx) * smoothstep(1.08, 1.0, wx)
            * smoothstep(0.02, 0.1, q.y) * smoothstep(0.98, 0.84, q.y);
  float slat = fract(q.y * 34.0 - q.x * 2.2);
  float blinds = smoothstep(0.3, 0.42, slat) * smoothstep(0.98, 0.86, slat);
  float rain = rainShade(vec2(wx, q.y), uTime);
  vec3 neonCol = mix(uMagenta, uTeal, smoothstep(0.25, 0.85, q.y + 0.15 * (q.x - 0.7)));
  vec3 neon = neonCol * win * blinds * (1.0 - 0.85 * rain) * 0.62;
  vec3 light = uSodium * lamp + neon + vec3(0.010, 0.016, 0.022);

  /* ---- the room -------------------------------------------------------- */
  float plaster = fbm(frag / (150.0 * u)) * 0.6 + fbm(frag / (16.0 * u)) * 0.4;
  vec3 col = vec3(0.17, 0.18, 0.20) * (0.75 + 0.5 * plaster) * light;
  float hangY1 = uRollerY + uRollerR;
  vec2 shOff = vec2(26.0, 34.0) * u;
  float shD = sdBox(frag - shOff, vec2(uMount.x - 14.0 * u, uMount.y), vec2(uMount.z + 14.0 * u, hangY1));
  col *= 1.0 - 0.7 * smoothstep(46.0 * u, -12.0 * u, shD);

  /* ---- the scroll ------------------------------------------------------ */
  float rollTop = uRollerY - uRollerR * 0.55;
  if (ps.x > uMount.x && ps.x < uMount.z && ps.y > uMount.y && ps.y < rollTop) {
    float mid = (uMount.x + uMount.z) * 0.5;
    float k = (ps.x - mid) / ((uMount.z - uMount.x) * 0.5);
    float shade = (1.0 - 0.2 * k * k) * (1.0 + 0.035 * sin(ps.y / (110.0 * u) + k * 1.4));
    vec2 sc = (ps - vec2(mid, (uPaper.y + uPaper.w) * 0.5)) / vec2((uMount.z - uMount.x) * 1.1, (uPaper.w - uPaper.y) * 0.8);
    float spot = 1.0 - smoothstep(0.15, 1.0, length(sc));
    vec3 key = uSodium * lamp * 0.55 + vec3(1.0, 0.86, 0.66) * spot * 1.05;
    vec3 sLight = key + neon * 0.7 + vec3(0.010, 0.016, 0.022);

    float weave = vnoise(ps / (1.6 * u)) * 0.5 + vnoise(vec2(ps.x / (0.9 * u), ps.y / (5.0 * u))) * 0.5;
    vec3 silk = vec3(0.24, 0.17, 0.125) * (0.82 + 0.3 * weave);
    float band = step(uPaper.w + 10.0 * u, ps.y) * step(ps.y, uPaper.w + 22.0 * u);
    silk = mix(silk, vec3(0.42, 0.33, 0.18) * (0.8 + 0.4 * weave), band * step(uPaper.x - 4.0 * u, ps.x) * step(ps.x, uPaper.z + 4.0 * u));
    vec3 surf = silk;
    vec3 extra = vec3(0.0);

    if (ps.x > uPaper.x && ps.x < uPaper.z && ps.y > uPaper.y && ps.y < uPaper.w) {
      float fib = fbm(vec2(ps.x / (40.0 * u), ps.y / (7.0 * u))) * 0.6 + vnoise(ps / (1.2 * u)) * 0.4;
      vec3 paper = vec3(0.90, 0.86, 0.77) * (0.92 + 0.1 * fib);
      float pe = min(min(ps.x - uPaper.x, uPaper.z - ps.x), min(ps.y - uPaper.y, uPaper.w - ps.y));
      paper *= 0.86 + 0.14 * smoothstep(0.0, 10.0 * u, pe);
      surf = paper;

      /* Trace: the name as a faint grey ghost under the paper's surface. */
      if (uTrace > 0.0) {
        vec2 nuv = (ps - uName.xy) / uName.zw;
        if (nuv.x > 0.0 && nuv.x < 1.0 && nuv.y > 0.0 && nuv.y < 1.0) {
          float gd = (texture2D(uBake, nuv).r - 0.5) * 2.0 * uBakeSpread * (uName.w / uBakeSize.y);
          float ghost = smoothstep(-0.8 * u, 0.8 * u, gd);
          surf = mix(surf, surf * vec3(0.74, 0.77, 0.84), ghost * uTrace * 0.6);
        }
      }

      vec2 pSize = uPaper.zw - uPaper.xy;
      vec2 iuv = (ps - uPaper.xy) / pSize;
      vec2 tuv = vec2(iuv.x, 1.0 - iuv.y);
      vec2 tx = 1.0 / uInkSize;
      vec4 s0 = texture2D(uInk, tuv);
      float pxPerTex = pSize.x / uInkSize.x;
      float d = (s0.r - 0.5) * 2.0 * uSpread * pxPerTex;
      float pool = s0.b;
      float wet = clamp(s0.g * (1.0 + 0.8 * pool), 0.0, 1.0);
      float lt = (1.0 - s0.g) * ${DRY_SECS.toFixed(2)};

      float fibN = vnoise(ps / (4.0 * u));
      float bleed = (0.25 + 0.9 * fibN) * (1.0 + 0.9 * pool) * u * smoothstep(0.0, 0.5 + 0.7 * pool, lt) * step(0.002, s0.r);
      float edgeN = (vnoise(ps / (2.0 * u)) - 0.5) * 0.7 * u;
      float aa = 0.75 * u;
      float cov = smoothstep(-aa, aa, d + bleed + edgeN);

      if (cov > 0.0) {
        float centre = smoothstep(1.5 * u, 8.0 * u, d);
        vec3 inkCol = mix(vec3(0.016, 0.018, 0.028), vec3(0.075, 0.075, 0.09), centre * 0.55 * (1.0 - pool));
        float dens = max(mix(0.94, 1.0, fibN), pool * 0.9);
        float sx = texture2D(uInk, tuv + vec2(tx.x, 0.0)).r - texture2D(uInk, tuv - vec2(tx.x, 0.0)).r;
        float sy = texture2D(uInk, tuv - vec2(0.0, tx.y)).r - texture2D(uInk, tuv + vec2(0.0, tx.y)).r;
        vec2 sg = vec2(sx, sy);
        vec2 inward = dot(sg, sg) > 1e-10 ? normalize(sg) : vec2(0.0);
        float slope = 1.0 - smoothstep(0.0, 5.0 * u, d);
        vec3 N = normalize(vec3(-inward * slope * 1.4, 1.0));
        vec3 L = normalize(vec3(lampPos - ps, 380.0 * u));
        vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
        float nh = max(dot(N, H), 0.0);
        float spec = nh * nh;
        spec *= spec; spec *= spec; spec *= spec;
        vec3 sheen = (key * spec * 0.8 + neon * 0.9 * slope + key * 0.018 * (0.6 + 0.8 * fibN)) * wet;
        surf = mix(surf, inkCol, cov * dens);
        extra = sheen * cov;
      }

      /* The seal: vermilion, pressed over whatever is under it. */
      if (uSealBox.w > 0.0) {
        vec2 suv = (ps - uSealBox.xy) / uSealBox.z;
        if (suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) {
          float a = texture2D(uSeal, suv).a;
          surf = mix(surf, uSealCol * (0.86 + 0.16 * fib), a * 0.94);
          extra *= 1.0 - a;
        }
      }
    }
    col = surf * sLight * shade + extra;
  }

  /* ---- the roller ------------------------------------------------------ */
  float ry = (ps.y - uRollerY) / uRollerR;
  float ends = 18.0 * u;
  if (abs(ry) < 1.0 && ps.x > uMount.x - ends && ps.x < uMount.z + ends) {
    float nz = sqrt(1.0 - ry * ry);
    bool cap = ps.x < uMount.x - 2.0 * u || ps.x > uMount.z + 2.0 * u;
    float grain = vnoise(vec2(ps.x / (30.0 * u), ry * 6.0));
    vec3 wood = cap ? vec3(0.44, 0.36, 0.25) : vec3(0.17, 0.075, 0.045) * (0.8 + 0.4 * grain);
    float diff = 0.35 + 0.65 * max(0.0, -ry * 0.55 + nz * 0.45);
    float hl = exp(-((ry + 0.45) / 0.13) * ((ry + 0.45) / 0.13));
    col = wood * (uSodium * lamp + neon * 0.8 + 0.02) * diff + uSodium * lamp * hl * (cap ? 0.5 : 0.28);
  }

  /* ---- the lens -------------------------------------------------------- */
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, col * vec3(0.82, 1.0, 1.12), (1.0 - smoothstep(0.0, 0.25, lum)) * 0.5);
  vec2 vq = frag / uRes - 0.5;
  col *= 1.0 - 0.55 * dot(vq * vec2(1.1, 1.3), vq * vec2(1.1, 1.3));
  float gr = hash(frag + vec2(floor(uTime * 24.0) * 13.0, 7.0)) - 0.5;
  col += gr * 0.03 * (0.4 + lum);
  col = col / (1.0 + col * 0.35);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;

/* ---- the seal ------------------------------------------------------------- */

/**
 * His seal (ui/Seal), cut again on a 2D canvas: the same stone, border, hex
 * and A from the same path data, with chipped wear from a seeded scatter
 * rather than a turbulence filter. Only its alpha is used.
 */
function cutSeal(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.scale(size / 64, size / 64);
  g.fillStyle = "#000";
  g.beginPath();
  g.roundRect(4, 4, 56, 56, 3);
  g.fill();
  g.globalCompositeOperation = "destination-out";
  g.lineJoin = "round";
  g.lineCap = "round";
  g.lineWidth = 1.6;
  g.beginPath();
  g.roundRect(8.5, 8.5, 47, 47, 1.5);
  g.stroke();
  g.lineWidth = 3;
  g.stroke(new Path2D("M32 13.5 48.5 23v18L32 50.5 15.5 41V23Z"));
  g.lineWidth = 3.6;
  g.stroke(new Path2D("M24.5 41.5 32 22.5l7.5 19M27.6 34.8h8.8"));
  // Wear: where the stone did not take ink. A fixed scatter (mulberry32).
  let s = 7;
  const rnd = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < 140; i++) {
    g.beginPath();
    g.arc(4 + rnd() * 56, 4 + rnd() * 56, 0.3 + rnd() * rnd() * 1.4, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function hexToRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/* ---- the engine ----------------------------------------------------------- */

export interface PointerSample {
  /** CSS px within the canvas. */
  x: number;
  y: number;
  /** ms. */
  t: number;
  /** 0…1 when a pen reports it, else null. */
  pressure: number | null;
}

/** A dab: centre (ink px), radius, direction, dryness, pool, stroke seed. */
type Dab = [number, number, number, number, number, number, number, number];
const DAB_FLOATS = 10;
const CORNERS = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];

export type StudioEngine = NonNullable<ReturnType<typeof createStudio>>;

/**
 * Build the Studio on `canvas`, or null without WebGL (or without MAX
 * blending, which the distance-field union needs). `bake` must be decoded.
 */
export function createStudio(canvas: HTMLCanvasElement, bake: HTMLImageElement) {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
  });
  if (!gl) return null;
  const minmax = gl.getExtension("EXT_blend_minmax");
  if (!minmax) return null;

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn("[studio] shader:", gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };
  const program = (vsSrc: string, fsSrc: string) => {
    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const p = gl.createProgram()!;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn("[studio] link:", gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  };
  const room = program(QUAD_VERT, ROOM_FRAG);
  const dab = program(DAB_VERT, DAB_FRAG);
  const dry = program(QUAD_VERT, DRY_FRAG);
  const write = program(QUAD_VERT, WRITE_FRAG);
  if (!room || !dab || !dry || !write) return null;

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const dabBuf = gl.createBuffer();

  const loc = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
  const css = getComputedStyle(document.documentElement);
  const sodium = hexToRgb(css.getPropertyValue("--color-hazard"), [1, 0.627, 0.169]);
  const magenta = hexToRgb(css.getPropertyValue("--spectrum-1"), [1, 0.176, 0.561]);
  const teal = hexToRgb(css.getPropertyValue("--spectrum-3"), [0.133, 0.878, 1]);
  const sealCol = hexToRgb(css.getPropertyValue("--color-seal"), [0.72, 0.16, 0.1]);

  /* Textures: 0 ink (render target), 1 the bake (data), 2 the seal. */
  const texture = (unit: number) => {
    const t = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const inkTex = texture(0);
  const fbo = gl.createFramebuffer();
  /* The bake's channels are data, not colour (see lib/inkShader). */
  texture(1);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, bake);
  texture(2);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cutSeal(256));

  /* Fixed uniforms. */
  gl.useProgram(room);
  gl.uniform1i(loc(room, "uInk"), 0);
  gl.uniform1i(loc(room, "uBake"), 1);
  gl.uniform1i(loc(room, "uSeal"), 2);
  gl.uniform2f(loc(room, "uBakeSize"), INK_NAME.width, INK_NAME.height);
  gl.uniform1f(loc(room, "uBakeSpread"), INK_NAME.spread);
  gl.uniform3fv(loc(room, "uSodium"), sodium);
  gl.uniform3fv(loc(room, "uMagenta"), magenta);
  gl.uniform3fv(loc(room, "uTeal"), teal);
  gl.uniform3fv(loc(room, "uSealCol"), sealCol);
  gl.useProgram(write);
  gl.uniform1i(loc(write, "uBake"), 1);
  gl.uniform1f(loc(write, "uBakeH"), INK_NAME.height);
  gl.uniform1f(loc(write, "uBakeSpread"), INK_NAME.spread);

  /* ---- state ---- */
  let cw = 0;
  let ch = 0;
  let w = 0;
  let h = 0;
  let k = 1;
  let layout: StudioLayout | null = null;
  /** Ink texture size, and ink px per CSS px. */
  let iw = 1;
  let ih = 1;
  let ik = 1;
  let spread = SPREAD_CSS;
  let dabs: Dab[] = [];
  let wetUntil = 0;
  let dryCarry = 0;
  let last = 0;
  let trace = 0;
  let traceTarget = 0;
  let seal: { x: number; y: number } | null = null;
  let unrollFrom = -1;
  let writing: { from: number; done: number } | null = null;
  const clock0 = performance.now();

  /* The stroke in progress. */
  let stroke: {
    x: number;
    y: number;
    t: number;
    r: number;
    dir: [number, number];
    dist: number;
    seed: number;
    speed: number;
    mid: [number, number];
  } | null = null;

  const brushR = () => (layout ? Math.max(4, layout.paper.w * 0.032) : 8);

  function clearInk() {
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.viewport(0, 0, iw, ih);
    gl!.clearColor(0, 0, 0, 1);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    seal = null;
    wetUntil = 0;
  }

  function resize(cssW: number, cssH: number) {
    cw = cssW;
    ch = cssH;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cap = Math.min(1, Math.sqrt(MAX_PIXELS / (cw * ch * dpr * dpr)));
    w = Math.max(1, Math.round(cw * dpr * cap));
    h = Math.max(1, Math.round(ch * dpr * cap));
    k = w / cw;
    canvas.width = w;
    canvas.height = h;
    layout = studioLayout(cw, ch);
    /* The ink texture is the paper at device resolution, capped. Resizing
       starts a fresh sheet: the old ink would land in the wrong place. */
    const P = layout.paper;
    ik = Math.min(dpr, INK_MAX / Math.max(P.w, P.h));
    iw = Math.max(1, Math.round(P.w * ik));
    ih = Math.max(1, Math.round(P.h * ik));
    spread = SPREAD_CSS * ik;
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, inkTex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, iw, ih, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, inkTex, 0);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    clearInk();
    return layout;
  }

  /* ---- the brush ---- */

  const onPaper = (x: number, y: number) => {
    if (!layout) return false;
    const P = layout.paper;
    return x >= P.x && x <= P.x + P.w && y >= P.y && y <= P.y + P.h;
  };

  function pushDab(x: number, y: number, r: number, dir: [number, number], dryness: number, pool: number, seed: number) {
    if (!layout || r <= 0.2) return;
    const P = layout.paper;
    dabs.push([(x - P.x) * ik, (y - P.y) * ik, r * ik, dir[0], dir[1], dryness, pool, seed]);
  }

  /** Dabs along a straight run, radius easing from r0 to r1. */
  function run(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, dir: [number, number], dryness: number, pool: number, seed: number) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const step = Math.max(0.6, Math.min(r0, r1) * 0.22);
    const n = Math.max(1, Math.ceil(len / step));
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      pushDab(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, r0 + (r1 - r0) * f, dir, dryness, pool, seed);
    }
  }

  function down(p: PointerSample) {
    if (!onPaper(p.x, p.y)) return false;
    const R0 = brushR();
    const r = p.pressure !== null ? R0 * (0.3 + 0.9 * p.pressure) : R0 * 0.8;
    stroke = { x: p.x, y: p.y, t: p.t, r, dir: [0, 1], dist: 0, seed: Math.random(), speed: 0, mid: [p.x, p.y] };
    // The landing: the brush presses, and the ink pools.
    pushDab(p.x, p.y, r * 1.05, [0, 1], 0, 1, stroke.seed);
    wetUntil = performance.now() + DRY_SECS * 1000;
    return true;
  }

  function move(points: PointerSample[]) {
    if (!stroke || !layout) return;
    const R0 = brushR();
    const S = stroke;
    for (const p of points) {
      const dx = p.x - S.x;
      const dy = p.y - S.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.75) continue;
      const dt = Math.max(1, p.t - S.t);
      S.speed = S.speed * 0.6 + (len / dt) * 0.4;
      // Direction, smoothed so a jittery hand does not flicker the nib.
      const nx = dx / len;
      const ny = dy / len;
      const ax = S.dir[0] * 0.45 + nx * 0.55;
      const ay = S.dir[1] * 0.45 + ny * 0.55;
      const al = Math.hypot(ax, ay) || 1;
      const dir: [number, number] = [ax / al, ay / al];
      const theta = Math.atan2(dir[1], dir[0]);
      /* A flat brush: about three to one between across and along. */
      const nib = 0.3 + 0.7 * Math.abs(Math.sin(theta - NIB));
      const base = p.pressure !== null ? R0 * (0.25 + 1.05 * p.pressure) : R0 * Math.min(1.2, Math.max(0.38, 1.25 - S.speed * 0.42));
      const landing = 0.72 + 0.28 * Math.min(1, S.dist / (R0 * 1.5));
      const target = base * nib * landing;
      const r = S.r + (target - S.r) * 0.35;
      // Runs dry with distance and speed.
      const dryness = Math.min(0.8, Math.max(0, S.dist / (layout.paper.h * 2.4) - 0.12 + Math.max(0, S.speed - 0.9) * 0.35));
      const pool = S.dist < R0 * 1.2 ? 0.8 : 0;
      // A quadratic through the midpoints: smooth curves from a coarse trail.
      const mx = (S.x + p.x) / 2;
      const my = (S.y + p.y) / 2;
      const steps = Math.max(1, Math.ceil(len / Math.max(0.6, r * 0.22)));
      let px = S.mid[0];
      let py = S.mid[1];
      for (let i = 1; i <= steps; i++) {
        const f = i / steps;
        const a = (1 - f) * (1 - f);
        const b = 2 * (1 - f) * f;
        const c = f * f;
        const qx = a * S.mid[0] + b * S.x + c * mx;
        const qy = a * S.mid[1] + b * S.y + c * my;
        run(px, py, qx, qy, S.r + (r - S.r) * ((i - 1) / steps), S.r + (r - S.r) * f, dir, dryness, pool, S.seed);
        px = qx;
        py = qy;
      }
      S.mid = [mx, my];
      S.dist += len;
      S.x = p.x;
      S.y = p.y;
      S.t = p.t;
      S.r = r;
      S.dir = dir;
    }
    wetUntil = performance.now() + DRY_SECS * 1000;
  }

  function up() {
    if (!stroke) return;
    const S = stroke;
    // Finish to the last point, then a tail: a fast lift flicks a taper off.
    run(S.mid[0], S.mid[1], S.x, S.y, S.r, S.r, S.dir, 0.3, 0, S.seed);
    const tail = Math.min(34, Math.max(3, S.speed * 26));
    const segs = 8;
    for (let i = 1; i <= segs; i++) {
      const f0 = (i - 1) / segs;
      const f1 = i / segs;
      run(
        S.x + S.dir[0] * tail * f0,
        S.y + S.dir[1] * tail * f0,
        S.x + S.dir[0] * tail * f1,
        S.y + S.dir[1] * tail * f1,
        S.r * (1 - f0) * (1 - f0 * 0.3),
        S.r * (1 - f1) * (1 - f1 * 0.3),
        S.dir,
        Math.min(0.85, 0.35 + f1 * 0.5),
        0,
        S.seed
      );
    }
    stroke = null;
    wetUntil = performance.now() + DRY_SECS * 1000;
  }

  /* ---- passes ---- */

  function flushDabs() {
    if (!dabs.length) return;
    const data = new Float32Array(dabs.length * 6 * DAB_FLOATS);
    let o = 0;
    for (const d of dabs)
      for (let c = 0; c < 6; c++) {
        data[o++] = CORNERS[c * 2];
        data[o++] = CORNERS[c * 2 + 1];
        data[o++] = d[0];
        data[o++] = d[1];
        data[o++] = d[2];
        data[o++] = d[3];
        data[o++] = d[4];
        data[o++] = d[5];
        data[o++] = d[6];
        data[o++] = d[7];
      }
    const g = gl!;
    resetAttribs();
    g.bindFramebuffer(g.FRAMEBUFFER, fbo);
    g.viewport(0, 0, iw, ih);
    g.useProgram(dab);
    g.uniform2f(loc(dab!, "uSize"), iw, ih);
    g.uniform1f(loc(dab!, "uSpread"), spread);
    g.bindBuffer(g.ARRAY_BUFFER, dabBuf);
    g.bufferData(g.ARRAY_BUFFER, data, g.STREAM_DRAW);
    const stride = DAB_FLOATS * 4;
    const attr = (name: string, size: number, offset: number) => {
      const a = g.getAttribLocation(dab!, name);
      if (a < 0) return;
      g.enableVertexAttribArray(a);
      g.vertexAttribPointer(a, size, g.FLOAT, false, stride, offset * 4);
    };
    attr("aCorner", 2, 0);
    attr("aCenter", 2, 2);
    attr("aR", 1, 4);
    attr("aDir", 2, 5);
    attr("aDry", 1, 7);
    attr("aPool", 1, 8);
    attr("aSeed", 1, 9);
    g.enable(g.BLEND);
    g.blendEquation(minmax!.MAX_EXT);
    g.blendFunc(g.ONE, g.ONE);
    g.drawArrays(g.TRIANGLES, 0, dabs.length * 6);
    g.disable(g.BLEND);
    g.bindFramebuffer(g.FRAMEBUFFER, null);
    dabs = [];
  }

  /** Bind the full-screen quad to a program's aPos. */
  function quadFor(p: WebGLProgram) {
    const g = gl!;
    g.bindBuffer(g.ARRAY_BUFFER, quad);
    const a = g.getAttribLocation(p, "aPos");
    g.enableVertexAttribArray(a);
    g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
  }

  /** Disable every attribute array but 0, so a quad pass never reads the dab buffer. */
  function resetAttribs() {
    const g = gl!;
    const n = g.getParameter(g.MAX_VERTEX_ATTRIBS) as number;
    for (let i = 0; i < n; i++) g.disableVertexAttribArray(i);
  }

  function dryPass(dt: number) {
    dryCarry += dt / DRY_SECS;
    if (dryCarry < 2 / 255) return;
    const g = gl!;
    resetAttribs();
    g.bindFramebuffer(g.FRAMEBUFFER, fbo);
    g.viewport(0, 0, iw, ih);
    g.useProgram(dry);
    quadFor(dry!);
    g.uniform1f(loc(dry!, "uAmt"), Math.min(1, dryCarry));
    g.enable(g.BLEND);
    g.blendEquation(g.FUNC_REVERSE_SUBTRACT);
    g.blendFunc(g.ONE, g.ONE);
    g.colorMask(false, true, false, false);
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
    g.colorMask(true, true, true, true);
    g.disable(g.BLEND);
    g.bindFramebuffer(g.FRAMEBUFFER, null);
    dryCarry = 0;
  }

  function writePass(t0: number, t1: number) {
    if (!layout) return;
    const g = gl!;
    const P = layout.paper;
    const N = layout.name;
    resetAttribs();
    g.bindFramebuffer(g.FRAMEBUFFER, fbo);
    g.viewport(0, 0, iw, ih);
    g.useProgram(write);
    quadFor(write!);
    g.uniform2f(loc(write!, "uSize"), iw, ih);
    g.uniform4f(loc(write!, "uName"), (N.x - P.x) * ik, (N.y - P.y) * ik, N.w * ik, N.h * ik);
    g.uniform1f(loc(write!, "uSpread"), spread);
    g.uniform1f(loc(write!, "uT0"), t0);
    g.uniform1f(loc(write!, "uT1"), t1);
    g.enable(g.BLEND);
    g.blendEquation(minmax!.MAX_EXT);
    g.blendFunc(g.ONE, g.ONE);
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
    g.disable(g.BLEND);
    g.bindFramebuffer(g.FRAMEBUFFER, null);
  }

  function composite(now: number) {
    if (!layout) return;
    const g = gl!;
    const L = layout;
    resetAttribs();
    g.bindFramebuffer(g.FRAMEBUFFER, null);
    g.viewport(0, 0, w, h);
    g.useProgram(room);
    quadFor(room!);
    const U = (n: string) => loc(room!, n);
    let rollerY = L.rollerY;
    if (unrollFrom >= 0) {
      const f = Math.min(1, (now - unrollFrom) / (UNROLL_SECS * 1000));
      // The roller drops, overshoots a hair and settles.
      const e = 1 - Math.pow(1 - f, 3);
      const settle = e + Math.sin(f * Math.PI) * 0.04 * (1 - f);
      rollerY = L.rollerFrom + (L.rollerY - L.rollerFrom) * settle;
      if (f >= 1) unrollFrom = -1;
    }
    g.uniform2f(U("uRes"), w, h);
    g.uniform1f(U("uPx"), k);
    g.uniform2f(U("uInkSize"), iw, ih);
    g.uniform1f(U("uSpread"), spread);
    g.uniform4f(U("uPaper"), L.paper.x * k, L.paper.y * k, (L.paper.x + L.paper.w) * k, (L.paper.y + L.paper.h) * k);
    g.uniform4f(U("uMount"), L.mount.x0 * k, -ch * 0.3 * k, L.mount.x1 * k, L.rollerY * k);
    g.uniform1f(U("uRollerY"), rollerY * k);
    g.uniform1f(U("uRollerR"), L.rollerR * k);
    g.uniform1f(U("uTime"), ((now - clock0) / 1000) % 600);
    g.uniform4f(U("uName"), L.name.x * k, L.name.y * k, L.name.w * k, L.name.h * k);
    g.uniform1f(U("uTrace"), trace);
    const S = L.seal;
    g.uniform4f(U("uSealBox"), seal ? (seal.x - S / 2) * k : 0, seal ? (seal.y - S / 2) * k : 0, S * k, seal ? 1 : 0);
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
  }

  /** One frame. Returns whether another is needed. */
  function frame(now: number) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    if (writing) {
      const span = writing.done - writing.from;
      const t1 = Math.min(1.0001, (now - writing.from) / span);
      const t0 = Math.max(0, t1 - (dt * 1000) / span - 0.002);
      writePass(t0, t1);
      wetUntil = now + DRY_SECS * 1000;
      if (t1 >= 1) writing = null;
    }
    flushDabs();
    if (now < wetUntil + 200) dryPass(dt);
    trace += (traceTarget - trace) * Math.min(1, dt * 8);
    if (Math.abs(traceTarget - trace) < 0.01) trace = traceTarget;
    composite(now);
    return busy(now);
  }

  function busy(now = performance.now()) {
    return !!stroke || !!writing || unrollFrom >= 0 || now < wetUntil + 200 || trace !== traceTarget || dabs.length > 0;
  }

  return {
    resize,
    frame,
    busy: () => busy(),
    lost: () => gl.isContextLost(),
    onPaper,
    down,
    move,
    up,
    /** Press the seal centred here (CSS px), if it is on the paper. */
    stamp(x: number, y: number) {
      if (!onPaper(x, y) || !layout) return false;
      const P = layout.paper;
      const half = layout.seal / 2;
      seal = {
        x: Math.min(P.x + P.w - half - 4, Math.max(P.x + half + 4, x)),
        y: Math.min(P.y + P.h - half - 4, Math.max(Math.max(P.y, 0) + half + 4, y)),
      };
      return true;
    },
    setTrace(on: boolean) {
      traceTarget = on ? 1 : 0;
    },
    /** A fresh sheet; `animate` unrolls it. */
    clear(animate: boolean) {
      stroke = null;
      writing = null;
      dabs = [];
      clearInk();
      unrollFrom = animate ? performance.now() : -1;
    },
    /** The intro's hand writes the name on this sheet. */
    write(reduced: boolean) {
      if (reduced) {
        writePass(0, 1.0001);
        wetUntil = performance.now() + DRY_SECS * 1000;
        return;
      }
      const now = performance.now();
      writing = { from: now, done: now + WRITE_SECS * 1000 };
    },
    writing: () => !!writing,
    /** Draw now and read the pixels out, before the buffer is presented. */
    snapshot(type = "image/png"): Promise<Blob | null> {
      composite(performance.now());
      return new Promise((res) => canvas.toBlob(res, type));
    },
  };
}
