## Comparison Baseline (how upstream v0.9.6 was obtained)

Repository audited: `/Users/ernestnyarko/Documents/Cursor/workspace/Files/enos-webui`

Current fork HEAD: `0bed35ea7110d58a670c814b040db9bd3a8fedd5` (`m13-electron-desktop-bridge`)

Upstream remote already existed as `upstream` and points to `https://github.com/open-webui/open-webui.git`. I refreshed the exact upstream tag with:

```bash
git fetch upstream tag v0.9.6 --depth=1
```

The local upstream baseline is exact tag `v0.9.6`, commit `1a97751e376e00a1897bc3679215ae1c7bd8fd42`. The comparison command family used was:

```bash
git diff --stat --compact-summary v0.9.6..HEAD
git diff --name-status v0.9.6..HEAD
git diff --numstat v0.9.6..HEAD
git diff --unified=0 v0.9.6..HEAD -- <high-risk-file>
```

Overall diff stat: `97 files changed, 8777 insertions(+), 791 deletions(-)`.

Important scope note: the repo diff contains only one changed tracked backend bind-mount file (`backend/open_webui/config.py`). The live-deploy note says six backend files are bind-mounted, plus the whole frontend build. For five of the six named backend paths, this repo is byte-identical to upstream `v0.9.6`; `backend/open_webui/retrieval/web/relevance.py` is absent from both `HEAD` and upstream `v0.9.6`. If the live deploy mounts a `relevance.py` from outside this repo, that is an unaudited out-of-tree override and should be treated as an updatability blocker until brought under version control.

## Modified Files Summary (table: file | change type | nerf risk | update lock-in risk)

| file | change type | nerf risk | update lock-in risk |
|---|---:|---|---|
| `.gitignore` | ADDITIVE (+3/-0) | No | LOW |
| `AGENTS.md` | ADDITIVE docs (+108/-0) | No | LOW |
| `Dockerfile.enos` | ADDITIVE build image (+211/-0) | No | MEDIUM |
| `ENOS.md` | ADDITIVE docs (+40/-0) | No | LOW |
| `backend/open_webui/config.py` | BEHAVIOR-CHANGING prompt customization (+8/-4) | No direct nerf found | MEDIUM |
| `backend/open_webui/static/custom.css` | SUBTRACTIVE/BEHAVIOR-CHANGING runtime CSS override (+107/-0) | YES: hides stock controls | HIGH |
| `src/anthropic-fonts.css` | ADDITIVE typography (+104/-0) | No | LOW |
| `src/app.css` | CUSTOMIZATION typography (+17/-2) | No | LOW |
| `src/app.html` | BEHAVIOR-CHANGING shell/custom asset injection (+16/-14) | Possible via full frontend override surface | HIGH |
| `src/lib/components/AddTerminalServerModal.svelte` | ADDITIVE preset handling (+20/-0) | No | LOW |
| `src/lib/components/admin/Evaluations/Feedbacks.svelte` | CUSTOMIZATION copy only (+1/-1) | No | LOW |
| `src/lib/components/admin/Functions.svelte` | SUBTRACTIVE link target change (+3/-3) | YES: disables Discover function link | MEDIUM |
| `src/lib/components/admin/Settings/General.svelte` | SUBTRACTIVE/BRANDING (+3/-39) | YES: removes docs/social/update links | MEDIUM |
| `src/lib/components/admin/Users/UserList/UserChatsModal.svelte` | ADDITIVE return URL (+1/-0) | No | LOW |
| `src/lib/components/channel/Channel.svelte` | CUSTOMIZATION title brand (+4/-3) | No | LOW |
| `src/lib/components/chat/Chat.svelte` | BEHAVIOR-CHANGING Desk/project integration (+533/-26) | YES: suppresses top model selector | HIGH |
| `src/lib/components/chat/ChatControls.svelte` | BEHAVIOR-CHANGING side pane/local files (+114/-73) | Possible: files/overview behavior changes | HIGH |
| `src/lib/components/chat/ChatPlaceholder.svelte` | SUBTRACTIVE link removal (+3/-7) | YES: removes community author link | LOW |
| `src/lib/components/chat/FileNav/FileNavToolbar.svelte` | CUSTOMIZATION icon refactor (+19/-97) | No functional nerf found | MEDIUM |
| `src/lib/components/chat/LocalFileNav.svelte` | ADDITIVE Desk files (+634/-0) | No | LOW |
| `src/lib/components/chat/MessageInput.svelte` | SUBTRACTIVE/BEHAVIOR-CHANGING composer changes (+191/-8) | YES: hides TerminalMenu; narrows model selection | HIGH |
| `src/lib/components/chat/Messages/CaveatNotice.svelte` | ADDITIVE UI (+17/-0) | No | LOW |
| `src/lib/components/chat/Messages/ContentRenderer.svelte` | ADDITIVE caveat rendering (+36/-9) | No direct nerf found | MEDIUM |
| `src/lib/components/chat/Messages/RateComment.svelte` | SUBTRACTIVE link target change (+2/-1) | YES: disables public review link | MEDIUM |
| `src/lib/components/chat/Messages/ResponseMessage.svelte` | BEHAVIOR-CHANGING response display (+25/-17) | Possible: replaces skeleton/status empty state | MEDIUM |
| `src/lib/components/chat/Messages/UserMessage.svelte` | ADDITIVE pasted-text card (+33/-21) | No direct nerf found | MEDIUM |
| `src/lib/components/chat/ModelSelector/ModelItemMenu.svelte` | SUBTRACTIVE (+0/-22) | YES: removes Community Reviews action | MEDIUM |
| `src/lib/components/chat/Navbar.svelte` | BEHAVIOR-CHANGING navbar/title menu (+46/-10) | YES when paired with `Chat.svelte` selector suppression | HIGH |
| `src/lib/components/chat/PastedTextCard.svelte` | ADDITIVE UI (+85/-0) | No | LOW |
| `src/lib/components/chat/Placeholder.svelte` | SUBTRACTIVE link removal/binding (+4/-8) | YES: removes community author link | LOW |
| `src/lib/components/chat/Placeholder/FolderPlaceholder.svelte` | CUSTOMIZATION copy (+1/-1) | No | LOW |
| `src/lib/components/chat/Placeholder/FolderTitle.svelte` | BEHAVIOR-CHANGING project metadata (+25/-13) | No direct nerf found | MEDIUM |
| `src/lib/components/chat/Settings/About.svelte` | SUBTRACTIVE/BRANDING (+2/-44) | YES: disables/removes update/social/license/creator links | MEDIUM |
| `src/lib/components/chat/Settings/Integrations/Terminals.svelte` | ADDITIVE UI wrapper (+21/-11) | No direct nerf found | LOW |
| `src/lib/components/chat/ShareChatModal.svelte` | CUSTOMIZATION copy (+2/-2) | No: upload still targets `openwebui.com` | LOW |
| `src/lib/components/common/EnosOrb.svelte` | ADDITIVE UI (+18/-0) | No | LOW |
| `src/lib/components/common/Folder.svelte` | CUSTOMIZATION typography (+1/-1) | No | LOW |
| `src/lib/components/enos/.gitkeep` | ADDITIVE (+0/-0) | No | LOW |
| `src/lib/components/enos/ModelPicker.svelte` | ADDITIVE ENOS picker (+55/-0) | No by itself; risk comes from replacing stock picker | LOW |
| `src/lib/components/icons/Sidebar.svelte` | ADDITIVE prop (+2/-0) | No | LOW |
| `src/lib/components/layout/ChatsModal.svelte` | ADDITIVE return URL (+14/-1) | No | LOW |
| `src/lib/components/layout/Navbar/Menu.svelte` | ADDITIVE alignment prop (+2/-1) | No | LOW |
| `src/lib/components/layout/Sidebar.svelte` | SUBTRACTIVE/BEHAVIOR-CHANGING surface filtering (+407/-234) | YES: hides/filter Chats on Desk | HIGH |
| `src/lib/components/layout/Sidebar/ChatItem.svelte` | BEHAVIOR-CHANGING project context (+14/-4) | No direct nerf found | MEDIUM |
| `src/lib/components/layout/Sidebar/Folders/FolderMenu.svelte` | BEHAVIOR-CHANGING project menu (+23/-12) | No direct nerf found | MEDIUM |
| `src/lib/components/layout/Sidebar/Folders/FolderModal.svelte` | BEHAVIOR-CHANGING local folder action (+24/-5) | No direct nerf found | MEDIUM |
| `src/lib/components/layout/Sidebar/RecursiveFolder.svelte` | BEHAVIOR-CHANGING project/sidebar behavior (+92/-48) | Possible: changes folder expand/click semantics | HIGH |
| `src/lib/components/layout/Sidebar/UserMenu.svelte` | SUBTRACTIVE link removal (+1/-17) | YES: removes Documentation and disables Releases link | MEDIUM |
| `src/lib/components/layout/UpdateInfoToast.svelte` | SUBTRACTIVE link removal (+1/-3) | YES: removes release link from update toast | LOW |
| `src/lib/components/workspace/Models.svelte` | SUBTRACTIVE/BEHAVIOR-CHANGING routing panel (+171/-6) | YES: disables Discover model link; hides `enos.desk` model | HIGH |
| `src/lib/components/workspace/Models/Knowledge.svelte` | ADDITIVE optional props (+14/-1) | No | LOW |
| `src/lib/components/workspace/Prompts.svelte` | SUBTRACTIVE link target change (+3/-3) | YES: disables Discover prompt link | MEDIUM |
| `src/lib/components/workspace/Tools.svelte` | SUBTRACTIVE link target change (+3/-3) | YES: disables Discover tool link | MEDIUM |
| `src/lib/constants.ts` | CUSTOMIZATION app name (+1/-1) | No functional nerf | LOW |
| `src/lib/enos/deskAgentLoop.test.ts` | ADDITIVE test (+147/-0) | No | LOW |
| `src/lib/enos/deskAgentLoop.ts` | ADDITIVE Desk agent loop (+145/-0) | No | LOW |
| `src/lib/enos/deskFileTools.test.ts` | ADDITIVE test (+437/-0) | No | LOW |
| `src/lib/enos/deskFileTools.ts` | ADDITIVE Desk tools (+516/-0) | No | LOW |
| `src/lib/enos/desktopBridge.ts` | ADDITIVE bridge (+307/-0) | No | LOW |
| `src/lib/enos/grounding.test.ts` | ADDITIVE test (+21/-0) | No | LOW |
| `src/lib/enos/grounding.ts` | ADDITIVE grounding (+33/-0) | No | LOW |
| `src/lib/enos/pastedText.test.ts` | ADDITIVE test (+45/-0) | No | LOW |
| `src/lib/enos/pastedText.ts` | ADDITIVE helper (+48/-0) | No | LOW |
| `src/lib/enos/projectActions.ts` | ADDITIVE helper (+145/-0) | No | LOW |
| `src/lib/enos/projectChatActions.test.ts` | ADDITIVE test (+249/-0) | No | LOW |
| `src/lib/enos/projectChatActions.ts` | ADDITIVE helper (+286/-0) | No direct nerf; possible dead/orphaned path | LOW |
| `src/lib/enos/surfaceScope.test.ts` | ADDITIVE test (+50/-0) | No | LOW |
| `src/lib/enos/surfaceScope.ts` | ADDITIVE helper used for filtering (+47/-0) | YES when used to hide Desk/Chat items | MEDIUM |
| `src/lib/stores/enos/.gitkeep` | ADDITIVE (+0/-0) | No | LOW |
| `src/lib/stores/enos/surface.ts` | ADDITIVE store (+5/-0) | No | LOW |
| `src/lib/stores/index.ts` | ADDITIVE stores (+2/-0) | No | LOW |
| `src/routes/+layout.svelte` | ADDITIVE/CUSTOMIZATION surface/brand hooks (+17/-3) | No direct nerf found | MEDIUM |
| `src/routes/s/[id]/+page.svelte` | ADDITIVE admin return affordance (+27/-6) | No | LOW |
| `src/tailwind.css` | CUSTOMIZATION font variables (+3/-6) | No | LOW |
| `static/assets/fonts/AnthropicMono-Italic-Web.woff2` | ADDITIVE binary | No | LOW |
| `static/assets/fonts/AnthropicMono-Roman-Web.woff2` | ADDITIVE binary | No | LOW |
| `static/assets/fonts/AnthropicSans-Italic-Web.woff2` | ADDITIVE binary | No | LOW |
| `static/assets/fonts/AnthropicSans-Roman-Web.woff2` | ADDITIVE binary | No | LOW |
| `static/assets/fonts/AnthropicSerif-Italic-Web.woff2` | ADDITIVE binary | No | LOW |
| `static/assets/fonts/AnthropicSerif-Roman-Web.woff2` | ADDITIVE binary | No | LOW |
| `static/enos-loader.svg` | ADDITIVE asset (+20/-0) | No | LOW |
| `static/fonts/enos/AnthropicMono-Italic-Variable.woff2` | ADDITIVE binary | No | LOW |
| `static/fonts/enos/AnthropicMono-Variable.woff2` | ADDITIVE binary | No | LOW |
| `static/fonts/enos/AnthropicSans-Italic-Variable.woff2` | ADDITIVE binary | No | LOW |
| `static/fonts/enos/AnthropicSans-Variable.woff2` | ADDITIVE binary | No | LOW |
| `static/fonts/enos/AnthropicSerif-Italic-Variable.woff2` | ADDITIVE binary | No | LOW |
| `static/fonts/enos/AnthropicSerif-Variable.woff2` | ADDITIVE binary | No | LOW |
| `static/static/custom.css` | SUBTRACTIVE/BEHAVIOR-CHANGING runtime CSS override (+107/-0) | YES: hides stock controls | HIGH |
| `static/static/enos-surface.mjs` | SUBTRACTIVE/BEHAVIOR-CHANGING runtime DOM override (+1410/-0) | YES: hides terminal/model/right-panel UI | HIGH |
| `test/enos-admin-chat-return.test.mjs` | ADDITIVE test (+70/-0) | No | LOW |
| `test/enos-chat-navbar.test.mjs` | ADDITIVE test (+91/-0) | No | LOW |
| `test/enos-desk-sidebar.test.mjs` | ADDITIVE test (+1025/-0) | No | LOW |
| `test/enos-local-terminal.test.mjs` | ADDITIVE test (+44/-0) | No | LOW |
| `test/enos-model-selection.test.mjs` | ADDITIVE test (+65/-0) | No | LOW |
| `test/enos-pasted-text-card.test.mjs` | ADDITIVE test (+66/-0) | No | LOW |
| `test/enos-response-loading.test.mjs` | ADDITIVE test (+46/-0) | No | LOW |
| `test/enos-search-query-quality.test.mjs` | ADDITIVE test (+18/-0) | No | LOW |

## Bind-Mount Override Deep Dive (one subsection per file, file:line evidence)

### `backend/open_webui/config.py`

Diff stat: `8 insertions / 4 deletions`.

Classification: BEHAVIOR-CHANGING prompt customization, no direct base-functionality nerf found.

Evidence:

- Follow-up prompt changed from broad chat-history continuation to current-exchange anchoring. Current lines `backend/open_webui/config.py:3188-3203` add current-topic anchoring and greeting/acknowledgement behavior. Upstream `v0.9.6` lines `backend/open_webui/config.py:3188-3202` asked for follow-ups "based on the chat history" and had a broader short-conversation fallback. This changes generated follow-up behavior but does not remove the follow-up feature.
- Query-generation prompt adds named-entity and pronoun/deictic-reference resolution at `backend/open_webui/config.py:3254-3256`. Upstream `v0.9.6` had no equivalent lines and went straight from the broad-query instruction to output format at upstream `backend/open_webui/config.py:3252-3254`.

Removed/altered behavior:

- Removed upstream wording that follow-ups should continue/deepen discussion based on the whole chat history. That can reduce resurfacing older topics; I classify this as behavior-changing, not a nerf, because the feature still emits follow-ups and the new prompt is plausibly quality-improving.

NERF RISK: None found in this file.

Updatability risk: MEDIUM. This is a core upstream config module; source-level prompt edits will conflict with future OWUI prompt changes and are hard to audit when live values may also reside in the DB config row.

Refactor recommendation: move ENOS prompt overrides into DB config/exported seed config or an ENOS config overlay loaded after upstream defaults. Keep upstream `config.py` unmodified unless adding a small, general extension point.

### `backend/open_webui/env.py`

Diff stat: no tracked diff.

Evidence: `HEAD` blob `2f6b4ed6322027d54a27e58e62a8e75ccd21c955` equals upstream `v0.9.6` blob `2f6b4ed6322027d54a27e58e62a8e75ccd21c955`.

Removed/altered behavior: none in this repo.

NERF RISK: None found from source diff.

Updatability risk: HIGH operationally if still live-bind-mounted as a full file. Even an identical full-file mount will mask future upstream changes unless the mount source is refreshed with every OWUI upgrade.

Refactor recommendation: remove the bind mount if no active ENOS diff is needed; otherwise replace full-file override with environment variables or a small ENOS startup overlay.

### `backend/open_webui/routers/images.py`

Diff stat: no tracked diff.

Evidence: `HEAD` blob `9d65cebfb8bf974d9d66b82500e6f97cc2ef6cda` equals upstream `v0.9.6` blob `9d65cebfb8bf974d9d66b82500e6f97cc2ef6cda`.

Removed/altered behavior: none in this repo.

NERF RISK: None found from source diff.

Updatability risk: HIGH operationally if live-bind-mounted as a full file, because future upstream image-router fixes would be hidden by the stale mount.

Refactor recommendation: remove the bind mount. If ENOS image behavior is needed later, add middleware, dependency injection, or route-level wrapper code instead of overriding the whole router.

### `backend/open_webui/routers/retrieval.py`

Diff stat: no tracked diff.

Evidence: `HEAD` blob `70f6cf6309bbd1d32d4e6ee2aaa3549c7bffcca2` equals upstream `v0.9.6` blob `70f6cf6309bbd1d32d4e6ee2aaa3549c7bffcca2`.

Removed/altered behavior: none in this repo.

NERF RISK: None found from source diff.

Updatability risk: HIGH operationally if live-bind-mounted as a full file, because retrieval is a high-change upstream surface.

Refactor recommendation: use config-driven retrieval settings or a provider/plugin hook. Avoid full router overrides.

### `backend/open_webui/retrieval/web/relevance.py`

Diff stat: not applicable; path is absent in both `HEAD` and upstream `v0.9.6`.

Evidence: `git ls-tree -r --name-only HEAD` and `git ls-tree -r --name-only v0.9.6` return no `backend/open_webui/retrieval/web/relevance.py`.

Removed/altered behavior: not auditable from this repository because the file is not present in the compared trees.

NERF RISK: Unknown if the live deploy actually bind-mounts an out-of-tree `relevance.py`. Hypothesis: this may be a stale deployment note or an untracked runtime override.

Updatability risk: CRITICAL until resolved. An untracked live override cannot be diffed, rebased, or reviewed against upstream.

Refactor recommendation: either remove the live bind mount if stale, or commit the exact mounted file into the repo and audit it against the correct upstream path. If it implements relevance filtering, prefer a retrieval-provider option or a DB-configurable reranking step over a full source override.

### `backend/open_webui/tools/builtin.py`

Diff stat: no tracked diff.

Evidence: `HEAD` blob `965f333dfccdc31aacd00b500ddc2d64cfacbbac` equals upstream `v0.9.6` blob `965f333dfccdc31aacd00b500ddc2d64cfacbbac`.

Removed/altered behavior: none in this repo.

NERF RISK: None found from source diff.

Updatability risk: HIGH operationally if live-bind-mounted as a full file. Built-in tools are likely to change across OWUI releases; a stale mount would silently skip upstream tool fixes.

Refactor recommendation: add ENOS tools through the DB function/tool mechanism or a plugin/tool registration layer. Do not override all built-ins.

## Updatability Assessment (per-file lock-in rank + refactor recommendations)

Per-file lock-in rank is listed in the Modified Files Summary table above. The main update blockers are clustered below.

### HIGH lock-in files and why

- `src/lib/components/chat/Chat.svelte` (`+533/-26`): large fork of a central OWUI workflow. Evidence of stock UI suppression: current `src/lib/components/chat/Chat.svelte:3547` passes `showModelSelector={false}`; upstream `v0.9.6` `src/lib/components/chat/Chat.svelte:3041-3044` passed selected models without disabling the navbar selector.
- `src/lib/components/chat/MessageInput.svelte` (`+191/-8`): central composer fork. Evidence of stock terminal selector removal: upstream `v0.9.6` `src/lib/components/chat/MessageInput.svelte:1983-1988` rendered the permission/model-gated `<TerminalMenu bind:show={showTerminalMenu} />`; current `src/lib/components/chat/MessageInput.svelte:2171-2174` leaves only `<!-- enos: TerminalMenu (cloud icon) hidden -->` before voice input.
- `backend/open_webui/static/custom.css` and `static/static/custom.css` (`+107/-0` each): global CSS hard-overrides stock UI. Current `backend/open_webui/static/custom.css:68-87` and `static/static/custom.css:68-87` hide `#integration-menu-button`, `button[aria-label="Available Tools"]`, assistant model identity, `button[aria-label="Controls"]`, and `button[aria-label="User menu"]` with `display: none !important`.
- `static/static/enos-surface.mjs` (`+1410/-0`): full frontend runtime mutation layer. Current `static/static/enos-surface.mjs:442-445` marks arbitrary DOM elements hidden with `data-enos-surface-hidden` and `aria-hidden`; `static/static/enos-surface.mjs:1165-1188` hides top model default chrome, terminal controls, and model options based on text/DOM classification; `static/static/enos-surface.mjs:555-574` auto-closes right panels on Chat.
- `src/lib/components/layout/Sidebar.svelte` (`+407/-234`): broad fork of chat/folder navigation. Evidence: current `src/lib/components/layout/Sidebar.svelte:119-124` introduces Desk-surface detection, filtered sidebar chats, and `showDeskChats = !isDeskSurface`; current `src/lib/components/layout/Sidebar.svelte:1520-1524` renders the stock `Chats` folder only when `showDeskChats` is true. Chat fetching is filtered at `src/lib/components/layout/Sidebar.svelte:442-446` and pagination at `src/lib/components/layout/Sidebar.svelte:461-462`.
- `src/lib/components/chat/ChatControls.svelte` (`+114/-73`): central right-pane logic changed. Upstream `v0.9.6` `src/lib/components/chat/ChatControls.svelte:78-91` showed files from selected terminal/code-interpreter and overview only when messages existed; current `src/lib/components/chat/ChatControls.svelte:104-115` adds local file nav, forces overview on Desk, and changes tab ordering/visibility.
- `src/app.html` and the whole frontend build: `src/app.html` injects `static/enos-surface.mjs` and cache-busted `custom.css`, while the deploy also bind-mounts the frontend build. This makes future OWUI frontend changes compete with both source forks and generated/static overrides.

### MEDIUM lock-in files

Files with smaller source edits but recurring conflicts expected: `backend/open_webui/config.py`, `src/lib/components/chat/Navbar.svelte`, `src/lib/components/layout/Sidebar/RecursiveFolder.svelte`, `src/lib/components/workspace/Models.svelte`, `src/lib/components/chat/Messages/ContentRenderer.svelte`, `src/lib/components/chat/Messages/ResponseMessage.svelte`, `src/lib/components/chat/Messages/UserMessage.svelte`, `src/lib/components/chat/Placeholder/FolderTitle.svelte`, `src/lib/components/layout/Sidebar/ChatItem.svelte`, `src/lib/components/layout/Sidebar/Folders/FolderMenu.svelte`, `src/lib/components/layout/Sidebar/Folders/FolderModal.svelte`, `src/routes/+layout.svelte`, and all direct link-removal files listed as MEDIUM in the summary table.

### LOW lock-in files

New ENOS-only modules, tests, fonts, assets, and docs are generally upstream-safe because they do not touch upstream-owned files: `src/lib/enos/*`, `src/lib/components/enos/*`, `test/enos-*.mjs`, `static/assets/fonts/*`, `static/fonts/enos/*`, `static/enos-loader.svg`, `AGENTS.md`, and `ENOS.md`.

### Refactor recommendations

1. Replace global CSS/DOM hiding with explicit extension points.
   - Current risk: stock controls are hidden by `custom.css` and `enos-surface.mjs`, outside Svelte component contracts.
   - Convert to: upstream-friendly props/feature flags such as `surfaceMode`, `showCommunityLinks`, `showTerminalSelector`, and `showNativeControls`, with defaults preserving OWUI behavior. Scope ENOS presentation under `[data-enos-surface]` without hiding stock UI unless a user/admin setting explicitly opts in.

2. Extract Desk/project behavior out of upstream core files.
   - Current risk: `Chat.svelte`, `MessageInput.svelte`, `Sidebar.svelte`, `ChatControls.svelte`, and `RecursiveFolder.svelte` are high-conflict files.
   - Convert to: ENOS wrapper components (`EnosDeskPane`, `EnosProjectSidebarSection`, `EnosComposerAddons`) mounted through small stable insertion points. Keep upstream logic intact and pass additive callbacks/stores instead of rewriting control flow.

3. Remove full-file backend bind mounts.
   - Current risk: five backend files are identical in repo but reportedly bind-mounted live, which will still freeze future upstream fixes.
   - Convert to: DB-configured prompt/tool settings, environment variables, middleware, provider registration, or plugin/tool rows. Delete stale mounts. Bring any live `relevance.py` into the repo or remove it.

4. Restore community/update links behind an ENOS policy instead of disabling them.
   - Current risk: `href="#"` and removed anchor blocks break enabled OWUI community features while the feature flag remains true.
   - Convert to: if ENOS policy forbids Open WebUI branding, hide the whole community section with a clear product config flag, or route to an ENOS-maintained docs/community page. Do not leave visible dead links.

## Verdict (nerfs yes/no + list; updatability yes/no + blockers; top-3 refactors)

### Are we nerfing base OWUI anywhere?

Yes.

Ranked nerf risks:

1. CRITICAL: global frontend CSS hides stock chat controls/tools/user controls.
   - Evidence: `backend/open_webui/static/custom.css:68-87` and `static/static/custom.css:68-87` hide the integration menu, available tools indicator, assistant model header/avatar, Controls button, and User menu with `display: none !important`.
   - Consequence: stock OWUI users can lose access to web/image/code/tool toggles, control pane entry, user menu, and response model identity even when permissions/features allow them.

2. HIGH: stock terminal selector is removed from the composer.
   - Evidence: upstream `v0.9.6` `src/lib/components/chat/MessageInput.svelte:1983-1988` rendered `<TerminalMenu>` when terminal-capable models/connections existed; current `src/lib/components/chat/MessageInput.svelte:2171-2174` replaces that block with an ENOS comment saying the cloud icon is hidden.
   - Consequence: base Open Terminal selection/configured terminal usage is degraded from the normal composer path.

3. HIGH: stock top model selector is suppressed and replaced by ENOS-specific selection.
   - Evidence: current `src/lib/components/chat/Chat.svelte:3547` passes `showModelSelector={false}`; upstream `v0.9.6` `src/lib/components/chat/Navbar.svelte:124-126` renders `<ModelSelector>` when `showModelSelector` is true. The new ENOS picker offers only fixed `enos.subconscious`, `enos.mind`, and `enos.deepmind` choices in `src/lib/components/enos/ModelPicker.svelte:4-8`.
   - Consequence: arbitrary OWUI model selection from the stock navbar is no longer available in that path.

4. HIGH: runtime surface script hides/filters terminal/model/right-panel UI by DOM text and selectors.
   - Evidence: `static/static/enos-surface.mjs:1165-1188` hides elements via `markHidden` for top model default chrome, terminal controls, and model policies; `static/static/enos-surface.mjs:296-322` hides raw provider/bridge/desk-tier/mind-tier model rows depending on surface; `static/static/enos-surface.mjs:555-574` auto-closes right panels on Chat.
   - Consequence: this silently changes stock UI behavior after render and is fragile against upstream DOM changes.

5. HIGH: Desk surface hides and filters the stock Chats list.
   - Evidence: current `src/lib/components/layout/Sidebar.svelte:119-124` sets surface filtering and `showDeskChats = !isDeskSurface`; current `src/lib/components/layout/Sidebar.svelte:1520-1524` only renders the stock `Chats` folder when `showDeskChats` is true. Current `src/lib/enos/surfaceScope.ts:21-35` filters items by `meta.surface`.
   - Consequence: on Desk, stock chats can disappear from the primary sidebar unless tagged/migrated into that surface.

6. MEDIUM: community, docs, reviews, and release links are removed or converted to dead anchors while visible UI remains.
   - Evidence: Community Reviews removed from model item menu (upstream `src/lib/components/chat/ModelSelector/ModelItemMenu.svelte:147-166`, current file ends the menu at `src/lib/components/chat/ModelSelector/ModelItemMenu.svelte:131-147`); Discover links changed to `href="#"` in `src/lib/components/admin/Functions.svelte:611-614`, `src/lib/components/workspace/Models.svelte:977-980`, `src/lib/components/workspace/Prompts.svelte:536-539`, and `src/lib/components/workspace/Tools.svelte:571-574`; public review link changed to `href="#"` with `preventDefault` in `src/lib/components/chat/Messages/RateComment.svelte:258-261`; admin help docs/social links removed from `src/lib/components/admin/Settings/General.svelte:199-210` versus upstream `src/lib/components/admin/Settings/General.svelte:202-240`; About social/license/creator links removed at current `src/lib/components/chat/Settings/About.svelte:112-131` versus upstream `src/lib/components/chat/Settings/About.svelte:124-170`; Releases changed to `href="#"` in `src/lib/components/layout/Sidebar/UserMenu.svelte:565-580`; update toast release link changed from anchor to span at `src/lib/components/layout/UpdateInfoToast.svelte:24`.
   - Consequence: feature-flagged community/update affordances are visible but nonfunctional or removed.

Not counted as nerfs: ENOS branding (`APP_NAME`, title, favicon), added Desk local file tools, pasted-text presentation, prompt quality changes, fonts/assets, and additive tests/docs.

### Can we still take upstream updates cleanly?

No, not cleanly.

Top blockers:

1. Hard-divergence in core frontend files: `Chat.svelte`, `MessageInput.svelte`, `Sidebar.svelte`, `ChatControls.svelte`, `RecursiveFolder.svelte`, and `Models.svelte` have large behavior changes in high-churn upstream areas.
2. Full frontend build/static override: `custom.css` and `enos-surface.mjs` hide and mutate upstream DOM after render, creating a second, non-component update surface that will break when upstream labels/selectors/structure change.
3. Backend full-file bind mounts: even where files are currently identical, live full-file mounts for `env.py`, routers, and tools would freeze future upstream changes unless removed or refreshed. The named `relevance.py` path is absent in repo and upstream, so any live mount there is unversioned and unauditable.

### 3 highest-priority refactors to reduce lock-in

1. Remove global hiding overrides first: replace `custom.css` and `enos-surface.mjs` suppression with explicit Svelte props/settings that default to stock OWUI behavior.
2. Pull Desk/project features out of `Chat.svelte`, `MessageInput.svelte`, `Sidebar.svelte`, and `ChatControls.svelte` into ENOS-owned wrapper/addon components mounted through small insertion points.
3. Stop bind-mounting full backend core files; move prompt/tool/retrieval customizations into DB config, environment config, provider hooks, or plugin/tool registration, and either delete or version-control the alleged `relevance.py` override.
