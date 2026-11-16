# AGENTS.md

Instructions for any coding agent working in this repo (Codex reads this file directly, Claude Code reads it through `CLAUDE.md`). Two agents take turns on this codebase, so leave the tree in a state the other one can pick up.

## What this is

The portfolio at amartuvshin.work: one page, English and Mongolian, told as a single continuous scroll over a fixed video ground. Next.js 16 (App Router, React 19, React Compiler), TypeScript strict, Tailwind v4, exported as a static site and served by Cloudflare Workers Static Assets. See `README.md` for the structure.

## Commands

```bash
npm run dev          # dev server (opens the browser); dev:no-open for headless
npm run build        # static export to out/ (prebuild bakes images)
npm run start        # serve out/ with wrangler on :3000
npm run lint         # ESLint, React Compiler rules on
npm run typecheck    # tsc --noEmit
npm run axe          # accessibility sweep against a running server (AXE_BASE)
node scripts/perf-phone.mjs <url>   # throttled phone frame times; point at a prod build
```

Before calling any change done: `npm run typecheck` and `npm run lint` must pass. A UI change also needs the verify-visual skill (`.claude/skills/verify-visual/SKILL.md`).

## Git

- Work happens on `dev`. `main` is production: Cloudflare builds and deploys every push to it, and `dev` gets its own preview URL.
- Commit only when asked. Never push to `main` unless asked. After a push, report it and stop; don't watch CI or poll the deploy.
- To undo published work, use `git revert`. Never reset and force-push unless explicitly asked. Before a sizeable change, tag `checkpoint/<topic>-<YYYY-MM-DD>`.
- Commit messages: lowercase `area: what changed` (e.g. `nav: the monogram is the Mongol-script a too`), then end with a co-author trailer for the agent that wrote it:
  - Codex: `Co-Authored-By: Codex <noreply@openai.com>`
  - Claude: `Co-Authored-By: Claude <noreply@anthropic.com>`
- The repo is public. Never commit anything from `docs/private/`, personal details, credentials, or absolute paths from a local machine.

## Content

- Every fact on the page lives in `src/lib/content.ts` (EN) and `src/lib/content.mn.ts` (MN); interface strings in `src/lib/ui.ts`. All copy goes through `useI18n()`. Never hard-code a string in a component.
- Every fact must come from a source (résumé, the Spotfixes final report or deck, the transcript, LinkedIn, or the owner directly). Never write plausible filler. If a fact isn't sourced, ask.
- Spotfixes was a team of three; never imply it was built solo. Two accuracy figures exist (89% from the report, 97.6% from the deck); never swap or relabel them.
- Copy is plain, not sloganeering. No CTA-style taglines.
- New MN copy is a draft until the owner proofreads it. Say so when you add some.

## Design rules (each one was paid for)

- **Colour is a ramp, never a flat fill.** Use `var(--gradient-spectrum)` or the `spectrum-*` utilities. Chrome (type, hairlines, borders) stays achromatic. Text on the ramp is `text-void`. The tokens live in `src/app/globals.css`; the one sanctioned exception is the flat neon Path years.
- **14px type floor.** Labels use the `tag` utility; prose is at least `text-sm` and never dimmer than `text-fg/80`.
- **Bold, but personal.** Ambitious options are welcome; generic ones are rejected. No stock 3D mascots, no "play with the effect" toy chapters, no pointer-driven reveals on the hero. New sections start from real source material.
- **The pointer never steers scroll-driven UI.** In pinned sections: no hover-driven state and no inner scroll boxes.
- **Effects must not read as faults.** Structured interruptions (shutters, wipes) are fine; random glitch or stripe effects are not. Prefer motion that settles once over spinning or randomised motion.
- The spine is the only scrollbar on every device.

## Performance rules

- Animate `transform` and `opacity` only. Never animate a blurred element's size, and count filter instances.
- Infinite animations must pause off screen. Check idle cost with `document.getAnimations()`.
- Never write a custom property to `<html>` per frame, and don't toggle whole-page styles on scroll.
- Fullscreen shaders get a pixel ceiling, not a DPR cap.
- Scroll-linked motion uses CSS `animation-timeline` (`hooks/useScrollTimelines.ts`), with framer as the fallback.
- Measure perf on a production build with CPU throttling (4×), not on the dev server.
- Keep the full `prefers-reduced-motion` path working: no pinning, no scrub, posters instead of footage.

## Known traps

- **Lightning CSS** folds an unprefixed `backdrop-filter` into a following `-webkit-backdrop-filter`, and folds `scale` into `transform` in the same keyframe. Write the `-webkit-` declaration first, and keep `scale` and `transform` in separate `@keyframes`.
- **The `:focus-visible` ring is unlayered** in `globals.css`, so `outline-none` is dead code. To change one element's ring, use a trailing `!` (e.g. `focus-visible:[outline-offset:-4px]!`).
- **Stale Turbopack CSS:** after a token edit, if nothing changes, delete `.next` and restart the dev server.
- **Windows EBUSY:** `wrangler dev` (workerd) locks `out/`, so `next build` fails. Kill workerd/wrangler first.
- **Mongolian fonts:** the Latin faces have no Cyrillic. `:lang(mn)` swaps them to Montserrat, Exo 2 and Onest. `document.fonts.check` lies about glyph coverage; render "ӨҮөү" and check the platform fonts.
- **View Transitions:** no `requestAnimationFrame` inside the update callback, and name the fixed chrome only during a jump.
- **Headless captures lie** on this site: blank screenshots, false overflow passes and dead scroll. Follow the verify-visual skill and don't trust a single screenshot.

## Shared memory and skills

Durable project knowledge (decisions, rejected ideas, measured numbers, traps) lives in a memory folder outside the repo that both agents read and write. Your user-level instructions say where it is. Read its index before starting, and add to it when you learn something that will matter next session.

Skills in `.claude/skills/` are shared too:
- `verify-visual`: how to prove a UI change works
- `handoff`: end-of-session note for the other agent
- `cross-review`: review the other agent's diff against these rules
