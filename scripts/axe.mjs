/**
 * Accessibility sweep — axe-core against a running dev server.
 *
 * `npm run axe` (start `npm run dev` first).
 *
 * **Why a script and not the Playwright MCP.** The MCP's code runner has neither
 * `require` nor a dynamic-import callback, so `@axe-core/playwright` cannot be
 * loaded inside it. This is also the shape CI wants.
 *
 * **Why one pass per act.** Every colour on this site resolves through
 * `[data-act]` — `--color-fg`, `--color-muted`, `--color-faint`, `--color-line`
 * and `--color-surface` all differ between void, deck and bloom. A contrast pass
 * on one act has checked a third of the site. The three sections below are one
 * per act; see `.claude/skills/verify-visual` for the full list.
 *
 * **Why the waits.** Nothing here is network-bound, so `networkidle` returns long
 * before the page is settled. The preloader has to clear, the GSAP entrances have
 * to land and r3f has to draw. That takes real elapsed time.
 *
 * Reduced motion is swept too: it is not a variation, it is a different render —
 * the WebGL world becomes a card grid, the carousel becomes a list, two sections
 * become plain grids. Half the components only exist on that branch.
 */

import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.AXE_BASE ?? "http://localhost:3000";

/** One section per act. */
const ACTS = [
  ["void", "#work"],
  ["deck", "#capabilities"],
  ["bloom", "#about"],
];

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** Long enough for the preloader, the entrances and the first WebGL draw. */
const SETTLE = 2600;

/**
 * The canvas is `aria-hidden` with the case-file roster as its accessible
 * representation, so axe flagging it would be a false positive on a decision
 * that was made deliberately. Nothing else is excluded.
 */
const EXCLUDE = ["canvas"];

async function sweep(page, label, reducedMotion) {
  await page.emulateMedia({ reducedMotion });
  const found = [];

  for (const [act, hash] of ACTS) {
    await page.goto(BASE + "/" + hash);
    await page.waitForTimeout(SETTLE);

    let builder = new AxeBuilder({ page }).withTags(TAGS);
    for (const sel of EXCLUDE) builder = builder.exclude(sel);
    const { violations } = await builder.analyze();

    if (violations.length === 0) {
      console.log(`  ${label} / ${act.padEnd(5)} ${hash.padEnd(15)} clean`);
      continue;
    }
    console.log(`  ${label} / ${act.padEnd(5)} ${hash.padEnd(15)} ${violations.length} violation(s)`);
    for (const v of violations) {
      console.log(`      [${v.impact}] ${v.id} — ${v.nodes.length} node(s): ${v.help}`);
      for (const n of v.nodes.slice(0, 4)) console.log(`         → ${n.target.join(" ")}`);
      found.push(`${label}/${act}: ${v.id}`);
    }
  }
  return found;
}

const browser = await chromium.launch({
  /* System Chrome, not a Playwright download: this page is WebGL-heavy and the
     bundled build's software rasteriser both renders differently and hides the
     GPU path that most of the site actually takes. Headed for the same reason. */
  channel: "chrome",
  headless: false,
});

try {
  /* An explicit context, not `browser.newPage()`. AxeBuilder walks up to the
     context to enumerate frames and throws "Please use browser.newContext()"
     against the implicit one. */
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const failures = [
    ...(await sweep(page, "motion  ", "no-preference")),
    ...(await sweep(page, "reduced ", "reduce")),
  ];

  console.log(
    failures.length
      ? `\n${failures.length} violation type(s) across the sweep.`
      : "\nNo WCAG 2.1 A/AA violations in any act, either motion mode."
  );
  process.exitCode = failures.length ? 1 : 0;
} finally {
  await browser.close();
}
