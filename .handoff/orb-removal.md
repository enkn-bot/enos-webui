# Handoff: Skeleton orb removal → base pulsing dot

**Date:** 2026-06-23  
**Session branch (enos-webui):** `m13-electron-desktop-bridge`  
**Session branch (enos):** `m21-surface-ux-bugfixes`

---

## Objective

Remove `EnosOrb` from `Skeleton.svelte` and revert to base v0.9.6's clean animated pulsing dot.

User instruction: _"take our orbs so we have clean and work strictly from base, add shimmer to 'active' -ing states... don't want to over engineer, want this clean and improvement to base."_

---

## Current status

**Pending — not started.** Ground-truth investigation is complete; implementation not yet done.

---

## Completed this session (enos-webui branch HEAD = a9c992943)

- Bug A (web punt): graceful degrade note injected via `__features__` kwarg in pipe — deployed
- Bug B standard path: title gate fix `!_chatId` → `parentId === null` — deployed
- Bug B desk path: desk loop auto-title + `enos:folder-chats-changed` dispatch — deployed
- Snappy rename: `RecursiveFolder.svelte` listens for `enos:folder-chats-changed` — deployed
- Bug C: Full-Access write schemas opened in `deskFileTools.ts` — deployed
- Caddy no-cache: shell `Cache-Control: no-cache` on all 3 surfaces — deployed

All changes committed and pushed to `origin/m13-electron-desktop-bridge`.

---

## Files to change (ONE file, enos-webui)

**`src/lib/components/chat/Messages/Skeleton.svelte`** — replace EnosOrb with base pulsing dot.

### Current content (ENOS-modified)

```svelte
<script lang="ts">
	import EnosOrb from '$lib/components/common/EnosOrb.svelte';

	export let size = 'md';
	export let modelId: string | null | undefined = null;
</script>

<span
	class="relative flex items-center {size === 'md'
		? 'size-9 my-1'
		: size === 'xs'
			? 'size-6'
			: 'size-7'} -mx-1.5"
>
	<EnosOrb {modelId} className={size === 'md' ? 'size-9' : size === 'xs' ? 'size-6' : 'size-7'} />
</span>
```

### Target content (base v0.9.6 — verified from upstream)

```svelte
<script lang="ts">
	export let size = 'md';
</script>

<span
	class="relative flex {size === 'md'
		? 'size-3 my-2'
		: size === 'xs'
			? 'size-1.5 my-1'
			: 'size-2 my-1'} mx-1"
>
	<span
		class="absolute inline-flex h-full w-full animate-pulse rounded-full bg-gray-700 dark:bg-gray-200 opacity-75"
	></span>
	<span
		class="relative inline-flex {size === 'md'
			? 'size-3'
			: size === 'xs'
				? 'size-1.5'
				: 'size-2'} rounded-full bg-black dark:bg-white animate-size"
	></span>
</span>

<style>
	@keyframes size {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.25);
		}
	}
	.animate-size {
		animation: size 1.5s ease-in-out infinite;
	}
</style>
```

**Do NOT remove `EnosOrb.svelte` itself** — it's used elsewhere (e.g. sidebar, header). Only Skeleton.svelte changes.

---

## Why this is the right fix

1. `ResponseMessage.svelte:841` guard: `{#if message.content === '' && !message.done && !message.error && !hasVisibleStatus}<Skeleton />` — already base-aligned; Thinking... shimmer already gone.
2. `StatusItem.svelte:28-29`: already applies CSS class `shimmer` when `done === false` — active -ing states shimmer natively in base; no new system needed.
3. The only competing element is `Skeleton.svelte` rendering `EnosOrb` instead of the base pulsing dot. Removing it:
   - Eliminates the orb visual noise during thinking/loading
   - Returns to base animation (clean, upstream-compatible)
   - Invents nothing new

---

## Deploy sequence (after edit)

```bash
# In /Users/ernestnyarko/Documents/Cursor/workspace/Files/enos-webui
npm run build
rsync -av --delete build/ ubuntu@40.233.121.41:/home/ubuntu/open-webui/build/
ssh ubuntu@40.233.121.41 "docker restart open-webui"
```

Then verify on VM that thinking state shows pulsing dot, not orb.

**WAIT for user to say "deploy" before running rsync/restart.**

---

## Important invariants

- OWUI identity NEVER leaks (no "Open WebUI" visible in UI/bundle)
- Deploy = user must say "deploy" explicitly
- Commit/push = user must ask explicitly
- Additive only — don't nerf base features, don't remove EnosOrb.svelte (used elsewhere)
- Caveman mode + codex:rescue in effect

---

## Do not

- Remove `EnosOrb.svelte` or touch other callers of it
- Add any new animation system or shimmer logic — StatusItem already handles it
- Merge into main (main is unrelated Ariana history per MVP freeze invariant)
- Push without being asked
