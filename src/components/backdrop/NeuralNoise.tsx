"use client";

import { useEffect, useRef } from "react";
import { useAct, type Act } from "@/components/chrome/ActTheme";
import { useScrollProgressRef } from "@/hooks/useScrollProgress";
import { backdrop } from "@/lib/backdrop";

/**
 * The ground the whole site stands on.
 *
 * A fullscreen neural-noise field: fifteen rotated, accumulating sine layers
 * that resolve into filaments of light out of a black ground. It is the single
 * background for the entire document — every section is transparent on top of
 * it — which is what removes the seams the per-section grounds used to leave at
 * every boundary.
 *
 * Three things drive it, and between them they are the "journey":
 *
 *   pointer  — the field blooms around the cursor, everywhere, always
 *   scroll   — hue travels the spectrum ramp magenta → violet → cyan top to
 *              bottom, and the filaments tighten as you descend
 *   act      — depth (void / deck / bloom) is a gain and speed change *in the
 *              shader*, replacing the old repaint of a div behind the content
 *
 * Deliberately raw WebGL rather than three.js: this is one full-screen quad
 * with one program, and it has to coexist with the work world's real scene
 * without fighting it for context or bundle.
 */

interface NeuralNoiseProps {
  /** Peak strength at the top of the page. */
  opacity?: number;
  /** The three spectrum stops, as hex. Order is the ramp order. */
  colors?: [string, string, string];
  className?: string;
}

const DEFAULT_COLORS: [string, string, string] = [
  "#ff2d8f",
  "#7b5cff",
  "#22e0ff",
];

/** Per-act [gain, speed] — depth, expressed as light rather than as paint. */
const ACT_TUNING: Record<Act, [number, number]> = {
  void: [1, 1],
  deck: [0.78, 0.82],
  bloom: [1.32, 1.18],
};

const VERTEX = `
precision mediump float;
varying vec2 vUv;
attribute vec2 a_position;
void main() {
  vUv = 0.5 * (a_position + 1.0);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT = `
/* highp, not mediump.
   The reference ships mediump and gets away with it on a desktop GPU, where
   mediump is silently implemented as fp32. Where it is honoured as fp16 —
   SwiftShader, and a great many mobile GPUs — this shader falls apart: the
   reference feeds \`performance.now()\` straight in as milliseconds, which
   exceeds fp16's usable range within seconds, \`cos()\` of the resulting garbage
   returns a constant, every one of the 15 layers accumulates in phase, and the
   whole field saturates to flat white. See the CPU side for the other half of
   this fix — the time uniform is now small and wrapped. */
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vUv;

/** Seconds, wrapped. Never raw performance.now(). */
uniform float u_time;
uniform float u_ratio;
uniform vec2  u_pointer_position;
uniform float u_speed;
uniform float u_scroll;   /* 0-1 document progress */
uniform float u_gain;     /* act gain x global intensity */
uniform float u_burst;    /* decaying section-crossing pulse */
uniform vec3  u_c1;
uniform vec3  u_c2;
uniform vec3  u_c3;

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

/* The ramp, sampled continuously. Two segments rather than a three-way mix so
   the middle stop is actually *reached* at t = 0.5 instead of being averaged
   away — that stop is the violet the whole palette hinges on. */
vec3 ramp(float t) {
  t = clamp(t, 0.0, 1.0);
  return t < 0.5
    ? mix(u_c1, u_c2, t * 2.0)
    : mix(u_c2, u_c3, (t - 0.5) * 2.0);
}

/* Ten layers, not the reference's fifteen.
   Each layer contributes 1/scale to the result and scale grows by 1.2x per
   iteration, so layers 11-15 together add under 6% of the total amplitude:
   below the noise floor of the final pow() curve, and invisible in the output.
   They were, however, a third of the per-pixel cost of the most expensive
   shader on the page.
   (No backticks in here - this whole string is a template literal.) */
float neuro_shape(vec2 uv, float t, float p, float baseScale) {
  vec2 sine_acc = vec2(0.0);
  vec2 res = vec2(0.0);
  float scale = baseScale;
  for (int j = 0; j < 10; j++) {
    uv = rotate(uv, 1.0);
    sine_acc = rotate(sine_acc, 1.0);
    vec2 layer = uv * scale + float(j) + sine_acc - t;
    sine_acc += sin(layer) + 2.4 * p;
    res += (0.5 + 0.5 * cos(layer)) / scale;
    scale *= 1.2;
  }
  return res.x + res.y;
}

void main() {
  vec2 uv = 0.5 * vUv;
  uv.x *= u_ratio;

  /* Pointer bloom. Squared falloff so the influence is tight around the cursor
     and gone by mid-screen — a linear falloff lifts the entire field and stops
     reading as a light source. */
  vec2 pointer = vUv - u_pointer_position;
  pointer.x *= u_ratio;
  float pd = clamp(length(pointer), 0.0, 1.0);
  float p = 0.55 * pow(1.0 - pd, 2.0);

  /* Section-crossing ripple: a ring expanding from centre as the pulse decays,
     so a seam moves the whole frame rather than just the overlay drawn on it.

     The squaring is written out rather than as pow(x, 2.0) deliberately.
     pow() is undefined for a negative base in GLSL and returns NaN in practice
     (it is evaluated as exp2(y * log2(x))). Every pixel here is inside the ring
     radius, so the base is negative *everywhere* — as pow() this produced NaN
     across the entire field, which the compositor rendered as opaque white and
     which looked for all the world like the shader being too bright. */
  float radius = (1.0 - u_burst) * 0.95;
  float ringD = (length(vUv - vec2(0.5)) - radius) * 7.0;
  float ring = exp(-ringD * ringD);
  p += u_burst * ring * 0.55;

  float t = u_speed * u_time;

  /* Filaments tighten with depth into the page. */
  float baseScale = 8.0 + u_scroll * 4.5;

  float noise = neuro_shape(uv, t, p, baseScale);
  noise = 1.2 * pow(noise, 3.0);
  /* The tenth-power term below is what turns the brightest filaments into hot
     cores, and it is violently unstable above 1 — clamping first bounds the
     blowout to something the compositor can hold instead of letting one hot
     pixel take the whole frame with it. */
  noise = clamp(noise, 0.0, 1.0);
  noise += pow(noise, 10.0);
  noise = max(0.0, noise - 0.5);
  /* Radial falloff — the field has no edges, it just runs out. */
  noise *= (1.0 - length(vUv - 0.5));
  noise *= u_gain;

  /* Hue travels the ramp with scroll, with a second offset sample mixed in so
     there is vertical hue separation within any one frame. Without it the whole
     screen is a single flat hue and the ramp reads as a tint, not a spectrum. */
  vec3 col = mix(
    ramp(u_scroll),
    ramp(fract(u_scroll + 0.34 + vUv.y * 0.30)),
    0.45
  ) * noise;

  gl_FragColor = vec4(col, noise);
}
`;

/** `#rrggbb` → normalised rgb. */
function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(
  gl: WebGLRenderingContext,
  source: string,
  type: number
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("NeuralNoise shader:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function NeuralNoise({
  opacity = 0.85,
  colors = DEFAULT_COLORS,
  className,
}: NeuralNoiseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scroll = useScrollProgressRef();
  const act = useAct();

  /* The act arrives as a React value but is consumed inside the render loop,
     which must not close over a stale one. A ref bridges the two without
     re-running the effect — restarting the loop on every act change would drop
     the pointer easing mid-flight. */
  const actRef = useRef<Act>(act);
  useEffect(() => {
    actRef.current = act;
  }, [act]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    }) ??
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    const vs = compile(gl, VERTEX, gl.VERTEX_SHADER);
    const fs = compile(gl, FRAGMENT, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("NeuralNoise link:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const u = {
      time: gl.getUniformLocation(program, "u_time"),
      ratio: gl.getUniformLocation(program, "u_ratio"),
      pointer: gl.getUniformLocation(program, "u_pointer_position"),
      speed: gl.getUniformLocation(program, "u_speed"),
      scroll: gl.getUniformLocation(program, "u_scroll"),
      gain: gl.getUniformLocation(program, "u_gain"),
      burst: gl.getUniformLocation(program, "u_burst"),
      c1: gl.getUniformLocation(program, "u_c1"),
      c2: gl.getUniformLocation(program, "u_c2"),
      c3: gl.getUniformLocation(program, "u_c3"),
    };

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.uniform3fv(u.c1, toRgb(colors[0]));
    gl.uniform3fv(u.c2, toRgb(colors[1]));
    gl.uniform3fv(u.c3, toRgb(colors[2]));

    /* Resolution budget. This program is a 15-iteration loop per pixel running
       for the whole session, and on a weak machine it will happily cost more
       than the work world's actual 3D scene. Half-res on low core counts, and
       never above 1.5x DPR — the field is all soft gradients, so the upscale is
       invisible and the saving is not. */
    const cores = navigator.hardwareConcurrency ?? 8;
    const maxDpr = cores <= 4 ? 0.75 : 1;

    /* A hard pixel ceiling, not just a DPR cap.
       DPR alone is not a budget: this shader's cost is per *pixel*, so on a
       4K display a 1× cap is still 8.3 million pixels of a ten-iteration trig
       loop, every frame. That was the lag. The field is nothing but soft
       gradients, so rendering it at ~1.1MP and letting the browser scale the
       canvas up is visually free — there is no detail in it to lose.

       Halved again on phone-sized viewports. A 1.1MP ceiling was set against a
       desktop GPU; the same buffer on a mid-range phone is the single most
       expensive thing on the page, and at that screen size the field is four
       inches of soft gradient where nobody can see the difference. */
    const MAX_PIXELS = window.innerWidth < 900 ? 550_000 : 1_100_000;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const budget = Math.min(1, Math.sqrt(MAX_PIXELS / (w * h * dpr * dpr)));
      const scale = dpr * budget;
      canvas.width = Math.max(1, Math.floor(w * scale));
      canvas.height = Math.max(1, Math.floor(h * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(u.ratio, canvas.width / canvas.height);
    };
    resize();

    /* --- Pointer, eased frame-rate-independently so the bloom tracks at the
           same weight at 60Hz and 144Hz. The reference's flat `* 0.2` per frame
           is twice as fast on a 120Hz panel. */
    const target = { x: 0.5, y: 0.5 };
    const pos = { x: 0.5, y: 0.5 };

    const onPointer = (x: number, y: number) => {
      target.x = x / window.innerWidth;
      target.y = 1 - y / window.innerHeight;
    };
    const onPointerMove = (e: PointerEvent) => onPointer(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.targetTouches[0];
      if (touch) onPointer(touch.clientX, touch.clientY);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = performance.now();
    let gain = ACT_TUNING.void[0];
    let speed = ACT_TUNING.void[1];

    /* Draw at 30fps, not display rate.
       This is the one thing on the page that genuinely does not need 60 —
       the field drifts over tens of seconds, and at 30 the difference is not
       perceptible. Halving the draws halves the GPU cost outright and, more
       importantly, leaves whole frames free for the things that *are*
       scroll-coupled: the seams, the pinned sections and Lenis itself, which
       were the parts that actually felt laggy.

       The pointer easing still runs every frame — it is a few arithmetic ops
       and it is the one part of this that has to feel immediate. */
    const FRAME_MS = 1000 / 30;
    let lastDraw = 0;

    const render = (now: number) => {
      raf = requestAnimationFrame(render);

      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;

      const k = 1 - Math.pow(0.0006, delta);
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;

      const [targetGain, targetSpeed] = ACT_TUNING[actRef.current];
      const ak = 1 - Math.pow(0.05, delta);
      gain += (targetGain - gain) * ak;
      speed += (targetSpeed - speed) * ak;

      // Pulses decay on a fixed time constant rather than per frame, so a
      // dropped frame shortens the ripple instead of stretching it.
      backdrop.burst = Math.max(0, backdrop.burst - delta * 1.6);

      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;

      /* Seconds, wrapped every ten minutes. The reference passes raw
         `performance.now()`, which is milliseconds and grows without bound —
         fine in fp32, catastrophic in fp16 (see the fragment header). Wrapping
         on a whole number of seconds keeps the value tiny forever, and the
         field's phase is continuous across the wrap because every term it feeds
         is periodic. */
      gl.uniform1f(u.time, (now % 600000) * 0.001);
      gl.uniform2f(u.pointer, pos.x, pos.y);
      /* Scroll speed feeds the field's own speed, not its brightness. Pushing
         gain would make the whole frame flash on every flick; pushing speed
         makes the field *smear* with the movement and settle when you stop,
         which is the thing that reads as the page having weight. Capped at a
         third — this is a texture on the motion, not a second animation. */
      gl.uniform1f(u.speed, 0.42 * speed * (1 + backdrop.velocity * 0.34));
      gl.uniform1f(u.scroll, scroll.current);
      gl.uniform1f(u.gain, gain * backdrop.intensity);
      gl.uniform1f(u.burst, backdrop.burst);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    /* Nothing is visible in a hidden tab, and this loop is expensive enough to
       matter. `last` is reset on resume so the first frame back doesn't get a
       multi-second delta and jump every eased value to its target at once. */
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
      /* Deliberately NOT `loseContext()`.
         A canvas hands back the *same* context object from getContext() for its
         whole life, and a lost one never recovers on its own — so losing it here
         means that the moment this effect re-runs against the same canvas the
         re-initialisation silently no-ops and the field renders nothing at all.
         React runs exactly that mount→unmount→mount cycle in development, so
         this killed the backdrop on every dev load. The context is released with
         the canvas element when the component genuinely unmounts. */
    };
    // `colors` is a literal default and never changes at runtime; re-running
    // this effect would tear down and rebuild the GL context for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ opacity }}
    />
  );
}
