# New Project Modal Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Desk project creation project-first: every new project gets a real Local or Cloud workspace root, with a clean create flow and advanced OWUI fields moved out of first-run creation.

**Architecture:** Keep OWUI folders as the backing project record. Change only the Desk-facing folder modal behavior: create mode becomes a lean ENOS project chooser, edit mode keeps the existing advanced OWUI folder controls. Sidebar creates the real Local or Cloud workspace root, then stores the source on the folder. Also hide duplicate project detail in the project menu when it repeats the project name.

**Tech Stack:** Svelte, OWUI folder APIs, ENOS desktop bridge, Vitest source guard tests.

---

### Task 1: Guard Tests

**Files:**
- Modify: `src/lib/enos/deskUiSource.test.ts`

- [x] **Step 1: Add failing source guard tests**

Assert that `DeskProjectMenu.svelte` hides duplicate detail labels and that `FolderModal.svelte` exposes a lean create mode with Local/Cloud choices, clean project creation copy, and advanced fields gated to edit mode.

- [x] **Step 2: Run focused test and verify it fails**

Run:

```bash
npm run test:frontend -- --run src/lib/enos/deskUiSource.test.ts
```

Expected: fails before implementation.

### Task 2: Project Menu Detail

**Files:**
- Modify: `src/lib/components/enos/DeskProjectMenu.svelte`

- [x] **Step 1: Hide duplicate detail**

Show project detail only when it exists and differs from the visible project name.

### Task 3: Lean New Project Modal

**Files:**
- Modify: `src/lib/components/layout/Sidebar/Folders/FolderModal.svelte`

- [x] **Step 1: Add environment state**

Add `projectEnvironment`, `projectStartMode`, and derived button labels.

- [x] **Step 2: Keep create mode lean**

Create mode shows project name, Local/Cloud chooser, and one action area. Edit mode keeps background image, system prompt, and knowledge controls.

- [x] **Step 3: Preserve submit contract**

Submit still returns `{ name, meta, data, localWorkspace, projectEnvironment, parent_id }`; local clean passes a desktop-created workspace, and cloud clean asks Sidebar to provision/select the cloud workspace root.

### Task 4: Cloud Project Root

**Files:**
- Modify: `src/lib/components/layout/Sidebar.svelte`
- Modify: `src/lib/enos/deskUiSource.test.ts`

- [x] **Step 1: Add failing source guard**

Assert that cloud project creation calls `createCloudWorkspace`, creates a cloud directory, records `project_context_source.kind = 'cloud'`, points Files at the cloud path, and selects the workspace.

- [x] **Step 2: Create real cloud root on submit**

When create mode submits `projectEnvironment === 'cloud'`, create `/home/user/<Project>/`, set the selected terminal id, store the cloud source on the project folder, and point Files at that path.

### Task 5: Verification

**Files:**
- Test: `src/lib/enos/deskUiSource.test.ts`
- Test: `src/lib/components/enos/DeskWorkspacePicker.test.ts`

- [x] **Step 1: Run focused tests**

```bash
npm run test:frontend -- --run src/lib/enos/deskUiSource.test.ts src/lib/components/enos/DeskWorkspacePicker.test.ts
```

- [x] **Step 2: Build**

```bash
npm run build
```
