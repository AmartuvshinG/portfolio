/**
 * The Path's globe: an LED panel looking at the Earth through a camera.
 *
 * The same hardware as the footer's ticker (lib/ledSign) — dark lenses on a
 * fixed pitch, warm on land and cold at sea, lit along the route through the
 * ticker's temperature ramp — but the panel is a window, and the Earth turns
 * behind it as the visitor scrolls.
 *
 * **Two passes.**
 *  1. *One fragment per diode*, into a small texture (cols × rows): a ray
 *     from the camera through the diode's centre hits the sphere; the hit's
 *     latitude and longitude read the baked mask (land, lakes cut out,
 *     borders — scripts/bake-globe-mask.mjs), and the route's drive is worked
 *     out *analytically* — the angle to each great circle's plane, and how
 *     far along it the hit is — so the line is exactly one diode wide at any
 *     zoom and costs no geometry. The angular size of the diode at the hit
 *     sets that width, so it holds at the limb too.
 *  2. *Per pixel*: each pixel finds its diode in that texture and draws the
 *     lens — a hard disc, a hot centre when driven — and the halos of its
 *     eight neighbours. Ten texture reads a pixel, no loops over geometry.
 *
 * **When it runs.** Only when asked: the Path calls `draw` when scroll moves
 * the camera or the route. There is no loop. The buffer has a DPR cap and a
 * pixel ceiling (CSS upscales), as the film shader does.
 *
 * **Mask seams.** The mask is mipmapped (the diodes are much coarser than its
 * texels when the camera is high). Longitude wraps at ±180°, where a naive
 * lookup's derivative explodes and picks the smallest mip in a stripe down the
 * Pacific; Tarini's two-coordinate trick (with OES_standard_derivatives)
 * picks whichever of two wrapped coordinates is continuous there. Without the
 * extension the mask is sampled unmipmapped.
 *
 * **Extras (2026-10-03).** An atmosphere: rays that just miss the sphere
 * light a holo halo of diodes past the limb. A graticule on the sea, every
 * 15°. A shockwave at each landing — two rings running out from the city,
 * scrubbed by the scroll. All analytic, in the same two passes.
 *
 * GLSL traps (memory): highp where available, no pow() of a signed base.
 */

import { arcAngle, cameraBasis, cross, FOV_Y, normalize, PLACES, toVec, type Shot, type Vec3 } from "@/lib/routeGeo";

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const PRECISION = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

const CELLS_FRAG = (derivatives: boolean) => `
${derivatives ? "#extension GL_OES_standard_derivatives : enable\n#define SEAMLESS 1" : ""}
${PRECISION}
uniform sampler2D uMask;
uniform vec2 uGrid;
uniform float uPitch;
uniform vec3 uC;
uniform vec3 uF;
uniform vec3 uR;
uniform vec3 uU;
uniform float uFocal;
uniform vec2 uFocus;
uniform vec3 uA;
uniform vec3 uN1;
uniform float uTh1;
uniform vec3 uN2;
uniform float uTh2;
uniform float uOut;
uniform float uBack;
uniform float uFreight;
uniform vec3 uErie;
uniform float uLandE;
uniform float uLandU;

const float PI = 3.14159265;
/* The sea's graticule, every 15 degrees. */
const float GRAT = 0.2617994;
const float TRAIL = 16.0;
const float PACKET = 5.0;

/* Angle along the great circle from a (in the plane with normal n), and the
   angle off its plane. */
vec2 onArc(vec3 p, vec3 a, vec3 n) {
  float off = abs(asin(clamp(dot(p, n), -1.0, 1.0)));
  vec3 q = p - n * dot(p, n);
  float along = atan(dot(q, cross(n, a)), dot(q, a));
  return vec2(along, off);
}

/* A landing's shockwave: two rings running out from the city, fading as they
   go. prog 0..1 is scrubbed by the scroll, so it plays back as well. */
float ring(vec3 p, vec3 c, float prog, float cellAng) {
  if (prog <= 0.0 || prog >= 1.0) return 0.0;
  float ang = acos(clamp(dot(p, c), -1.0, 1.0));
  float w = max(cellAng * 0.75, 0.002);
  float k1 = 1.0 - smoothstep(0.0, w, abs(ang - prog * 0.17));
  float p2 = prog - 0.22;
  float k2 = p2 > 0.0 ? 1.0 - smoothstep(0.0, w, abs(ang - p2 * 0.17)) : 0.0;
  return max(k1 * (1.0 - prog) * 1.3, k2 * (1.0 - prog) * 0.8);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float H = uGrid.y * uPitch;
  vec2 px = vec2((cell.x + 0.5) * uPitch, H - (cell.y + 0.5) * uPitch);
  vec3 d = normalize(uF * uFocal + uR * (px.x - uFocus.x) - uU * (px.y - uFocus.y));
  float b = dot(uC, d);
  float c = dot(uC, uC) - 1.0;
  float disc = b * b - c;
  /* A miss still samples (at the nearest point) before it bails, so the mask
     lookup's derivatives are taken in uniform control flow. */
  float t = -b - sqrt(max(disc, 0.0));
  vec3 p = normalize(uC + t * d);
  float shade = clamp(dot(p, -d), 0.0, 1.0);

  float lat = asin(clamp(p.z, -1.0, 1.0));
  float lon = atan(p.y, p.x);
  float u1 = lon / (2.0 * PI) + 0.5;
  float v = 0.5 - lat / PI;
#ifdef SEAMLESS
  float u2 = fract(u1 + 0.5) - 0.5;
  float u = fwidth(u1) <= fwidth(u2) + 1e-6 ? u1 : u2;
#else
  float u = u1;
#endif
  vec3 m = texture2D(uMask, vec2(u, v)).rgb;
  if (disc < 0.0) {
    /* The atmosphere: a miss close past the limb glows, faintest furthest
       out. |C|^2 - b^2 = 1 - disc is the ray's closest approach, squared. */
    float above = sqrt(1.0 - disc) - 1.0;
    float halo = b < 0.0 ? 1.0 - smoothstep(0.0, 0.085, above) : 0.0;
    gl_FragColor = vec4(0.0, halo * halo, 0.0, 0.0);
    return;
  }

  /* One diode's angular size where the ray lands: its width on the screen,
     scaled out to the surface and stretched toward the limb. */
  float cellAng = uPitch * t / (uFocal * max(shade, 0.25));
  float halfW = cellAng * 0.62;

  float drive = 0.0;
  vec2 r1 = onArc(p, uA, uN1);
  if (r1.y < halfW && r1.x >= -cellAng * 0.5 && r1.x <= uTh1 + cellAng * 0.5) {
    float head = uOut * uTh1;
    if (r1.x <= head) {
      float dd = (head - r1.x) / cellAng;
      // Cooling behind the head: white-hot at the front, sodium behind.
      float k = (uOut < 1.0 && dd < TRAIL) ? 1.25 - dd / TRAIL * 0.5 : 0.75;
      if (uBack > 0.0) {
        k = uBack < 1.0 ? 0.62 : 0.55;
        if (uBack < 1.0) {
          float pd = abs(r1.x - (1.0 - uBack) * uTh1) / cellAng;
          if (pd < PACKET) k = max(k, 1.25 - pd / PACKET * 0.6);
        }
      }
      drive = k;
    }
  }
  if (uFreight > 0.0) {
    vec2 r2 = onArc(p, uA, uN2);
    if (r2.y < halfW && r2.x >= -cellAng * 0.5 && r2.x <= uTh2 + cellAng * 0.5) {
      float k = 0.6;
      if (uFreight < 1.0) {
        // A triangle wave: out to the mine and back, twice over the beat.
        float w = fract(uFreight * 2.0);
        float at = (w < 0.5 ? w * 2.0 : 2.0 - w * 2.0) * uTh2;
        if (abs(r2.x - at) < cellAng * 1.2) k = 1.25;
      }
      drive = max(drive, k);
    }
  }
  drive = max(drive, max(ring(p, uErie, uLandE, cellAng), ring(p, uA, uLandU, cellAng)));

  /* The graticule, carried in the border channel under the border's own
     threshold (the panel tells them apart): one diode wide at any zoom. */
  float dLat = abs(mod(lat + GRAT * 0.5, GRAT) - GRAT * 0.5);
  /* Meridians stop short of the poles, where they would crowd into a star. */
  float dLon = abs(lat) < 1.13 ? abs(mod(lon + GRAT * 0.5, GRAT) - GRAT * 0.5) * cos(lat) : 1.0;
  float grat = min(dLat, dLon) < cellAng * 0.3 ? 0.035 : 0.0;

  gl_FragColor = vec4(m.r, max(m.g, grat), drive / 1.5, max(shade, 2.0 / 255.0));
}
`;

const PANEL_FRAG = `
${PRECISION}
uniform sampler2D uCells;
uniform vec2 uGrid;
uniform float uPitch;

const float CORE_R = 0.39;

/* ember → deep amber → sodium → white-hot (lib/ledSign's ramp). */
vec3 temperature(float k) {
  vec3 a = vec3(120.0, 22.0, 6.0) / 255.0;
  vec3 b = vec3(240.0, 84.0, 18.0) / 255.0;
  vec3 c = vec3(255.0, 160.0, 43.0) / 255.0;
  vec3 d = vec3(255.0, 236.0, 206.0) / 255.0;
  if (k < 0.35) return mix(a, b, k / 0.35);
  if (k < 0.7) return mix(b, c, (k - 0.35) / 0.35);
  return mix(c, d, clamp((k - 0.7) / 0.3, 0.0, 1.0));
}

vec4 cellAt(vec2 cell) {
  return texture2D(uCells, (cell + 0.5) / uGrid);
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 cell = floor(fc / uPitch);
  vec4 c = cellAt(cell);
  float r = length(fc - (cell + 0.5) * uPitch) / uPitch;
  float edge = 0.6 / uPitch;
  float lens = 1.0 - smoothstep(CORE_R - edge, CORE_R + edge, r);

  vec3 col = vec3(0.0);
  float a = 0.0;
  if (c.a <= 0.0 && c.g > 0.0) {
    /* The atmosphere's diodes: holo, dim, never driven. */
    col = vec3(126.0, 234.0, 255.0) / 255.0 * (0.25 + 0.6 * c.g);
    a = lens * c.g * 0.8;
  }
  if (c.a > 0.0) {
    float shade = c.a;
    /* A dark backing, so the page behind does not show between the lenses
       and muddy the coasts: the globe is an object. */
    col = vec3(4.0, 5.0, 10.0) / 255.0;
    a = 0.6 + 0.2 * shade;
    float land = smoothstep(0.3, 0.7, c.r);
    /* Unlit lenses, dark enough that a screenful of land reads as ground and
       not as a lit panel: the borders and the route are what carry light. */
    vec3 sea = vec3(20.0, 25.0, 38.0) / 255.0 * (0.45 + 0.55 * shade);
    vec3 ground = vec3(84.0, 60.0, 40.0) / 255.0 * (0.55 + 0.45 * shade);
    vec3 base = mix(sea, ground, land);
    /* Borders: a warm lens, only on land. The line is one texel of the mask,
       so far out the mip averages it thin: any trace of it counts. */
    float border = smoothstep(0.05, 0.22, c.g) * land;
    base = mix(base, vec3(205.0, 128.0, 52.0) / 255.0 * (0.6 + 0.4 * shade), border * 0.85);
    // The graticule: faint holo lenses, on the sea only.
    float grid = smoothstep(0.016, 0.03, c.g) * (1.0 - smoothstep(0.045, 0.06, c.g)) * (1.0 - land);
    base = mix(base, vec3(126.0, 234.0, 255.0) / 255.0 * (0.14 + 0.1 * shade), grid * 0.5);
    // The limb: the outermost ring faintly holo, so the disc reads as a sphere.
    base = mix(base, vec3(126.0, 234.0, 255.0) / 255.0 * 0.5, (1.0 - smoothstep(0.04, 0.16, shade)) * 0.6);
    col = mix(col, base, lens);
    a = mix(a, 1.0, lens);

    float k = c.b * 1.5;
    if (k > 0.0) {
      vec3 lit = temperature(clamp(k / 1.25, 0.0, 1.0));
      float hot = (1.0 - smoothstep(0.0, CORE_R * 0.72, r)) * (0.35 + clamp(k / 1.25, 0.0, 1.0) * 0.6);
      lit = mix(lit, vec3(1.0, 0.98, 0.94), hot);
      col = mix(col, lit, lens * min(1.0, 0.3 + k * 0.7));
    }
  }

  /* Halos from this diode and its neighbours. */
  vec3 glow = vec3(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 nc = cell + vec2(float(x), float(y));
      float k = cellAt(nc).b * 1.5;
      if (k <= 0.0) continue;
      float d = length(fc - (nc + 0.5) * uPitch) / uPitch;
      float fall = 1.0 - smoothstep(CORE_R, 1.5, d);
      glow += vec3(1.0, 0.55, 0.16) * (0.34 * fall * fall) * min(1.0, k * 0.5);
    }
  }

  vec3 premul = col * a + glow;
  gl_FragColor = vec4(min(premul, vec3(1.0)), min(1.0, a + max(glow.r, max(glow.g, glow.b))));
}
`;

export interface GlobeFrame extends Shot {
  out: number;
  back: number;
  freight: number;
  /** Landing shockwaves at Erie and at Ulaanbaatar, 0..1 while they run. */
  landErie?: number;
  landUb?: number;
}

export interface GlobeOptions {
  /** Diode pitch, CSS px. */
  pitch: number;
  maxDpr?: number;
  /** Most device pixels the buffer may have. */
  ceiling?: number;
}

/**
 * Build the globe on `canvas`, or null without WebGL. `mask` is the baked
 * image, already decoded.
 */
export function createGlobe(canvas: HTMLCanvasElement, mask: HTMLImageElement, opts: GlobeOptions) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;
  const derivatives = !!gl.getExtension("OES_standard_derivatives");

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn("[globe] shader:", gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };
  const program = (frag: string) => {
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return null;
    const p = gl.createProgram()!;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, "aPos");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn("[globe] link:", gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  };
  const cellsProg = program(CELLS_FRAG(derivatives));
  const panelProg = program(PANEL_FRAG);
  if (!cellsProg || !panelProg) return null;

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  /* The mask: mipmapped and wrapping in longitude (it is power-of-two). */
  const maskTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, maskTex);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, mask);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (derivatives) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }

  /* The per-diode texture and its framebuffer. */
  const cellTex = gl.createTexture();
  const fbo = gl.createFramebuffer();

  const loc = (p: WebGLProgram, names: string[]) =>
    Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)])) as Record<string, WebGLUniformLocation | null>;
  const uc = loc(cellsProg, [
    "uMask", "uGrid", "uPitch", "uC", "uF", "uR", "uU", "uFocal", "uFocus",
    "uA", "uN1", "uTh1", "uN2", "uTh2", "uOut", "uBack", "uFreight",
    "uErie", "uLandE", "uLandU",
  ]);
  const up = loc(panelProg, ["uCells", "uGrid", "uPitch"]);

  /* The route, once: UB → Erie and UB → Khanbogd as plane normals and spans. */
  const a = toVec(PLACES.ub.lat, PLACES.ub.lon);
  const erie = toVec(PLACES.erie.lat, PLACES.erie.lon);
  const n1 = normalize(cross(a, toVec(PLACES.erie.lat, PLACES.erie.lon)));
  const n2 = normalize(cross(a, toVec(PLACES.khanbogd.lat, PLACES.khanbogd.lon)));
  const th1 = arcAngle("ub", "erie");
  const th2 = arcAngle("ub", "khanbogd");

  let cols = 0;
  let rows = 0;
  let pitch = 0;
  let dpr = 1;

  /** Size the buffer to a box of `w × h` CSS px. */
  const layout = (w: number, h: number) => {
    const ceiling = opts.ceiling ?? 2_400_000;
    dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr ?? 1.5);
    if (w * h * dpr * dpr > ceiling) dpr = Math.sqrt(ceiling / (w * h));
    pitch = Math.max(3, Math.round(opts.pitch * dpr));
    cols = Math.ceil((w * dpr) / pitch);
    rows = Math.ceil((h * dpr) / pitch);
    canvas.width = cols * pitch;
    canvas.height = rows * pitch;
    canvas.style.width = `${canvas.width / dpr}px`;
    canvas.style.height = `${canvas.height / dpr}px`;

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, cellTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, cellTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { cssWidth: canvas.width / dpr, cssHeight: canvas.height / dpr };
  };

  const v3 = (l: WebGLUniformLocation | null, v: Vec3) => gl.uniform3f(l, v[0], v[1], v[2]);

  const draw = (fr: GlobeFrame) => {
    if (!cols || gl.isContextLost()) return;
    const W = canvas.width;
    const H = canvas.height;
    const cam = cameraBasis(fr);
    const focal = H / 2 / Math.tan(FOV_Y / 2);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, cols, rows);
    gl.useProgram(cellsProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.uniform1i(uc.uMask, 0);
    gl.uniform2f(uc.uGrid, cols, rows);
    gl.uniform1f(uc.uPitch, pitch);
    v3(uc.uC, cam.c);
    v3(uc.uF, cam.f);
    v3(uc.uR, cam.r);
    v3(uc.uU, cam.u);
    gl.uniform1f(uc.uFocal, focal);
    gl.uniform2f(uc.uFocus, fr.fx * W, fr.fy * H);
    v3(uc.uA, a);
    v3(uc.uN1, n1);
    gl.uniform1f(uc.uTh1, th1);
    v3(uc.uN2, n2);
    gl.uniform1f(uc.uTh2, th2);
    gl.uniform1f(uc.uOut, fr.out);
    gl.uniform1f(uc.uBack, fr.back);
    gl.uniform1f(uc.uFreight, fr.freight);
    v3(uc.uErie, erie);
    gl.uniform1f(uc.uLandE, fr.landErie ?? 0);
    gl.uniform1f(uc.uLandU, fr.landUb ?? 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(panelProg);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, cellTex);
    gl.uniform1i(up.uCells, 1);
    gl.uniform2f(up.uGrid, cols, rows);
    gl.uniform1f(up.uPitch, pitch);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const dispose = () => {
    gl.deleteTexture(maskTex);
    gl.deleteTexture(cellTex);
    gl.deleteFramebuffer(fbo);
    gl.deleteBuffer(quad);
    gl.deleteProgram(cellsProg);
    gl.deleteProgram(panelProg);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };

  return { layout, draw, dispose };
}

export type Globe = NonNullable<ReturnType<typeof createGlobe>>;
