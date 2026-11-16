---
name: handoff
description: "End-of-session handoff between the two agents on this repo (Claude Code and Codex). Saves durable learnings to the shared memory and prints a short status the other agent can resume from. Use when the user says handoff, wrap up, switching to Codex/Claude, out of usage, or end of session."
---

# Handoff

The other agent starts cold. It knows only `AGENTS.md`, the shared memory, and the git tree. This skill makes sure those three are enough.

## 1. Save what's durable to the shared memory

Your user-level instructions give the memory folder's path. For each thing learned this session that will matter in a future session, write or update a note there:
- a decision or a rejection, with the reason
- a measured number
- a trap that cost time
- an open question

Skip anything git already records, and anything that only mattered to this session.

- Check for an existing note first. Update it rather than duplicate it.
- Use the same frontmatter as the existing notes (`name`, `description`, `metadata.type`), and **Why:** / **How to apply:** lines for feedback and project notes.
- Use absolute dates, and add the commit hash if there is one.
- Add a one-line pointer to `MEMORY.md` for any new note.

## 2. Leave the tree readable

- Run `git status` and `git log --oneline -5`.
- Don't commit unless the user asked. If work is uncommitted, say so plainly in the status.
- If the session left a dev server or wrangler running, say which port.

## 3. Print the status

Exactly this shape, so the other agent can be told "read the last handoff":

```
HANDOFF <YYYY-MM-DD> from <Claude|Codex>
Branch:  <branch> @ <short sha>   (<clean | N files uncommitted: ...>)
Done:    <one line per finished thing, with commit sha>
Open:    <unfinished work, and where it stopped>
Next:    <the single next step you would take>
Verify:  <what was verified and how, and what was NOT verified>
Memory:  <notes written or updated>
```

Also append that block to `HANDOFF-LOG.md` in the shared memory folder, newest at the top. Create the file if it's missing. It isn't a memory note, so don't add it to the `MEMORY.md` index.
