# Desk Project/Session UX Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement the approved Desk project/session UX refinements for web cloud-only projects, session copy, cloud project-root files, and missing local folder recovery.

**Architecture:** Keep the existing OWUI storage model. Add small pure ENOS helpers, test them first, then wire the helpers into the Desk sidebar, navbar, file pane, and local recovery state. Do not add a Finder/project-root rename contract until the Electron bridge exposes that capability.

**Tech Stack:** Svelte 5, TypeScript, Vitest, existing ENOS Desk helpers under `src/lib/enos`.

---

### Task 1: Surface And Session Helpers

**Files:**
- Modify: `src/lib/enos/surfaceScope.ts`
- Modify: `src/lib/enos/surfaceScope.test.ts`
- Create: `src/lib/enos/deskSessionLabels.ts`
- Test: `src/lib/enos/deskSessionLabels.test.ts`

- [x] **Step 1: Write failing tests**

```ts
// src/lib/enos/surfaceScope.test.ts
expect(filterProjectsForDeskRuntime(projects, { surface: 'desk', hasDesktopBridge: false }).map((p) => p.id)).toEqual([
  'cloud',
  'github'
]);
expect(filterProjectsForDeskRuntime(projects, { surface: 'desk', hasDesktopBridge: true }).map((p) => p.id)).toEqual([
  'local',
  'cloud',
  'github',
  'legacy'
]);
```

```ts
// src/lib/enos/deskSessionLabels.test.ts
expect(deskSurfaceLabel('new', 'desk')).toBe('New Session');
expect(deskSurfaceLabel('empty', 'desk')).toBe('No sessions yet');
expect(deskSurfaceLabel('collection', 'desk')).toBe('Sessions');
expect(deskSurfaceLabel('new', 'chat')).toBe('New Chat');
```

- [x] **Step 2: Verify red**

Run: `npm run test:frontend -- --run src/lib/enos/surfaceScope.test.ts src/lib/enos/deskSessionLabels.test.ts`

Expected: FAIL because `filterProjectsForDeskRuntime` and `deskSurfaceLabel` do not exist.

- [x] **Step 3: Implement minimal helpers**

```ts
export const filterProjectsForDeskRuntime = <T extends SurfaceScopedItem>(
  items: T[] | null | undefined,
  args: { surface: EnosSurface; hasDesktopBridge: boolean }
): T[] => {
  const list = filterBySurface(items, args.surface);
  if (args.surface !== 'desk' || args.hasDesktopBridge) return list;
  return list.filter((item) => {
    const kind = (item as any)?.data?.project_context_source?.kind;
    return kind === 'cloud' || kind === 'github';
  });
};
```

```ts
export type DeskSurfaceLabelKind = 'new' | 'collection' | 'empty' | 'rename';

export const deskSurfaceLabel = (
  kind: DeskSurfaceLabelKind,
  surface: 'chat' | 'desk'
): string => {
  if (surface === 'desk') {
    if (kind === 'new') return 'New Session';
    if (kind === 'collection') return 'Sessions';
    if (kind === 'empty') return 'No sessions yet';
    if (kind === 'rename') return 'Rename session';
  }
  if (kind === 'new') return 'New Chat';
  if (kind === 'collection') return 'Chats';
  if (kind === 'empty') return 'No chats found';
  return 'Rename chat';
};
```

- [x] **Step 4: Verify green**

Run the same Vitest command. Expected: PASS.

### Task 2: Wire Web Desk Cloud-Only Projects And Session Copy

**Files:**
- Modify: `src/lib/components/layout/Sidebar.svelte`
- Modify: `src/lib/components/layout/Sidebar/RecursiveFolder.svelte`
- Modify: `src/lib/components/chat/Navbar.svelte`
- Modify: `src/lib/enos/deskUiSource.test.ts`

- [x] **Step 1: Write failing source guard tests**

Assert `Sidebar.svelte` imports `filterProjectsForDeskRuntime`, uses it for `folderList`, and labels Desk loose sessions as `Sessions` / `New Session`. Assert `RecursiveFolder.svelte` no longer renders the browser-desk local cue.

- [x] **Step 2: Verify red**

Run: `npm run test:frontend -- --run src/lib/enos/deskUiSource.test.ts src/lib/enos/surfaceScope.test.ts src/lib/enos/deskSessionLabels.test.ts`

Expected: FAIL on missing helper wiring and old local cue assertions.

- [x] **Step 3: Implement wiring**

Use:

```svelte
import { deskSurfaceLabel } from '$lib/enos/deskSessionLabels';
import { filterProjectsForDeskRuntime } from '$lib/enos/surfaceScope';

$: newChatLabel = $i18n.t(deskSurfaceLabel('new', currentSurface));
$: sessionsLabel = $i18n.t(deskSurfaceLabel('collection', currentSurface));
```

Replace:

```ts
const folderList = filterBySurface(allFolders, currentSurface, {
  legacyDeskItemIds: legacyDeskProjectIds
});
```

with:

```ts
const folderList = filterProjectsForDeskRuntime(
  filterBySurface(allFolders, currentSurface, { legacyDeskItemIds: legacyDeskProjectIds }),
  { surface: currentSurface, hasDesktopBridge }
);
```

In Desk markup, use `newChatLabel`, `sessionsLabel`, and `deskSurfaceLabel('rename', currentSurface)` for visible labels and aria labels. Remove the `isDesktopOnlyHere` local cue from `RecursiveFolder.svelte`; local-only folders should not reach web Desk rendering.

- [x] **Step 4: Verify green**

Run the same Vitest command. Expected: PASS.

### Task 3: Cloud Files Start At Active Project Root

**Files:**
- Modify: `src/lib/enos/cloudFiles.ts`
- Modify: `src/lib/enos/cloudFiles.test.ts`
- Modify: `src/lib/components/chat/FileNav.svelte`
- Modify: `src/lib/components/chat/ChatControls.svelte`
- Modify: `src/lib/enos/deskUiSource.test.ts`

- [x] **Step 1: Write failing tests**

```ts
expect(resolveCloudFilesInitialPath('/home/user/', '/home/user/Test 22/')).toBe('/home/user/Test 22/');
expect(resolveCloudFilesInitialPath('/home/user/.local/', '/home/user/Test 22/')).toBe('/home/user/Test 22/');
expect(resolveCloudFilesInitialPath('/home/user/Test 22/src/', '/home/user/Test 22/')).toBe('/home/user/Test 22/src/');
expect(resolveCloudProjectRoot({ kind: 'cloud', cloudPath: '/home/user/Test 22' })).toBe('/home/user/Test 22/');
```

- [x] **Step 2: Verify red**

Run: `npm run test:frontend -- --run src/lib/enos/cloudFiles.test.ts src/lib/enos/deskUiSource.test.ts`

Expected: FAIL because project root helpers and prop wiring do not exist.

- [x] **Step 3: Implement root resolution**

Add `cloudProjectRoot` prop to `FileNav.svelte`, call `resolveCloudFilesInitialPath(cwd, cloudProjectRoot)`, and pass `cloudProjectRoot={selectedCloudProjectRoot}` from `ChatControls.svelte`, where:

```ts
$: selectedCloudProjectRoot = resolveCloudProjectRoot($selectedFolder?.data?.project_context_source);
```

- [x] **Step 4: Verify green**

Run the same Vitest command. Expected: PASS.

### Task 4: Missing Local Folder Recovery State

**Files:**
- Modify: `src/lib/components/chat/LocalFileNav.svelte`
- Modify: `src/lib/enos/deskUiSource.test.ts`

- [x] **Step 1: Write failing source guard test**

Assert `LocalFileNav.svelte` contains `Project folder missing`, `Relink Folder`, `Keep Read-Only`, and still disables file actions by rendering the recovery branch instead of the file-action toolbar.

- [x] **Step 2: Verify red**

Run: `npm run test:frontend -- --run src/lib/enos/deskUiSource.test.ts`

Expected: FAIL because the old copy says “Files live on this project’s machine.”

- [x] **Step 3: Implement recovery UI**

In the `unreachable` branch, replace the passive notice with a recovery-first block:

```svelte
<div class="text-sm font-medium mb-1">{$i18n.t('Project folder missing')}</div>
<div class="text-xs text-gray-400 dark:text-gray-500">
  {$i18n.t('This project folder was moved, renamed, or deleted outside ENOS. Sessions stay here, but local files and agent actions are paused until you recover the folder.')}
</div>
<div class="mt-4 flex justify-center gap-2">
  <button on:click={chooseWorkspace}>{$i18n.t('Relink Folder')}</button>
  <button on:click={() => (unreachable = false)}>{$i18n.t('Keep Read-Only')}</button>
</div>
```

- [x] **Step 4: Verify green**

Run: `npm run test:frontend -- --run src/lib/enos/deskUiSource.test.ts`

Expected: PASS.

### Task 5: Full Verification And Commit

**Files:**
- Modify: `docs/superpowers/plans/2026-06-25-desk-project-session-ux-hardening.md`

- [x] **Step 1: Run focused tests**

Run:

```bash
npm run test:frontend -- --run \
  src/lib/enos/surfaceScope.test.ts \
  src/lib/enos/deskSessionLabels.test.ts \
  src/lib/enos/cloudFiles.test.ts \
  src/lib/enos/deskUiSource.test.ts \
  src/lib/components/enos/DeskWorkspacePicker.test.ts
```

Expected: all tests pass.

- [x] **Step 2: Run build**

Run: `npm run build`

Expected: exit 0.

- [x] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-06-25-desk-project-session-ux-hardening.md src/lib/enos src/lib/components/chat src/lib/components/layout
git commit -m "feat(desk): harden project session UX"
```

## Notes

Finder folder rename sync is intentionally not implemented in this renderer pass because the current Electron bridge exposes file-entry rename but no project-root rename contract. Add a bridge method first, then wire external-folder confirmation and ENOS-created folder rename behavior.
