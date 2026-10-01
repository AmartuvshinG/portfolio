/**
 * The film's signal grade: one WebGL pass that draws both reels.
 *
 * Everything FilmBackdrop used to do with CSS on two `<video>` elements — the
 * cover crop, the push-in, the city's climb, the porthole iris and its ramp
 * ring, the soft-light grade — happens here instead, plus the three things CSS
 * could not do cheaply:
 *
 *   aberration   the red and blue channels pull apart radially
 *   slices       a handful of seeded horizontal bands shear sideways
 *   scanlines    faint, fixed in screen space
 *
 * And the Blade Runner layer, on the city reel only (space is not sodium-lit,
 * and it does not rain there):
 *
 *   grade        shadows to teal, highlights to sodium amber — except where a
 *                pixel is already saturated, so the neon signs stay neon
 *   rain         three depths of procedural streaks that take the colour of
 *                what is behind them; the near layer refracts the picture
 *   flare        a horizontal anamorphic streak off the brightest lights
 *   haze         sodium light pooling low in the frame, thinning as the
 *                camera climbs
 *   reflection   the hero's neon sign (its brushed mask, uploaded once),
 *                mirrored on the wet floor in the lower frame: squashed,
 *                smeared sideways and broken by ripples, the way a street
 *                sign lies in a puddle. Full quality, desktop, hero only
 *
 * And the camera's look (fine pointers only): the cursor turns the frame a
 * little, the way the reference "mouse-responsive background" pans its plate,
 * but at depth — the reels move least, the far rain a little more, the rain
 * on the glass most. Three speeds of the same gesture is what makes the film
 * read as a space rather than a picture. The plates are overscanned while it
 * is on, so the shift never reaches the clamped edge of the frame.
 *
 * The cursor is also a light. Around the (eased) pointer the rain catches it —
 * drops brighten, a faint sodium pool sits on the wet glass — the way a hand
 * torch picks out rain. City reel only, only while it rains, so it adds no
 * draws: the rain already redraws at 30 fps.
 *
 * Rain moves, so while the city is on screen the caller draws at 30fps even
 * at rest. Everything else still draws only when something changed.
 *
 * Aberration and slices are driven by `speed`: how fast the *film* is moving
 * (|Δf| per frame, smoothed), not how fast the page scrolls. The beat map
 * holds the film nearly still while a section is read, so they only happen at
 * the joins, while the picture is actually travelling — and never on a frame
 * at rest, where a sheared band would read as a rendering fault.
 *
 * Portability (see the GLSL traps memory): no `pow()` of anything that can be
 * negative, no `sin`-based hash, highp where available.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vUv;
uniform sampler2D uCity;
uniform sampler2D uIss;
uniform vec2 uRes;          // buffer size, px
uniform float uCityAR;      // video width / height
uniform float uIssAR;
uniform float uCityScale;
uniform float uCityShift;   // translateY, fraction of height
uniform float uIssScale;
uniform float uIssPosX;     // object-position x, 0..1
uniform float uIris;        // 0..1
uniform float uRMax;        // px
uniform float uTint;        // grade strength
uniform float uSpeed;       // 0..1
uniform float uCityOn;      // fade-in, 0..1
uniform float uIssOn;
uniform vec3 uS1;
uniform vec3 uS2;
uniform vec3 uS3;
uniform vec3 uAmber;        // the sodium token
uniform float uTime;        // wrapped seconds
uniform float uRain;        // 0..1
uniform float uHaze;        // 0..1
uniform vec2 uLook;         // eased pointer, -1..1, +y down
uniform float uOverscan;    // plate zoom that buys the look its headroom
uniform float uCursorOn;    // 1 on a fine pointer
uniform float uBloom;       // 0 or 1: halation + grain (full quality only)
uniform float uGrade;       // 1 = the grade; 0 = the raw footage (the lab's split view)
uniform sampler2D uSign;    // the neon sign's mask (alpha)
uniform vec4 uSignRect;     // the sign on screen, buffer px: x, y, w, h (y down)
uniform float uFloor;       // the waterline, buffer px from the top
uniform float uReflect;     // 0…1: how much of the sign lies on the floor

// Dave Hoskins' sin-free hash: identical on every GPU.
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

vec3 ramp(float t) {
  t = clamp(t, 0.0, 1.0);
  return t < 0.5 ? mix(uS1, uS2, t * 2.0) : mix(uS2, uS3, t * 2.0 - 1.0);
}

// Screen uv (y down) -> video uv, like object-fit: cover with a CSS
// translate + scale about an origin.
vec2 coverUv(vec2 suv, float vAR, float scale, vec2 origin, float shiftY, float posX) {
  vec2 p = origin + (suv - vec2(0.0, shiftY) - origin) / scale;
  float sAR = uRes.x / uRes.y;
  vec2 k = sAR > vAR ? vec2(1.0, vAR / sAR) : vec2(sAR / vAR, 1.0);
  vec2 uv = 0.5 + (p - 0.5) * k;
  uv.x += (1.0 - k.x) * (posX - 0.5);
  return uv;
}

// One reel, with the channels split along the radial offset.
vec3 reel(sampler2D tex, vec2 uv, vec2 split) {
  float r = texture2D(tex, clamp(uv + split, 0.001, 0.999)).r;
  float g = texture2D(tex, clamp(uv, 0.001, 0.999)).g;
  float b = texture2D(tex, clamp(uv - split, 0.001, 0.999)).b;
  return vec3(r, g, b);
}

// One depth of rain: columns of short slanted streaks falling through cells.
// Each streak lives wholly inside its cell, so nothing tears at a boundary.
float rain(vec2 p, float cols, float speed, float width, float seed) {
  p.x += p.y * 0.16;
  vec2 q = vec2(p.x * cols, p.y * cols * 0.25 - uTime * speed);
  vec2 cell = floor(q);
  vec2 f = fract(q);
  float on = step(0.62, hash11(cell.x * 3.17 + cell.y * 17.31 + seed));
  float cx = 0.2 + 0.6 * hash11(cell.x * 13.7 + cell.y * 1.93 + seed);
  float body = 1.0 - smoothstep(0.0, width, abs(f.x - cx));
  float len = smoothstep(0.08, 0.45, f.y) * (1.0 - smoothstep(0.5, 0.92, f.y));
  return on * body * len;
}

vec3 softLight(vec3 base, vec3 blend) {
  return mix(
    2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
    sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
    step(0.5, blend)
  );
}

void main() {
  vec2 suv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 px = suv * uRes;

  // Slices: nine bands, a seeded few of which shear. Only while moving.
  float s = uSpeed;
  float band = floor(suv.y * 9.0 + 0.35);
  float h = hash11(band + 7.0);
  float shear = step(0.62, h) * (h - 0.5) * 0.09 * max(0.0, s - 0.3);
  vec2 duv = suv + vec2(shear, 0.0);

  // Rain, in screen space (y down, scaled by height so it is round).
  // Each depth shifts by its own share of the look: the parallax.
  vec2 rp = vec2(px.x, px.y) / uRes.y;
  vec2 lookH = uLook * vec2(uRes.x / uRes.y, 0.5);
  float rNear = uRain > 0.0 ? rain(rp + lookH * 0.03, 22.0, 7.0, 0.07, 1.0) : 0.0;
  float rMid = uRain > 0.0 ? rain(rp + lookH * 0.018, 46.0, 9.5, 0.09, 7.0) : 0.0;
  float rFar = uRain > 0.0 ? rain(rp + lookH * 0.008, 92.0, 12.0, 0.13, 13.0) : 0.0;
  // The near drops bend the picture behind them, like water on glass.
  duv.x += rNear * 0.0035 * uRain;

  vec2 split = (duv - 0.5) * 0.014 * s;

  // The plates' share of the look, smallest of all: they are the far wall.
  vec2 plateShift = uLook * vec2(0.012, 0.006);
  vec2 puv = duv + plateShift;

  // Porthole: the station inside the circle, the city outside. The hole is
  // cut in the plate, so it moves with the plate.
  float d = length(px - uRes * (0.5 - plateShift));
  float r = uIris * uRMax;
  float inside = uIris >= 1.0 ? 1.0 : (uIris <= 0.0 ? 0.0 : 1.0 - smoothstep(r - 1.0, r + 1.0, d));

  vec3 lumW = vec3(0.2126, 0.7152, 0.0722);
  vec3 teal = vec3(0.30, 0.78, 0.86);

  vec3 col = vec3(0.0);
  if (inside < 1.0) {
    vec2 cuv = coverUv(puv, uCityAR, uCityScale * uOverscan, vec2(0.5, 0.2), uCityShift, 0.5);
    vec3 c = reel(uCity, cuv, split);

    // Split-tone: teal shadows, sodium highlights, weighted away from
    // pixels that are already saturated (the signs).
    float l = dot(c, lumW);
    float mx = max(c.r, max(c.g, c.b));
    float sat = (mx - min(c.r, min(c.g, c.b))) / (mx + 0.001);
    vec3 tone = mix(teal, uAmber * 1.25, smoothstep(0.12, 0.7, l)) * l * 1.35;
    c = mix(c, tone, 0.5 * (1.0 - sat) * uGrade);

    // Anamorphic flare: a horizontal smear of the brightest lights.
    float flare = 0.0;
    for (int i = -5; i <= 5; i++) {
      float fi = float(i);
      vec3 t = texture2D(uCity, clamp(cuv + vec2(fi * 0.02, 0.0), 0.001, 0.999)).rgb;
      flare += max(0.0, dot(t, lumW) - 0.7) * (1.0 - abs(fi) / 6.0);
    }
    c += vec3(0.2, 0.75, 1.0) * flare * 0.2 * uGrade;

    // Halation: on film, the brightest lights bleed a warm, red-leaning
    // glow into the emulsion around them. Two rings of taps, a bright-pass
    // threshold, tinted toward red-orange. Full quality only — sixteen more
    // samples a pixel is the price, and the pixel ceiling bounds it.
    if (uBloom > 0.0) {
      vec3 halo = vec3(0.0);
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.7854;
        vec2 o = vec2(cos(a), sin(a) * uCityAR);
        vec3 t1 = texture2D(uCity, clamp(cuv + o * 0.010, 0.001, 0.999)).rgb;
        vec3 t2 = texture2D(uCity, clamp(cuv + o * 0.024, 0.001, 0.999)).rgb;
        halo += t1 * max(0.0, dot(t1, lumW) - 0.55) * 1.2 + t2 * max(0.0, dot(t2, lumW) - 0.55) * 0.7;
      }
      halo /= 8.0;
      c += halo * vec3(1.0, 0.55, 0.38) * 0.9 * uBloom;
    }

    // Sodium haze pooling low in the frame (screen blend, never clips). It
    // peaks above the bottom edge and falls away under it, because the
    // bottom strip is where the page sets its micro-labels.
    float hazeBand = smoothstep(0.35, 0.8, suv.y) * (1.0 - smoothstep(0.84, 1.0, suv.y) * 0.75);
    vec3 haze = uAmber * hazeBand * 0.18 * uHaze;
    c = 1.0 - (1.0 - c) * (1.0 - haze);

    // The cursor's light: a soft pool where the eased pointer is.
    vec2 cd = (suv - (uLook * 0.5 + 0.5)) * vec2(uRes.x / uRes.y, 1.0);
    float torch = uCursorOn * exp(-dot(cd, cd) / 0.04);
    c = 1.0 - (1.0 - c) * (1.0 - uAmber * 0.035 * torch * uRain);

    // Rain takes the colour of what is behind it, so it glows in front of
    // a sign and is grey against the dark — and catches the cursor's light.
    float r = (rNear * 0.26 + rMid * 0.17 + rFar * 0.11) * uRain * (1.0 + 1.4 * torch);
    c += r * mix(vec3(0.7, 0.8, 0.9), c * 2.4, 0.6);

    // The sign on the wet floor. Below the waterline the sign is mirrored
    // and squashed; a rough wet surface spreads it sideways and drags it
    // into vertical streaks, and ripples bend it and break it into bands.
    if (uReflect > 0.0 && px.y > uFloor) {
      float depth = (px.y - uFloor) / (uSignRect.w * 0.9);
      if (depth < 1.0) {
        float ry = rp.y;
        float rip = sin(ry * 120.0 + uTime * 2.4) * 0.05 + sin(ry * 310.0 - uTime * 3.3) * 0.02;
        float cx = uSignRect.x + uSignRect.z * 0.5;
        float u = (px.x - cx) / (uSignRect.z * 1.7) + 0.5 + rip * (0.4 + depth);
        float v = 1.0 - depth;
        float m = 0.0;
        if (u > -0.2 && u < 1.2) {
          for (int i = -2; i <= 2; i++) {
            float du = float(i) * 0.06;
            float wgt = 1.0 - abs(float(i)) * 0.3;
            m += texture2D(uSign, vec2(u + du, v)).a * wgt;
            m += texture2D(uSign, vec2(u + du, v + 0.035)).a * wgt * 0.7;
            m += texture2D(uSign, vec2(u + du, v + 0.07)).a * wgt * 0.45;
          }
          m = smoothstep(0.08, 1.1, m / 2.2 * 2.5);
        }
        float bands = 0.55 + 0.45 * sin(ry * 240.0 + uTime * 1.7);
        float fade = (1.0 - depth) * (1.0 - depth * 0.6) * uReflect * bands;
        vec3 neonR = mix(vec3(1.0, 0.8, 0.5), uAmber, v * 0.7 + 0.3);
        c = 1.0 - (1.0 - c) * (1.0 - clamp(neonR * m * fade * 1.5, 0.0, 0.92));
      }
    }

    col = c * uCityOn;
  }
  if (inside > 0.0) {
    vec2 iuv = coverUv(puv, uIssAR, uIssScale * uOverscan, vec2(0.5), 0.0, uIssPosX);
    vec3 c = reel(uIss, iuv, split);
    // Space: nearly neutral, a cool teal lift and nothing warm.
    c = mix(c, c * vec3(0.9, 1.0, 1.08), 0.5);
    col = mix(col, c * uIssOn, inside);
  }

  // The ramp, soft-light across the frame at 160deg: the neon half of the
  // palette. Half strength over the city, where the sodium grade leads.
  float gx = dot(suv - 0.5, vec2(0.342, 0.940)) + 0.5;
  float tintK = uTint * mix(0.5, 1.0, inside);
  col = mix(col, softLight(clamp(col, 0.0, 1.0), ramp(gx)), tintK);

  // The porthole's rim: three strokes of the ramp at the iris edge.
  if (uIris > 0.0 && uIris < 1.0) {
    float e = abs(d - r);
    float ringA = max(max((1.0 - smoothstep(10.0, 11.0, e)) * 0.18, (1.0 - smoothstep(3.5, 4.5, e)) * 0.35), 1.0 - smoothstep(0.8, 1.8, e));
    ringA *= 1.0 - clamp((uIris - 0.7) / 0.3, 0.0, 1.0);
    col = mix(col, ramp((suv.x + suv.y) * 0.5), ringA);
  }

  // Scanlines, fixed to the screen.
  col *= 1.0 - 0.07 * step(2.0, mod(px.y, 3.0)) * uGrade;

  // Film grain, stepped at 24 fps, heavier in the shadows the way a stock's
  // grain shows most in the dark. Drawn only on frames the film already
  // draws, so at rest it simply holds.
  if (uBloom > 0.0) {
    float gt = floor(uTime * 24.0);
    float gr = hash11(px.x * 0.7317 + px.y * 13.137 + gt * 71.3) - 0.5;
    float lum = dot(col, lumW);
    col += gr * 0.045 * (1.0 - smoothstep(0.0, 0.6, lum)) * uBloom;
  }

  gl_FragColor = vec4(col, 1.0);
}`;

/** Hard ceiling on the drawing buffer; the canvas is CSS-upscaled. */
const MAX_PIXELS = 1_100_000;

export interface FilmFrame {
  time: number;
  rain: number;
  haze: number;
  cityScale: number;
  cityShift: number;
  issScale: number;
  issPosX: number;
  iris: number;
  tint: number;
  speed: number;
  cityOn: number;
  issOn: number;
  /** Eased pointer, −1…1 (zeros on touch). */
  lookX: number;
  lookY: number;
  /** 1, or ~1.035 while the look is live. */
  overscan: number;
  /** 1 when the pointer is a light (fine pointer), else 0. */
  cursorOn: number;
  /** 1 for halation and grain (full quality), else 0. */
  bloom: number;
  /** The grade (split-tone, flare, scanlines); 0 shows the raw footage. Default 1. */
  grade?: number;
  /** The hero sign's reflection (CSS px; null when there is none). */
  reflect?: { x: number; y: number; w: number; h: number; floor: number; amount: number } | null;
}

function hexToRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Build the renderer on `canvas`, or return null if WebGL is unavailable (the
 * caller then keeps the plain-video path).
 */
export function createFilmRenderer(
  canvas: HTMLCanvasElement,
  city: HTMLVideoElement,
  iss: HTMLVideoElement
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
      console.warn("[film] shader:", gl.getShaderInfoLog(sh));
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
    console.warn("[film] link:", gl.getProgramInfoLog(prog));
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
    cityAR: U("uCityAR"),
    issAR: U("uIssAR"),
    cityScale: U("uCityScale"),
    cityShift: U("uCityShift"),
    issScale: U("uIssScale"),
    issPosX: U("uIssPosX"),
    iris: U("uIris"),
    rMax: U("uRMax"),
    tint: U("uTint"),
    speed: U("uSpeed"),
    cityOn: U("uCityOn"),
    issOn: U("uIssOn"),
    time: U("uTime"),
    rain: U("uRain"),
    haze: U("uHaze"),
    look: U("uLook"),
    overscan: U("uOverscan"),
    cursorOn: U("uCursorOn"),
    bloom: U("uBloom"),
    grade: U("uGrade"),
    signRect: U("uSignRect"),
    floor: U("uFloor"),
    reflect: U("uReflect"),
  };
  gl.uniform1i(U("uSign"), 2);

  const css = getComputedStyle(document.documentElement);
  gl.uniform3fv(U("uS1"), hexToRgb(css.getPropertyValue("--spectrum-1"), [1, 0.176, 0.561]));
  gl.uniform3fv(U("uS2"), hexToRgb(css.getPropertyValue("--spectrum-2"), [0.482, 0.361, 1]));
  gl.uniform3fv(U("uS3"), hexToRgb(css.getPropertyValue("--spectrum-3"), [0.133, 0.878, 1]));
  gl.uniform3fv(U("uAmber"), hexToRgb(css.getPropertyValue("--color-hazard"), [1, 0.627, 0.169]));
  gl.uniform1i(U("uCity"), 0);
  gl.uniform1i(U("uIss"), 1);

  const makeTex = (unit: number) => {
    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([5, 6, 13]));
    return tex;
  };
  const texes = [makeTex(0), makeTex(1), makeTex(2)];
  /** Which frame each texture holds, so an unchanged frame is not re-uploaded. */
  const uploaded = [-1, -1];

  let w = 0;
  let h = 0;
  let rMax = 0;
  let signReady = false;
  /** The backdrop fills the window; the lab's split view passes its box. */
  function resize(cw = window.innerWidth, ch = window.innerHeight) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const k = Math.min(1, Math.sqrt(MAX_PIXELS / (cw * ch * dpr * dpr)));
    w = Math.max(1, Math.round(cw * dpr * k));
    h = Math.max(1, Math.round(ch * dpr * k));
    canvas.width = w;
    canvas.height = h;
    rMax = Math.hypot(w / 2, h / 2) + 4;
    gl!.viewport(0, 0, w, h);
  }
  resize();

  function upload(unit: number, video: HTMLVideoElement, version: number) {
    if (video.readyState < 2 || uploaded[unit] === version) return;
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, texes[unit]);
    try {
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, video);
      uploaded[unit] = version;
    } catch {
      /* A frame that cannot be read yet; the next seeked event retries. */
    }
  }

  return {
    resize,
    lost: () => gl.isContextLost(),
    /** `clip`: draw only buffer columns [x0, x1) — the lab draws the raw and
     *  the graded film side by side, two draws through a scissor. */
    draw(f: FilmFrame, cityVersion: number, issVersion: number, clip?: [number, number]) {
      if (f.iris < 1) upload(0, city, cityVersion);
      if (f.iris > 0) upload(1, iss, issVersion);
      gl.uniform2f(u.res, w, h);
      gl.uniform1f(u.cityAR, city.videoWidth ? city.videoWidth / city.videoHeight : 16 / 9);
      gl.uniform1f(u.issAR, iss.videoWidth ? iss.videoWidth / iss.videoHeight : 16 / 9);
      gl.uniform1f(u.cityScale, f.cityScale);
      gl.uniform1f(u.cityShift, f.cityShift);
      gl.uniform1f(u.issScale, f.issScale);
      gl.uniform1f(u.issPosX, f.issPosX);
      gl.uniform1f(u.iris, f.iris);
      gl.uniform1f(u.rMax, rMax);
      gl.uniform1f(u.tint, f.tint);
      gl.uniform1f(u.speed, f.speed);
      gl.uniform1f(u.cityOn, f.cityOn);
      gl.uniform1f(u.issOn, f.issOn);
      gl.uniform1f(u.time, f.time);
      gl.uniform1f(u.rain, f.rain);
      gl.uniform1f(u.haze, f.haze);
      gl.uniform2f(u.look, f.lookX, f.lookY);
      gl.uniform1f(u.overscan, f.overscan);
      gl.uniform1f(u.cursorOn, f.cursorOn);
      gl.uniform1f(u.bloom, f.bloom);
      gl.uniform1f(u.grade, f.grade ?? 1);
      const r = signReady ? f.reflect : null;
      if (r && r.amount > 0) {
        const k = w / window.innerWidth;
        gl.uniform4f(u.signRect, r.x * k, r.y * k, r.w * k, r.h * k);
        gl.uniform1f(u.floor, r.floor * k);
        gl.uniform1f(u.reflect, r.amount);
      } else gl.uniform1f(u.reflect, 0);
      if (clip) {
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(Math.round(clip[0]), 0, Math.max(0, Math.round(clip[1] - clip[0])), h);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (clip) gl.disable(gl.SCISSOR_TEST);
    },
    /** Buffer width, px (for the caller's scissor). */
    width: () => w,
    /** The neon sign's mask, for its reflection on the floor. Once.
     *  Uploaded small and pre-blurred: the sign is ~40px wide on screen, so
     *  the full-size mask's thin strokes would be hit or missed per pixel;
     *  a soft low-res copy reads as coverage, which is what a puddle shows. */
    setSign(image: HTMLImageElement) {
      const c = document.createElement("canvas");
      c.width = 48;
      c.height = Math.round((48 * image.naturalHeight) / Math.max(1, image.naturalWidth));
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.filter = "blur(1.2px)";
      ctx.drawImage(image, 0, 0, c.width, c.height);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, texes[2]);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      signReady = true;
    },
    dispose() {
      texes.forEach((t) => gl.deleteTexture(t));
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    },
  };
}
