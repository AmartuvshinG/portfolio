import * as THREE from "three";
import type { Project } from "@/lib/content";
import { accentColor } from "@/lib/content";

/**
 * ============================================================================
 * Card textures for the 3D work world.
 *
 * Every card in the world is a flat plane wearing a canvas-drawn texture. Doing
 * the composition in 2D rather than in the scene graph buys three things at
 * once: rounded corners come free from `roundRect` clipping (a plane with an
 * alpha edge, no geometry work), the title and index are crisp text instead of
 * either a second texture or DOM overlays that have to be kept in sync with a
 * moving camera, and the missing-screenshot case is not a special path — it
 * draws a generated panel through the exact same pipeline, so the world looks
 * intentional before a single real asset exists.
 * ============================================================================
 */

/** Texture pixel size. 2:1.25 to match the 2000×1250 screenshot spec. */
const W = 1024;
const H = 640;
const RADIUS = 34;

/** Drawn when a project's screenshot is absent. */
function drawGeneratedPanel(
  ctx: CanvasRenderingContext2D,
  project: Project
) {
  const tint = accentColor[project.accent];

  ctx.fillStyle = "#101015";
  ctx.fillRect(0, 0, W, H);

  // Accent wash, weighted to one side so the four cards don't read identically.
  // Kept light: the card also carries an additive rim plate in the scene, and
  // the two compounding turned the lime project into a solid green panel.
  const wash = ctx.createLinearGradient(W, 0, W * 0.2, H);
  wash.addColorStop(0, `${tint}22`);
  wash.addColorStop(1, "transparent");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  // Hairline grid
  ctx.strokeStyle = "rgba(244,243,239,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }

  // Oversized index watermark
  ctx.fillStyle = `${tint}1f`;
  ctx.font = `900 ${H * 0.78}px Archivo, Arial Black, sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(project.index, -12, H + H * 0.16);
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  // object-fit: cover, by hand.
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

  // Bottom scrim, so the title stays readable over any screenshot.
  const scrim = ctx.createLinearGradient(0, H * 0.45, 0, H);
  scrim.addColorStop(0, "rgba(7,7,10,0)");
  scrim.addColorStop(1, "rgba(7,7,10,0.88)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, H);
}

function drawChrome(ctx: CanvasRenderingContext2D, project: Project) {
  const tint = accentColor[project.accent];
  const pad = 42;

  ctx.textBaseline = "alphabetic";

  // Index + category, top left
  ctx.fillStyle = tint;
  ctx.font = "500 20px JetBrains Mono, ui-monospace, monospace";
  ctx.fillText(project.index, pad, pad + 18);

  ctx.fillStyle = "rgba(244,243,239,0.55)";
  ctx.fillText(project.category.toUpperCase(), pad + 56, pad + 18);

  // Year, top right
  const year = project.year;
  ctx.textAlign = "right";
  ctx.fillText(year, W - pad, pad + 18);
  ctx.textAlign = "left";

  // Title, bottom left
  ctx.fillStyle = "#f4f3ef";
  ctx.font = "900 62px Archivo, Arial Black, sans-serif";
  ctx.fillText(project.title, pad, H - pad - 30);

  // Accent rule under the title
  ctx.fillStyle = tint;
  ctx.fillRect(pad, H - pad - 14, 120, 4);
}

/**
 * Builds one card texture. Resolves as soon as the screenshot loads — or
 * immediately with the generated panel if it is missing, which is why a fresh
 * clone of the repo still renders a complete world.
 */
export function buildCardTexture(project: Project): Promise<THREE.CanvasTexture> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    const finish = () => {
      drawChrome(ctx, project);

      // Rounded corners, cut last: compositing the clip as a mask over the
      // finished art is far simpler than clipping every draw call above.
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, RADIUS);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      resolve(texture);
    };

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      drawCover(ctx, img);
      finish();
    };
    img.onerror = () => {
      drawGeneratedPanel(ctx, project);
      finish();
    };
    img.src = project.shot;
  });
}
