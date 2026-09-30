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
  vec2 rp = vec2(px.x, px.y) / uRes.y;
  float rNear = uRain > 0.0 ? rain(rp, 22.0, 7.0, 0.07, 1.0) : 0.0;
  float rMid = uRain > 0.0 ? rain(rp, 46.0, 9.5, 0.09, 7.0) : 0.0;
  float rFar = uRain > 0.0 ? rain(rp, 92.0, 12.0, 0.13, 13.0) : 0.0;
  // The near drops bend the picture behind them, like water on glass.
  duv.x += rNear * 0.0035 * uRain;

  vec2 split = (duv - 0.5) * 0.014 * s;

  // Porthole: the station inside the circle, the city outside.
  float d = length(px - uRes * 0.5);
  float r = uIris * uRMax;
  float inside = uIris >= 1.0 ? 1.0 : (uIris <= 0.0 ? 0.0 : 1.0 - smoothstep(r - 1.0, r + 1.0, d));

  vec3 lumW = vec3(0.2126, 0.7152, 0.0722);
  vec3 teal = vec3(0.30, 0.78, 0.86);

  vec3 col = vec3(0.0);
  if (inside < 1.0) {
    vec2 cuv = coverUv(duv, uCityAR, uCityScale, vec2(0.5, 0.2), uCityShift, 0.5);
    vec3 c = reel(uCity, cuv, split);

    // Split-tone: teal shadows, sodium highlights, weighted away from
    // pixels that are already saturated (the signs).
    float l = dot(c, lumW);
    float mx = max(c.r, max(c.g, c.b));
    float sat = (mx - min(c.r, min(c.g, c.b))) / (mx + 0.001);
    vec3 tone = mix(teal, uAmber * 1.25, smoothstep(0.12, 0.7, l)) * l * 1.35;
    c = mix(c, tone, 0.5 * (1.0 - sat));

    // Anamorphic flare: a horizontal smear of the brightest lights.
    float flare = 0.0;
    for (int i = -5; i <= 5; i++) {
      float fi = float(i);
      vec3 t = texture2D(uCity, clamp(cuv + vec2(fi * 0.02, 0.0), 0.001, 0.999)).rgb;
      flare += max(0.0, dot(t, lumW) - 0.7) * (1.0 - abs(fi) / 6.0);
    }
    c += vec3(0.2, 0.75, 1.0) * flare * 0.2;

    // Sodium haze pooling low in the frame (screen blend, never clips).
    vec3 haze = uAmber * smoothstep(0.35, 1.05, suv.y) * 0.2 * uHaze;
    c = 1.0 - (1.0 - c) * (1.0 - haze);

    // Rain takes the colour of what is behind it, so it glows in front of
    // a sign and is grey against the dark.
    float r = (rNear * 0.26 + rMid * 0.17 + rFar * 0.11) * uRain;
    c += r * mix(vec3(0.7, 0.8, 0.9), c * 2.4, 0.6);

    col = c * uCityOn;
  }
  if (inside > 0.0) {
    vec2 iuv = coverUv(duv, uIssAR, uIssScale, vec2(0.5), 0.0, uIssPosX);
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
  col *= 1.0 - 0.07 * step(2.0, mod(px.y, 3.0));

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
  };

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
  const texes = [makeTex(0), makeTex(1)];
  /** Which frame each texture holds, so an unchanged frame is not re-uploaded. */
  const uploaded = [-1, -1];

  let w = 0;
  let h = 0;
  let rMax = 0;
  function resize() {
    const cw = window.innerWidth;
    const ch = window.innerHeight;
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
    draw(f: FilmFrame, cityVersion: number, issVersion: number) {
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
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      texes.forEach((t) => gl.deleteTexture(t));
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    },
  };
}
