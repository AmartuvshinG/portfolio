---
name: cross-review
description: "Review the work on dev (or a given range) that the other agent wrote, against this repo's AGENTS.md rules and the shared memory's traps. Read-only: reports findings, edits nothing. Use when the user says cross-review, review Codex's work, review Claude's work, check the diff before merging to main."
---

# Cross-review

You are reviewing another agent's work. Assume it was competent but didn't know everything you know. Your job is to catch what breaks the site or breaks a rule that was paid for. Style nits are out of scope.

**Do not edit files.** Report only. The user decides what gets fixed and by whom.

## 1. Get the diff

- Default range: `git log --oneline main..dev` and `git diff main...dev`, plus uncommitted changes (`git diff`, `git status`).
- If the user names a range or sha, use that instead.
- Read the latest block in `HANDOFF-LOG.md` in the shared memory folder, if there is one. It says what the author meant to do and what it didn't verify.

## 2. Check against

1. **Correctness:** logic errors, broken effects or cleanup, SSR/hydration mismatches (this is a static export), missing reduced-motion branches, and broken EN/MN parity (a string added to `content.ts` but not `content.mn.ts`, or hard-coded in a component).
2. **AGENTS.md rules:** flat chromatic fills, type under 14px, pointer-steered scroll UI, inner scroll boxes in pinned sections, non-transform/opacity animation, infinite animations that don't pause off screen, unsourced facts.
3. **Known traps:** unprefixed `backdrop-filter` after the `-webkit-` one, `scale` and `transform` in the same keyframe, `outline-none` expected to work, rAF inside a View Transition callback.
4. **Memory:** skim the `MEMORY.md` index for notes on the areas the diff touches. Flag anything that reintroduces a rejected idea.
5. **Public repo:** nothing from `docs/private/`, no personal data, no absolute local paths, no secrets.

Run `npm run typecheck` and `npm run lint` (both read-only) and include the results.

## 3. Report

Rank findings most severe first. For each one give:
- `path:line`
- a one-sentence defect
- the concrete failure (which input, viewport or state goes wrong)
- confidence: confirmed or plausible

End with a one-line verdict: **ship**, **ship after fixes**, or **don't ship**. If nothing survives scrutiny, say so; don't invent findings.
