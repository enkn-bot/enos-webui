# Browser Annotation (Visual Element Picker → Chat) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Desk's browser pane, let the user toggle an Annotate mode, devtools-pick an element, and attach it as a structured annotation chip on the chat input that is serialized into the agent turn on send.

**Architecture:** A guest preload script injected into the Electron `<webview>` (via a new `will-attach-webview` handler) renders the picker overlay + inspector inside the page and pushes a structured payload to the host via `ipcRenderer.sendToHost`. The host `BrowserView.svelte` toggles the mode (`webview.send`) and listens for `ipc-message`, writing payloads to a `pendingAnnotations` store. `MessageInput.svelte` renders the annotation chip from that store and serializes annotations into the prompt on submit, then clears.

**Tech Stack:** Svelte 5 / SvelteKit / TypeScript (enos-webui), Electron preload / ESM (enos-desktop), Vitest (unit), node:test (static-analysis).

## Global Constraints

- Two repos, two roots. enos-webui root: `enos-webui_link/`. enos-desktop root: `apps/enos-desktop/`. Every path below is relative to the stated repo root.
- No new npm dependencies in either repo.
- Slice 1 only: no `data-enos-source` stamping plugin (deferred to Slice 2). The payload reads `data-enos-source` if present, else `null` — never fabricates it.
- The annotation must never auto-submit. It attaches to the draft; the user sends.
- The annotation must never replace the user's typed draft — serialized annotations are PREPENDED.
- Do not trigger any `window.prompt` / `window.alert` / modal dialogs.
- Annotation `text` is capped at 200 chars; selector build must never throw (wrap in try/catch, fall back to tag name).
- The picker overlay is rendered by the guest preload only; the host never tries to draw element-anchored overlays.
- `npm run test:frontend` (enos-webui, Vitest) must stay green.
- `node --test` on the new static-analysis files must pass.

---

## File Map

| Status | Repo | Path | Responsibility |
|--------|------|------|----------------|
| **Create** | enos-webui | `src/lib/enos/annotation.ts` | `Annotation` type + `serializeAnnotations(list, draft)` pure fn |
| **Create** | enos-webui | `src/lib/enos/annotation.test.ts` | Vitest unit tests for serializer |
| **Create** | enos-webui | `src/lib/stores/annotations.ts` | `pendingAnnotations: Writable<Annotation[]>` + helpers |
| **Create** | enos-webui | `src/lib/stores/annotations.test.ts` | Vitest unit tests for store helpers |
| **Modify** | enos-webui | `src/lib/components/enos/BrowserView.svelte` | Annotate toggle button + ⌘. + `ipc-message` listener |
| **Modify** | enos-webui | `src/lib/components/chat/MessageInput.svelte` | annotation chip + serialize-on-submit |
| **Create** | enos-webui | `test/enos-browser-annotation.test.mjs` | Static-analysis tests (node:test) |
| **Create** | enos-desktop | `src/webview-annotate.js` | Guest preload: picker overlay, inspector, payload, `sendToHost` |
| **Modify** | enos-desktop | `src/main.mjs` | `will-attach-webview` → attach guest preload |
| **Create** | enos-desktop | `test/webview-annotate.test.mjs` | Static-analysis tests (node:test) |

**Shared payload contract** (guest preload produces, host consumes — keep identical in both repos):

```
Annotation = {
  id: string;            // crypto.randomUUID()
  source: string | null; // data-enos-source value "file:line", else null
  tag: string;           // tagName.toLowerCase()
  selector: string;      // best-effort CSS selector, falls back to tag
  text: string;          // trimmed textContent, capped 200
  styles: { color: string; fontSize: string; fontFamily: string };
  rect: { w: number; h: number };
  url: string;           // page location.href
  note: string;          // optional inline note, '' if none
}
```

---

### Task 1: Annotation type + serializer (enos-webui)

**Files:**
- Create: `enos-webui_link/src/lib/enos/annotation.ts`
- Create: `enos-webui_link/src/lib/enos/annotation.test.ts`

**Interfaces:**
- Produces: `type Annotation` (shape above); `serializeAnnotations(list: Annotation[], draft: string): string` — used by Task 6 (MessageInput).

- [ ] **Step 1: Write the failing test**

```typescript
// enos-webui_link/src/lib/enos/annotation.test.ts
import { describe, it, expect } from 'vitest';
import { serializeAnnotations, type Annotation } from './annotation';

const mk = (over: Partial<Annotation> = {}): Annotation => ({
	id: '1',
	source: 'src/Squad.tsx:42',
	tag: 'h1',
	selector: 'h1.team-name',
	text: 'Esteemed Kompany',
	styles: { color: '#1E1914', fontSize: '15px', fontFamily: 'Inter' },
	rect: { w: 528, h: 17 },
	url: 'http://localhost:5180/',
	note: '',
	...over
});

describe('serializeAnnotations', () => {
	it('returns the draft unchanged when there are no annotations', () => {
		expect(serializeAnnotations([], 'hello')).toBe('hello');
	});

	it('prepends a header with the page url and an entry per annotation', () => {
		const out = serializeAnnotations([mk()], 'make it pop');
		expect(out).toContain('Annotations on http://localhost:5180/');
		expect(out).toContain('h1.team-name');
		expect(out).toContain('Esteemed Kompany');
		expect(out).toContain('src/Squad.tsx:42');
		expect(out.endsWith('make it pop')).toBe(true);
	});

	it('includes the inline note when present', () => {
		const out = serializeAnnotations([mk({ note: 'make this bigger' })], '');
		expect(out).toContain('make this bigger');
	});

	it('omits the source label when source is null', () => {
		const out = serializeAnnotations([mk({ source: null })], '');
		expect(out).not.toContain('src:');
	});
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
cd enos-webui_link
npm run test:frontend -- --run src/lib/enos/annotation.test.ts
```

Expected: FAIL — "Cannot find module './annotation'"

- [ ] **Step 3: Create the module**

```typescript
// enos-webui_link/src/lib/enos/annotation.ts
export type Annotation = {
	id: string;
	source: string | null;
	tag: string;
	selector: string;
	text: string;
	styles: { color: string; fontSize: string; fontFamily: string };
	rect: { w: number; h: number };
	url: string;
	note: string;
};

const entry = (a: Annotation, i: number): string => {
	const src = a.source ? ` — src: ${a.source}` : '';
	const note = a.note ? ` — ask: ${a.note}` : '';
	const style = `${a.styles.fontSize} ${a.styles.fontFamily}, ${a.styles.color}, ${a.rect.w}×${a.rect.h}`;
	const text = a.text ? ` "${a.text}"` : '';
	return `${i + 1}. <${a.selector}>${text}${src}${note} — ${style}`;
};

export const serializeAnnotations = (list: Annotation[], draft: string): string => {
	if (list.length === 0) return draft;
	const url = list[0]?.url ?? '';
	const header = `[Annotations on ${url}]`;
	const body = list.map(entry).join('\n');
	return `${header}\n${body}\n\n${draft}`;
};
```

- [ ] **Step 4: Run test to confirm it passes**

```
npm run test:frontend -- --run src/lib/enos/annotation.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add enos-webui_link/src/lib/enos/annotation.ts enos-webui_link/src/lib/enos/annotation.test.ts
git commit -m "feat(annotation): Annotation type + serializeAnnotations"
```

---

### Task 2: pendingAnnotations store (enos-webui)

**Files:**
- Create: `enos-webui_link/src/lib/stores/annotations.ts`
- Create: `enos-webui_link/src/lib/stores/annotations.test.ts`

**Interfaces:**
- Consumes: `type Annotation` from `$lib/enos/annotation`.
- Produces: `pendingAnnotations: Writable<Annotation[]>`; `addAnnotation(a: Annotation): void`; `removeAnnotation(id: string): void`; `clearAnnotations(): void` — used by Tasks 5 (BrowserView) and 6 (MessageInput).

- [ ] **Step 1: Write the failing test**

```typescript
// enos-webui_link/src/lib/stores/annotations.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	pendingAnnotations,
	addAnnotation,
	removeAnnotation,
	clearAnnotations
} from './annotations';
import type { Annotation } from '$lib/enos/annotation';

const mk = (id: string): Annotation => ({
	id,
	source: null,
	tag: 'div',
	selector: 'div',
	text: '',
	styles: { color: '', fontSize: '', fontFamily: '' },
	rect: { w: 0, h: 0 },
	url: 'http://x/',
	note: ''
});

describe('pendingAnnotations store', () => {
	beforeEach(() => clearAnnotations());

	it('starts empty', () => {
		expect(get(pendingAnnotations)).toEqual([]);
	});

	it('adds and removes by id', () => {
		addAnnotation(mk('a'));
		addAnnotation(mk('b'));
		expect(get(pendingAnnotations).map((x) => x.id)).toEqual(['a', 'b']);
		removeAnnotation('a');
		expect(get(pendingAnnotations).map((x) => x.id)).toEqual(['b']);
	});

	it('clear empties the list', () => {
		addAnnotation(mk('a'));
		clearAnnotations();
		expect(get(pendingAnnotations)).toEqual([]);
	});
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npm run test:frontend -- --run src/lib/stores/annotations.test.ts
```

Expected: FAIL — "Cannot find module './annotations'"

- [ ] **Step 3: Create the store**

```typescript
// enos-webui_link/src/lib/stores/annotations.ts
import { writable } from 'svelte/store';
import type { Annotation } from '$lib/enos/annotation';

export const pendingAnnotations = writable<Annotation[]>([]);

export const addAnnotation = (a: Annotation): void =>
	pendingAnnotations.update((list) => [...list, a]);

export const removeAnnotation = (id: string): void =>
	pendingAnnotations.update((list) => list.filter((x) => x.id !== id));

export const clearAnnotations = (): void => pendingAnnotations.set([]);
```

- [ ] **Step 4: Run test to confirm it passes**

```
npm run test:frontend -- --run src/lib/stores/annotations.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add enos-webui_link/src/lib/stores/annotations.ts enos-webui_link/src/lib/stores/annotations.test.ts
git commit -m "feat(annotation): pendingAnnotations store + add/remove/clear"
```

---

### Task 3: Guest preload picker (enos-desktop)

**Files:**
- Create: `apps/enos-desktop/src/webview-annotate.js`
- Create: `apps/enos-desktop/test/webview-annotate.test.mjs`

**Interfaces:**
- Produces: a CommonJS preload module that (a) listens for `ipcRenderer.on('enos:annotate-mode', (_e, on))` to toggle the picker, and (b) on element click sends `ipcRenderer.sendToHost('enos:annotation', payload)` where `payload` matches the shared Annotation contract minus `id` (host assigns `id`). It must export a pure `buildPayload(el, loc)` for testing.

> Note: this file is loaded as a `<webview>` preload. With `contextIsolation:true` (the window default) a preload still has Node `require` and runs in an isolated world but shares the DOM. Use `require('electron')`. The picker overlay uses absolutely-positioned DOM nodes with `z-index: 2147483647`.

- [ ] **Step 1: Write the failing static-analysis + unit test**

```javascript
// apps/enos-desktop/test/webview-annotate.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const src = readFileSync('src/webview-annotate.js', 'utf8');

test('listens for the annotate-mode toggle channel', () => {
	assert.match(src, /ipcRenderer\.on\(\s*['"]enos:annotate-mode['"]/);
});

test('sends annotations to host on the enos:annotation channel', () => {
	assert.match(src, /sendToHost\(\s*['"]enos:annotation['"]/);
});

test('reads data-enos-source attribute', () => {
	assert.match(src, /data-enos-source/);
});

test('caps text length at 200', () => {
	assert.match(src, /\b200\b/);
});

test('buildPayload extracts tag, text, source, rect from a stub element', () => {
	// Load just the pure helper without Electron by stubbing require.
	const mod = { exports: {} };
	const stubRequire = (name) => {
		if (name === 'electron') return { ipcRenderer: { on() {}, sendToHost() {} } };
		throw new Error('unexpected require ' + name);
	};
	const fn = new Function('module', 'require', src + '\nmodule.exports = { buildPayload };');
	fn(mod, stubRequire);
	const el = {
		tagName: 'H1',
		getAttribute: (k) => (k === 'data-enos-source' ? 'src/Squad.tsx:42' : null),
		textContent: '  Esteemed Kompany  ',
		getBoundingClientRect: () => ({ width: 528, height: 17 }),
		className: 'team-name',
		id: ''
	};
	const loc = { href: 'http://localhost:5180/' };
	const p = mod.exports.buildPayload(el, loc, (_e) => ({
		color: 'rgb(30, 25, 20)',
		fontSize: '15px',
		fontFamily: 'Inter'
	}));
	assert.equal(p.tag, 'h1');
	assert.equal(p.text, 'Esteemed Kompany');
	assert.equal(p.source, 'src/Squad.tsx:42');
	assert.equal(p.rect.w, 528);
	assert.equal(p.url, 'http://localhost:5180/');
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
cd apps/enos-desktop
node --test test/webview-annotate.test.mjs
```

Expected: FAIL — cannot read `src/webview-annotate.js`

- [ ] **Step 3: Create the preload**

```javascript
// apps/enos-desktop/src/webview-annotate.js
// Guest preload injected into Desk's <webview>. Renders a devtools-style
// element picker inside the page and posts the selected element to the host.
const { ipcRenderer } = require('electron');

const Z = 2147483647;
const cssSelector = (el) => {
	try {
		if (el.id) return `${el.tagName.toLowerCase()}#${el.id}`;
		const cls = (el.className || '').toString().trim().split(/\s+/).filter(Boolean).slice(0, 2);
		return el.tagName.toLowerCase() + (cls.length ? '.' + cls.join('.') : '');
	} catch {
		return (el && el.tagName ? el.tagName.toLowerCase() : 'element');
	}
};

// Pure, testable. `getStyles` is injected so tests need no real DOM/CSSOM.
function buildPayload(el, loc, getStyles) {
	const cs = getStyles(el);
	const r = el.getBoundingClientRect();
	const raw = (el.textContent || '').trim().replace(/\s+/g, ' ');
	return {
		source: el.getAttribute('data-enos-source') || null,
		tag: el.tagName.toLowerCase(),
		selector: cssSelector(el),
		text: raw.slice(0, 200),
		styles: { color: cs.color, fontSize: cs.fontSize, fontFamily: cs.fontFamily },
		rect: { w: Math.round(r.width), h: Math.round(r.height) },
		url: loc.href,
		note: ''
	};
}

(function attach() {
	let active = false;
	let hovered = null;
	let highlight = null;
	let tip = null;

	const ensureOverlay = () => {
		if (highlight) return;
		highlight = document.createElement('div');
		highlight.style.cssText = `position:fixed;pointer-events:none;z-index:${Z};border:2px solid #2563eb;background:rgba(37,99,235,0.08);border-radius:2px;transition:all 40ms;`;
		tip = document.createElement('div');
		tip.style.cssText = `position:fixed;pointer-events:none;z-index:${Z};font:11px/1.4 ui-monospace,monospace;background:#111;color:#eee;padding:4px 6px;border-radius:4px;white-space:nowrap;`;
		document.body.appendChild(highlight);
		document.body.appendChild(tip);
	};
	const removeOverlay = () => {
		highlight?.remove();
		tip?.remove();
		highlight = null;
		tip = null;
		hovered = null;
	};

	const getStyles = (el) => {
		const cs = window.getComputedStyle(el);
		return { color: cs.color, fontSize: cs.fontSize, fontFamily: cs.fontFamily.split(',')[0].replace(/["']/g, '') };
	};

	const paint = (el) => {
		ensureOverlay();
		const r = el.getBoundingClientRect();
		highlight.style.left = `${r.left}px`;
		highlight.style.top = `${r.top}px`;
		highlight.style.width = `${r.width}px`;
		highlight.style.height = `${r.height}px`;
		const cs = getStyles(el);
		tip.textContent = `${el.tagName.toLowerCase()}  ${Math.round(r.width)}×${Math.round(r.height)}  ${cs.fontSize} ${cs.color}`;
		tip.style.left = `${r.left}px`;
		tip.style.top = `${Math.max(0, r.top - 24)}px`;
	};

	const onMove = (e) => {
		if (!active) return;
		const el = document.elementFromPoint(e.clientX, e.clientY);
		if (!el || el === hovered) return;
		hovered = el;
		paint(el);
	};

	const onClick = (e) => {
		if (!active) return;
		e.preventDefault();
		e.stopPropagation();
		const el = document.elementFromPoint(e.clientX, e.clientY);
		if (!el) return;
		ipcRenderer.sendToHost('enos:annotation', buildPayload(el, window.location, getStyles));
	};

	const setActive = (on) => {
		active = !!on;
		document.documentElement.style.cursor = active ? 'crosshair' : '';
		if (!active) removeOverlay();
	};

	window.addEventListener('mousemove', onMove, true);
	window.addEventListener('click', onClick, true);
	ipcRenderer.on('enos:annotate-mode', (_e, on) => setActive(on));
})();

// Exported for unit tests (no-op at runtime in the preload context).
if (typeof module !== 'undefined') module.exports = { buildPayload, cssSelector };
```

- [ ] **Step 4: Run test to confirm it passes**

```
node --test test/webview-annotate.test.mjs
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/enos-desktop/src/webview-annotate.js apps/enos-desktop/test/webview-annotate.test.mjs
git commit -m "feat(annotate): guest webview preload picker + buildPayload"
```

---

### Task 4: Attach guest preload via will-attach-webview (enos-desktop)

**Files:**
- Modify: `apps/enos-desktop/src/main.mjs`

**Interfaces:**
- Consumes: `src/webview-annotate.js` (Task 3) by absolute path.
- Produces: every `<webview>` in the main window loads `webview-annotate.js` as its preload.

> Context: the main window is created around `main.mjs:882` with `webPreferences.preload` and `webviewTag:true`. `__dirname` is already available in this module (it is used for the window preload path `path.join(__dirname, "preload.mjs")`).

- [ ] **Step 1: Write the failing static-analysis test**

```javascript
// append to apps/enos-desktop/test/webview-annotate.test.mjs
import { readFileSync as _read } from 'node:fs';
const mainSrc = _read('src/main.mjs', 'utf8');

test('main wires will-attach-webview', () => {
	assert.match(mainSrc, /will-attach-webview/);
});

test('main attaches the webview-annotate preload', () => {
	assert.match(mainSrc, /webview-annotate\.js/);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
node --test test/webview-annotate.test.mjs
```

Expected: the 2 new tests FAIL (no `will-attach-webview` in main.mjs)

- [ ] **Step 3: Add the handler in main.mjs**

Find the line that creates the main window: `mainWindow = new BrowserWindow(winOptions);` (around line 904). Immediately AFTER it, add:

```javascript
  // Attach the annotation picker preload to every <webview> guest. Electron
  // requires preload paths as file:// URLs here. Selecting an element posts
  // `enos:annotation` to the host renderer via ipcRenderer.sendToHost.
  mainWindow.webContents.on("will-attach-webview", (_event, webPreferences) => {
    webPreferences.preload = pathToFileURL(
      path.join(__dirname, "webview-annotate.js")
    ).href;
    webPreferences.contextIsolation = false;
  });
```

Then ensure `pathToFileURL` is imported. Find the existing `url` import near the top of `main.mjs`. If `import { pathToFileURL } from "node:url";` is not present, add it after the `electron` import line (line 1):

```javascript
import { pathToFileURL } from "node:url";
```

> Why `contextIsolation:false` on the guest: the preload uses `require('electron')` + shares the page DOM directly, which is the simplest reliable picker. The guest still has no `nodeIntegration` in the page itself. This is scoped to the webview guest only, not the host window.

- [ ] **Step 4: Run test to confirm it passes**

```
node --test test/webview-annotate.test.mjs
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/enos-desktop/src/main.mjs apps/enos-desktop/test/webview-annotate.test.mjs
git commit -m "feat(annotate): attach guest preload via will-attach-webview"
```

---

### Task 5: BrowserView Annotate toggle + ipc-message listener (enos-webui)

**Files:**
- Modify: `enos-webui_link/src/lib/components/enos/BrowserView.svelte`

**Interfaces:**
- Consumes: `addAnnotation` from `$lib/stores/annotations`; `type Annotation` from `$lib/enos/annotation`.
- Produces: an Annotate toggle button in the toolbar; `⌘.` keyboard shortcut; on `ipc-message` channel `enos:annotation`, builds an `Annotation` (assigning `id = crypto.randomUUID()`) and calls `addAnnotation`.

> Context: `BrowserView.svelte` already has `webviewEl` bound (the `<webview>` element) and a `webviewListeners` action attaching nav/find listeners (around lines 93–123). Add the annotate wiring to that same action and a toolbar button next to the 3-dots menu (around line 182).

- [ ] **Step 1: Write the static-analysis test (new file)**

```javascript
// enos-webui_link/test/enos-browser-annotation.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const bv = readFileSync('src/lib/components/enos/BrowserView.svelte', 'utf8');

test('BrowserView imports addAnnotation', () => {
	assert.match(bv, /addAnnotation/);
});
test('BrowserView toggles annotate mode via webview.send', () => {
	assert.match(bv, /send\(\s*['"]enos:annotate-mode['"]/);
});
test('BrowserView listens for ipc-message', () => {
	assert.match(bv, /ipc-message/);
});
test('BrowserView binds the annotate shortcut', () => {
	assert.match(bv, /key === '\.'|metaKey/);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
cd enos-webui_link
node --test test/enos-browser-annotation.test.mjs
```

Expected: 4 FAIL

- [ ] **Step 3: Add imports + state to the `<script>`**

After the existing imports (around line 6) add:

```typescript
	import { addAnnotation } from '$lib/stores/annotations';
	import type { Annotation } from '$lib/enos/annotation';
```

After the existing `let loading = false;` declaration (around line 17) add:

```typescript
	let annotating = false;
```

- [ ] **Step 4: Add the toggle + key handler functions**

After the `forward` function (around line 43) add:

```typescript
	const setAnnotate = (on: boolean) => {
		annotating = on;
		webviewEl?.send?.('enos:annotate-mode', on);
	};
	const toggleAnnotate = () => setAnnotate(!annotating);
	const onAnnotateKey = (e: KeyboardEvent) => {
		if ((e.metaKey || e.ctrlKey) && e.key === '.') {
			e.preventDefault();
			toggleAnnotate();
		}
	};
```

- [ ] **Step 5: Receive annotations in the webview action**

Inside `webviewListeners` (the action starting around line 93), after the existing `node.addEventListener('found-in-page', onFound);` line, add:

```typescript
		const onIpc = (e: any) => {
			if (e.channel !== 'enos:annotation') return;
			const p = e.args?.[0];
			if (!p) return;
			const annotation: Annotation = { id: crypto.randomUUID(), ...p };
			addAnnotation(annotation);
		};
		node.addEventListener('ipc-message', onIpc);
```

And in the same action's `destroy()` cleanup, after `node.removeEventListener('found-in-page', onFound);` add:

```typescript
			node.removeEventListener('ipc-message', onIpc);
```

- [ ] **Step 6: Bind the global key listener**

Add to the markup (anywhere at the top level of the template, e.g. just before the `{#if showMenu}` overlay near line 130):

```svelte
<svelte:window on:keydown={onAnnotateKey} />
```

- [ ] **Step 7: Add the toolbar toggle button**

Find the 3-dots menu button block (around line 182, the `<div class="relative">`). Immediately BEFORE that `<div class="relative">`, add:

```svelte
		<button
			type="button"
			class="px-2 py-1 rounded-md text-xs font-medium transition {annotating
				? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
				: 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}"
			on:click={toggleAnnotate}
			title="Annotate (⌘.)"
		>
			{annotating ? 'Annotating' : 'Annotate'}
		</button>
```

- [ ] **Step 8: Run static-analysis test to confirm it passes**

```
node --test test/enos-browser-annotation.test.mjs
```

Expected: 4 tests PASS

- [ ] **Step 9: Commit**

```bash
git add enos-webui_link/src/lib/components/enos/BrowserView.svelte enos-webui_link/test/enos-browser-annotation.test.mjs
git commit -m "feat(annotate): BrowserView toggle + ipc-message → store"
```

---

### Task 6: MessageInput annotation chip + serialize-on-submit (enos-webui)

**Files:**
- Modify: `enos-webui_link/src/lib/components/chat/MessageInput.svelte`

**Interfaces:**
- Consumes: `pendingAnnotations`, `removeAnnotation`, `clearAnnotations` from `$lib/stores/annotations`; `serializeAnnotations` from `$lib/enos/annotation`.
- Produces: a chip showing `{N} annotation(s)` above the textarea when the store is non-empty; on submit, the prompt dispatched is `serializeAnnotations($pendingAnnotations, prompt)` and the store is cleared.

> Context: `MessageInput.svelte` renders attachment chips in the `{#if files.length > 0}` block (around line 1315) and submits via `dispatch('submit', prompt)` at two sites (around lines 1238 and 1247). `prompt` is the draft (`export let prompt`). Use the auto-subscribed `$pendingAnnotations`.

- [ ] **Step 1: Add the static-analysis test (append to existing file)**

```javascript
// append to enos-webui_link/test/enos-browser-annotation.test.mjs
const mi = readFileSync('src/lib/components/chat/MessageInput.svelte', 'utf8');

test('MessageInput imports pendingAnnotations', () => {
	assert.match(mi, /pendingAnnotations/);
});
test('MessageInput serializes annotations on submit', () => {
	assert.match(mi, /serializeAnnotations\(/);
});
test('MessageInput clears annotations after submit', () => {
	assert.match(mi, /clearAnnotations\(\)/);
});
test('MessageInput shows an annotation chip', () => {
	assert.match(mi, /\$pendingAnnotations\.length/);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
node --test test/enos-browser-annotation.test.mjs
```

Expected: the 4 new tests FAIL

- [ ] **Step 3: Add imports**

After the last existing import in the `<script>` (use the InputMenu/FileItem import region around lines 68–73), add:

```typescript
	import {
		pendingAnnotations,
		removeAnnotation,
		clearAnnotations
	} from '$lib/stores/annotations';
	import { serializeAnnotations } from '$lib/enos/annotation';
```

- [ ] **Step 4: Add a submit helper that folds in annotations**

Near the other handler functions (top of the `<script>` is fine), add:

```typescript
	const submitWithAnnotations = () => {
		const merged = serializeAnnotations($pendingAnnotations, prompt);
		clearAnnotations();
		dispatch('submit', merged);
	};
```

- [ ] **Step 5: Route both submit sites through the helper**

There are two `dispatch('submit', prompt);` calls (around lines 1238 and 1247). Replace BOTH occurrences of:

```typescript
									dispatch('submit', prompt);
```

with:

```typescript
									submitWithAnnotations();
```

(The indentation differs slightly between the two sites — match each site's existing indentation; the call text is the same.)

- [ ] **Step 6: Add the annotation chip above the files block**

Immediately BEFORE the `{#if files.length > 0}` block (around line 1315), add:

```svelte
								{#if $pendingAnnotations.length > 0}
									<div class="mx-2 mt-2.5 flex items-center flex-wrap gap-2">
										{#each $pendingAnnotations as a (a.id)}
											<div
												class="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
												title={a.source ?? a.selector}
											>
												<svg viewBox="0 0 16 16" fill="currentColor" class="size-3.5">
													<path d="M2.5 3A1.5 1.5 0 0 1 4 1.5h8A1.5 1.5 0 0 1 13.5 3v6A1.5 1.5 0 0 1 12 10.5H6.7l-2.9 2.4A.5.5 0 0 1 3 12.5V10.5A1.5 1.5 0 0 1 2.5 9V3Z" />
												</svg>
												<span>{a.selector}</span>
												<button
													type="button"
													class="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-500/25"
													on:click={() => removeAnnotation(a.id)}
													title="Remove annotation"
												>
													<svg viewBox="0 0 20 20" fill="currentColor" class="size-3">
														<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
													</svg>
												</button>
											</div>
										{/each}
									</div>
								{/if}
```

- [ ] **Step 7: Run static-analysis test to confirm it passes**

```
node --test test/enos-browser-annotation.test.mjs
```

Expected: all 8 tests PASS (4 from Task 5 + 4 here)

- [ ] **Step 8: Run the frontend suite to confirm nothing regressed**

```
npm run test:frontend -- --run src/lib/enos/annotation.test.ts src/lib/stores/annotations.test.ts
```

Expected: all PASS

- [ ] **Step 9: Commit**

```bash
git add enos-webui_link/src/lib/components/chat/MessageInput.svelte enos-webui_link/test/enos-browser-annotation.test.mjs
git commit -m "feat(annotate): MessageInput annotation chip + serialize-on-submit"
```

---

## Self-Review

**Spec coverage:**
- Toggle Annotate mode (button + ⌘.): Task 5 ✓
- Devtools picker overlay + inspector inside guest: Task 3 ✓
- Reliable guest→host channel (sendToHost / ipc-message): Tasks 3, 4, 5 ✓
- Reads `data-enos-source` if present, else null (no fabrication): Task 3 `buildPayload` ✓
- Annotation attaches as chip on chat input, count grows, removable: Task 6 ✓
- One send dispatches all annotations + follow-up text, prepended, never auto-submit: Task 6 ✓
- No new deps: all tasks use stdlib / existing svelte/electron ✓
- Slice 2 (stamping plugin) explicitly deferred ✓

**Placeholder scan:** none — every code step shows complete code.

**Type consistency:**
- `Annotation` shape identical in `annotation.ts` (Task 1), store (Task 2), preload payload (Task 3, minus `id`), BrowserView `id` assignment (Task 5). Host assigns `id`; preload omits it. ✓
- `serializeAnnotations(list, draft)` defined Task 1, called Task 6. ✓
- `addAnnotation` / `removeAnnotation` / `clearAnnotations` defined Task 2, used Tasks 5/6. ✓
- Channels `enos:annotate-mode` (host→guest) and `enos:annotation` (guest→host) consistent across Tasks 3/4/5. ✓

**Cross-repo note:** Tasks 3–4 run in `apps/enos-desktop` (commands `cd apps/enos-desktop`); Tasks 1–2, 5–6 in `enos-webui_link`. Commits use repo-relative `git add` paths from each repo root.

**Deferred (not in Slice 1):**
- `data-enos-source` Vite/Babel stamping plugin on user dev apps (Slice 2).
- Inline per-element note pill ("can you make this bigger?" captured at pick time) — Slice 3; `note` field exists in the contract and serializer already, defaults to `''`.
- Multi-annotation edit, non-instrumented-page fallback messaging — Slice 3.
- Rebuild + redeploy of the desktop app and webui bundle — done once after Slice 1 review.

