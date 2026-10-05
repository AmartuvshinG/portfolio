/**
 * Phone scroll perf: an iPhone-sized Chromium, CPU throttled, scrolled through
 * the whole page by rAF at a thumb's pace, with every frame tagged by the
 * chapter under the reading line.
 *
 *   node scripts/perf-phone.mjs                      http://localhost:3000
 *   node scripts/perf-phone.mjs http://localhost:8080 --cpu 6 --speed 2.4
 *
 * Run it against a production export (`npm run build`, then
 * `python -m http.server 8080 --directory out` from the repo root — serving
 * from inside out/ makes the next build fail with EBUSY). A dev server
 * measures React's dev overhead, not the site.
 *
 * Why these numbers: the display this was tuned on runs at 240 Hz, where 2×
 * throttling drops no frames at all; 4× is where builds start to differ.
 * Speed is px per ms of scroll (0.9 is a reading flick, 2.4 a fast one).
 * Chromium is not Safari: use it to compare builds, never as the iPhone's
 * absolute number. The `playwright-ios` MCP (WebKit) is for looks.
 */
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const flag = (name, d) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const BASE = args.find((a) => /^https?:/.test(a)) ?? "http://localhost:3000";
const CPU = flag("cpu", 4);
const SPEED = flag("speed", 0.9);

const browser = await chromium.launch({ channel: process.env.PERF_CHANNEL || undefined });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

await page.goto(BASE, { waitUntil: "load" });
/* The preloader's sign has to finish before the entrance (and the ground)
   start; measuring through it would blame the scroll for the boot. */
await page.waitForTimeout(9000);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
await page.waitForTimeout(1000);

const frames = await page.evaluate(
  (speed) =>
    new Promise((done) => {
      const chapters = [...document.querySelectorAll("[data-chapter]")];
      const at = () => {
        const line = window.innerHeight * 0.5;
        const hit = chapters.find((el) => {
          const r = el.getBoundingClientRect();
          return r.top <= line && r.bottom > line;
        });
        return hit?.getAttribute("data-chapter") ?? "-";
      };
      const out = [];
      const max = () => document.documentElement.scrollHeight - window.innerHeight;
      let last = performance.now();
      let y = 0;
      const step = (now) => {
        const dt = now - last;
        last = now;
        out.push({ dt, chapter: at() });
        y += speed * Math.min(dt, 50);
        window.scrollTo(0, y);
        if (y < max()) requestAnimationFrame(step);
        else done(out);
      };
      requestAnimationFrame((t) => {
        last = t;
        requestAnimationFrame(step);
      });
    }),
  SPEED
);

await browser.close();

/* Per chapter, in page order. A "long" frame is over 34 ms: two refreshes
   missed at 60 Hz, the stutter a thumb feels. */
const by = new Map();
for (const f of frames.slice(1)) {
  if (!by.has(f.chapter)) by.set(f.chapter, []);
  by.get(f.chapter).push(f.dt);
}
const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))];
console.log(`${BASE} · 390×844 @3x · CPU ${CPU}× · ${SPEED} px/ms · ${frames.length} frames\n`);
console.log("chapter".padEnd(14), "frames".padStart(7), "p50".padStart(7), "p95".padStart(7), "max".padStart(7), ">34ms".padStart(7));
for (const [chapter, dts] of by) {
  console.log(
    chapter.padEnd(14),
    String(dts.length).padStart(7),
    pct(dts, 0.5).toFixed(1).padStart(7),
    pct(dts, 0.95).toFixed(1).padStart(7),
    Math.max(...dts).toFixed(1).padStart(7),
    String(dts.filter((d) => d > 34).length).padStart(7)
  );
}
