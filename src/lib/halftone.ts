/**
 * The halftone wipe: the site's one transition language.
 *
 * A dot screen at 45°, printed in two inks, opening from a point. Outside the
 * front every cell is solid ground (the dots have grown into each other).
 * At the front the dots shrink, and their rims light up with the ramp. Inside,
 * the screen is gone and what was underneath shows. It is the press sheet
 * tearing open rather than a fade.
 *
 * One fragment shader on a single triangle, held to a pixel budget (dense
 * screens and software GPUs drop below DPR 1 rather than stall). The caller
 * drives the radius. Nothing here owns time.
 *
 * Shader lineage: the dot screen in the Vinyl Halftone Preloader reference
 * (docs/reference, Amara's pick), cut down to the reveal and recoloured.
 */

const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uR;
uniform float uBand;
uniform float uCell;
uniform float uPx;
uniform vec3 uGround;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec3 uD;
vec3 ramp(float t){
  t=clamp(t,0.,1.);
  if(t<.38) return mix(uA,uB,t/.38);
  if(t<.7) return mix(uB,uC,(t-.38)/.32);
  return mix(uC,uD,(t-.7)/.3);
}
void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  mat2 r=mat2(.70710678,-.70710678,.70710678,.70710678);
  mat2 ri=mat2(.70710678,.70710678,-.70710678,.70710678);
  vec2 g=r*p;
  vec2 cc=(floor(g/uCell)+.5)*uCell;
  vec2 c=ri*cc;
  float d=length(c-uCenter);
  // 1 outside the front (solid ground), falling to 0 inside it.
  float f=smoothstep(uR-uBand,uR,d);
  float rad=sqrt(f)*uCell*.78;
  float dist=length(g-cc);
  float a=max(1.-smoothstep(rad-uPx,rad+uPx,dist),step(.985,f));
  // The front's rim: the ramp, by angle round the opening.
  float rim=smoothstep(uR-uBand,uR-uBand*.45,d)*(1.-smoothstep(uR-uBand*.3,uR+uBand*.2,d));
  float ang=atan(c.y-uCenter.y,c.x-uCenter.x)/6.2831853+.5;
  vec3 col=mix(uGround,ramp(fract(ang+.08)),rim*.92);
  gl_FragColor=vec4(col*a,a);
}`;

type RGB = [number, number, number];

function hex(c: string): RGB {
  const h = c.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB;
}

export interface Halftone {
  /** Draw the opening at radius `r` (CSS px) around `cx, cy` (CSS px). */
  draw(cx: number, cy: number, r: number): void;
  /** The radius at which the whole screen is open. */
  reach(cx: number, cy: number): number;
  dispose(): void;
}

export function createHalftone(canvas: HTMLCanvasElement, opts?: { ground?: string; budget?: number }): Halftone | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
  } catch {
    gl = null;
  }
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const s = gl!.createShader(type);
    if (!s) return null;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    return gl!.getShaderParameter(s, gl!.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl!.getUniformLocation(prog, n);
  const u = {
    res: U("uRes"), center: U("uCenter"), r: U("uR"), band: U("uBand"), cell: U("uCell"), px: U("uPx"),
    ground: U("uGround"), a: U("uA"), b: U("uB"), c: U("uC"), d: U("uD"),
  };
  gl.uniform3fv(u.ground, hex(opts?.ground ?? "#05040c"));
  gl.uniform3fv(u.a, hex("#ff1f3d"));
  gl.uniform3fv(u.b, hex("#e81cc8"));
  gl.uniform3fv(u.c, hex("#8a3dff"));
  gl.uniform3fv(u.d, hex("#5664ff"));

  let scale = 1;
  let w = 0;
  let h = 0;
  const size = () => {
    const cw = Math.max(1, canvas.clientWidth);
    const ch = Math.max(1, canvas.clientHeight);
    if (cw === w && ch === h) return;
    w = cw;
    h = ch;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    scale = Math.min(dpr, Math.sqrt((opts?.budget ?? 1.4e6) / (w * h)));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    gl!.viewport(0, 0, canvas.width, canvas.height);
  };

  return {
    reach(cx, cy) {
      size();
      return Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
    },
    draw(cx, cy, r) {
      size();
      const unit = Math.min(w, h);
      const cell = Math.max(7, Math.min(14, unit * 0.016));
      gl!.uniform2f(u.res, canvas.width, canvas.height);
      gl!.uniform2f(u.center, cx * scale, cy * scale);
      gl!.uniform1f(u.r, r * scale);
      gl!.uniform1f(u.band, unit * 0.34 * scale);
      gl!.uniform1f(u.cell, cell * scale);
      gl!.uniform1f(u.px, scale);
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    },
    dispose() {
      gl!.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
