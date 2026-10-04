# Handoff — the verification harness

Written 2026-08-09, after the UI/UX correctness pass. Everything below is set up
and committed; this is how to *use* it.

---

## 1. First: restart, then approve

**Yes, a restart is required.** `.mcp.json` is read when the client starts, and
two servers were added to it after this session began. Nothing you do in the
current session will load them.

On the next start you should get a prompt asking whether to trust the
project-scope MCP servers defined in `.mcp.json`. **Approve it** — that file is
in the repo and you can read it; it is nine lines.

> Worth knowing why the prompt appears now and did not before: `enabledMcpjsonServers`
> for this project is still empty, which means the Playwright server you have been
> using is loading from **VS Code's own MCP config**, not from `.mcp.json`. The two
> new servers exist only in `.mcp.json`, so this is the first time that file has
> needed approval.

### Check it worked

Run `/mcp`. You should see three servers connected:

| Server | What it is |
|---|---|
| `playwright` | Drives a real browser — click, type, screenshot, resize |
| `chrome-devtools` | Chrome's performance panel: traces, Core Web Vitals, layout shift |
| `context7` | Fetches current docs for a library on demand |

If a server is missing, `/mcp` will say why. The usual cause is npm being unable
to fetch the package — all three run via `npx` and download on first use.

---

## 2. What each one is actually for

### `chrome-devtools` — why is it slow?

This is the one that answers questions Playwright cannot. Playwright can tell
you a thing is on screen; it tells you nothing about what it cost.

Use it when the page feels heavy. It records a real performance trace and
attributes the cost — *which* layer forced a repaint, *which* animation missed
frames, what the Core Web Vitals actually are.

That matters here specifically because this page is ~2300vh with a fullscreen
WebGL shader, seven simultaneously-scaling promoted layers in `ZoomParallax`, and
a documented history of scroll jank caused by filter counts and animated blurs.
Before this, diagnosing that meant guessing.

Ask for it in words — *"record a performance trace while scrolling through the
Lab section and tell me what's costing frames"*.

It is configured `--isolated` (a throwaway Chrome profile, so it never touches
your real browser) and **headed** on purpose: headless Chrome falls back to a
software renderer, which would make every performance number about this site
fiction.

### `context7` — is this API still current?

Your stack is unusually new: Next 16.2, React 19.2 with the compiler, Tailwind
v4, react-three-fiber v9. That is exactly where my training data is thinnest and
most likely to be a version behind.

This is not hypothetical. One of the contact-form bugs fixed this week was
`text-[--spectrum-1]` — correct Tailwind v3, meaningless in v4, and it silently
rendered your error messages in muted grey instead of hazard orange. Context7 is
the check against that class of mistake.

Ask for it in words — *"check the current Tailwind v4 docs before you write
that"*. Registered without an API key, which works fine; a key only buys higher
rate limits and access to private repos.

### `verify-visual` — the skill

Not a program. A markdown file at `.claude/skills/verify-visual/SKILL.md` that
loads automatically when a task involves checking a visual change.

It exists because this site defeats naive testing in four specific ways, each of
which has already wasted time at least once:

- A screenshot comes back **black** on a page that renders fine, because it
  captured frame one before the preloader cleared.
- A horizontal-overflow check **always passes**, because `body` is
  `overflow-x: hidden` and clamps `scrollWidth`.
- A closed dialog is **still in the DOM** for ~600ms while its exit animation
  runs, so "did it close" returns the wrong answer.
- A token edit appears to **do nothing**, because Turbopack served a stale CSS
  chunk. (Fix: `rm -rf .next` and restart. This will bite again.)

It also records the required test matrix — 390/768/1440 × normal/reduced-motion ×
one section per act — and why contrast has to be sampled off real pixels here
rather than computed against the flat act colour.

You do not need to invoke it. It should surface on its own.

---

## 3. Commands

```bash
npm run dev          # dev server, opens a browser
npm run dev:no-open  # dev server, no browser
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # bake image widths, then the static export into out/
npm run preview      # build, then serve out/ exactly as production does (:3000)
npm run deploy       # build, then wrangler deploy to Cloudflare
npm run axe          # accessibility sweep (dev server or preview must be running)
```

`npm run axe` drives real Chrome across the hero and all three acts (`void`,
`deck`, `bloom`), both motion modes, both languages, desktop and a 390 phone,
and exits non-zero on any violation.

---

## 3½. Hosting

**amartuvshin.work is a static export on Cloudflare Workers Static Assets.**
There is no server at request time.

- `next.config.ts` sets `output: "export"`. `wrangler.jsonc` serves `out/`,
  uses `404.html` for unknown paths, and binds the apex as a custom domain.
  `www` redirects to the apex through a Cloudflare Redirect Rule (dashboard).
- **Images.** No optimiser runs at request time. `scripts/bake-images.mjs`
  (`prebuild`) writes `public/opt/work/<name>.w{640,960,1280,1920}.webp`, which is
  gitignored, and `src/lib/imageLoader.ts` points next/image at them. Keep the
  widths equal in that script, the loader and `images.deviceSizes`.
- **GitHub numbers** are fetched at build. CI rebuilds and deploys daily at
  03:00 UTC to keep them fresh.
- **Headers** live in `public/_headers`: security headers, immutable caching
  for `/_next/static` and `/opt`, and the OG card's `image/png` type.
- **Deploys.** The `deploy` job in CI runs on push to `main`, daily and on
  demand, once the repo variable `DEPLOY_ENABLED=true` and the secrets
  `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` exist. Locally:
  `npx wrangler login` once, then `npm run deploy`.
- **Rollback.** `npx wrangler rollback` restores the previous version
  instantly; `npx wrangler deployments list` shows the history. Or revert on
  `main` and let CI redeploy.
- **Branches.** `main` is what ships. `dev` is for work in progress.
- `kryos.` and `voidgate.amartuvshin.work` are separate Cloudflare projects in
  the same zone. Don't touch their DNS records.

---

## 4. CI

`.github/workflows/ci.yml` runs on every push to `main` or `dev` and every pull request, and then deploys `main` (§3½):

```
npm ci → typecheck → lint → build → axe
```

See it at **github.com/AmartuvshinG/portfolio/actions**.

This was the biggest gap in the repo — nothing verified a push at all. Two of the
four contact-form bugs fixed this week were statically visible and would have
been caught here the moment they were typed.

### The axe sweep

Added once the aria bug in §5 was fixed — it was held back while that bug existed,
because a pipeline that is red from its first run is one everyone learns to
ignore. It is the last step in the `check` job and the only one that needs a
browser and a running server, which is also why it is last: `npm run start`
serves the output of the `build` step above it and will not work without it.

Two things about that step are worth not undoing:

- It installs Google Chrome explicitly. `scripts/axe.mjs` uses `channel: "chrome"`,
  which means the distro package rather than a Playwright-pinned build. The runner
  image happens to ship Chrome already, but that is an implementation detail of
  the image and the job should not quietly depend on it.
- It runs under `xvfb-run`, rather than flipping the script to headless. The
  script launches headed on purpose; a virtual display keeps one code path, so a
  local run and a CI run are the same run. There is no GPU on a runner either
  way — correctness assertions do not care, but treat any *performance* number
  out of this job as fiction.

**Not yet proven.** This step is written and its YAML parses, but as of this
edit it has never executed — xvfb does not exist on the dev machine and the only
real test is a push. If the first run is red, suspect the Chrome install or the
`wait-on` timeout before suspecting the sweep itself; `npm run axe` is clean
locally in all three acts and both motion modes.

---

## 5. Open items

~~**The hero is silent to screen readers.**~~ **Fixed 2026-08-09.** `WordReveal`
and `ScrambleText` put `aria-label` on a `<p>`/`<span>` and marked every animated
fragment `aria-hidden`. The intent was right — one clean sentence instead of a
per-word stutter — but a generic element does not support naming, so the label
was *discarded* and all the children were hidden: the hero lead ("Interfaces that
feel like hardware.") and the kicker announced as nothing at all.

Both now carry the real string in an `.sr-only` first child instead of an
`aria-label`. It is out of flow, so it costs no layout, and keeping it *inside*
the element preserves the heading level when `WordReveal` is used `as="h1"`.
`npm run axe` went 6 → **0** violations and now exits clean in all three acts,
both motion modes. The sweep it was blocking is now wired into CI — see §4.

**Hosting — decided.** Cloudflare Workers, as a static export (§3½).

---

## 6. Git state

- Remote: `github.com/AmartuvshinG/portfolio` (private). Branch **`main`** ships; **`dev`** is for work in progress.
- Auth is Git Credential Manager and already works. The `gh` CLI is **not**
  installed — install it if you want PR commands from the terminal.
- Five checkpoint tags are pushed, so rollback points survive losing this machine:

| Tag | What it is |
|---|---|
| `checkpoint/qa-2026-08-09` | After the correctness pass — current good state |
| `checkpoint/pre-qa-2026-08-09` | Before it, if the whole pass needs undoing |
| `checkpoint-nexus` | The NEXUS look |
| `checkpoint-paper` | Earlier direction |
| `safety-2026-08-08-pre-neo-tokyo` | Before the neo-Tokyo work |

Roll back with `git checkout <tag>`, or `git reset --hard <tag>` to move `main`
(destructive — be sure).

---

## 7. Reading order for a fresh session

1. `.claude/skills/verify-visual/SKILL.md` — the traps. Read before touching UI.
2. `CLAUDE.md` if present, then this file.
3. `src/app/globals.css` — the design system, and three comments in it explain
   cascade-layer hazards that have caused real bugs. One of them is why
   `outline-none` does nothing anywhere in this codebase.
