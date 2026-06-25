# Desk Project Environment Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Desk project/environment chrome simpler and honest: project is context, environment is where work runs, GitHub stays out of the default picker, and switching uses ENOS modals.

**Architecture:** Keep the existing split between `DeskProjectMenu` and `DeskWorkspacePicker`. Simplify `DeskProjectMenu` to project context only. Keep `DeskWorkspacePicker` as the Local/Cloud chooser and replace synchronous `window.confirm` with OWUI's existing `ConfirmDialog`.

**Tech Stack:** Svelte, OWUI components, Vitest source guard tests.

---

### Task 1: Source Guard Tests

**Files:**

- Modify: `src/lib/enos/deskUiSource.test.ts`

- [x] **Step 1: Write failing tests**

Update the Desk title/project/environment tests so they expect:

```ts
expect(projectButtonBlock).not.toContain('ChevronDown');
expect(menu).not.toContain('getGithubStatus');
expect(menu).not.toContain('owner/repo');
expect(menu).not.toContain("{$i18n.t('Source')}");
expect(picker).toContain(
	"import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';"
);
expect(picker).not.toContain('window.confirm');
```

- [x] **Step 2: Run focused test and verify it fails**

Run:

```bash
npm run test:frontend -- src/lib/enos/deskUiSource.test.ts
```

Expected: fails because current code still shows project chevron, GitHub controls, Source label, and `window.confirm`.

### Task 2: Project Menu Cleanup

**Files:**

- Modify: `src/lib/components/chat/Navbar.svelte`
- Modify: `src/lib/components/enos/DeskProjectMenu.svelte`

- [x] **Step 1: Remove project chevron**

In `Navbar.svelte`, keep `desk-project-menu-button` clickable but remove the `ChevronDown` instance inside that button.

- [x] **Step 2: Simplify project menu**

In `DeskProjectMenu.svelte`, remove GitHub API imports and state. The menu should show:

```svelte
PROJECT Planwell Working on your device | Working in cloud | Not connected to files yet
```

It may show a small context row for local/cloud/repo source only if already bound, but no `Source` heading and no always-visible GitHub auth/clone controls.

### Task 3: Environment Modal

**Files:**

- Modify: `src/lib/components/enos/DeskWorkspacePicker.svelte`

- [x] **Step 1: Replace `window.confirm` with `ConfirmDialog`**

Add modal state:

```ts
let pendingSwitchTarget: 'local' | 'cloud' | null = null;
let pendingSwitchAction: (() => Promise<void> | void) | null = null;
```

Open the modal before Local/Cloud transitions that need confirmation. On confirm, run the saved action.

- [x] **Step 2: Use honest copy**

Local to cloud:

```text
Copy this project to cloud?
ENOS will upload this local folder to your private cloud workspace and continue there. Files stay on this device too.
```

Cloud to local:

```text
Work locally?
Choose or bind a folder on this device. Cloud files stay in cloud until cloud-to-local copy is added.
```

### Task 4: Verification

**Files:**

- Test: `src/lib/enos/deskUiSource.test.ts`

- [x] **Step 1: Run focused source test**

```bash
npm run test:frontend -- src/lib/enos/deskUiSource.test.ts
```

- [x] **Step 2: Run frontend build**

```bash
npm run build
```

- [x] **Step 3: Visual pass**

Use browser/Playwright snapshot or screenshot against the running Desk surface after deploy/local run.

Completed with focused source/adjacent tests, production build, rsync deploy to `soraia-a1:~/open-webui/build/`, and live bundle/host checks.
