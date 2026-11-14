import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { onWorldFrame, readWorldFrame } from "@/lib/cinematicWorld";
import { WORLD_POSES } from "./worldPoses";

/** A physical chamber with a single renderer, asleep whenever its camera settles. */
export function createWorld(host: HTMLElement, path: string, transform: string, uncovered: () => boolean) {
  const canvas = document.createElement("canvas");
  canvas.className = "cin-world-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2("#080914", .024);
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 120);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const keepGeometry = <T extends THREE.BufferGeometry>(geometry: T) => { geometries.add(geometry); return geometry; };
  const keepMaterial = <T extends THREE.Material>(material: T) => { materials.add(material); return material; };

  // Broad light cards give the metal continuous, readable highlights.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const lightCard = (color: string, x: number, y: number, z: number, width: number, height: number) => {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    card.position.set(x, y, z); card.lookAt(0, 0, 0); room.add(card);
  };
  lightCard("#ff174e", -5, 1, 3, 3, 9);
  lightCard("#8c64ff", 5, 2, 0, 3, 10);
  lightCard("#f3f1ff", 0, 6, 3, 8, 2);
  const environment = pmrem.fromScene(room, .025);
  scene.environment = environment.texture;
  room.dispose(); pmrem.dispose();

  // Deterministic machining grain, with no texture downloads or animated noise.
  const grain = document.createElement("canvas"); grain.width = grain.height = 128;
  const ctx = grain.getContext("2d")!;
  const pixels = ctx.createImageData(128, 128);
  let seed = 173;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 150 + (seed >>> 27);
    pixels.data[i] = value; pixels.data[i + 1] = value; pixels.data[i + 2] = value; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const roughness = new THREE.CanvasTexture(grain);
  roughness.wrapS = roughness.wrapT = THREE.RepeatWrapping;
  roughness.repeat.set(3, 34); textures.add(roughness);

  const parsed = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="white" d="${path}" transform="${transform}"/></svg>`);
  const shapes = parsed.paths.flatMap((svgPath) => SVGLoader.createShapes(svgPath));
  const geometry = keepGeometry(new THREE.ExtrudeGeometry(shapes, { depth: 1.65, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: .19, bevelThickness: .25, curveSegments: 24 }));
  geometry.center(); geometry.scale(.30, .30, .30); geometry.rotateX(Math.PI);
  const metal = keepMaterial(new THREE.MeshStandardMaterial({ color: "#9b9ca7", metalness: .98, roughness: .31, roughnessMap: roughness, envMapIntensity: 1.35 }));
  const sculpture = new THREE.Mesh(geometry, metal);
  sculpture.position.set(3.4, 1.4, 0); sculpture.rotation.set(.08, -.4, -.15); sculpture.scale.setScalar(1.18);
  scene.add(sculpture);
  const edgeGeometry = keepGeometry(new THREE.EdgesGeometry(geometry, 38));
  const edgeMaterial = keepMaterial(new THREE.LineBasicMaterial({ color: "#dfd8f5", transparent: true, opacity: .12 }));
  sculpture.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));

  const structure = keepMaterial(new THREE.MeshStandardMaterial({ color: "#191c28", metalness: .85, roughness: .43, envMapIntensity: .65 }));
  const box = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
  const ribs = new THREE.InstancedMesh(box, structure, 24);
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  for (let i = 0; i < 8; i++) {
    const z = 4 - i * 5;
    for (let j = 0; j < 3; j++) {
      const position = new THREE.Vector3(j === 0 ? -9 : j === 1 ? 9 : 0, j === 2 ? 7 : 1.3, z);
      const scale = j === 2 ? new THREE.Vector3(18.4, .24, .5) : new THREE.Vector3(.24, 11.4, .5);
      matrix.compose(position, rotation, scale); ribs.setMatrixAt(i * 3 + j, matrix);
    }
  }
  scene.add(ribs);

  // Continuous ramps on the architectural lights, never flat neon fills.
  const stripGeometry = keepGeometry(new THREE.PlaneGeometry(18, .045, 16, 1));
  const stripPositions = stripGeometry.attributes.position;
  const stripColors = new Float32Array(stripPositions.count * 3);
  const red = new THREE.Color("#ff164f"); const violet = new THREE.Color("#7651ff"); const tint = new THREE.Color();
  for (let i = 0; i < stripPositions.count; i++) tint.copy(red).lerp(violet, (stripPositions.getX(i) + 9) / 18).toArray(stripColors, i * 3);
  stripGeometry.setAttribute("color", new THREE.BufferAttribute(stripColors, 3));
  const stripMaterial = keepMaterial(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const strips = new THREE.InstancedMesh(stripGeometry, stripMaterial, 14);
  const floorRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const unitScale = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < 7; i++) {
    matrix.compose(new THREE.Vector3(0, 6.84, 3.7 - i * 5), rotation, unitScale); strips.setMatrixAt(i * 2, matrix);
    matrix.compose(new THREE.Vector3(0, -4.38, 3.7 - i * 5), floorRotation, unitScale); strips.setMatrixAt(i * 2 + 1, matrix);
  }
  scene.add(strips);
  const floorGeometry = keepGeometry(new THREE.PlaneGeometry(100, 110));
  const floorMaterial = keepMaterial(new THREE.MeshStandardMaterial({ color: "#12131d", metalness: .85, roughness: .36, roughnessMap: roughness, envMapIntensity: .5 }));
  const floor = new THREE.Mesh(floorGeometry, floorMaterial); floor.rotation.x = -Math.PI / 2; floor.position.set(0, -4.4, -20); scene.add(floor);
  // A faded mirrored subject gives the floor depth without a second render.
  const reflectionMaterial = keepMaterial(new THREE.MeshStandardMaterial({ color: "#736575", metalness: .95, roughness: .5, transparent: true, opacity: .12, depthWrite: false, depthTest: false, envMapIntensity: .8 }));
  const reflection = new THREE.Mesh(geometry, reflectionMaterial); reflection.scale.set(1.18, -1.18, 1.18); reflection.renderOrder = 1; scene.add(reflection);

  const glowCanvas = document.createElement("canvas"); glowCanvas.width = 256; glowCanvas.height = 128;
  const glowContext = glowCanvas.getContext("2d")!;
  const glow = glowContext.createRadialGradient(128, 64, 1, 128, 64, 128);
  glow.addColorStop(0, "#c42a774d"); glow.addColorStop(.3, "#713fff26"); glow.addColorStop(1, "#713fff00");
  glowContext.fillStyle = glow; glowContext.fillRect(0, 0, 256, 128);
  const glowTexture = new THREE.CanvasTexture(glowCanvas); glowTexture.colorSpace = THREE.SRGBColorSpace; textures.add(glowTexture);
  const glowMaterial = keepMaterial(new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, depthWrite: false }));
  const glowPlane = new THREE.Mesh(keepGeometry(new THREE.PlaneGeometry(23, 11)), glowMaterial);
  glowPlane.rotation.x = -Math.PI / 2; glowPlane.position.set(1, -4.37, 1); scene.add(glowPlane);
  const key = new THREE.DirectionalLight("#f2efff", 2.6); key.position.set(-2, 8, 8); scene.add(key);
  const redLight = new THREE.PointLight("#ff164f", 190, 40, 2); redLight.position.set(-6, 1, 4); scene.add(redLight);
  const violetLight = new THREE.PointLight("#7651ff", 230, 40, 2); violetLight.position.set(7, 2, 3); scene.add(violetLight);
  scene.add(new THREE.AmbientLight("#8589b5", .3));

  host.append(canvas);
  let raf = 0; let stopped = false; let lost = false; let previous = 0; let phone = false;
  const current = { ...WORLD_POSES.hero, z: 24, opacity: 0 };
  function draw(now: number) {
    raf = 0;
    if (stopped || lost || document.hidden || !uncovered()) return;
    // Keep native scroll/UI at the display rate; the scene itself needs 60 Hz.
    if (previous && now - previous < 15) { raf = requestAnimationFrame(draw); return; }
    const dt = previous ? Math.min(60, now - previous) : 16.67; previous = now;
    const { chapter, progress } = readWorldFrame();
    const pose = WORLD_POSES[chapter];
    const target = { ...pose, z: phone ? pose.z + 9 : pose.z, x: phone ? 0 : pose.x };
    if (chapter === "hero") { target.z -= progress * 3; target.y += progress * .7; target.angle += progress * .22; }
    const ease = 1 - Math.exp(-dt / 130);
    let unsettled = false;
    for (const key of ["x", "y", "z", "angle", "opacity"] as const) {
      current[key] = THREE.MathUtils.lerp(current[key], target[key], ease);
      if (Math.abs(current[key] - target[key]) > .002) unsettled = true;
    }
    camera.position.set(current.x, current.y, current.z); camera.lookAt(0, .5, -3);
    sculpture.rotation.y = current.angle;
    reflection.position.set(sculpture.position.x, -8.8 - sculpture.position.y, sculpture.position.z);
    reflection.rotation.set(-sculpture.rotation.x, sculpture.rotation.y, -sculpture.rotation.z);
    canvas.style.opacity = String(current.opacity);
    renderer.render(scene, camera);
    host.dataset.webgl = "ready";
    canvas.dataset.draws = String(renderer.info.render.calls);
    if (unsettled) raf = requestAnimationFrame(draw);
  }
  function kick() { if (!raf && !stopped && !lost && !document.hidden && uncovered()) { raf = requestAnimationFrame(draw); } }
  function resize() {
    phone = host.clientWidth < 900;
    const pixels = phone ? 450_000 : 1_100_000;
    const scale = Math.min(window.devicePixelRatio || 1, Math.sqrt(pixels / Math.max(1, host.clientWidth * host.clientHeight)));
    renderer.setSize(Math.max(1, Math.floor(host.clientWidth * scale)), Math.max(1, Math.floor(host.clientHeight * scale)), false);
    camera.aspect = host.clientWidth / Math.max(1, host.clientHeight); camera.updateProjectionMatrix();
    canvas.dataset.pixels = String(canvas.width * canvas.height); kick();
  }
  function contextLost(event: Event) { event.preventDefault(); lost = true; cancelAnimationFrame(raf); raf = 0; delete host.dataset.webgl; }
  function contextRestored() { lost = false; resize(); }
  const observer = new ResizeObserver(resize); observer.observe(host);
  let observedChapter = readWorldFrame().chapter;
  const unsubscribe = onWorldFrame(() => {
    const { chapter } = readWorldFrame();
    // Reading stages have a fixed pose: their scroll progress needs no GPU work.
    if (chapter === "hero" || chapter !== observedChapter) kick();
    observedChapter = chapter;
  });
  canvas.addEventListener("webglcontextlost", contextLost); canvas.addEventListener("webglcontextrestored", contextRestored);
  document.addEventListener("visibilitychange", kick); window.addEventListener("cinematic-cover", kick);
  resize();
  return () => {
    stopped = true; cancelAnimationFrame(raf); observer.disconnect(); unsubscribe();
    canvas.removeEventListener("webglcontextlost", contextLost); canvas.removeEventListener("webglcontextrestored", contextRestored);
    document.removeEventListener("visibilitychange", kick); window.removeEventListener("cinematic-cover", kick);
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
    ribs.dispose(); strips.dispose(); environment.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); delete host.dataset.webgl;
  };
}
