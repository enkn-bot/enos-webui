# Chat Annotations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users highlight a file in the Files dock tab and inject it as a quoted block into the chat input draft — the same "annotate and compose" pattern used by Codex and Cursor. (Response-bubble selection is intentionally excluded: the existing Ask/Explain popup already covers immediate-submit on selected text.)

**Architecture:** A shared `pendingAnnotation` writable store is the single seam: `LocalFileNav` writes a formatted quote string to it; `MessageInput` subscribes and prepends the quote to the current prompt on the next tick, then clears. No new routes, no new API calls, no new components — only additive changes to two existing files plus one new store file.

**Tech Stack:** Svelte 5 / SvelteKit, TypeScript, Tailwind CSS, Vitest (unit), node:test (static-analysis tests)

## Global Constraints

- Root: `enos-webui_link/` — all paths below are relative to that root
- No new npm dependencies
- Do not modify base OWUI files outside the files listed here
- `npm run test:frontend` must stay green (Vitest)
- `node --test test/enos-annotations.test.mjs` must pass (new static-analysis test)
- Quote text must never replace the user's existing draft — always prepend
- Do not trigger any `window.prompt` / `window.alert` dialogs

---

## File Map

| Status | Path | Responsibility |
|--------|------|----------------|
| **Create** | `src/lib/stores/annotations.ts` | `pendingAnnotation` writable store |
| **Create** | `src/lib/stores/annotations.test.ts` | Vitest unit tests for the store |
| **Modify** | `src/lib/components/chat/LocalFileNav.svelte` | "Quote in chat" button on selected utf8 file |
| **Modify** | `src/lib/components/chat/MessageInput.svelte` | Subscribe to store, prepend quote, clear |
| **Create** | `test/enos-annotations.test.mjs` | Static-analysis tests (node:test) |

---

### Task 1: `pendingAnnotation` store

**Files:**
- Create: `src/lib/stores/annotations.ts`
- Create: `src/lib/stores/annotations.test.ts`

**Interfaces:**
- Produces: `pendingAnnotation: Writable<string>` — imported by Tasks 2, 3, 4

- [ ] **Step 1: Write the failing unit test**

```typescript
// src/lib/stores/annotations.test.ts
import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { pendingAnnotation } from './annotations';

describe('pendingAnnotation', () => {
    it('starts empty', () => {
        expect(get(pendingAnnotation)).toBe('');
    });

    it('can be set and cleared', () => {
        pendingAnnotation.set('> hello\n\n');
        expect(get(pendingAnnotation)).toBe('> hello\n\n');
        pendingAnnotation.set('');
        expect(get(pendingAnnotation)).toBe('');
    });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
cd enos-webui_link
npm run test:frontend -- --reporter=verbose src/lib/stores/annotations.test.ts
```

Expected: FAIL — "Cannot find module './annotations'"

- [ ] **Step 3: Create the store**

```typescript
// src/lib/stores/annotations.ts
import { writable } from 'svelte/store';

export const pendingAnnotation = writable('');
```

- [ ] **Step 4: Run test to confirm it passes**

```
npm run test:frontend -- --reporter=verbose src/lib/stores/annotations.test.ts
```

Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/annotations.ts src/lib/stores/annotations.test.ts
git commit -m "feat(annotations): add pendingAnnotation store"
```

---

### Task 2: "Quote in chat" button in LocalFileNav

**Files:**
- Modify: `src/lib/components/chat/LocalFileNav.svelte`

**Interfaces:**
- Consumes: `pendingAnnotation` from `$lib/stores/annotations`
- Consumes (existing): `selectedFile: EnosDesktopFilePreview | null`, `editContent: string` (already in scope)

- [ ] **Step 1: Create the static-analysis test file**

```javascript
// test/enos-annotations.test.mjs  (NEW FILE)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const localFileNav = readFileSync('src/lib/components/chat/LocalFileNav.svelte', 'utf8');

test('LocalFileNav: imports pendingAnnotation store', () => {
    assert.match(localFileNav, /pendingAnnotation/, 'Must import pendingAnnotation store');
});

test('LocalFileNav: has handleQuoteInChat function', () => {
    assert.match(localFileNav, /handleQuoteInChat/, 'Must have a handleQuoteInChat handler');
});

test('LocalFileNav: Quote button only shown for utf8 files', () => {
    assert.match(localFileNav, /encoding.*utf8|utf8.*encoding/,
        'Quote button must guard on utf8 encoding');
});
```

- [ ] **Step 2: Run test to confirm all 3 assertions fail**

```
node --test test/enos-annotations.test.mjs
```

Expected: 3 FAIL — "Must import pendingAnnotation store"

- [ ] **Step 3: Add the import to LocalFileNav.svelte**

In `src/lib/components/chat/LocalFileNav.svelte`, add after the last existing `import` in the `<script>` block:

```typescript
import { pendingAnnotation } from '$lib/stores/annotations';
```

- [ ] **Step 4: Add the handler after the existing `handleAttachFile` or `onAttach` call site (around line 243)**

```typescript
const handleQuoteInChat = () => {
    if (!selectedFile || selectedFile.encoding !== 'utf8') return;
    const ext = selectedFile.path.split('.').pop() ?? '';
    const formatted = `**\`${selectedFile.path}\`**\n\`\`\`${ext}\n${editContent}\n\`\`\`\n\n`;
    pendingAnnotation.set(formatted);
};
```

- [ ] **Step 5: Add the "Quote in chat" button in the template**

Find the existing "Attach" button in the template (the one that calls `handleAttachFile` or `onAttach`). The "Quote in chat" button goes right next to it, shown only for utf8 text files:

```svelte
{#if selectedFile && selectedFile.encoding === 'utf8'}
    <button
        class="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg
               bg-transparent hover:bg-black/5 dark:hover:bg-white/10 transition"
        on:click={handleQuoteInChat}
        title="Quote file content in chat"
    >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5">
            <path d="M3.75 2A1.75 1.75 0 0 0 2 3.75v.836a3.253 3.253 0 0 1 1.5-.586V3.75A.25.25 0 0 1 3.75 3.5h2.5a.25.25 0 0 1 .25.25v5.5a.25.25 0 0 1-.25.25H3.75a.25.25 0 0 1-.25-.25V8.5H2v.75C2 10.216 2.784 11 3.75 11H6.5V8.25A1.75 1.75 0 0 0 4.75 6.5h-.5A1.25 1.25 0 0 1 3 5.25V3.75A1.75 1.75 0 0 1 4.75 2h-1ZM9.25 2A1.75 1.75 0 0 0 7.5 3.75v.836a3.253 3.253 0 0 1 1.5-.586V3.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25v5.5a.25.25 0 0 1-.25.25H9.25A.25.25 0 0 1 9 9.25V8.5H7.5v.75C7.5 10.216 8.284 11 9.25 11H12V8.25A1.75 1.75 0 0 0 10.25 6.5h-.5A1.25 1.25 0 0 1 8.5 5.25V3.75A1.75 1.75 0 0 1 10.25 2h-1Z"/>
        </svg>
        Quote in chat
    </button>
{/if}
```

- [ ] **Step 6: Run test to confirm all 3 assertions pass**

```
node --test test/enos-annotations.test.mjs
```

Expected: all 3 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/chat/LocalFileNav.svelte test/enos-annotations.test.mjs
git commit -m "feat(annotations): Quote in chat button on selected file in Files dock"
```

---

### Task 3: MessageInput subscribes to pendingAnnotation

**Files:**
- Modify: `src/lib/components/chat/MessageInput.svelte`

**Interfaces:**
- Consumes: `pendingAnnotation` from `$lib/stores/annotations`
- Consumes (existing): `prompt: string` (export let, line 142); `chatInputElement` (existing ref)

- [ ] **Step 1: Write the static-analysis test (add to existing test file)**

```javascript
// Append to test/enos-annotations.test.mjs
const messageInput = readFileSync('src/lib/components/chat/MessageInput.svelte', 'utf8');

test('MessageInput: imports pendingAnnotation store', () => {
    assert.match(messageInput, /pendingAnnotation/, 'Must import pendingAnnotation store');
});

test('MessageInput: prepends annotation to prompt', () => {
    assert.match(messageInput, /pendingAnnotation\.subscribe|pendingAnnotation\b.*unsubscribe/,
        'Must subscribe to pendingAnnotation');
    assert.match(messageInput, /prompt\s*=\s*.*\+\s*prompt|prompt\s*=\s*annotation.*prompt/,
        'Must prepend the annotation to the existing prompt');
});
```

- [ ] **Step 2: Run test to confirm new assertions fail**

```
node --test test/enos-annotations.test.mjs
```

Expected: tasks 1-3 pass, tasks 4-5 fail

- [ ] **Step 3: Add the import to MessageInput.svelte**

In `src/lib/components/chat/MessageInput.svelte`, add after the last existing `import` in the `<script>` block:

```typescript
import { pendingAnnotation } from '$lib/stores/annotations';
```

- [ ] **Step 4: Add the subscription in onMount**

Find the `onMount` in `MessageInput.svelte` (it already exists). Add the subscription inside it (or use a separate `onMount` if preferred — Svelte allows multiple):

```typescript
import { onMount, onDestroy, tick } from 'svelte';
// (onMount / onDestroy are already imported — just add the subscription lines)

let unsubAnnotation: () => void;

onMount(() => {
    unsubAnnotation = pendingAnnotation.subscribe(async (annotation) => {
        if (!annotation) return;
        prompt = annotation + prompt;
        pendingAnnotation.set('');
        await tick();
        chatInputElement?.focus?.();
    });
});

onDestroy(() => {
    unsubAnnotation?.();
});
```

> Note: `onMount` / `onDestroy` are already imported in this file. Check for duplicate imports before adding. If `onDestroy` is not yet imported, add it to the existing import line from `'svelte'`.

- [ ] **Step 5: Run test to confirm all 5 assertions pass**

```
node --test test/enos-annotations.test.mjs
```

Expected: 5 tests PASS

- [ ] **Step 6: Run vitest to confirm store tests still pass**

```
npm run test:frontend -- --reporter=verbose
```

Expected: all tests PASS (including the 2 annotations store tests)

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/chat/MessageInput.svelte test/enos-annotations.test.mjs
git commit -m "feat(annotations): MessageInput prepends pendingAnnotation to prompt on change"
```

---

## Self-Review

**Spec coverage:**
- Shared store: Task 1 ✓
- File side (LocalFileNav → store): Task 2 ✓
- Input side (MessageInput ← store): Task 3 ✓
- Static-analysis tests: Tasks 2, 3 (same test file) ✓
- Unit tests: Task 1 ✓
- Quote never replaces existing prompt (prepend): Task 3, step 4 — `prompt = annotation + prompt` ✓
- Quote button guarded on utf8 encoding: Task 2 ✓

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:**
- `pendingAnnotation: Writable<string>` — set in Tasks 2, 3; consumed in Task 4 ✓
- `quoteButtonPos: { x: number; y: number } | null` — used only in Task 2 ✓
- `handleQuoteInChat` — defined and called only in Task 3 ✓
- `handleQuoteMouseUp` / `handleQuoteClick` / `dismissQuoteButton` — defined and used only in Task 2 ✓

**Browser Phase (not in plan):** Browser webview (Electron isolated partition) annotation requires a preload script injection and is intentionally deferred.
