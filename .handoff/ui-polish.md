# HANDOFF — ENOS UI polish pass (Chat + Desk)

Continues [[/Users/ernestnyarko/Documents/Cursor/workspace/Files/enos/.handoff/base-experience.md]] (base-experience milestone, judge removal — all DONE). This tab = frontend UI polish.

## Objective
Polish ENOS Chat + Desk chrome to a clean, premium, single-identity look on top of base OWUI. Additive, never-nerf.

## Current status
All requested items SHIPPED + deployed live EXCEPT the last fix (folder/chat→tray) which is **deployed but UNVERIFIED by user in Electron** — that is the one open loop.

## Repo / branch
- Frontend: /Users/ernestnyarko/Documents/Cursor/workspace/Files/enos-webui — branch `m13-electron-desktop-bridge` (ahead 41, NOT pushed)
- Brain/deploy: /Users/ernestnyarko/Documents/Cursor/workspace/Files/enos — branch `m21-surface-ux-bugfixes` (ahead 53). Dirty: `.planning/HANDOFF.json` (stray GSD, ignore/checkout).
- Latest frontend commit: `0346f4bf0 fix: deterministic folder/chat -> tray open across chat + desk`

## Live deployment (VM soraia-a1, container enos-open-webui)
- Container: healthy. Frontend cache token: `enos-m14c19`. Pipe sha: `fcbbda71dbfca991` (judge-removed pipe).
- Tray-fix chunks present in deployed build/_app (verified: 4 files contain `pendingTrayOpen`).
- Electron desktop app running (1 main proc); loads remote https://enosdesk.duckdns.org (restart to pick up deploys: `pkill -f "enos-desktop/node_modules/electron"; cd enos/apps/enos-desktop && npm start &`).

## Completed (committed + deployed + browser-verified unless noted)
- Composer cleanup (chat+desk): dropped integrations/tools/cloud; web-search default-on; kept +/ModelPicker/mic/call. Desk terminal → side pane.
- Header: removed top-right expand + user avatar (chat); user circle = brand sage (UserAvatar.svelte, initials-on-sage; --enos-brand-sage #a4b672).
- Dynamic greeting restored in Placeholder.svelte (Svelte, Anthropic Serif) — verified.
- Model-keyed loader orbs: EnosOrb.svelte + modelTier.ts + 4 brand SVGs in static/static/ (subconscious=orange, mind=coral, deepmind=teal, system=sage/all); wired Skeleton/StatusItem — verified.
- "+ Select workspace…" Desk picker (DeskWorkspacePicker.svelte): Local "Desktop only" / Cloud + Add cloud env / GitHub "Coming soon" — verified.
- "No search query generated" status suppressed (StatusItem) — verified.
- DeepMind period; chats now show on desk (612fe8b65) — verified; desk side-pane defaults to Files (f1da9e27d); icon consistency pass (ff05a0db9, conservative + deskUiSource.test); emojis removed app-wide (a840495f3) — verified automations empty-state.

## Files changed by this tab (frontend)
- New: src/lib/components/enos/{UserAvatar,EnosOrb,DeskWorkspacePicker}.svelte; src/lib/enos/{greeting,modelTier,trayOpen.test,deskUiSource.test,greeting.test,modelTier.test,uiCleanup.test}.ts; static/static/enos_loader_orb_*.svg
- Modified: Placeholder, MessageInput, Navbar, Chat, Sidebar, Sidebar/UserMenu, Sidebar/RecursiveFolder, Sidebar/ChatItem, ChatControls, Messages/{Skeleton,ResponseMessage,StatusHistory,StatusItem}, enos/ModelPicker, stores/index.ts, src/app.html, static/static/custom.css, backend/open_webui/static/custom.css

## Verification run
- `npx vitest run` → 55 passed (20 files). `npm run build` → clean. New files: 0 type errors (touched-file counts are OWUI baseline implicit-any; build is the gate).
- Browser (Playwright, live): greeting/serif, composer cleanup, sage avatar, loader orb, picker dropdown, chats-on-desk, emoji-free empty states ALL confirmed.

## Known open loop / blocker
- **Folder/chat → tray open: deployed, NOT user-verified in Electron.** Root cause fixed = `goto('/')` remounted Chat and dropped the pending open amid competing ChatControls reactives; fix = `pendingTrayOpen` store (requestTrayOpenForSurface) consumed by `ChatControls.openTray()` once `paneReady`. Two prior fixes failed (wrong layer: mobile-only closeHandler; then desk !chatId guard). Headless Playwright CANNOT actionably click the sidebar folder (3 timeouts) → could not auto-repro; relied on robust-by-construction + unit test.
  - IF still broken after user tests: next step = the click handler itself isn't firing on that element. Instrument RecursiveFolder folder-click (line ~581, note dead no-op `(e)=>e.stopPropagation()` at 582) + ChatItem click with console logs, redeploy, have user click in Electron with DevTools console, read which step fires.

## Important decisions / invariants
- Single-identity: model names/orbs stay hidden (branding, not nerf). Top model selector intentionally NOT restored.
- Regex banned for semantic decisions. No fork pipe judge (lean on base RAG). Confirm each live deploy ("deploy" gate).
- Deploy: frontend = `npm run build` → `rsync -az --delete-after build/ soraia-a1:/home/ubuntu/open-webui/build/` → restart. enos-surface.mjs/custom.css served from branding/ mounts (scp separately + bump ?v= in src/app.html). build/ is whole-dir bind-mount → no index.html auth-loop. Users may need hard-refresh (web) — Electron picks up on restart.
- Codex stalls at the FINAL report/commit step repeatedly; work + (usually) commits land. Always verify on-disk + commit if needed.

## Shipped since this doc was written (committed + deployed, 60 tests green)
- `c9edc64c9` desk workspace badge derives from OPEN CHAT's folder (not sticky selectedFolder); shows bound source; `kind:'local'` stamped. vitest scoped to src/.
- `dc7492037` badge labeled by env: `Local:`/`Repo:`/`Cloud:` + name (workspaceKindLabel).
- `12cb3916d` sidebar: Projects add = folder+ (NewFolderAlt); Chats row New Chat (PencilSquare) → startNewChatHandler. Folder.svelte gained configurable `addIcon`.
- `c9db7fb62` font pass: `.enos-display` serif token class (greeting + project title), hardcoded 'Anthropic Serif' removed, guard test. Dead @font-face left (deferred prune).

## Remaining desk pieces (folded in — do before/with backend roadmap)
1. **Bind existing project to a workspace (close the "select workspace" loop).** Today binding only happens at folder CREATION (Sidebar.svelte:375-382 `bridge.bindWorkspaceToFolder` + `saveProjectDigestForFolder` → sets `data.project_context_source` {rootName, kind:'local'}). DeskWorkspacePicker.selectLocal (`src/lib/components/enos/DeskWorkspacePicker.svelte:56`) just opens the create-folder modal → existing projects (e.g. "Microsoft") can never bind → badge stays "Select workspace…". FIX: when a project is open/selected, picker "Local" binds THAT folder (extract shared `bindLocalWorkspace(folderId)` util reused by Sidebar + picker; needs Electron native-dialog test). Cloud: selectDirect/selectSystem set selectedTerminalId but DON'T set the folder's project_context_source → badge won't show Cloud; decide badge cloud-state source. GitHub = coming soon.
2. **Surface split + legacy chat migration (the big one).** Decision locked: scope chats per surface (folders already are). Backfill `meta.surface` on existing chats: untagged→`chat`, chats inside a desk-bound project→`desk`. Then revert the show-all folder-chat stopgap (`RecursiveFolder.setFolderItems`) to surface-scoped. New chats already self-tag.
3. Earlier open loop: verify folder/chat→tray in Electron (deployed, unverified).
4. Nothing pushed to origin (both branches ahead). Push when user asks.

## Commands to resume
```bash
cd /Users/ernestnyarko/Documents/Cursor/workspace/Files/enos-webui
git status --short --branch && git log --oneline -3
ssh soraia-a1 'docker ps --filter name=enos-open-webui --format "{{.Status}}"; grep -o "custom.css?v=[^\"]*" /home/ubuntu/open-webui/build/index.html'
# verify creds: llm@testing.com / llm@testing.com ; live: enoschat.duckdns.org / enosdesk.duckdns.org
```

## Do not
- Don't push branches without ask. Don't deploy live without explicit "deploy". Don't restore the top model selector. Don't re-add a pipe judge. Don't merge MVP/base into Ariana history.
