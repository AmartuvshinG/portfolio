/**
 * Bake the preloader's LED sign: the Mongol-script name as a dot matrix.
 *
 *   node scripts/bake-led-name.mjs [divisions] [--preview out.png]
 *
 * Renders `profile.nameScript` in Noto Sans Mongolian (the same Google
 * `text=` subset the layout loads), turns it the way `writing-mode:
 * vertical-lr` turns Mongol script — 90° clockwise — and supersamples every
 * LED cell 8×8 into a coverage level 0–3. The result is written to
 * src/lib/ledName.ts.
 *
 * Why bake rather than sample at runtime: the intro is the first thing on
 * screen, and it would otherwise have to wait for Google Fonts to answer
 * before it could draw a single diode. Baked, it paints on frame one.
 *
 * Rerun whenever `profile.nameScript` changes.
 *
 * The face is checked with CDP `CSS.getPlatformFontsForNode`, not
 * `document.fonts.check` — the latter only says *a* face covering the range
 * loaded, not that the glyphs came from it (see the Unbounded trap).
 */
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const ROOT = new URL("..", import.meta.url);
const args = process.argv.slice(2);
/** LED cells across the font size (the column's width is ~1.3× this). */
const DIVS = Number(args.find((a) => /^\d+$/.test(a)) ?? 14);
const previewAt = args.includes("--preview") ? args[args.indexOf("--preview") + 1] : null;

const content = await readFile(new URL("src/lib/content.ts", ROOT), "utf8");
const m = /nameScript:\s*"([^"]+)"/.exec(content);
if (!m) throw new Error("nameScript not found in src/lib/content.ts");
// The source writes FVS1 as an escape; JSON.parse turns it into the character.
const name = JSON.parse(`"${m[1]}"`);

const FONT_PX = 280;
const fontUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+Mongolian&display=block&text=${encodeURIComponent(name)}`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.setContent(
    `<!doctype html><html><head><link rel="stylesheet" href="${fontUrl}"></head>
     <body style="margin:0;background:#000">
       <span id="probe" lang="mn-Mong" style="font:${FONT_PX}px 'Noto Sans Mongolian';writing-mode:vertical-lr;color:#fff">${name}</span>
     </body></html>`,
    { waitUntil: "networkidle" }
  );
  await page.evaluate(() => document.fonts.ready);

  // Which face actually drew the glyphs.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument");
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#probe" });
  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
  console.log("faces:", fonts.map((f) => `${f.familyName} ×${f.glyphCount}`).join(", "));
  if (fonts.length !== 1 || !/Mongolian/i.test(fonts[0].familyName)) {
    throw new Error("a fallback face drew part of the name — the bake would be wrong");
  }

  if (previewAt) {
    await page.locator("#probe").screenshot({ path: previewAt.replace(/\.png$/, "-dom.png") });
  }

  const grid = await page.evaluate(
    ({ name, FONT_PX, DIVS }) => {
      const font = `${FONT_PX}px 'Noto Sans Mongolian'`;
      const probe = document.createElement("canvas").getContext("2d");
      probe.font = font;
      const tw = Math.ceil(probe.measureText(name).width) + 40;
      const th = Math.ceil(FONT_PX * 1.6);

      // Horizontal render; the vertical sign is this turned 90° clockwise.
      const c = document.createElement("canvas");
      c.width = tw;
      c.height = th;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, tw, th);
      ctx.fillStyle = "#fff";
      ctx.font = font;
      ctx.textBaseline = "middle";
      ctx.direction = "ltr";
      ctx.fillText(name, 20, th / 2);
      const px = ctx.getImageData(0, 0, tw, th).data;
      const at = (x, y) => (x < 0 || y < 0 || x >= tw || y >= th ? 0 : px[(y * tw + x) * 4] / 255);

      // Vertical: V(x, y) = H(y, th - 1 - x). Rows run along the text.
      const pitch = FONT_PX / DIVS;
      const cols = Math.ceil(th / pitch);
      const rows = Math.ceil(tw / pitch);
      const S = 8;
      const cov = [];
      for (let r = 0; r < rows; r++) {
        const line = [];
        for (let col = 0; col < cols; col++) {
          let sum = 0;
          for (let sy = 0; sy < S; sy++)
            for (let sx = 0; sx < S; sx++) {
              const vx = (col + (sx + 0.5) / S) * pitch;
              const vy = (r + (sy + 0.5) / S) * pitch;
              sum += at(Math.floor(vy), Math.floor(th - 1 - vx));
            }
          line.push(sum / (S * S));
        }
        cov.push(line);
      }
      return { cov, rows, cols };
    },
    { name, FONT_PX, DIVS }
  );

  // Coverage → level. A cell a third covered still reads as part of a stroke
  // at LED pitch; below a tenth it is anti-aliasing noise.
  const level = (v) => (v >= 0.62 ? 3 : v >= 0.36 ? 2 : v >= 0.12 ? 1 : 0);
  let lines = grid.cov.map((row) => row.map(level));

  // Trim empty margins.
  const used = (l) => l.some((v) => v > 0);
  while (lines.length && !used(lines[0])) lines.shift();
  while (lines.length && !used(lines[lines.length - 1])) lines.pop();
  let left = 0;
  let right = lines[0].length - 1;
  while (left < right && lines.every((l) => l[left] === 0)) left++;
  while (right > left && lines.every((l) => l[right] === 0)) right--;
  lines = lines.map((l) => l.slice(left, right + 1));

  const rows = lines.length;
  const cols = lines[0].length;
  const cells = lines.map((l) => l.map((v) => (v ? String(v) : ".")).join(""));
  const lit = cells.join("").replace(/\./g, "").length;
  console.log(`grid ${cols}×${rows}, ${lit} LEDs`);
  console.log(cells.join("\n"));

  const out = `/**
 * GENERATED by scripts/bake-led-name.mjs — do not edit by hand.
 * Rerun it whenever \`profile.nameScript\` changes.
 *
 * The Mongol-script name as a dot matrix, already turned for vertical-lr:
 * one string per LED row, top to bottom; "." is no diode, 1–3 how much of the
 * cell the glyph covered (edge cells burn dimmer, which is what keeps the
 * silhouette from looking like a staircase). ${cols}×${rows}, ${lit} LEDs.
 */
export const LED_NAME = {
  cols: ${cols},
  rows: ${rows},
  cells: [
${cells.map((c) => `    "${c}",`).join("\n")}
  ],
} as const;
`;
  await writeFile(new URL("src/lib/ledName.ts", ROOT), out);
  console.log("wrote src/lib/ledName.ts");
} finally {
  await browser.close();
}
