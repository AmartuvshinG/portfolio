/**
 * The ink wipe: the site's transition for an overlay opening or closing.
 *
 * Sumi ink floods the screen from where you clicked — the intro's ink, now
 * used as a cut — its wet front catching the sodium light, then breaks up
 * into the paper's fibre and drains away, revealing whatever opened
 * underneath. One fullscreen pass, for well under a second, then the canvas
 * is hidden and nothing runs.
 *
 * Used for exactly two things (a case file, the phone index), so it stays
 * punctuation: a structured interruption, never a per-scroll effect.
 *
 * Module singleton: the canvas and its WebGL context are made on first use
 * and kept. No WebGL, reduced motion, or a lost context → `play` is a no-op
 * and the overlay simply appears, as it always has.
 *
 * Shader rules as everywhere here: pixel ceiling, highp, sin-free hash.
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
uniform vec2 uOrigin;   // buffer px, y down
uniform float uFlood;   // 0…1: the front's travel
uniform float uDrain;   // 0…1: the ink breaking up
uniform float uPx;
uniform vec3 uSodium;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.07 + vec2(11.3, 7.1);
    a *= 0.5;
  }
  return s;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float far = length(max(uOrigin, uRes - uOrigin));
  // The front: a circle roughened by the paper, wider tendrils at its edge.
  float n = fbm(p / (90.0 * uPx));
  float fine = vnoise(p / (6.0 * uPx));
  float r = uFlood * (far * 1.15 + 160.0 * uPx);
  float d = length(p - uOrigin) + (n - 0.5) * 220.0 * uPx + (fine - 0.5) * 18.0 * uPx;
  float ink = smoothstep(r, r - 6.0 * uPx, d);
  // The wet rim just behind the front catches the light.
  float rim = smoothstep(r - 2.0 * uPx, r - 10.0 * uPx, d) * smoothstep(r - 34.0 * uPx, r - 10.0 * uPx, d);

  // Draining: the ink breaks up along the fibre, holes opening everywhere at
  // once but not evenly, each hole with a lit edge of its own.
  float hole = fbm(p / (60.0 * uPx) + 3.1) * 0.75 + fine * 0.25;
  float t = uDrain * 1.15;
  float keep = smoothstep(t - 0.04, t + 0.04, hole);
  float holeRim = (1.0 - smoothstep(0.0, 0.05, abs(hole - t))) * step(0.001, uDrain);
  ink *= keep;

  vec3 sumi = vec3(0.012, 0.014, 0.022) + vec3(0.02, 0.022, 0.03) * n;
  vec3 col = sumi + uSodium * (rim * 0.55 + holeRim * 0.35 * ink);
  float a = clamp(ink + rim * 0.4, 0.0, 1.0);
  gl_FragColor = vec4(col * a, a);
}`;

const MAX_PIXELS = 900_000;
const FLOOD_MS = 520;
const HOLD_MS = 30;
const DRAIN_MS = 480;

type Wipe = {
  canvas: HTMLCanvasElement;
  draw: (flood: number, drain: number) => void;
  resize: () => void;
  setOrigin: (x: number, y: number) => void;
  lost: () => boolean;
};

let wipe: Wipe | null | undefined;
let busy = false;
let lastPointer: { x: number; y: number } | null = null;

if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (e) => {
      lastPointer = { x: e.clientX, y: e.clientY };
    },
    { capture: true, passive: true }
  );
}

function build(): Wipe | null {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    zIndex: "105",
    pointerEvents: "none",
    display: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
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
  const uRes = U("uRes"), uOrigin = U("uOrigin"), uFlood = U("uFlood"), uDrain = U("uDrain"), uPx = U("uPx");
  const hex = getComputedStyle(document.documentElement).getPropertyValue("--color-hazard").trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  const n = m ? parseInt(m[1], 16) : 0xffa02b;
  gl.uniform3f(U("uSodium"), ((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  gl.clearColor(0, 0, 0, 0);

  let k = 1;
  let ox = 0;
  let oy = 0;
  const resize = () => {
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cap = Math.min(1, Math.sqrt(MAX_PIXELS / (cw * ch * dpr * dpr)));
    canvas.width = Math.max(1, Math.round(cw * dpr * cap));
    canvas.height = Math.max(1, Math.round(ch * dpr * cap));
    k = canvas.width / cw;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  document.body.appendChild(canvas);
  return {
    canvas,
    resize,
    lost: () => gl.isContextLost(),
    setOrigin: (x, y) => {
      ox = x;
      oy = y;
    },
    draw: (flood, drain) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uOrigin, ox * k, oy * k);
      gl.uniform1f(uFlood, flood);
      gl.uniform1f(uDrain, drain);
      gl.uniform1f(uPx, k);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}

/** The front gathers, runs, and slows into the corners: you see it travel. */
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeIn = (x: number) => x * x;

/**
 * Play the wipe from a point (default: the last pointer press, else the
 * centre). `onCovered` fires when the screen is fully inked — the moment to
 * swap what is underneath. Resolves when the ink has drained.
 */
export function playInkWipe(opts: { x?: number; y?: number; onCovered?: () => void } = {}): Promise<void> {
  const cover = () => opts.onCovered?.();
  if (typeof window === "undefined") return Promise.resolve();
  if (busy || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cover();
    return Promise.resolve();
  }
  if (wipe === undefined) wipe = build();
  if (!wipe || wipe.lost()) {
    cover();
    return Promise.resolve();
  }
  const w = wipe;
  busy = true;
  w.resize();
  w.setOrigin(opts.x ?? lastPointer?.x ?? window.innerWidth / 2, opts.y ?? lastPointer?.y ?? window.innerHeight / 2);
  w.canvas.style.display = "block";
  return new Promise((resolve) => {
    const t0 = performance.now();
    let covered = false;
    const frame = (now: number) => {
      const t = now - t0;
      const flood = easeInOut(Math.min(1, t / FLOOD_MS));
      const drain = t < FLOOD_MS + HOLD_MS ? 0 : easeIn(Math.min(1, (t - FLOOD_MS - HOLD_MS) / DRAIN_MS));
      if (!covered && t >= FLOOD_MS) {
        covered = true;
        cover();
      }
      w.draw(flood, drain);
      if (t < FLOOD_MS + HOLD_MS + DRAIN_MS) requestAnimationFrame(frame);
      else {
        w.canvas.style.display = "none";
        busy = false;
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}
