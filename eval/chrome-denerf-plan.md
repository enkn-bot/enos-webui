# Chrome De-Nerf Plan — additive restore of 3 frontend nerfs

Restore base OWUI chrome ADDITIVELY without breaking the Chat/Desk/Terminal surface design. Source: fork-drift-audit.md + Codex (gpt-5.5/xhigh) read-only diff vs upstream v0.9.6. NOT YET DEPLOYED (Svelte changes need frontend rebuild).

## 1. Terminal selector (MessageInput.svelte)
- Upstream v0.9.6 renders `<TerminalMenu>` at lines 1983-1988.
- Fork hides it at `src/lib/components/chat/MessageInput.svelte:2171-2174`.
- Additive fix: remove only the hide-guard (2171-2174) so the upstream block re-renders. Keep ENOS ModelPicker (~1910-1915).
- Risk: `static/static/enos-surface.mjs:1172-1176` may still suppress terminal controls post-render. Verify after rebuild.

## 2. Top model selector (Chat.svelte)
- Fork sets `showModelSelector={false}` at `src/lib/components/chat/Chat.svelte:3547`.
- Additive fix: remove override (or set true) so base navbar selector renders. ENOS ModelPicker in composer unaffected — both coexist.
- Desk: `Navbar.svelte:133-162` holds Desk title menu; if crowded, add stock `<ModelSelector>` beside it (narrow width) rather than removing either.
- Risk: `enos-surface.mjs:1165-1168` may suppress top chrome; audit after rebuild.

## 3. Desk Chats list (Sidebar.svelte + surfaceScope.ts)
- Fork: `Sidebar.svelte:119-124` -> `showDeskChats = !isDeskSurface`; `:424-446`,`:461-462` gate stock Chats render; `:1520-1524` surface-filter via surfaceScope.ts.
- Additive opt-in fix: new user setting `settings.enos.scopeSidebarChatsBySurface` (default FALSE). Replace hard `isDeskSurface` guard with `isDeskSurface && settings?.enos?.scopeSidebarChatsBySurface`. Keep surfaceScope.ts + Desk folder/meta paths intact.
- Risk: `test/enos-desk-sidebar.test.mjs` asserts old suppression — update assertions to new default-false opt-in.

## Deploy sequence (Claude, via SSH; needs REBUILD)
1. Make the 3 Svelte edits above.
2. Repo root: `npm run build` (Vite+Svelte -> build/).
3. **index.html gotcha** ([[project_enos_fork_indexhtml]]): bind-mounted index.html has frozen chunk hashes -> 404 vs rebuilt build/. Safer = bake new build/index.html into src/app.html + drop the mount; OR copy new index.html into bind-mount + restart.
4. Deploy build/ to VM bind-mount — chunks/immutable assets BEFORE index.html.
5. Restart container; verify via ssh -L tunnel + Playwright: terminal menu + top model selector + Chats list all render. Confirm surfaces (Desk/Terminal) still behave.

NOTE: heavier than config flips (rebuild + index.html risk). Review + deploy in a session with headroom.
