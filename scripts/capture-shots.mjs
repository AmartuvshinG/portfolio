/**
 * Project screenshots — captured from the live sites into `public/work/`.
 *
 * `node scripts/capture-shots.mjs`            every target
 * `node scripts/capture-shots.mjs portfolio`  only targets whose name matches
 *
 * The `portfolio` target shoots this site, so run it against a production
 * server (`npm run build && npm run start`) — the dev build carries the Next.js
 * badge in the corner. Override the origin with `SHOTS_BASE`.
 *
 * **Why 1600×1000 at 1.25×.** The work world and the case files are built to a
 * 2000×1250 spec (see `cardTexture.ts`). Rendering the page at a desktop CSS
 * width and letting the device scale factor supply the pixels gets a real
 * desktop layout, not a 2000px-wide one the site was never designed for.
 *
 * **Why the scroll is walked, not jumped.** Every one of these sites reveals
 * sections on IntersectionObserver or a scroll library. Jumping straight to a
 * section skips the triggers of everything above it and can land on a block
 * that has not been told to appear yet.
 *
 * Every frame still has to be looked at by eye before it ships — a capture that
 * caught an entrance half-way through is a bad screenshot that looks deliberate.
 */

import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("public/work");
const BASE = process.env.SHOTS_BASE ?? "http://localhost:3000";
const W = 1600;
const H = 1000;
const SCALE = 1.25;

/**
 * `at` is either `0` (the top of the page), a `#selector`, or a heading's text.
 * The heading is matched by substring, case-insensitive, with whitespace
 * collapsed — several of these sites split headings into per-word spans.
 * `offset` moves into a tall section as a fraction of its height, `nudge` by
 * plain pixels, and `settle` overrides the post-scroll wait (ms).
 */
const TARGETS = [
  {
    name: "spotfixes",
    url: "https://spotfixes.com",
    shots: [
      { file: "spotfixes.webp", at: 0 },
      { file: "spotfixes-capabilities.webp", at: "Every capability" },
      { file: "spotfixes-accuracy.webp", at: "Accuracy that compounds" },
      { file: "spotfixes-stack.webp", at: "Enterprise-grade stack" },
    ],
  },
  {
    name: "kryos",
    url: "https://kryos.amartuvshin.work",
    shots: [
      // Its entrance runs long — at the default settle the lead paragraph and
      // CTA were still mid-fade.
      { file: "kryos.webp", at: 0, settle: 9000 },
      // Past the headline, onto the world cards: at the heading itself the
      // fixed nav sat on top of it and a card title collided with the HUD.
      { file: "kryos-works.webp", at: "Nine worlds", nudge: 520, settle: 4000 },
    ],
  },
  {
    name: "voidgate",
    url: "https://voidgate.amartuvshin.work",
    shots: [
      { file: "voidgate.webp", at: 0 },
      { file: "voidgate-archive.webp", at: "THE ARCHIVE" },
    ],
  },
  {
    name: "portfolio",
    url: BASE,
    // The HUD cursor draws wherever the wheel pointer last sat; the gutter
    // chapter sign is driven by scroll events a scripted jump can outrun, and
    // was caught reading "Profile" over the work section.
    hide: ['[class~="z-[130]"]', '[class~="z-[70]"]'],
    shots: [
      { file: "portfolio.webp", at: 0, settle: 6500 },
      { file: "portfolio-work.webp", at: "#work", offset: 0.12, settle: 3500 },
      { file: "portfolio-path.webp", at: "#timeline" },
    ],
  },
];

/**
 * Overlays that belong to a different device or a first visit, not to the
 * design: VOIDGATE's "use portrait mode" notice, cookie bars. Hidden by the
 * text they carry, walking up to the fixed/absolute layer that holds it.
 */
const OVERLAY_TEXT = [
  "Browser resolution not supported",
  "Please use portrait mode",
];

async function hideOverlays(page, hide = []) {
  // The page's own scrollbar is browser chrome, not the design.
  await page.addStyleTag({
    content:
      "html,body{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}" +
      hide.map((s) => `${s}{display:none!important}`).join(""),
  });
  await page.evaluate((needles) => {
    const all = [...document.querySelectorAll("body *")];
    for (const el of all) {
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent)
        .join(" ");
      if (!needles.some((t) => own.includes(t) || el.textContent?.trim() === t)) continue;
      let node = el;
      while (node && node !== document.body) {
        const pos = getComputedStyle(node).position;
        if (pos === "fixed" || pos === "absolute") {
          node.style.setProperty("display", "none", "important");
          break;
        }
        node = node.parentElement;
      }
    }
  }, OVERLAY_TEXT);
}

/** Where the page must scroll to so the target starts just under the fold. */
async function targetY(page, at, offset = 0) {
  return page.evaluate(
    ({ at, offset }) => {
      if (at === 0) return 0;
      let el = null;
      if (at.startsWith("#")) {
        el = document.querySelector(at);
      } else {
        const want = at.toLowerCase().replace(/\s+/g, "");
        el = [...document.querySelectorAll("h1,h2,h3")].find((h) =>
          h.textContent.toLowerCase().replace(/\s+/g, "").includes(want)
        );
      }
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      // Tall pinned sections want a point inside them, not their top edge.
      return Math.max(0, top - 120 + offset * r.height);
    },
    { at, offset }
  );
}

async function walkTo(page, y) {
  const from = await page.evaluate(() => window.scrollY);
  const steps = Math.max(1, Math.ceil(Math.abs(y - from) / 500));
  for (let i = 1; i <= steps; i++) {
    const to = from + ((y - from) * i) / steps;
    await page.evaluate((to) => window.scrollTo(0, to), to);
    await page.waitForTimeout(140);
  }

  /* A smooth-scroll library that owns the scroll (Lenis, on this site) keeps
     its own target and eases `scrollY` straight back to it, so a jump does not
     stick. Real wheel events are what such a library listens to: fall back to
     driving it with those until it arrives. */
  await page.waitForTimeout(400);
  await page.mouse.move(W / 2, H * 0.1);
  for (let i = 0; i < 200; i++) {
    const at = await page.evaluate(() => window.scrollY);
    const gap = y - at;
    if (Math.abs(gap) < 40) break;
    await page.mouse.wheel(0, Math.sign(gap) * Math.min(Math.abs(gap), 400));
    await page.waitForTimeout(90);
  }
  // Park the pointer in a corner, off anything hoverable, so no hover state
  // (a lifted card, a readout) is still live when the frame is taken.
  await page.mouse.move(2, H - 2);
}

/**
 * The Web Design Lab card is one project made of two sites, so its cover is
 * both: KRYOS on the left, VOIDGATE on the right, split on a diagonal with a
 * hairline seam. A side-by-side would halve each site into a letterbox; the
 * diagonal keeps both headlines at full size.
 */
async function composeWebDesign() {
  const w = W * SCALE;
  const h = H * SCALE;
  const left = path.join(OUT, "kryos.webp");
  const right = path.join(OUT, "voidgate.webp");
  // Seam runs from 56% across the top to 43% across the bottom — tuned so it
  // clears both wordmarks: KRYOS's "WORLDS" to its left, VOIDGATE's to its right.
  const [a, b] = [w * 0.56, w * 0.43];
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><polygon points="${a},0 ${w},0 ${w},${h} ${b},${h}" fill="#fff"/></svg>`
  );
  const seam = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><line x1="${a}" y1="0" x2="${b}" y2="${h}" stroke="#eceefb" stroke-opacity="0.85" stroke-width="3"/></svg>`
  );
  // VOIDGATE's headline sits left of centre, so the whole shot slides right
  // into its half. The shift is chosen so the shot's own left edge lands just
  // left of the seam's foot — its starfield margin fills the wedge, where a
  // solid pad read as a dark band and a mirrored one as backwards text.
  // Two pipelines: within one, sharp runs `extract` before `extend`.
  const shift = Math.round(w * 0.425);
  const extended = await sharp(right)
    .extend({ left: shift, background: "#140f2a" })
    .toBuffer();
  const shifted = await sharp(extended)
    .extract({ left: 0, top: 0, width: w, height: h })
    .toBuffer();
  const rightHalf = await sharp(shifted)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  await sharp(left)
    .composite([{ input: rightHalf }, { input: seam }])
    .webp({ quality: 80 })
    .toFile(path.join(OUT, "web-design.webp"));
  console.log("\n  ✓ web-design.webp (composite)");
}

const filter = process.argv[2];
const targets = TARGETS.filter((t) => !filter || t.name.includes(filter));

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  /* System Chrome, headed: these sites are WebGL-heavy and a software
     rasteriser renders them differently — same reason as scripts/axe.mjs. */
  channel: "chrome",
  headless: false,
});

try {
  for (const target of targets) {
    const context = await browser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: SCALE,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    console.log(`\n${target.name} — ${target.url}`);
    await page.goto(target.url, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(5000);

    for (const shot of target.shots) {
      const found = await targetY(page, shot.at, shot.offset ?? 0);
      const y = found === null ? null : found + (shot.nudge ?? 0);
      if (y === null) {
        console.log(`  ✗ ${shot.file}: "${shot.at}" not found`);
        continue;
      }
      await walkTo(page, y);
      await page.waitForTimeout(shot.settle ?? 2600);
      await hideOverlays(page, target.hide);
      const png = await page.screenshot({ type: "png" });
      await sharp(png)
        .resize(W * SCALE, H * SCALE, { fit: "cover" })
        .webp({ quality: 80 })
        .toFile(path.join(OUT, shot.file));
      console.log(`  ✓ ${shot.file}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (!filter || ["kryos", "voidgate", "compose"].some((n) => n.includes(filter))) {
  await composeWebDesign();
}
