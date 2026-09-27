/**
 * Draws one capability card onto a canvas, so the WebGL carousel can use it
 * as a texture.
 *
 * The cards have no photographs, and the carousel's lens needs pixels to bend,
 * so each card is typeset here in the site's own faces: the code, the icon
 * chip, the title, the description, the tags, and the case file that proves
 * it. The fonts are read from the live CSS variables, which means a Mongolian
 * page draws in the Mongolian faces with no extra work. Those faces are
 * `preload: false`, so they are loaded explicitly before anything is drawn:
 * a canvas does not wait for a font, it silently falls back.
 */

export const PANEL_W = 900;
export const PANEL_H = 1200;

export interface PanelSpec {
  code: string;
  title: string;
  description: string;
  tags: string[];
  /** Serialised SVG markup of the card's icon, stroke already resolved. */
  iconSvg: string;
  proofLabel?: string;
  proofTitle?: string;
}

interface Faces {
  tech: string;
  sans: string;
  mono: string;
}

function readFaces(): Faces {
  const css = getComputedStyle(document.documentElement);
  const pick = (v: string, fallback: string) => css.getPropertyValue(v).trim() || fallback;
  return {
    tech: pick("--font-tech", "system-ui, sans-serif"),
    sans: pick("--font-sans", "system-ui, sans-serif"),
    mono: pick("--font-mono", "ui-monospace, monospace"),
  };
}

/** Make sure every face and weight used below is loaded, for this text. */
async function loadFaces(f: Faces, sample: string) {
  const specs = [`700 80px ${f.tech}`, `400 40px ${f.sans}`, `500 26px ${f.mono}`];
  await Promise.all(specs.map((s) => document.fonts.load(s, sample).catch(() => [])));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= width || !line) {
      line = next;
    } else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function ramp(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, a = 1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, `rgba(255,45,143,${a})`);
  g.addColorStop(0.5, `rgba(123,92,255,${a})`);
  g.addColorStop(1, `rgba(34,224,255,${a})`);
  return g;
}

/** Type scale per layout. `compact` is for phones, where a panel is shown at
    about a third of its texture size and the desktop scale would set the
    description near 11px. */
const SCALES = {
  regular: { title: 80, titleLead: 86, body: 40, bodyLead: 56, bodyLines: 6, tag: 30 },
  compact: { title: 100, titleLead: 104, body: 50, bodyLead: 66, bodyLines: 5, tag: 36 },
};

export async function drawPanels(
  specs: PanelSpec[],
  compact = false
): Promise<HTMLCanvasElement[]> {
  const faces = readFaces();
  await loadFaces(faces, specs.map((s) => `${s.title} ${s.description} ${s.proofLabel ?? ""}`).join(" "));
  return Promise.all(specs.map((s) => drawPanel(s, faces, SCALES[compact ? "compact" : "regular"])));
}

async function drawPanel(
  spec: PanelSpec,
  f: Faces,
  k: (typeof SCALES)["regular"]
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = PANEL_W;
  canvas.height = PANEL_H;
  const ctx = canvas.getContext("2d")!;
  const R = 56;
  const PAD = 72;

  /* Glass body: deep ink, a violet bloom low in the card and a lit top edge. */
  roundRect(ctx, 2, 2, PANEL_W - 4, PANEL_H - 4, R);
  ctx.save();
  ctx.clip();
  const body = ctx.createLinearGradient(0, 0, 0, PANEL_H);
  body.addColorStop(0, "rgba(22,20,52,0.96)");
  body.addColorStop(1, "rgba(9,10,24,0.96)");
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);
  const bloom = ctx.createRadialGradient(PANEL_W * 0.8, PANEL_H * 1.05, 40, PANEL_W * 0.8, PANEL_H * 1.05, PANEL_W);
  bloom.addColorStop(0, "rgba(123,92,255,0.38)");
  bloom.addColorStop(1, "rgba(123,92,255,0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);
  const sheen = ctx.createLinearGradient(0, 0, PANEL_W, PANEL_H * 0.5);
  sheen.addColorStop(0, "rgba(255,255,255,0.1)");
  sheen.addColorStop(0.45, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);
  ctx.restore();

  /* Rim on the ramp. */
  roundRect(ctx, 3, 3, PANEL_W - 6, PANEL_H - 6, R);
  ctx.lineWidth = 4;
  ctx.strokeStyle = ramp(ctx, 0, 0, PANEL_W, PANEL_H, 0.75);
  ctx.stroke();

  /* Icon chip. */
  const chip = 120;
  roundRect(ctx, PAD, PAD, chip, chip, 32);
  ctx.fillStyle = ramp(ctx, PAD, PAD, PAD + chip, PAD + chip, 0.28);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(236,238,251,0.3)";
  ctx.stroke();
  try {
    const icon = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(spec.iconSvg)}`);
    ctx.drawImage(icon, PAD + 30, PAD + 30, chip - 60, chip - 60);
  } catch {
    /* The chip reads fine empty. */
  }

  /* Code, top right. */
  ctx.fillStyle = "rgba(236,238,251,0.7)";
  ctx.font = `500 30px ${f.mono}`;
  ctx.letterSpacing = "6px";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(spec.code, PANEL_W - PAD, PAD + 8);
  ctx.textAlign = "left";

  /* Title. */
  let y = PAD + chip + 70;
  ctx.font = `700 ${k.title}px ${f.tech}`;
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#eceefb";
  for (const line of wrap(ctx, spec.title.toUpperCase(), PANEL_W - PAD * 2, 3)) {
    ctx.fillText(line, PAD, y);
    y += k.titleLead;
  }

  /* Description. */
  y += 30;
  ctx.font = `400 ${k.body}px ${f.sans}`;
  ctx.fillStyle = "rgba(200,204,232,0.92)";
  for (const line of wrap(ctx, spec.description, PANEL_W - PAD * 2, k.bodyLines)) {
    ctx.fillText(line, PAD, y);
    y += k.bodyLead;
  }

  /* Tags, as pills — as many as fit above the proof footer. */
  y += 36;
  const tagFloor = spec.proofTitle ? PANEL_H - PAD - 96 - 60 : PANEL_H - PAD;
  const pillH = k.tag + 26;
  ctx.font = `500 ${k.tag}px ${f.mono}`;
  ctx.letterSpacing = "1px";
  let x = PAD;
  for (const tag of spec.tags) {
    const w = ctx.measureText(tag).width + 48;
    if (x + w > PANEL_W - PAD) {
      x = PAD;
      y += pillH + 14;
    }
    if (y + pillH > tagFloor) break;
    roundRect(ctx, x, y, w, pillH, pillH / 2);
    ctx.fillStyle = "rgba(236,238,251,0.06)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(236,238,251,0.22)";
    ctx.stroke();
    ctx.fillStyle = "rgba(236,238,251,0.9)";
    ctx.fillText(tag, x + 24, y + (pillH - k.tag) / 2);
    x += w + 14;
  }

  /* Proof, pinned to the foot. */
  if (spec.proofTitle && spec.proofLabel) {
    const foot = PANEL_H - PAD - 96;
    ctx.fillStyle = ramp(ctx, PAD, 0, PANEL_W - PAD, 0, 0.6);
    ctx.fillRect(PAD, foot - 30, PANEL_W - PAD * 2, 2);
    ctx.font = `500 26px ${f.mono}`;
    ctx.letterSpacing = "5px";
    ctx.fillStyle = "rgba(236,238,251,0.62)";
    ctx.fillText(spec.proofLabel.toUpperCase(), PAD, foot);
    ctx.font = `700 44px ${f.tech}`;
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#eceefb";
    ctx.fillText(spec.proofTitle.toUpperCase(), PAD, foot + 44);
  }

  return canvas;
}
