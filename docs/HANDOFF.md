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
npm run build        # next build — catches what dev mode forgives
npm run axe          # accessibility sweep (dev server must be running)
```

`npm run axe` drives real Chrome across all three acts (`void`, `deck`, `bloom`)
and both motion modes, and exits non-zero on any violation.

**It currently fails, on purpose, on one real bug** — see §5.

---

## 4. CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:

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

**Vercel MCP — unanswered.** Worth adding only if Vercel is the host. There is no
`vercel.json` and no deploy config in the repo, so nobody has confirmed where
this deploys. If it is Vercel, that server gives deployment status and build logs.

---

## 6. Git state

- Remote: `github.com/AmartuvshinG/portfolio` (private). Branch **`main`**.
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
