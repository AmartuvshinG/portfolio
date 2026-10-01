/**
 * The intro's scene: one WebGL pass that draws the whole room.
 *
 * A hanging scroll in a dark room at night. One sodium lamp, up and to the
 * left, out of frame. To the right, a window: neon from the street comes in
 * through the blinds as slatted light, and the rain running down the glass
 * throws its shadows through it. Once, a spinner passes outside and its light
 * crosses the wall. On the scroll, his name is written in Mongol bichig, by
 * brush, top to bottom.
 *
 * The brush comes from a bake (scripts/bake-ink-name.mjs → /intro/ink-name.png):
 * R is the signed distance to the stroke edge, G when the brush reaches each
 * pixel, B where a stroke has just landed. Everything a brush does to paper
 * is drawn from those:
 *
 *   front    ink appears where the brush has been (G < uT), feathered by the
 *            paper's fibre so the leading edge is soaked in, not wiped on
 *   bleed    for half a second after the brush passes, the edge creeps a
 *            pixel or two out into the fibres (nijimi), then stops
 *   dry      streaks along the direction of travel (the gradient of G) open
 *            up where the stroke is fast and thin, and more as the brush
 *            runs dry toward the foot of the name (kasure)
 *   wet      fresh ink stands proud of the paper and is glossy: its rim
 *            catches the lamp and the neon, then dries matte. The genre's
 *            wet street, in ink
 *   pool     where a stroke lands the brush presses, the ink pools darker
 *            and stays wet longer (B)
 *   brush    the brush itself is never drawn, only what it does: a bead of
 *            wet ink at its tip, and its shadow from the lamp, which slides
 *            off and softens as the hand lifts between strokes (the tip's
 *            route is the bake's INK_PATH, read in lib/inkPath)
 *   focus    a procedural defocus — every edge widens, the fibres smooth —
 *            for the rack focus past the scroll at the end, without a blur
 *            filter on a fullscreen layer
 *
 * Like the film shader: a hard pixel ceiling (CSS upscales), no `pow()` of a
 * possibly-negative base, highp where available, wrapped seconds for time,
 * and a sin-free hash (see the GLSL traps memory).
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uPx;          // buffer px per CSS px
uniform sampler2D uInk;
uniform vec2 uTexSize;
uniform float uSpread;      // texture px
uniform vec4 uInkBox;       // x, y, w, h (buffer px, y down)
uniform vec4 uPaper;        // x0, y0, x1, y1
uniform vec4 uMount;        // x0, y0, x1, y1 (y1 = rest position of the roller)
uniform float uRollerY;
uniform float uRollerR;
uniform float uT;           // writing, 0…1 (+ a tail while it dries)
uniform float uWriteSecs;
uniform float uTime;        // seconds, wrapped
uniform float uLamp;
uniform float uNeon;
uniform float uFocus;
uniform float uZoom;
uniform float uDip;         // buffer px
uniform float uSweep;       // −1 = none, else 0…1 across the window
uniform vec2 uLook;
uniform vec3 uTip;          // brush tip: x, y (0…1 of the ink box), lift 0…1
uniform float uTipR;        // stroke half-width at the tip, texture px
uniform float uTipVis;      // the brush is over the paper, 0…1
uniform vec3 uSodium;
uniform vec3 uMagenta;
uniform vec3 uTeal;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}
float sdBox(vec2 p, vec2 lo, vec2 hi) {
  vec2 c = (lo + hi) * 0.5;
  vec2 h = (hi - lo) * 0.5;
  vec2 d = abs(p - c) - h;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

/* Distance to a segment, and how far along it (0…1). */
vec2 sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  return vec2(length(pa - ba * h), h);
}

/* Rain on the window glass, as the shadow it throws: soft vertical runs. */
float rainShade(vec2 q) {
  float s = 0.0;
  for (int i = 0; i < 2; i++) {
    float scale = i == 0 ? 30.0 : 57.0;
    float gx = q.x * scale;
    float col = floor(gx);
    float h = hash(vec2(col, float(i) * 7.0 + 1.0));
    float speed = 0.07 + 0.16 * h;
    float f = fract(q.y * (2.0 + h * 2.0) - uTime * speed - h * 10.0);
    float cx = abs(fract(gx) - 0.5);
    float run = smoothstep(0.32, 0.0, cx) * smoothstep(0.0, 0.04, f) * smoothstep(0.75, 0.08, f);
    s += run * step(0.42, h);
  }
  return clamp(s, 0.0, 1.0);
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 c = uRes * 0.5;
  vec2 p = c + (frag - c) / uZoom;
  float u = uPx;
  // Depth: the wall barely moves with the look, the scroll (nearer) more.
  vec2 pw = p + uLook * 6.0 * u;
  vec2 ps = p + uLook * 16.0 * u - vec2(0.0, uDip);
  vec2 q = pw / uRes;

  /* ---- light ---------------------------------------------------------- */
  vec2 lampPos = vec2(uRes.x * 0.16, -uRes.y * 0.3);
  float ld = length(pw - lampPos) / uRes.y;
  float lamp = uLamp * 1.25 / (1.0 + ld * ld * 2.6);

  // The window: a skewed patch of slatted neon on the right of the room.
  float wx = q.x - 0.16 * q.y;
  float win = smoothstep(0.56, 0.62, wx) * smoothstep(1.08, 1.0, wx)
            * smoothstep(0.02, 0.1, q.y) * smoothstep(0.98, 0.84, q.y);
  float slat = fract(q.y * 34.0 - q.x * 2.2);
  float blinds = smoothstep(0.3, 0.42, slat) * smoothstep(0.98, 0.86, slat);
  float rain = rainShade(vec2(wx, q.y));
  float pulse = 0.88 + 0.12 * sin(uTime * 1.3);
  vec3 neonCol = mix(uMagenta, uTeal, smoothstep(0.25, 0.85, q.y + 0.15 * (q.x - 0.7)));
  float through = win * blinds * (1.0 - 0.85 * rain) * uNeon * pulse;
  vec3 neon = neonCol * through * 0.62;

  // A spinner passing outside: one soft beam crossing the window, once.
  vec3 sweep = vec3(0.0);
  if (uSweep >= 0.0) {
    float bx = mix(0.45, 1.25, uSweep);
    float d = (wx - bx) / 0.07;
    float beam = exp(-d * d) * win * (0.55 + 0.45 * blinds) * smoothstep(0.0, 0.15, uSweep) * smoothstep(1.0, 0.8, uSweep);
    sweep = vec3(0.75, 0.92, 1.0) * beam * 0.55;
  }

  vec3 light = uSodium * lamp + neon + sweep + vec3(0.010, 0.016, 0.022);

  /* ---- the room -------------------------------------------------------- */
  float plaster = fbm(pw / (150.0 * u)) * 0.6 + fbm(pw / (16.0 * u)) * 0.4;
  vec3 col = vec3(0.17, 0.18, 0.20) * (0.75 + 0.5 * plaster) * light;

  // The scroll hangs off the wall; its shadow falls down and to the right.
  float hangY1 = uRollerY + uRollerR;
  vec2 shOff = vec2(26.0, 34.0) * u;
  float shD = sdBox(pw - shOff, vec2(uMount.x - 14.0 * u, uMount.y), vec2(uMount.z + 14.0 * u, hangY1));
  col *= 1.0 - 0.7 * smoothstep(46.0 * u, -12.0 * u, shD);

  /* ---- the scroll ------------------------------------------------------ */
  float rollTop = uRollerY - uRollerR * 0.55;
  bool onMount = ps.x > uMount.x && ps.x < uMount.z && ps.y > uMount.y && ps.y < rollTop;
  if (onMount) {
    float mid = (uMount.x + uMount.z) * 0.5;
    float k = (ps.x - mid) / ((uMount.z - uMount.x) * 0.5);
    float shade = (1.0 - 0.2 * k * k) * (1.0 + 0.035 * sin(ps.y / (110.0 * u) + k * 1.4));
    vec2 lp = ps - lampPos;
    float lamp2 = uLamp * 1.25 / (1.0 + dot(lp, lp) / (uRes.y * uRes.y) * 2.6);
    /* A picture light on the scroll: the paper is the brightest thing in
       the room, warm white rather than sodium. */
    vec2 sc = (ps - vec2((uMount.x + uMount.z) * 0.5, uInkBox.y + uInkBox.w * 0.45)) / vec2((uMount.z - uMount.x) * 1.1, uInkBox.w * 0.85);
    float spot = uLamp * (1.0 - smoothstep(0.15, 1.0, length(sc)));
    vec3 key = uSodium * lamp2 * 0.55 + vec3(1.0, 0.86, 0.66) * spot * 1.05;
    vec3 sLight = key + neon * 0.7 + sweep + vec3(0.010, 0.016, 0.022);

    // Silk: a dark, warm weave.
    float weave = vnoise(ps / (1.6 * u)) * 0.5 + vnoise(vec2(ps.x / (0.9 * u), ps.y / (5.0 * u))) * 0.5;
    vec3 silk = vec3(0.24, 0.17, 0.125) * (0.82 + 0.3 * weave);
    // Gold bands above and below the paper (ichimonji).
    float band = step(uPaper.y - 22.0 * u, ps.y) * step(ps.y, uPaper.y - 10.0 * u)
               + step(uPaper.w + 10.0 * u, ps.y) * step(ps.y, uPaper.w + 22.0 * u);
    silk = mix(silk, vec3(0.42, 0.33, 0.18) * (0.8 + 0.4 * weave), band * step(uPaper.x - 4.0 * u, ps.x) * step(ps.x, uPaper.z + 4.0 * u));
    vec3 surf = silk;
    vec3 extra = vec3(0.0);

    /* The brush's shadow. The lamp is up and to the left, so the shadow of
       the hairs and the handle falls away from it, down and to the right:
       a short dark wedge at the tip and a long soft stalk behind. Lifting,
       the brush rises off its shadow — it slides further off and blurs. */
    float pxT = uInkBox.w / uTexSize.y;
    vec2 tipP = uInkBox.xy + uTip.xy * uInkBox.zw;
    float tipR = max(uTipR * pxT, 2.0 * u);
    float brushSh = 0.0;
    if (uTipVis > 0.0) {
      vec2 away = normalize(tipP - lampPos);
      vec2 o = away * (3.0 * u + uTip.z * 22.0 * u);
      float soft = 1.0 + uTip.z * 2.2;
      vec2 hair = sdSeg(ps, tipP + o, tipP + o + away * tipR * 4.0);
      float hairW = tipR * mix(0.9, 1.25, hair.y);
      float hairSh = 1.0 - smoothstep(hairW - 2.0 * u * soft, hairW + 5.0 * u * soft, hair.x);
      vec2 stalk = sdSeg(ps, tipP + o + away * tipR * 4.0, tipP + o + away * tipR * 26.0);
      float stalkW = tipR * 0.55;
      float stalkSh = (1.0 - smoothstep(stalkW - 3.0 * u * soft, stalkW + 9.0 * u * soft, stalk.x)) * (1.0 - stalk.y * 0.6);
      brushSh = max(hairSh, stalkSh * 0.75) * uTipVis * (1.0 - uTip.z * 0.45) * (1.0 - uFocus);
    }

    bool onPaper = ps.x > uPaper.x && ps.x < uPaper.z && ps.y > uPaper.y && ps.y < uPaper.w;
    if (onPaper) {
      // Paper: long, faint fibres and a fine tooth.
      float fib = fbm(vec2(ps.x / (40.0 * u), ps.y / (7.0 * u))) * 0.6 + vnoise(ps / (1.2 * u)) * 0.4;
      fib = mix(fib, 0.5, uFocus * 0.8);
      vec3 paper = vec3(0.90, 0.86, 0.77) * (0.92 + 0.1 * fib);
      // A soft darkening at the paper's edge, where it meets the silk.
      float pe = min(min(ps.x - uPaper.x, uPaper.z - ps.x), min(ps.y - uPaper.y, uPaper.w - ps.y));
      paper *= 0.86 + 0.14 * smoothstep(0.0, 10.0 * u, pe);
      surf = paper;

      vec2 iuv = (ps - uInkBox.xy) / uInkBox.zw;
      if (iuv.x > 0.0 && iuv.x < 1.0 && iuv.y > 0.0 && iuv.y < 1.0) {
        vec2 tx = 1.0 / uTexSize;
        vec4 s0 = texture2D(uInk, iuv);
        float pxPerTex = uInkBox.w / uTexSize.y;
        float sdfT = (s0.r - 0.5) * 2.0 * uSpread;   // texture px, ink > 0
        float d = sdfT * pxPerTex;                     // buffer px
        float a = s0.g;
        float pool = s0.b;                             // 1 where a stroke just landed
        float lt = (uT - a) * uWriteSecs;              // s since the brush passed
        // The bead at the tip: the wettest, darkest ink on the paper.
        float bead = (1.0 - smoothstep(tipR * 0.6, tipR * 2.2, length(ps - tipP))) * (1.0 - uTip.z) * uTipVis;

        float fibN = vnoise(ps / (4.0 * u));
        float reveal = smoothstep(-0.015, 0.04, lt + (fibN - 0.5) * 0.06);
        float bleed = (0.35 + 1.5 * fibN) * (1.0 + 0.9 * pool) * u * smoothstep(0.0, 0.5 + 0.7 * pool, lt) * (1.0 - uFocus);
        float edgeN = (vnoise(ps / (2.0 * u)) - 0.5) * 1.1 * u;
        float aa = 0.75 * u + uFocus * 18.0 * u;
        float cov = smoothstep(-aa, aa, d + bleed + edgeN) * reveal;

        if (cov > 0.0) {
          // Direction of travel = how arrival changes across the stroke.
          float gx = texture2D(uInk, iuv + vec2(tx.x * 2.0, 0.0)).g - texture2D(uInk, iuv - vec2(tx.x * 2.0, 0.0)).g;
          float gy = texture2D(uInk, iuv + vec2(0.0, tx.y * 2.0)).g - texture2D(uInk, iuv - vec2(0.0, tx.y * 2.0)).g;
          vec2 g = vec2(gx, gy);
          vec2 dir = dot(g, g) > 1e-10 ? normalize(g) : vec2(0.0, 1.0);
          // Streaks are sized on screen (CSS px), not in texels: the name
          // is often drawn at a third of its texture size, and texel-sized
          // streaks average out to nothing below a pixel.
          vec2 cssP = ps / u;
          float along = dot(cssP, dir);
          float across = dot(cssP, vec2(-dir.y, dir.x));
          float n = vnoise(vec2(along * 0.035, across * 0.55)) * 0.65 + vnoise(vec2(along * 0.07, across * 1.2)) * 0.35;
          float edge01 = 1.0 - clamp(d / (3.5 * u), 0.0, 1.0);
          float dry = smoothstep(0.4, 1.0, a) * 0.75 + 0.15;
          float thr = 0.08 + 0.42 * dry * dry * (0.3 + 0.7 * edge01);
          float dens = mix(0.22, 1.0, smoothstep(thr - 0.05, thr + 0.04, n));
          dens = mix(dens, 0.9, uFocus);

          // Sumi: blue-black, darkest where it pooled at the stroke's edge.
          float centre = smoothstep(1.5 * u, 8.0 * u, d);
          vec3 inkCol = mix(vec3(0.016, 0.018, 0.028), vec3(0.075, 0.075, 0.09), centre * 0.55 * (1.0 - pool) * (1.0 - bead));
          dens = max(dens, max(pool * 0.9, bead));

          // Wet: the bead's rim tilts the surface; the lamp and the neon
          // catch it, then it dries matte.
          float wet = max(1.0 - smoothstep(0.0, 1.2 + 1.6 * pool, lt), bead) * (1.0 - uFocus);
          float sx = texture2D(uInk, iuv + vec2(tx.x, 0.0)).r - texture2D(uInk, iuv - vec2(tx.x, 0.0)).r;
          float sy = texture2D(uInk, iuv + vec2(0.0, tx.y)).r - texture2D(uInk, iuv - vec2(0.0, tx.y)).r;
          vec2 sg = vec2(sx, sy);
          vec2 inward = dot(sg, sg) > 1e-10 ? normalize(sg) : vec2(0.0);
          float slope = 1.0 - smoothstep(0.0, 5.0 * u, d);
          vec3 N = normalize(vec3(-inward * slope * 1.4, 1.0));
          vec3 L = normalize(vec3(lampPos - ps, 380.0 * u));
          vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
          float nh = max(dot(N, H), 0.0);  // all y-down: the texture's rows run down too
          float spec = nh * nh;
          spec *= spec; spec *= spec; spec *= spec; // ^16
          vec3 sheen = (key * spec * 1.0 + neon * 0.9 * slope + key * 0.05 * (0.6 + 0.8 * fibN)) * wet;

          surf = mix(surf, inkCol, cov * dens);
          extra = sheen * cov;
        }
      }
    }
    col = surf * sLight * shade * (1.0 - 0.42 * brushSh) + extra * (1.0 - 0.6 * brushSh);
  }

  /* ---- the roller (jiku) ---------------------------------------------- */
  float ry = (ps.y - uRollerY) / uRollerR;
  float ends = 18.0 * u;
  if (abs(ry) < 1.0 && ps.x > uMount.x - ends && ps.x < uMount.z + ends) {
    float nz = sqrt(1.0 - ry * ry);
    bool cap = ps.x < uMount.x - 2.0 * u || ps.x > uMount.z + 2.0 * u;
    float grain = vnoise(vec2(ps.x / (30.0 * u), ry * 6.0));
    vec3 wood = cap ? vec3(0.44, 0.36, 0.25) : vec3(0.17, 0.075, 0.045) * (0.8 + 0.4 * grain);
    vec2 lp = ps - lampPos;
    float lamp3 = uLamp * 1.25 / (1.0 + dot(lp, lp) / (uRes.y * uRes.y) * 2.6);
    float diff = 0.35 + 0.65 * max(0.0, -ry * 0.55 + nz * 0.45);
    float hl = exp(-((ry + 0.45) / 0.13) * ((ry + 0.45) / 0.13));
    col = wood * (uSodium * lamp3 + neon * 0.8 + sweep + 0.02) * diff + uSodium * lamp3 * hl * (cap ? 0.5 : 0.28);
  }

  /* ---- the lens ------------------------------------------------------- */
  // Teal in the shadows, warmth kept in the light.
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, col * vec3(0.82, 1.0, 1.12), (1.0 - smoothstep(0.0, 0.25, lum)) * 0.5);
  // Vignette.
  vec2 vq = frag / uRes - 0.5;
  col *= 1.0 - 0.55 * dot(vq * vec2(1.1, 1.3), vq * vec2(1.1, 1.3));
  // Grain, at 24 fps.
  float gt = floor(uTime * 24.0);
  float gr = hash(frag + vec2(gt * 13.0, gt * 7.0)) - 0.5;
  col += gr * 0.035 * (0.4 + lum);
  // Exposure: a soft shoulder.
  col = col / (1.0 + col * 0.35);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;

/** Hard ceiling on the drawing buffer; the canvas is CSS-upscaled. */
const MAX_PIXELS = 1_100_000;

/** The scene's layout, CSS px, y down. Shared with the DOM (letterbox, seal). */
export interface InkLayout {
  bar: number;
  ink: { x: number; y: number; w: number; h: number };
  paper: { x0: number; y0: number; x1: number; y1: number };
  mount: { x0: number; y0: number; x1: number };
  /** The roller's resting centre, and where it starts (unrolling). */
  rollerY: number;
  rollerFrom: number;
  rollerR: number;
  seal: { x: number; y: number; size: number };
}

/**
 * The letterbox bar's height, CSS px. 2.39:1 on a landscape screen, held
 * between 6 and 16% of the height; a slim 7% on portrait, where a true 2.39
 * frame would leave a ribbon. The CSS on the bars computes the same.
 */
export function letterboxBar(cw: number, ch: number): number {
  if (ch > cw) return Math.round(ch * 0.07);
  return Math.round(Math.min(ch * 0.16, Math.max(ch * 0.06, (ch - cw / 2.39) / 2)));
}

export function inkLayout(cw: number, ch: number, tex: { width: number; height: number }): InkLayout {
  const bar = letterboxBar(cw, ch);
  const frameH = ch - bar * 2;
  let inkH = frameH * 0.86;
  let inkW = (inkH * tex.width) / tex.height;
  // The mount is ~2.5 ink-widths wide; keep it inside a phone.
  const mountW = inkW * 2.55;
  if (mountW > cw * 0.84) {
    const k = (cw * 0.84) / mountW;
    inkH *= k;
    inkW *= k;
  }
  const cx = cw / 2;
  const inkY = bar + frameH * 0.025;
  const paperX0 = cx - inkW * 0.92;
  const paperX1 = cx + inkW * 0.92;
  const paperY1 = inkY + inkH + frameH * 0.03;
  const rollerR = Math.max(6, inkW * 0.1);
  const rollerY = paperY1 + 26 + rollerR;
  const sealSize = inkW * 0.34;
  return {
    bar,
    ink: { x: cx - inkW / 2, y: inkY, w: inkW, h: inkH },
    paper: { x0: paperX0, y0: -ch * 0.2, x1: paperX1, y1: paperY1 },
    mount: { x0: paperX0 - inkW * 0.32, y0: -ch * 0.3, x1: paperX1 + inkW * 0.32 },
    rollerY,
    rollerFrom: bar + rollerR,
    rollerR,
    seal: { x: paperX0 + inkW * 0.2, y: paperY1 - sealSize - inkW * 0.22, size: sealSize },
  };
}

export interface InkFrame {
  time: number;
  /** Writing, 0…1 (beyond 1 while it dries). */
  t: number;
  writeSecs: number;
  lamp: number;
  neon: number;
  focus: number;
  zoom: number;
  /** CSS px. */
  dip: number;
  /** −1, or 0…1 while the spinner's light crosses. */
  sweep: number;
  /** 0…1: the roller's travel from rollerFrom to rollerY. */
  unroll: number;
  lookX: number;
  lookY: number;
  /** The brush: 0…1 of the ink box, its lift, its stroke half-width (texture
   *  px), and how present it is over the paper (0 = gone). */
  tipX: number;
  tipY: number;
  tipLift: number;
  tipR: number;
  tipVis: number;
}

function hexToRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Build the renderer, or null without WebGL. `image` must be decoded.
 */
export function createInkRenderer(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  tex: { width: number; height: number; spread: number }
) {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn("[ink] shader:", gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("[ink] link:", gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = (name: string) => gl.getUniformLocation(prog, name);
  const u = {
    res: U("uRes"),
    px: U("uPx"),
    inkBox: U("uInkBox"),
    paper: U("uPaper"),
    mount: U("uMount"),
    rollerY: U("uRollerY"),
    rollerR: U("uRollerR"),
    t: U("uT"),
    writeSecs: U("uWriteSecs"),
    time: U("uTime"),
    lamp: U("uLamp"),
    neon: U("uNeon"),
    focus: U("uFocus"),
    zoom: U("uZoom"),
    dip: U("uDip"),
    sweep: U("uSweep"),
    look: U("uLook"),
    tip: U("uTip"),
    tipR: U("uTipR"),
    tipVis: U("uTipVis"),
  };

  const css = getComputedStyle(document.documentElement);
  gl.uniform3fv(U("uSodium"), hexToRgb(css.getPropertyValue("--color-hazard"), [1, 0.627, 0.169]));
  gl.uniform3fv(U("uMagenta"), hexToRgb(css.getPropertyValue("--spectrum-1"), [1, 0.176, 0.561]));
  gl.uniform3fv(U("uTeal"), hexToRgb(css.getPropertyValue("--spectrum-3"), [0.133, 0.878, 1]));
  gl.uniform2f(U("uTexSize"), tex.width, tex.height);
  gl.uniform1f(U("uSpread"), tex.spread);
  gl.uniform1i(U("uInk"), 0);

  /* The bake's channels are data, not colour: no colour-space conversion,
     no premultiplication, or the distances and times are quietly bent. */
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  let w = 0;
  let h = 0;
  let k = 1;
  let layout: InkLayout | null = null;
  function resize(cw: number, ch: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cap = Math.min(1, Math.sqrt(MAX_PIXELS / (cw * ch * dpr * dpr)));
    w = Math.max(1, Math.round(cw * dpr * cap));
    h = Math.max(1, Math.round(ch * dpr * cap));
    k = w / cw;
    canvas.width = w;
    canvas.height = h;
    gl!.viewport(0, 0, w, h);
    layout = inkLayout(cw, ch, tex);
    return layout;
  }

  return {
    resize,
    lost: () => gl.isContextLost(),
    draw(f: InkFrame) {
      if (!layout) return;
      const L = layout;
      gl.uniform2f(u.res, w, h);
      gl.uniform1f(u.px, k);
      gl.uniform4f(u.inkBox, L.ink.x * k, L.ink.y * k, L.ink.w * k, L.ink.h * k);
      gl.uniform4f(u.paper, L.paper.x0 * k, L.paper.y0 * k, L.paper.x1 * k, L.paper.y1 * k);
      gl.uniform4f(u.mount, L.mount.x0 * k, L.mount.y0 * k, L.mount.x1 * k, L.rollerY * k);
      gl.uniform1f(u.rollerY, (L.rollerFrom + (L.rollerY - L.rollerFrom) * f.unroll) * k);
      gl.uniform1f(u.rollerR, L.rollerR * k);
      gl.uniform1f(u.t, f.t);
      gl.uniform1f(u.writeSecs, f.writeSecs);
      gl.uniform1f(u.time, f.time);
      gl.uniform1f(u.lamp, f.lamp);
      gl.uniform1f(u.neon, f.neon);
      gl.uniform1f(u.focus, f.focus);
      gl.uniform1f(u.zoom, f.zoom);
      gl.uniform1f(u.dip, f.dip * k);
      gl.uniform1f(u.sweep, f.sweep);
      gl.uniform2f(u.look, f.lookX, f.lookY);
      gl.uniform3f(u.tip, f.tipX, f.tipY, f.tipLift);
      gl.uniform1f(u.tipR, f.tipR);
      gl.uniform1f(u.tipVis, f.tipVis);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
