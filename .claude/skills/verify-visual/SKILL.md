---
name: verify-visual
description: "How to verify a visual or behavioural change to this portfolio and actually believe the result. Use before claiming any UI change works — covers the stale-CSS trap after token edits, the four ways the browser harness lies about this site (blank captures, false overflow passes, dead scroll, phantom-open dialogs), the required viewport/motion matrix, real-pixel contrast measurement, and the zero-dependency CDP fallback when no MCP is loaded. Triggers: verify, screenshot, check the change, does it work, contrast, overflow, responsive, reduced motion, accessibility, focus ring, WebGL, act theme."
---

# Verifying a change to this site

This site defeats the obvious checks. A screenshot can come back blank on a page
that renders fine, an overflow test can pass on a page that overflows, and a
token edit can appear to do nothing for reasons that have nothing to do with the
token. Everything below is a trap that has already cost time at least once.

**The rule: never report a visual change as working on the strength of the code
alone, or of one screenshot.** Measure the property you changed.

---

## 0. Before anything else — is the CSS you are looking at yours?

Turbopack serves a **stale CSS chunk** after a token rewrite. Components update,
styles do not, and the page renders in an older design while your edit sits in
the file looking correct. This has happened more than once, and it looks exactly
like "my change did nothing".

Any time you have edited `src/app/globals.css` — especially the `@theme` block or
a `[data-act]` block — do this first:

```bash
rm -rf .next && npm run dev:no-open
```

Then confirm in the browser that the token actually arrived, rather than
assuming:

```js
getComputedStyle(document.documentElement).getPropertyValue('--color-faint')
```

If that returns the old value, the chunk is stale. Nothing else you measure is
meaningful until it returns the new one.

---

## 1. The verification matrix

One pass is not verification. The minimum:

| Axis | Values |
|---|---|
| Viewport | **390** (phone), **768** (tablet), **1440** (desktop) |
| Motion | default **and** `prefers-reduced-motion: reduce` |
| Act | one section from each of `void`, `deck`, `bloom` |

The act axis is not optional for anything involving colour: `--color-fg`,
`--color-muted`, `--color-faint`, `--color-line` and `--color-surface` all
resolve differently per act, so a fix verified on one act is verified on a third
of the site.

Sections by act (check `data-act` on the section if unsure):
- **void** — `#hero`, `#work`, `#contact`, `footer`
- **deck** — `#connect`, `#capabilities`, `#timeline`
- **bloom** — `#about`

Reduced motion is a genuinely different render, not a subtle one: `SelectedWork`
swaps the WebGL world for `WorkCardGrid`, the hero drops its sticky runway, and
`Timeline` drops its beam and sticky years.
Verifying only the default branch leaves half the components untested.

With Playwright MCP, force it through `browser_run_code_unsafe`:

```js
async (page) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/#timeline');
  await page.waitForTimeout(2500);
  return await page.evaluate(() => /* measure */);
}
```

Set it back with `{ reducedMotion: 'no-preference' }` — it persists across
navigations.

---

## 2. The four ways the harness lies

### Blank or first-frame captures
`chrome --screenshot` alone captures the **first frame**, before any entrance
animation, before the preloader clears, and before WebGL has drawn anything —
so it returns a black rectangle for a page that looks fine. `--virtual-time-budget`
expires before the animations settle rather than fast-forwarding them.

Use Playwright (or CDP), navigate, then **wait**. The preloader, the GSAP
entrances and the r3f first draw all need real elapsed time; 1500–2500ms after
`goto` is the working figure. `networkidle` is not enough — nothing is loading,
it is animating.

### False overflow passes
`body` has `overflow-x: hidden`, so `document.documentElement.scrollWidth` is
**clamped to the viewport** and a horizontal-overflow check passes on a page that
overflows. This test is worthless here:

```js
// LIES. Always passes.
document.documentElement.scrollWidth === window.innerWidth
```

Measure element rectangles instead, and remember that several elements overhang
*by design* inside an `overflow-hidden` parent (the hero's horizon is bled 70%
past both edges on phones; About's bloom has decorative `-inset` spans). So the
question is never "does anything exceed the viewport" but "does anything **that
should be readable** exceed it":

```js
[...document.querySelectorAll('#hero h1, #connect li, #work a')].map(el => {
  const r = el.getBoundingClientRect();
  return { left: Math.round(r.left), right: Math.round(r.right) };
});
```

### Dead scroll
Lenis owns scrolling and runs off the GSAP ticker. `window.scrollTo` works, but
anything reading a *pinned* section's progress needs a frame or two to catch up,
and a scroll issued while an overlay holds the lock does nothing at all
(`document.body.style.overflow === 'hidden'`). Check the lock before concluding
the page is broken.

`scrollIntoView()` puts a section's **top** at the viewport top. For a tall
pinned section (`#work` is 75vh per case file)
that leaves the thing you wanted to see off screen, and an "is it visible" test
returns 0. Scroll to the child, `{ block: 'center' }`.

### Phantom-open dialogs
`AnimatePresence` keeps an overlay in the DOM through its exit transition, so
this reports a failure that is not one:

```js
// Reports "still open" for ~600ms after it has closed.
!!document.querySelector('[role="dialog"][aria-modal="true"]')
```

The overlay is *closed* the moment `open` flips. Assert on the things that flip
with it — `document.body.style.overflow === ''` and focus having returned to the
trigger — or wait > 1200ms before asserting on the node.

---

## 3. Contrast must be measured off real pixels

Computing a ratio against the flat act colour is **wrong on this site**. There is
one fixed WebGL backdrop behind the entire document (see the CONTINUUM
backdrop), so the effective ground behind any given element is the shader's
output at that point, not `--color-void`. Cards add another layer on top of that.

Screenshot, then sample. Take the true darkest pixel in the element's box as the
ground (percentiles pick up antialiased edges and understate the ratio badly for
10–11px mono text) and compare it against the *token* value rather than the peak
glyph pixel:

```js
// Get the boxes first
[...root.querySelectorAll('*')]
  .filter(el => getComputedStyle(el).color === 'rgb(120, 126, 157)' && !el.children.length)
  .map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
```

Then decode the PNG and compute WCAG contrast over that box. The places worth
checking, because they are the tightest: the **CapabilityCard tag row** (sits on
`--color-surface`, which is lighter than the ground) and the **footer bottom
bar**. Both currently clear 4.5:1 with little room — 4.95:1 and 5.10:1.

---

## 4. Things that look like bugs and are not

- **`outline-none` does nothing.** `:focus-visible` in `globals.css` is
  deliberately unlayered so every focusable element gets a ring, and unlayered
  CSS outranks every cascade layer regardless of specificity. To change the ring
  on one element you need a trailing bang: `focus-visible:[outline-offset:-4px]!`.
  Same hazard as the two `@layer base` comments in that file.
- **r3f props land on a wrapper `<div>`, not the `<canvas>`.** `<Canvas aria-hidden>`
  produces `<div aria-hidden><div><canvas></div></div>`. That is the correct
  element anyway — it hides the whole subtree.
- **The first keypress after `goto` can land pre-hydration** and do nothing.
  Press again before concluding a shortcut is broken.
- **The dark circular badge at the bottom-left in dev screenshots** is the
  Next.js dev indicator, not site chrome. It is absent in production.
- **A "glitchy stripe" in the hero is a deliberate datamosh**, not a rendering
  fault.

---

## 5. Fallback: CDP over system Chrome, zero dependencies

When no MCP is loaded, drive the installed Chrome directly over the DevTools
protocol. Launch with a remote debugging port and a throwaway profile:

```bash
"/c/Program Files/Google Chrome/Application/chrome.exe" \
  --remote-debugging-port=9222 \
  --user-data-dir="$TMPDIR/chrome-verify" \
  --no-first-run --no-default-browser-check \
  http://localhost:3000
```

Then `GET http://localhost:9222/json` for the target's `webSocketDebuggerUrl`,
and drive `Page.navigate`, `Runtime.evaluate` and `Page.captureScreenshot` over
the websocket from a small Node script. Section 2's rules all still apply —
particularly the wait, which is the whole reason `--screenshot` alone fails.

Do **not** use `--headless` for anything performance-related: the site's cost is
WebGL and compositing, and SwiftShader numbers are meaningless. Headless is fine
for DOM assertions.

---

## 6. What to run before saying it works

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npx next build       # catches what dev mode forgives
```

All three are clean on `checkpoint/qa-2026-08-09`; any new output is yours.

For accessibility, with the dev server running:

```bash
npm run axe          # scripts/axe.mjs — 3 acts x 2 motion modes, exits 1 on any violation
```

**Do not try to run axe inside the Playwright MCP.** Its code runner has neither
`require` nor a dynamic-import callback, so `@axe-core/playwright` cannot be
loaded there — that is why this is a script. Two further gotchas baked into it:
`AxeBuilder` rejects a page from `browser.newPage()` and needs an explicit
`browser.newContext()`, and the `<canvas>` is excluded on purpose (it is
`aria-hidden` with the case-file roster as its accessible representation).

The sweep is **clean as of `dbe26f9`**, and it runs in CI on every push, so any
violation you see is almost certainly yours. Triage against intent rather than
accepting the count, but start from the assumption that it is new.

The one finding it used to carry is fixed, and the shape of the fix is the part
worth remembering: `WordReveal` and `ScrambleText` named themselves with an
`aria-label` on a `<p>`/`<span>` while marking every animated fragment
`aria-hidden`. Neither element has a role, and **an element with no role does not
support naming** — the label was discarded, every child was hidden, and the hero
lead and kicker announced as nothing at all. The text now lives in an `.sr-only`
first child instead.

So: when you split text into animated fragments, the real string goes in a
visually-hidden **text node**, never an ARIA attribute on a generic wrapper. Keep
it *inside* the element rather than beside it — the DOM shape stays put and the
heading level survives when `WordReveal` is used `as="h1"`.
