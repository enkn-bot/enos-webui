# AGENTS.md — ENOS Web UI (Open WebUI fork) operating contract

You are an implementation agent on the **ENOS frontend** — a customized Open WebUI
fork (FastAPI backend + Svelte frontend). This file is your grounding: hard rules,
architecture, deploy reality, and definition of done. A reviewer (Claude) specs work
and reviews your output against _this contract_. **Horsepower is assumed — discipline
and completion are the bar.** The companion contract for the backend pipe/core/Desk-app
lives in the sibling repo at `../enos/AGENTS.md`; the prime directives are identical.

---

## 0. Prime directives (non-negotiable)

1. **No half-finishing.** "Done" = tests pass → `npm run build` succeeds → deployed +
   verified (if it ships) → committed → working tree clean → docs updated. If you
   can't finish, say so and leave the tree clean. See §4.
2. **No regex for semantic decisions.** Intent, relevance, follow-up, recency,
   contradiction, "is this about X" = a model's job (LLM/judge), **never** regex or
   keyword/domain lists. Regex is fine ONLY for syntax/protocol (URLs, markdown, file
   extensions, JSON escapes). Violated before — see §5.
3. **Never destabilize live Chat.** `enoschat.duckdns.org` is production. The frontend
   is shared across Chat/Desk/Terminal surfaces — a change to `Chat.svelte` affects all.
4. **Confirm destructive / outward-facing actions.** Deploys, deletes, prod writes — ask.
5. **Never print secret values.** Report presence/length only.
6. **Reuse, don't reinvent.** Build on Open WebUI's components and the existing
   `src/lib/enos/` modules. No duplicate engines (one was built and deleted — §5).
7. **Investigate before patching.** Root-cause first; no symptom-chasing.

Evolving state (roadmap, latest live changes) is in `../enos/ENOS_DESK_PLAN.md` and
`../enos/DEPLOY_NOTES.md`. `_archive/` is historical — ignore unless asked.

---

## 1. Architecture (what lives where)

- **Surfaces** are hostname-detected (`static/enos-surface.mjs` → `html[data-enos-surface]`).
  Chat / Desk / Terminal share one shell; the Desk surface adds the Electron bridge.
- **Desk native tool-calling** (the product path) lives in:
  - `src/lib/enos/deskFileTools.ts` — the 9 OpenAI-format tools (list/read/write/edit/
    create_folder/rename/delete/reveal/git_status) + the executor that calls the bridge.
  - `src/lib/enos/deskAgentLoop.ts` — the **one** production agent loop (don't fork it).
  - `src/lib/enos/desktopBridge.ts` — the `window.enosDesktop` bridge type + capabilities.
  - `src/lib/components/chat/Chat.svelte` `handleProjectChatAction` — wires the loop:
    `complete` → Electron model call (streaming via `agentCompleteStream`), `executeTool`
    → `executeDeskFileTool`, confirmation dialog as the mutation gate.
  - `src/lib/enos/grounding.ts` — browser-timezone date/time line for the Desk prompt.
- **The regex intent-parser `projectChatActions.ts` is orphaned** — superseded by native
  tool-calling. Don't extend it.
- **Backend** (`backend/open_webui/`) is the OWUI Python app. Task prompts (follow-up,
  title, query-gen) live in `config.py`; web tools in `tools/builtin.py` +
  `routers/retrieval.py`.

---

## 2. Hard rules, in detail

- **Desk mutations:** the agent always gets the full `DESK_FILE_TOOLS`; the
  **confirmation dialog** is the safety gate, **not** a capability flag. A
  `canUseEnosLocalProjectMutations` gate desynced and made Desk refuse file creation —
  do not reintroduce it. The `enos-desk-sidebar` test enforces this.
- **De-brand seal:** the fork hides that it's Open WebUI (title/About/links). Don't
  reintroduce `openwebui.com` / `github.com/open-webui` strings in user-facing UI.
- **Query quality is a prompt lever, not a filter.** Improve the query-generation
  prompt in `config.py`; never post-filter results with regex.

---

## 3. Deploy reality

- **Build + ship:** `npm run build` → `rsync -az --checksum build/ soraia-a1:~/open-webui/build/`.
  The VM **bind-mounts** `build/` over the Docker image, so rebuilding the image alone
  does nothing — you must rsync `build/`. Bump `?v=` in `src/app.html` for asset cache-busting.
- **After a Desk frontend deploy:** kill the Electron app, clear its caches
  (`~/Library/Application Support/ENOS Desk/{Cache,Code Cache,GPUCache}`), relaunch.
- **Backend config (task prompts):** changing a `config.py` default only affects fresh
  installs; the live value is in the `config` DB row and needs a **container restart**
  to reload after a raw write. (Backend code changes need an image rebuild + redeploy.)
- Verify: 3 hostnames 200, the change is observable, record live writes in `DEPLOY_NOTES.md`.

---

## 3a. Concurrency: more than one session/agent may be in this tree

This repo is worked from **multiple Claude/Codex sessions in parallel**, often in the
same checkout. Editing the same working tree concurrently is fine — the danger is
**building and deploying** from it: `npm run build` bundles whatever is on disk at that
moment (yours AND anyone else's uncommitted edits), and `rsync --delete` to `soraia-a1`
overwrites the previous deploy outright. Two sessions racing to build+deploy from the
same tree is how a finished, verified fix gets silently replaced by a stale or
half-finished one — it happened (2026-07-01: an unrelated in-progress notification-system
change got bundled into a deploy of Desk dock work by a different session, then a third
build overwrote _that_; no source was lost, but two live deploys were briefly wrong).

**Before you build+deploy, always check first:**

```
git status --short        # anything you didn't touch? someone else is in this tree.
git worktree list         # already-isolated sessions show up here
```

- If `git status` is clean except your own files → building from the main tree is fine.
- If it shows files you don't recognize → **do not** `npm run build`/rsync from here.
  Isolate: `git worktree add --detach <tmp-path> HEAD`, copy _only your_ changed files
  into it (`cp` each one — worktrees start from a commit, not the dirty working tree),
  build + rsync from there. Leaves the shared tree and the other session's edits
  completely untouched.
- Committing your work as soon as it's verified (small, atomic, per §0/§4) shrinks the
  window where it's sitting uncommitted and vulnerable to being swept into someone
  else's build — it doesn't prevent a race, but it means recovery is `git diff`, not
  reconstruction.
- After deploying, don't just trust the `rsync` exit code — confirm the live hash
  actually matches what you built: compare `grep -oE 'start\.[A-Za-z0-9_-]+\.js'` between
  your local `build/index.html` and `curl -s https://<host>/` (see incident above for why).

---

## 4. Definition of Done

- [ ] Tests pass (and written for new logic — TDD).
- [ ] `npm run build` succeeds (this is the real compile gate for `.svelte`).
- [ ] Deployed + verified if it ships (rsync + observe, not just "I wrote it").
- [ ] Committed, atomic, working tree clean, no orphaned/duplicate files.
- [ ] Rules honored (re-read §0 — regex ban, don't break shared Chat).

If any box is unchecked, it is **not done** — report what remains.

---

## 5. Anti-patterns from real failures (do NOT repeat)

- **Regex relevance filter** (`relevance.py`) + a regex query-rewriter — reverted (rule 2).
- **Mutation-capability gate** that broke Desk file creation — the dialog is the gate.
- **Duplicate agent loop** — there is exactly one (`deskAgentLoop.ts`).
- **Half-finished, uncommitted multi-file changes** a reviewer had to triage. Finish or clean up.
- **Building/deploying from a shared dirty tree** — a concurrent session's uncommitted
  work got bundled into a deploy, then overwritten by a third build. See §3a.

---

## 6. How we work together

Claude investigates + specs + reviews your diff against this contract. You implement to
completion with **TDD** and **verify before claiming done**. Ask when intent or a rule's
edge is unclear. Prefer general principles over edge-case rules — if a fix is "a rule for
this one case," it's usually a model/routing signal; flag it.
