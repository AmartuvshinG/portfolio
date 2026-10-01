/**
 * The LAB's brush exhibit: the intro's bake, taken apart.
 *
 * The same texture the intro and the neon signs read (/intro/ink-name.png),
 * drawn three ways so a visitor can see what each channel holds:
 *
 *   ink       what the intro shows: sumi on paper, written up to `t`
 *   arrival   G — when the brush reaches each pixel — as a heat ramp along
 *             the spectrum, with the front drawn white. The order of the
 *             strokes is right there in the colour.
 *   distance  R — the signed distance to the stroke's edge — as contour
 *             lines: sodium inside the ink, holo outside, the edge white.
 *
 * The brush's route (INK_PATH) is drawn over it by the exhibit on a plain 2D
 * canvas. One fragment pass; it draws only when the exhibit asks.
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
uniform vec4 uBox;          // the texture's box in buffer px: x, y, w, h (y down)
uniform sampler2D uInk;
uniform vec2 uTexSize;
uniform float uSpread;
uniform float uT;
uniform float uMode;        // 0 ink, 1 arrival, 2 distance
uniform vec3 uS1;
uniform vec3 uS2;
uniform vec3 uS3;
uniform vec3 uAmber;
uniform vec3 uHolo;

vec3 ramp(float a) {
  return a < 0.5 ? mix(uS1, uS2, a * 2.0) : mix(uS2, uS3, a * 2.0 - 1.0);
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 uv = (frag - uBox.xy) / uBox.zw;
  float pxT = uBox.w / uTexSize.y;
  vec3 ground = uMode < 0.5 ? vec3(0.89, 0.85, 0.76) : vec3(0.02, 0.024, 0.05);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(ground, 1.0);
    return;
  }
  vec4 s = texture2D(uInk, uv);
  float d = (s.r - 0.5) * 2.0 * uSpread;    // texture px, ink > 0
  float a = s.g;
  float aa = 0.8 / pxT;
  float inside = smoothstep(-aa, aa, d);
  float written = smoothstep(-0.004, 0.004, uT - a);
  vec3 col = ground;

  if (uMode < 0.5) {
    col = mix(ground, vec3(0.03, 0.035, 0.05), inside * written);
  } else if (uMode < 1.5) {
    // Unwritten ink is a faint ghost; written ink takes its arrival colour.
    col = mix(ground, vec3(0.16, 0.17, 0.22), inside * (1.0 - written));
    col = mix(col, ramp(clamp(a, 0.0, 1.0)), inside * written);
    // The front: a thin white line where arrival crosses t.
    float front = 1.0 - smoothstep(0.0, 0.006, abs(a - uT));
    col = mix(col, vec3(1.0), front * inside * step(0.001, uT) * step(uT, 0.999));
  } else {
    // Contours every 3 texture px, fading with distance; the edge in white.
    float band = abs(fract(d / 3.0) - 0.5) * 3.0;        // texture px to the nearest line
    float line = 1.0 - smoothstep(0.0, 1.2 / pxT + 0.35, band);
    float fade = 1.0 - smoothstep(0.0, uSpread, abs(d));
    vec3 tone = d > 0.0 ? uAmber : uHolo;
    col = ground + tone * line * fade * 0.85;
    float edge = 1.0 - smoothstep(0.0, aa * 1.5, abs(d));
    col = mix(col, vec3(1.0), edge * 0.9);
    // Only the written part is lit; the rest is dimmed.
    col = mix(ground + (col - ground) * 0.25, col, written);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

function hexToRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export type BrushMode = "ink" | "arrival" | "distance";
const MODE: Record<BrushMode, number> = { ink: 0, arrival: 1, distance: 2 };

/** Where the texture sits in a box of `cw`×`ch`: contained, centred. */
export function fitTexture(cw: number, ch: number, tex: { width: number; height: number }, pad = 16) {
  const k = Math.min((cw - pad * 2) / tex.width, (ch - pad * 2) / tex.height);
  const w = tex.width * k;
  const h = tex.height * k;
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
}

export function createLabBrush(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  tex: { width: number; height: number; spread: number }
) {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn("[lab] shader:", gl.getShaderInfoLog(sh));
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
  gl.uniform3fv(U("uS1"), hexToRgb(css.getPropertyValue("--spectrum-1"), [1, 0.176, 0.561]));
  gl.uniform3fv(U("uS2"), hexToRgb(css.getPropertyValue("--spectrum-2"), [0.482, 0.361, 1]));
  gl.uniform3fv(U("uS3"), hexToRgb(css.getPropertyValue("--spectrum-3"), [0.133, 0.878, 1]));
  gl.uniform3fv(U("uAmber"), hexToRgb(css.getPropertyValue("--color-hazard"), [1, 0.627, 0.169]));
  gl.uniform3fv(U("uHolo"), hexToRgb(css.getPropertyValue("--color-holo"), [0.494, 0.918, 1]));
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

  const u = { res: U("uRes"), box: U("uBox"), t: U("uT"), mode: U("uMode") };
  let k = 1;

  return {
    /** Size the buffer to a CSS box; returns buffer px per CSS px. */
    resize(cw: number, ch: number) {
      k = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(cw * k));
      canvas.height = Math.max(1, Math.round(ch * k));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      const b = fitTexture(cw, ch, tex);
      gl.uniform4f(u.box, b.x * k, b.y * k, b.w * k, b.h * k);
      return b;
    },
    draw(t: number, mode: BrushMode) {
      gl.uniform1f(u.t, t);
      gl.uniform1f(u.mode, MODE[mode]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
