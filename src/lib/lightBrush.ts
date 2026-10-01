/**
 * The name written in light: the intro's brush, run through a neon tube.
 *
 * The neon signs on the page (ui/InkSign) hang as unlit glass until they are
 * reached, and then this lights them along the brush's own route — the same
 * bake as the intro (/intro/ink-name.png: R distance, G arrival), the same
 * order, the same lifts. A hot spark rides the front; what it has passed
 * glows white for a moment and cools to sodium; the glass around it catches
 * a halo. When the run is over, the static sign (a CSS mask with a drop-
 * shadow) takes over and this context is thrown away.
 *
 * Small and short-lived on purpose: one fragment pass, a canvas the size of
 * the sign plus its halo, alive for a few seconds, one at a time (see
 * lib/inkWriteQueue). No CSS filter on a canvas that changes every frame —
 * the halo is computed here from a ring of taps on the distance field.
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
uniform vec4 uBox;        // the ink box in buffer px: x, y, w, h (y down)
uniform sampler2D uInk;
uniform vec2 uTexSize;
uniform float uSpread;
uniform float uT;         // 0…1 of the writing (beyond 1 as it settles)
uniform float uSecs;      // the writing's length, s
uniform vec3 uTip;        // x, y (0…1 of the box), lift 0…1
uniform float uTipVis;
uniform vec3 uHot;
uniform vec3 uWarm;
uniform vec3 uDeep;

/* How lit a point of the tube is: inside the ink, and already reached. */
float litAt(vec2 uv, float aa) {
  vec4 s = texture2D(uInk, uv);
  float d = (s.r - 0.5) * 2.0 * uSpread;   // texture px, ink > 0
  float on = smoothstep(-0.008, 0.02, uT - s.g);
  return smoothstep(-aa, aa, d) * on;
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 uv = (frag - uBox.xy) / uBox.zw;
  float pxT = uBox.w / uTexSize.y;          // buffer px per texture px
  float aa = 0.9 / pxT;

  vec4 s = texture2D(uInk, uv);
  float d = (s.r - 0.5) * 2.0 * uSpread;
  float lt = (uT - s.g) * uSecs;           // s since the light passed
  float on = smoothstep(-0.008, 0.02, uT - s.g);
  float core = smoothstep(-aa, aa, d) * on;
  // The tube is brightest at its centre line.
  float ridge = smoothstep(0.0, 6.0, d);

  // Halo: a ring of taps, two radii, on what is already lit.
  vec2 tx = 1.0 / uBox.zw;
  float glow = 0.0;
  for (int i = 0; i < 10; i++) {
    float an = float(i) * 0.6283;
    vec2 dir = vec2(cos(an), sin(an));
    glow += litAt(uv + dir * tx * 5.0, aa * 3.0) * 0.6;
    glow += litAt(uv + dir * tx * 13.0, aa * 6.0) * 0.4;
  }
  glow /= 10.0;

  // The gas: white-hot where the light has just passed, cooling to sodium,
  // and the sign's own gradient down its length.
  float fresh = exp(-max(lt, 0.0) * 2.4) * on;
  vec3 tube = mix(uWarm, uDeep, smoothstep(0.2, 1.0, uv.y));
  tube = mix(tube, uHot, min(1.0, 0.6 * ridge + 0.65 * fresh));

  // The spark at the front: hot when the brush is down, a dim ember in the
  // air between strokes.
  vec2 tipP = uBox.xy + uTip.xy * uBox.zw;
  float td = length(frag - tipP) / max(pxT, 0.001);   // texture px
  float down = 1.0 - uTip.z;
  float spark = (exp(-td * td / 90.0) * 1.4 + exp(-td / 22.0) * 0.35) * uTipVis * (0.25 + 0.75 * down);

  vec3 col = tube * core * (1.0 + 0.5 * fresh)
           + uWarm * glow * 1.1
           + mix(uWarm, uHot, 0.7) * spark;
  float alpha = clamp(max(core, max(glow * 0.85, spark)), 0.0, 1.0);
  gl_FragColor = vec4(min(col, vec3(1.0)), alpha);
}`;

/** Halo room round the sign, CSS px. */
export const LIGHT_PAD = 18;
const MAX_PIXELS = 420_000;

function hexToRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

let imagePromise: Promise<HTMLImageElement | null> | null = null;
/** The bake, decoded once for every sign. */
export function loadInkImage(src: string): Promise<HTMLImageElement | null> {
  if (!imagePromise) {
    imagePromise = new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      img
        .decode()
        .then(() => resolve(img))
        .catch(() => resolve(null));
    });
  }
  return imagePromise;
}

export interface LightFrame {
  t: number;
  secs: number;
  tipX: number;
  tipY: number;
  tipLift: number;
  tipVis: number;
}

/**
 * A renderer for one sign. `cssW`/`cssH` are the sign's box (without the
 * pad). Returns null without WebGL.
 */
export function createLightBrush(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  tex: { width: number; height: number; spread: number },
  cssW: number,
  cssH: number
) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn("[light] shader:", gl.getShaderInfoLog(sh));
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
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = (n: string) => gl.getUniformLocation(prog, n);
  const css = getComputedStyle(document.documentElement);
  gl.uniform3fv(U("uHot"), [1, 0.945, 0.863]); // #fff1dc, the CSS sign's top stop
  gl.uniform3fv(U("uWarm"), hexToRgb(css.getPropertyValue("--color-hazard"), [1, 0.627, 0.169]));
  gl.uniform3fv(U("uDeep"), [1, 0.478, 0.165]); // #ff7a2a, its foot
  gl.uniform2f(U("uTexSize"), tex.width, tex.height);
  gl.uniform1f(U("uSpread"), tex.spread);
  gl.uniform1i(U("uInk"), 0);

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

  const fullW = cssW + LIGHT_PAD * 2;
  const fullH = cssH + LIGHT_PAD * 2;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cap = Math.min(1, Math.sqrt(MAX_PIXELS / (fullW * fullH * dpr * dpr)));
  const k = dpr * cap;
  canvas.width = Math.max(1, Math.round(fullW * k));
  canvas.height = Math.max(1, Math.round(fullH * k));
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform2f(U("uRes"), canvas.width, canvas.height);
  gl.uniform4f(U("uBox"), LIGHT_PAD * k, LIGHT_PAD * k, cssW * k, cssH * k);

  const u = {
    t: U("uT"),
    secs: U("uSecs"),
    tip: U("uTip"),
    tipVis: U("uTipVis"),
  };

  return {
    draw(f: LightFrame) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(u.t, f.t);
      gl.uniform1f(u.secs, f.secs);
      gl.uniform3f(u.tip, f.tipX, f.tipY, f.tipLift);
      gl.uniform1f(u.tipVis, f.tipVis);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    /** Give the context back now rather than at GC: browsers cap them. */
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
