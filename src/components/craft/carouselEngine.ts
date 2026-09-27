import { gsap } from "gsap";
import * as THREE from "three";

/**
 * The liquid-glass carousel engine: an infinite row of panels rendered to a
 * target, then passed through one full-frame lens shader that bends and
 * fringes whatever sits under the centre.
 *
 * Ported from the reference component ("liquid glass carousel.txt") with the
 * changes this site needs:
 *
 * - **Vertical wheel belongs to the page.** The reference `preventDefault`ed
 *   every wheel event over the canvas, which on a scrolling page traps the
 *   reader inside the section. Only horizontal intent (deltaX, or shift+wheel)
 *   moves the row; everything else falls through to Lenis. Touch is
 *   `pan-y` for the same reason.
 * - **Transparent.** The canvas clears to nothing and the lens writes the
 *   texture's alpha, so the aurora shows through between panels.
 * - **A pixel ceiling, not only a DPR cap.** Same budget as the old backdrop
 *   shader: never more than ~1.1M pixels per pass.
 * - **It stops.** After 1.5s with no input and nothing tweening, the loop
 *   parks itself; any input wakes it. The reference drew 60fps forever.
 * - **Colour space.** three encodes to sRGB on the way into the render
 *   target, so the lens passes pixels straight through. Encoding again on
 *   output (`colorspace_fragment`) was tried and washed every panel to grey.
 */

export interface EngineItem {
  canvas: HTMLCanvasElement;
}

export interface EngineHandle {
  next: () => void;
  previous: () => void;
  openCentered: () => void;
  closeFocus: () => void;
  destroy: () => void;
}

export interface EngineOptions {
  items: EngineItem[];
  panelHeight: number;
  gap: number;
  entry: boolean;
  onActiveChange: (index: number) => void;
  onFocusChange: (open: boolean) => void;
  onEntryDone: (done: boolean) => void;
}

const LENS = {
  sizeX: 0.565,
  sizeY: 1,
  posX: 0.5,
  posY: 0.5,
  rotation: 65,
  dispersion: 11,
  glow: 4.2,
  whiteGlow: 0.2,
  novaSize: 12,
  blueRing: 5,
  ringRadius: 0.49,
  ringWidth: 0.014,
  shimmerFreq: 12,
  shimmerSpeed: 3.5,
  shimmerDepth: 0.12,
  rimStart: 0.578,
  rimTangential: 0.6,
  rimFreq1: 2,
  rimFreq2: 1,
  ringColor: "#7b5cff",
  rimLine: 1.2,
  rimLinePos: 0.488,
  rimLineWidth: 0.003,
  samples: 16,
};

const FOCUS = {
  cardDuration: 0.6,
  focusDuration: 0.75,
  cardEase: "power4.out",
  focusEase: "power3.out",
  stagger: 0.05,
  dropDist: 1.4,
  centerScale: 1.08,
  lensFade: 0.7,
};

const ENTRY = {
  delay: 0.2,
  startH: 80,
  riseDuration: 0.9,
  stagger: 0.06,
  riseEase: "power3.out",
  fromBelow: 0.9,
  growDelay: 0.15,
  growDuration: 1.6,
  growEase: "expo.inOut",
  growStagger: 0.07,
  lensBloom: 1.2,
  lensBloomEase: "power2.inOut",
};

const MAX_PIXELS = 1_100_000;
const IDLE_MS = 1500;
const REPEATS = 4;
const CLICK_SLOP = 6;
const TOUCH_CLICK_SLOP = 12;
const FLICK_IDLE_MS = 90;

const LENS_VERTEX = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const LENS_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uCenter;
uniform float uSizeX;
uniform float uSizeY;
uniform float uAspect;
uniform float uDispersion;
uniform float uGlow;
uniform float uWhiteGlow;
uniform float uNovaSize;
uniform float uBlueRing;
uniform float uRingRadius;
uniform float uRingWidth;
uniform float uShimmer;
uniform float uShimmerFreq;
uniform float uShimmerSpeed;
uniform float uShimmerDepth;
uniform float uTime;
uniform float uRimStart;
uniform float uRimTangential;
uniform float uRimFreq1;
uniform float uRimFreq2;
uniform vec3 uRingColor;
uniform float uRimLine;
uniform float uRimLinePos;
uniform float uRimLineWidth;
uniform float uRotation;

const int SAMPLES = 16;

vec3 discLens(vec2 center, float aspectCorrect, out float outA, out float texA) {
  vec2 p = (vUv - center);
  p.x *= aspectCorrect;
  float ca = cos(uRotation), sa = sin(uRotation);
  p = mat2(ca, -sa, sa, ca) * p;
  vec2 halfSize = vec2(uSizeX, uSizeY);
  float dist = length(p / halfSize);
  outA = 0.0;
  texA = 0.0;
  if (dist > 1.0) return vec3(0.0);

  float nd = clamp(dist, 0.0, 1.0);
  vec2 offset = vUv - center;
  vec2 radialDir = normalize(offset + 1e-6);
  vec2 tangentDir = vec2(-radialDir.y, radialDir.x);
  float angle = atan(p.y, p.x);

  float rimStrength = smoothstep(uRimStart, 1.0, nd);
  float fluidWave = sin(angle * uRimFreq1) * 0.55 + sin(angle * uRimFreq2) * 0.25;
  float rScreen = (uSizeX + uSizeY) * 0.5;
  vec2 rimOff = tangentDir * fluidWave * rimStrength * rScreen * uRimTangential;
  vec2 baseUV = center + offset + rimOff;

  float rimMask = smoothstep(0.55, 1.0, nd);
  vec2 dispDir = offset * uDispersion * 0.004 * rimMask;
  vec3 col = vec3(0.0);
  vec3 caW = vec3(0.0);
  float aSum = 0.0;
  float aW = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    float t = float(i) / float(SAMPLES - 1);
    vec4 s = textureLod(uTex, baseUV + dispDir * (t - 0.5), 0.0);
    vec3 w = vec3(
      exp(-pow((t - 0.00) / 0.38, 2.0)),
      exp(-pow((t - 0.50) / 0.38, 2.0)),
      exp(-pow((t - 1.00) / 0.38, 2.0))
    );
    col += s.rgb * w;
    caW += w;
    float wm = (w.r + w.g + w.b) / 3.0;
    aSum += s.a * wm;
    aW += wm;
  }
  col /= max(caW, vec3(0.001));
  texA = aSum / max(aW, 0.001);

  col *= mix(0.91, 1.0, smoothstep(0.0, 0.38, nd));

  float r2 = nd * nd * 0.25;
  float gs = max(uNovaSize * uGlow * 0.003, 0.004);
  float nova = exp(-r2 / gs) + exp(-r2 / (gs * 7.0)) * 0.18;
  nova *= uWhiteGlow * (uGlow / 17.0) * 1.15;
  col += vec3(nova) * texA;

  float dC = nd * 0.5;
  float tR = clamp(uRingRadius, 0.1, 0.49);
  float rW = max(uRingWidth, 0.003);
  float ring = exp(-pow((dC - tR) / rW, 2.0));
  ring *= uBlueRing * (uGlow / 17.0) * 1.8;
  if (uShimmer > 0.5) ring *= sin(angle * uShimmerFreq + uTime * uShimmerSpeed) * uShimmerDepth + (1.0 - uShimmerDepth);
  float ringAura = exp(-pow((dC - tR) / (rW * 6.0), 2.0)) * 0.28 * uBlueRing * (uGlow / 17.0);
  col += uRingColor * (ring + ringAura);
  col += vec3(exp(-pow((dC - uRimLinePos) / max(uRimLineWidth, 0.0001), 2.0)) * uRimLine);

  outA = smoothstep(1.0, 0.93, nd);
  return col;
}

void main(){
  vec4 base = texture2D(uTex, vUv);
  float a = 0.0;
  float texA = 0.0;
  vec3 c = discLens(uCenter, uAspect, a, texA);
  vec3 outc = mix(base.rgb, c, a);
  float outA = mix(base.a, texA, a);
  gl_FragColor = vec4(outc, outA);
}
`;

const LENS_FX_KEYS = ["uDispersion", "uBlueRing", "uRimLine", "uRimTangential"] as const;

type PanelRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  poolIdx: number;
  srcIndex: number;
  centerX: number;
};

type PoolItem = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; srcIndex: number };

export function createCarousel(
  mount: HTMLElement,
  cursorElement: HTMLElement | null,
  options: EngineOptions
): EngineHandle | null {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const entryOn = options.entry && !reduced;
  const count = options.items.length;
  if (count === 0) return null;

  let W = Math.max(1, mount.clientWidth);
  let H = Math.max(1, mount.clientHeight);
  const panelHFor = () =>
    Math.max(160, Math.min(options.panelHeight, Math.round(H * 0.74), Math.round(W * 1.02)));
  let PANEL_H = panelHFor();
  const GAP = options.gap;
  const EASE = reduced ? 0.28 : 0.09;
  const SNAP_EASE = reduced ? 0.22 : 0.06;
  const WHEEL = 1.4;
  const DRAG = 1.6;
  const TOUCH_DRAG = 1;
  const TOUCH_EASE = 0.22;
  const FRICTION = 0.865;
  const SNAP_IDLE_MS = 120;
  const SHRINK_MAX = 60;
  const SHRINK_ATTACK = 0.25;
  const SHRINK_DECAY = 0.06;

  const ratioFor = () =>
    Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / (W * H)));

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }

  let dpr = ratioFor();
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  const el = renderer.domElement;
  el.style.display = "block";
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.touchAction = "pan-y";
  el.style.userSelect = "none";
  el.setAttribute("aria-hidden", "true");
  mount.appendChild(el);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -100, 100);
  camera.position.z = 10;

  const textures = options.items.map((item) => {
    const tex = new THREE.CanvasTexture(item.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return { tex, aspect: item.canvas.width / item.canvas.height };
  });

  const slotWidth = (i: number) => textures[i].aspect * PANEL_H + GAP;
  let offsets: number[] = [];
  let totalWidth = 0;
  function recomputeTotal() {
    offsets = [];
    let acc = 0;
    for (let i = 0; i < count; i++) {
      offsets.push(acc);
      acc += slotWidth(i);
    }
    totalWidth = acc;
  }
  recomputeTotal();

  const slotCenter = (i: number) => offsets[i] + slotWidth(i) / 2 - GAP / 2;

  function centerForIndex(idx: number) {
    const loop = Math.floor(idx / count);
    const s = ((idx % count) + count) % count;
    return slotCenter(s) + loop * totalWidth;
  }

  function nearest(value: number) {
    let best = 0;
    let bestI = 0;
    let bestDist = Infinity;
    for (let i = 0; i < count; i++) {
      const c = slotCenter(i);
      const k = Math.round((value - c) / totalWidth);
      const d = Math.abs(c + k * totalWidth - value);
      if (d < bestDist) {
        bestDist = d;
        best = i + k * count;
        bestI = i;
      }
    }
    return { index: best, src: bestI };
  }

  const pool: PoolItem[] = [];
  for (let r = 0; r < REPEATS; r++) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ map: textures[i].tex, transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), mat);
      mesh.visible = false;
      scene.add(mesh);
      pool.push({ mesh, mat, srcIndex: i });
    }
  }

  let scroll = centerForIndex(0);
  let target = scroll;
  let velocity = 0;
  let prevScroll = scroll;
  let scrollEnergy = 0;
  let pendingFocus: { srcIndex: number } | null = null;
  let lastInput = performance.now();
  let lastActive = performance.now();
  let snapped = true;
  let lastCenter = -1;

  const makeRT = () => new THREE.WebGLRenderTarget(Math.round(W * dpr), Math.round(H * dpr));
  let rt = makeRT();
  const lensScene = new THREE.Scene();
  const lensCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const lensUniforms = {
    uTex: { value: rt.texture },
    uCenter: { value: new THREE.Vector2(LENS.posX, LENS.posY) },
    uSizeX: { value: LENS.sizeX },
    uSizeY: { value: LENS.sizeY },
    uRotation: { value: (LENS.rotation * Math.PI) / 180 },
    uAspect: { value: W / H },
    uDispersion: { value: LENS.dispersion },
    uGlow: { value: LENS.glow },
    uWhiteGlow: { value: LENS.whiteGlow },
    uNovaSize: { value: LENS.novaSize },
    uBlueRing: { value: LENS.blueRing },
    uRingRadius: { value: LENS.ringRadius },
    uRingWidth: { value: LENS.ringWidth },
    uShimmer: { value: reduced ? 0 : 1 },
    uShimmerFreq: { value: LENS.shimmerFreq },
    uShimmerSpeed: { value: LENS.shimmerSpeed },
    uShimmerDepth: { value: LENS.shimmerDepth },
    uTime: { value: 0 },
    uRimStart: { value: LENS.rimStart },
    uRimTangential: { value: LENS.rimTangential },
    uRimFreq1: { value: LENS.rimFreq1 },
    uRimFreq2: { value: LENS.rimFreq2 },
    uRingColor: { value: new THREE.Color(LENS.ringColor) },
    uRimLine: { value: LENS.rimLine },
    uRimLinePos: { value: LENS.rimLinePos },
    uRimLineWidth: { value: LENS.rimLineWidth },
  };
  const lensMat = new THREE.ShaderMaterial({
    uniforms: lensUniforms,
    vertexShader: LENS_VERTEX,
    fragmentShader: LENS_FRAGMENT,
    transparent: true,
  });
  const lensQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lensMat);
  lensScene.add(lensQuad);

  const lensFxFull: Record<(typeof LENS_FX_KEYS)[number], number> = {
    uDispersion: LENS.dispersion,
    uBlueRing: LENS.blueRing,
    uRimLine: LENS.rimLine,
    uRimTangential: LENS.rimTangential,
  };

  const focusState = {
    active: false,
    poolIdx: -1,
    lensFx: entryOn ? 0 : 1,
    anim: null as gsap.core.Timeline | null,
  };
  const N = REPEATS * count;
  const drop = new Array(N).fill(0);
  let focusScale = 1;
  const lastCenterX: Array<number | undefined> = new Array(N);
  const pEntry = new Array(N).fill(entryOn ? 0 : 1);
  const growArr = new Array(N).fill(entryOn ? 0 : 1);
  let entryActive = entryOn;
  let entrySettled = false;
  let entryAnim: gsap.core.Timeline | null = null;

  let panelRects: PanelRect[] = [];
  let centeredPanel: { srcIndex: number; poolIdx: number } | null = null;

  function layout() {
    panelRects = [];
    centeredPanel = null;
    let centeredDist = Infinity;
    const half = W / 2;
    const buffer = PANEL_H;
    const inEntry = entryActive || entrySettled;
    const midRep = Math.floor(REPEATS / 2);
    const cSrc = nearest(scroll).src;

    pool.forEach((p, poolIdx) => {
      const rep = Math.floor(poolIdx / count);
      const i = p.srcIndex;
      const aspect = textures[i].aspect;
      let x = slotCenter(i) - scroll;
      x = ((x % totalWidth) + totalWidth) % totalWidth;
      x += (rep - midRep) * totalWidth;
      if (x > half + totalWidth) x -= totalWidth * REPEATS;
      const centerX = x;

      if (!inEntry && (centerX < -half - buffer || centerX > half + buffer)) {
        p.mesh.visible = false;
        lastCenterX[poolIdx] = undefined;
        return;
      }
      lastCenterX[poolIdx] = centerX;

      const shrink = 1 - 0.25 * scrollEnergy;
      const h = PANEL_H * shrink;
      const wPx = aspect * PANEL_H * shrink;

      let y = 0;
      const isFocused = focusState.active && focusState.poolIdx === poolIdx;
      let drawW = wPx;
      let drawH = h;
      if (isFocused) {
        drawW = wPx * focusScale;
        drawH = h * focusScale;
      } else if (drop[poolIdx] > 0) {
        y = -drop[poolIdx] * H * FOCUS.dropDist;
      }

      p.mesh.visible = true;
      let finalX = centerX;
      let finalY = y;
      let finalW = drawW;
      let finalH = drawH;

      if (inEntry) {
        if (rep !== midRep) {
          p.mesh.visible = false;
          lastCenterX[poolIdx] = undefined;
          return;
        }
        const g = growArr[poolIdx];
        finalH = ENTRY.startH + (drawH - ENTRY.startH) * g;
        finalW = finalH * aspect;
        let di = i - cSrc;
        if (di > count / 2) di -= count;
        if (di < -count / 2) di += count;
        const slotH = (s: number) =>
          ENTRY.startH + (PANEL_H - ENTRY.startH) * growArr[midRep * count + s];
        let off = 0;
        const step = di > 0 ? 1 : -1;
        for (let k = 0; k < Math.abs(di); k++) {
          const sa = (((cSrc + step * k) % count) + count) % count;
          const sb = (((cSrc + step * (k + 1)) % count) + count) % count;
          off +=
            step *
            ((textures[sa].aspect * slotH(sa) + textures[sb].aspect * slotH(sb)) / 2 + GAP);
        }
        finalX = off;
        if (finalX < -half - buffer || finalX > half + buffer) {
          p.mesh.visible = false;
          lastCenterX[poolIdx] = undefined;
          return;
        }
        const below = -H * ENTRY.fromBelow;
        finalY = below + (y - below) * pEntry[poolIdx];
      }

      p.mesh.position.set(finalX, finalY, 0);
      p.mesh.scale.set(finalW, finalH, 1);

      const sx = centerX + W / 2;
      const sy = H / 2 - y;
      panelRects.push({
        left: sx - drawW / 2,
        right: sx + drawW / 2,
        top: sy - drawH / 2,
        bottom: sy + drawH / 2,
        poolIdx,
        srcIndex: i,
        centerX,
      });
      if (Math.abs(centerX) < centeredDist) {
        centeredDist = Math.abs(centerX);
        centeredPanel = { srcIndex: i, poolIdx };
      }
    });
  }

  const panelAt = (px: number, py: number) =>
    panelRects.find((r) => px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) ?? null;

  const localPoint = (e: { clientX: number; clientY: number }) => {
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  /* --- the "View" cursor */
  if (cursorElement) gsap.set(cursorElement, { xPercent: 20, yPercent: 30, scale: 0, autoAlpha: 0 });
  const moveX = cursorElement ? gsap.quickTo(cursorElement, "x", { duration: 0.4, ease: "power3.out" }) : null;
  const moveY = cursorElement ? gsap.quickTo(cursorElement, "y", { duration: 0.4, ease: "power3.out" }) : null;

  let dragging = false;
  let dragPointerId: number | null = null;
  let dragPointerType = "mouse";
  let dragStartX = 0;
  let dragStartY = 0;
  let dragLastX = 0;
  let dragDist = 0;
  let dragVel = 0;
  let dragMoveT = 0;
  let horizontalDrag = false;
  let suppressClick = false;
  let overPanel = false;
  let cursorNow = "";

  const inputLocked = () => focusState.active || entryActive || entrySettled;

  function setCursor(v: string) {
    if (v === cursorNow) return;
    cursorNow = v;
    el.style.cursor = v;
  }
  function setView(on: boolean) {
    if (inputLocked() || dragging) on = false;
    setCursor(dragging ? "grabbing" : on ? "grab" : "");
    if (on === overPanel) return;
    overPanel = on;
    if (!cursorElement) return;
    gsap.killTweensOf(cursorElement, "scale,autoAlpha,opacity,visibility");
    gsap.to(cursorElement, {
      scale: on ? 1 : 0,
      autoAlpha: on ? 1 : 0,
      duration: on ? 0.3 : 0.2,
      ease: on ? "power3.out" : "power3.in",
    });
  }

  function wake() {
    lastActive = performance.now();
    startLoop();
  }

  function onWheel(e: WheelEvent) {
    const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    if (!horizontal && !e.shiftKey) return; // the page's scroll
    e.preventDefault();
    e.stopPropagation(); // keep Lenis out of a gesture this row consumed
    if (inputLocked()) return;
    pendingFocus = null;
    target += (horizontal ? e.deltaX : e.deltaY) * WHEEL;
    lastInput = performance.now();
    snapped = false;
    wake();
  }

  function onPointerDown(e: PointerEvent) {
    suppressClick = false;
    if (inputLocked() || dragging) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    dragging = true;
    dragPointerId = e.pointerId;
    dragPointerType = e.pointerType || "mouse";
    horizontalDrag = dragPointerType === "mouse";
    if (horizontalDrag) {
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* best effort */
      }
    }
    const p = localPoint(e);
    dragStartX = dragLastX = p.x;
    dragStartY = p.y;
    dragDist = 0;
    dragVel = 0;
    dragMoveT = performance.now();
    velocity = 0;
    pendingFocus = null;
    snapped = false;
    lastInput = dragMoveT;
    setView(false);
    wake();
  }

  function onPointerMove(e: PointerEvent) {
    const p = localPoint(e);
    if (dragging && e.pointerId === dragPointerId) {
      /* On touch, decide once whether this is a horizontal drag of the row or
         a vertical scroll of the page; `pan-y` hands the latter to the browser,
         which cancels the pointer. */
      if (!horizontalDrag && Math.abs(p.x - dragStartX) > 8 && Math.abs(p.x - dragStartX) > Math.abs(p.y - dragStartY)) {
        horizontalDrag = true;
      }
      if (horizontalDrag) {
        const sens = dragPointerType === "mouse" ? DRAG : TOUCH_DRAG;
        const dx = p.x - dragLastX;
        dragDist += Math.abs(dx);
        target -= dx * sens;
        dragVel = dragVel * 0.6 + -dx * sens * 0.4;
        dragMoveT = performance.now();
        lastInput = dragMoveT;
        snapped = false;
      }
      dragLastX = p.x;
      wake();
    }
    if (e.pointerType !== "mouse") return;
    moveX?.(p.x);
    moveY?.(p.y);
    setView(!focusState.active && panelAt(p.x, p.y) !== null);
  }

  function onPointerUp(e?: PointerEvent) {
    if (!dragging) return;
    if (e && dragPointerId !== null && e.pointerId !== dragPointerId) return;
    dragging = false;
    if (dragPointerId !== null) {
      try {
        el.releasePointerCapture(dragPointerId);
      } catch {
        /* already released */
      }
      dragPointerId = null;
    }
    velocity = performance.now() - dragMoveT > FLICK_IDLE_MS ? 0 : dragVel;
    dragVel = 0;
    lastInput = performance.now();
    snapped = false;
    suppressClick = dragDist > (dragPointerType === "mouse" ? CLICK_SLOP : TOUCH_CLICK_SLOP);
    setView(false);
    wake();
  }

  function onLeave() {
    setView(false);
  }

  function onClick(e: MouseEvent) {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (inputLocked()) return;
    const p = localPoint(e);
    const hit = panelAt(p.x, p.y);
    if (!hit) return;
    if (centeredPanel && hit.poolIdx === centeredPanel.poolIdx) {
      openFocus();
      return;
    }
    velocity = 0;
    target = centerForIndex(nearest(scroll + hit.centerX).index);
    snapped = true;
    pendingFocus = { srcIndex: hit.srcIndex };
    setView(false);
    wake();
  }

  function ranked(fromX: number, filter: (idx: number) => boolean, farFirst: boolean) {
    const list = pool
      .map((_, idx) => ({ idx, x: lastCenterX[idx] }))
      .filter((o) => o.x !== undefined && filter(o.idx))
      .map((o) => ({ idx: o.idx, dist: Math.abs((o.x ?? 0) - fromX) }))
      .sort((a, b) => (farFirst ? b.dist - a.dist : a.dist - b.dist));
    let rank = 0;
    let prev = -1;
    return list.map((o) => {
      if (prev >= 0 && Math.abs(o.dist - prev) > 1) rank += 1;
      prev = o.dist;
      return { idx: o.idx, rank };
    });
  }

  function openFocus() {
    if (focusState.active || !centeredPanel) return;
    focusState.active = true;
    focusState.poolIdx = centeredPanel.poolIdx;
    target = centerForIndex(nearest(scroll).index);
    const fx = lastCenterX[focusState.poolIdx] ?? 0;
    const others = ranked(fx, (idx) => idx !== focusState.poolIdx, false);
    focusState.anim?.kill();
    const scaleProxy = { v: focusScale };
    const tl = gsap.timeline();
    tl.to(focusState, { lensFx: 0, duration: FOCUS.lensFade, ease: "power3.out" }, 0);
    tl.to(
      scaleProxy,
      {
        v: FOCUS.centerScale,
        duration: FOCUS.focusDuration,
        ease: FOCUS.focusEase,
        onUpdate: () => {
          focusScale = scaleProxy.v;
        },
      },
      0
    );
    others.forEach((o) =>
      tl.to(drop, { [o.idx]: 1, duration: FOCUS.cardDuration, ease: FOCUS.cardEase }, o.rank * FOCUS.stagger)
    );
    focusState.anim = tl;
    setView(false);
    options.onFocusChange(true);
    wake();
  }

  function closeFocus() {
    if (!focusState.active) return;
    focusState.anim?.kill();
    const fx = lastCenterX[focusState.poolIdx] ?? 0;
    const others = ranked(fx, (idx) => drop[idx] > 0, true);
    options.onFocusChange(false);
    const scaleProxy = { v: focusScale };
    const tl = gsap.timeline({
      onComplete: () => {
        focusState.active = false;
      },
    });
    tl.to(focusState, { lensFx: 1, duration: FOCUS.lensFade * 0.8, ease: "power3.inOut" }, 0);
    tl.to(
      scaleProxy,
      {
        v: 1,
        duration: FOCUS.focusDuration * 0.85,
        ease: FOCUS.focusEase,
        onUpdate: () => {
          focusScale = scaleProxy.v;
        },
      },
      0
    );
    others.forEach((o) =>
      tl.to(
        drop,
        { [o.idx]: 0, duration: FOCUS.cardDuration * 0.85, ease: FOCUS.cardEase },
        o.rank * FOCUS.stagger * 0.7
      )
    );
    focusState.anim = tl;
    wake();
  }

  function playEntry() {
    entryAnim?.kill();
    pEntry.fill(0);
    growArr.fill(0);
    entryActive = true;
    entrySettled = false;
    options.onEntryDone(false);
    focusState.lensFx = 0;
    target = scroll = centerForIndex(nearest(scroll).index);
    velocity = 0;
    snapped = true;
    layout();
    const visible: number[] = [];
    lastCenterX.forEach((x, k) => x !== undefined && visible.push(k));

    const tl = gsap.timeline({ delay: ENTRY.delay });
    const spread = ENTRY.stagger * Math.max(visible.length - 1, 1);
    let lastRiseEnd = 0;
    visible.forEach((idx, n) => {
      /* Seeded spread rather than Math.random, so the rise is the same every
         visit. */
      const at = ((n * 7919) % visible.length) / Math.max(visible.length, 1) * spread;
      lastRiseEnd = Math.max(lastRiseEnd, at + ENTRY.riseDuration);
      tl.to(pEntry, { [idx]: 1, duration: ENTRY.riseDuration, ease: ENTRY.riseEase }, at);
    });
    tl.call(
      () => {
        entryActive = false;
        entrySettled = true;
      },
      [],
      lastRiseEnd
    );

    const cSrc = nearest(scroll).src;
    const midRep = Math.floor(REPEATS / 2);
    const grow: { idx: number; rank: number }[] = [];
    let maxRank = 0;
    visible.forEach((k) => {
      if (Math.floor(k / count) !== midRep) return;
      let di = (k % count) - cSrc;
      if (di > count / 2) di -= count;
      if (di < -count / 2) di += count;
      maxRank = Math.max(maxRank, Math.abs(di));
      grow.push({ idx: k, rank: Math.abs(di) });
    });
    const growStart = lastRiseEnd + ENTRY.growDelay;
    let growEnd = growStart;
    tl.to(focusState, { lensFx: 1, duration: ENTRY.lensBloom, ease: ENTRY.lensBloomEase }, growStart);
    grow.forEach((o) => {
      const at = growStart + (maxRank - o.rank) * ENTRY.growStagger;
      growEnd = Math.max(growEnd, at + ENTRY.growDuration);
      tl.to(growArr, { [o.idx]: 1, duration: ENTRY.growDuration, ease: ENTRY.growEase }, at);
    });
    tl.call(
      () => {
        entrySettled = false;
        growArr.fill(1);
        options.onEntryDone(true);
      },
      [],
      growEnd
    );
    entryAnim = tl;
  }

  function step(direction: number) {
    if (inputLocked()) return;
    velocity = 0;
    pendingFocus = null;
    target = centerForIndex(nearest(scroll).index + direction);
    snapped = true;
    lastInput = performance.now();
    wake();
  }

  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerUp);
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("click", onClick);

  let raf = 0;
  let running = true;
  let visible = true;
  let lastFrame = 0;

  /* Every constant below was tuned per frame at 60Hz. Scaling by elapsed time
     keeps the row's feel identical at 30, 60 or 120Hz, and under throttling. */
  const per = (k: number, frames: number) => 1 - Math.pow(1 - k, frames);

  function busy() {
    return (
      dragging ||
      Math.abs(target - scroll) > 0.05 ||
      velocity !== 0 ||
      scrollEnergy > 0.001 ||
      !!pendingFocus ||
      !!focusState.anim?.isActive() ||
      !!entryAnim?.isActive() ||
      entryActive ||
      entrySettled
    );
  }

  function tick() {
    if (!running) return;
    if (!visible || document.hidden) {
      raf = 0;
      lastFrame = 0;
      return;
    }
    const now = performance.now();
    const frames = lastFrame ? Math.min(4, (now - lastFrame) / (1000 / 60)) : 1;
    lastFrame = now;
    if (!dragging) {
      target += velocity * frames;
      velocity *= Math.pow(FRICTION, frames);
      if (Math.abs(velocity) < 0.05) velocity = 0;
      if (!snapped && !focusState.active && now - lastInput > SNAP_IDLE_MS) {
        target = centerForIndex(nearest(scroll).index);
        snapped = true;
      }
    }
    const follow =
      dragging && dragPointerType !== "mouse" ? TOUCH_EASE : snapped && !pendingFocus ? SNAP_EASE : EASE;
    scroll += (target - scroll) * per(follow, frames);

    const ci = nearest(scroll).src;
    if (ci !== lastCenter) {
      lastCenter = ci;
      options.onActiveChange(ci);
    }

    const speed = (scroll - prevScroll) / Math.max(frames, 0.25);
    prevScroll = scroll;
    const norm = Math.min(1, Math.abs(speed) / SHRINK_MAX);
    scrollEnergy +=
      (norm - scrollEnergy) * per(norm > scrollEnergy ? SHRINK_ATTACK : SHRINK_DECAY, frames);
    if (scrollEnergy < 0.0005) scrollEnergy = 0;

    layout();

    if (pendingFocus && !focusState.active && Math.abs(target - scroll) < 0.5) {
      const pf = pendingFocus;
      pendingFocus = null;
      if (centeredPanel && centeredPanel.srcIndex === pf.srcIndex) openFocus();
    }

    lensUniforms.uAspect.value = W / H;
    lensUniforms.uTime.value = now * 0.001;
    for (const key of LENS_FX_KEYS) lensUniforms[key].value = lensFxFull[key] * focusState.lensFx;

    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(lensScene, lensCam);

    if (busy()) lastActive = now;
    if (now - lastActive > IDLE_MS) {
      raf = 0;
      lastFrame = 0;
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (!running || raf) return;
    raf = requestAnimationFrame(tick);
  }

  startLoop();
  if (entryOn) playEntry();
  else options.onEntryDone(true);

  function onResize() {
    W = Math.max(1, mount.clientWidth);
    H = Math.max(1, mount.clientHeight);
    PANEL_H = panelHFor();
    recomputeTotal();
    dpr = ratioFor();
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H);
    camera.left = -W / 2;
    camera.right = W / 2;
    camera.top = H / 2;
    camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
    rt.dispose();
    rt = makeRT();
    lensUniforms.uTex.value = rt.texture;
    target = scroll = centerForIndex(nearest(scroll).index);
    wake();
  }

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(mount);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    if (visible) wake();
  });
  intersection.observe(mount);
  const onVisibility = () => {
    if (!document.hidden) wake();
  };
  document.addEventListener("visibilitychange", onVisibility);

  function destroy() {
    running = false;
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    intersection.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    el.removeEventListener("wheel", onWheel);
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerUp);
    el.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("click", onClick);
    focusState.anim?.kill();
    entryAnim?.kill();
    if (cursorElement) gsap.killTweensOf(cursorElement);
    renderer.dispose();
    rt.dispose();
    lensQuad.geometry.dispose();
    lensMat.dispose();
    pool.forEach((p) => {
      p.mesh.geometry.dispose();
      p.mat.dispose();
    });
    textures.forEach((t) => t.tex.dispose());
    el.remove();
  }

  return {
    next: () => step(1),
    previous: () => step(-1),
    openCentered: () => {
      if (!inputLocked()) openFocus();
    },
    closeFocus,
    destroy,
  };
}
