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

  vec2 split = (duv - 0.5) * 0.014 * s;

  // Porthole: the station inside the circle, the city outside.
  float d = length(px - uRes * 0.5);
  float r = uIris * uRMax;
  float inside = uIris >= 1.0 ? 1.0 : (uIris <= 0.0 ? 0.0 : 1.0 - smoothstep(r - 1.0, r + 1.0, d));

  vec3 col = vec3(0.0);
  if (inside < 1.0) {
    vec2 cuv = coverUv(duv, uCityAR, uCityScale, vec2(0.5, 0.2), uCityShift, 0.5);
    col = reel(uCity, cuv, split) * uCityOn;
  }
  if (inside > 0.0) {
    vec2 iuv = coverUv(duv, uIssAR, uIssScale, vec2(0.5), 0.0, uIssPosX);
    col = mix(col, reel(uIss, iuv, split) * uIssOn, inside);
  }

  // The grade: the ramp across the frame at 160deg, soft-light, as the CSS
  // layer did; plus a gentle duotone pull of the highlights toward the ramp.
  float gx = dot(suv - 0.5, vec2(0.342, 0.940)) + 0.5;
  vec3 tint = ramp(gx);
  col = mix(col, softLight(col, tint), uTint);
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, ramp(gx) * lum * 1.15, uTint * 0.35);

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
  };

  const css = getComputedStyle(document.documentElement);
  gl.uniform3fv(U("uS1"), hexToRgb(css.getPropertyValue("--spectrum-1"), [1, 0.176, 0.561]));
  gl.uniform3fv(U("uS2"), hexToRgb(css.getPropertyValue("--spectrum-2"), [0.482, 0.361, 1]));
  gl.uniform3fv(U("uS3"), hexToRgb(css.getPropertyValue("--spectrum-3"), [0.133, 0.878, 1]));
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
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      texes.forEach((t) => gl.deleteTexture(t));
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    },
  };
}
