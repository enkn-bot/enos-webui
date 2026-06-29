<!-- src/lib/components/enos/DeskDock.svelte -->
<script lang="ts">
	import { getContext } from 'svelte';
	import { flip } from 'svelte/animate';
	import {
		addTab,
		activateTab,
		closeTab,
		emptyDockState,
		loadDockState,
		reorderTabs,
		saveDockState,
		setTabUrl,
		type DeskDockState,
		type DeskDockTabType
	} from '$lib/enos/tabDock';
	import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';

	import XTerminal from '$lib/components/chat/XTerminal.svelte';
	import LocalTerminal from './LocalTerminal.svelte';
	import BrowserView from './BrowserView.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';
	import { selectedFolder } from '$lib/stores';

	const i18n = getContext('i18n');

	export let folderId: string | null = null;
	export let chatId: string | null = null;

	let state: DeskDockState = emptyDockState();
	let showPicker = false;
	let lastFolderId: string | null | undefined = undefined;

	$: hasBrowser = Boolean(getEnosDesktopBridge());

	// Local projects get a real local shell (LocalTerminal); cloud/configured
	// projects keep the WebSocket-based XTerminal.
	$: isLocalProject =
		hasBrowser && $selectedFolder?.data?.project_context_source?.kind === 'local';

	// Load persisted state when the active project changes. Loose chats
	// (folderId null) keep an in-memory dock that is never persisted.
	$: if (folderId !== lastFolderId) {
		lastFolderId = folderId;
		state =
			folderId && typeof localStorage !== 'undefined'
				? loadDockState(localStorage, folderId)
				: emptyDockState();
		showPicker = state.tabs.length === 0;
	}

	const persist = () => {
		if (folderId && typeof localStorage !== 'undefined') {
			saveDockState(localStorage, folderId, state);
		}
	};

	const open = (type: DeskDockTabType) => {
		state = addTab(state, type);
		showPicker = false;
		persist();
	};

	const select = (id: string) => {
		state = activateTab(state, id);
		showPicker = false;
		persist();
	};

	const close = (id: string) => {
		state = closeTab(state, id);
		if (state.tabs.length === 0) showPicker = true;
		persist();
	};

	const onBrowserUrl = (id: string, url: string) => {
		state = setTabUrl(state, id, url);
		persist();
	};

	const tabLabel = (type: DeskDockTabType) =>
		type === 'terminal' ? 'Terminal' : type === 'browser' ? 'Browser' : 'Files';

	$: activeTab = state.tabs.find((t) => t.id === state.activeId) ?? null;

	// Pointer-based tab reorder (NOT HTML5 drag-and-drop, which forces a flat
	// ghost image without the tab's rounded corners). The real tab element
	// translates with the pointer, keeping its full styling; neighbours slide
	// out of the way via animate:flip as the pointer crosses their centres. This
	// is the "tabs make way for each other" feel rather than a swap-on-drop.
	const GAP_PX = 4; // matches gap-1 (0.25rem) between tabs

	let tabEls: Record<string, HTMLElement> = {};
	let dragId: string | null = null;
	let dragDx = 0; // live translateX of the grabbed tab
	let dragBaseX = 0; // pointer X that maps to dragDx === 0 (compensated on each swap)
	let dragStarted = false; // crossed the move threshold → a drag, not a click
	let dragPointerId = -1;
	let dragCandidateId: string | null = null;
	let dragCandidateX = 0;

	const registerTabEl = (node: HTMLElement, id: string) => {
		tabEls[id] = node;
		return {
			update(newId: string) {
				delete tabEls[id];
				id = newId;
				tabEls[id] = node;
			},
			destroy() {
				if (tabEls[id] === node) delete tabEls[id];
			}
		};
	};

	const centerX = (el: HTMLElement) => {
		const r = el.getBoundingClientRect();
		return r.left + r.width / 2;
	};

	// Skip the flip animation for the grabbed tab (we drive it via translateX);
	// animate everyone else so they slide into the vacated slot.
	const smartFlip = (node: Element, anim: any, params: any) => {
		if ((node as HTMLElement).dataset.tabId === dragId) return { duration: 0 };
		return flip(node as HTMLElement, anim, params);
	};

	const onTabPointerDown = (e: PointerEvent, id: string) => {
		if (!e.isPrimary || e.button !== 0) return;
		dragCandidateId = id;
		dragCandidateX = e.clientX;
		dragPointerId = e.pointerId;
		dragStarted = false;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	};

	const onTabPointerMove = (e: PointerEvent) => {
		if (dragCandidateId === null || e.pointerId !== dragPointerId) return;
		if (!dragStarted) {
			if (Math.abs(e.clientX - dragCandidateX) < 4) return; // still a click
			dragStarted = true;
			dragId = dragCandidateId;
			dragBaseX = e.clientX;
		}
		dragDx = e.clientX - dragBaseX;

		const i = state.tabs.findIndex((t) => t.id === dragId);
		if (i < 0) return;
		const right = state.tabs[i + 1];
		const left = state.tabs[i - 1];
		if (right && tabEls[right.id] && e.clientX > centerX(tabEls[right.id])) {
			const shift = tabEls[right.id].getBoundingClientRect().width + GAP_PX;
			state = reorderTabs(state, dragId!, right.id);
			dragBaseX += shift; // compensate so the grabbed tab stays under the pointer
			dragDx = e.clientX - dragBaseX;
		} else if (left && tabEls[left.id] && e.clientX < centerX(tabEls[left.id])) {
			const shift = tabEls[left.id].getBoundingClientRect().width + GAP_PX;
			state = reorderTabs(state, dragId!, left.id);
			dragBaseX -= shift;
			dragDx = e.clientX - dragBaseX;
		}
	};

	const endPointerDrag = (e: PointerEvent) => {
		if (e.pointerId !== dragPointerId) return;
		try {
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
			// capture already released
		}
		if (dragStarted && dragId) {
			persist();
		} else if (dragCandidateId !== null) {
			select(dragCandidateId); // a tap, not a drag → activate the tab
		}
		dragId = null;
		dragDx = 0;
		dragStarted = false;
		dragCandidateId = null;
		dragPointerId = -1;
	};
</script>

<div class="flex flex-col h-full min-h-0">
	<!-- Tab strip -->
	<div class="flex items-center gap-1 px-2 pt-2 pb-2 shrink-0">
		<div class="flex gap-1 min-w-0 scrollbar-hidden" style:overflow-x={dragId ? 'clip' : 'auto'}>
			{#each state.tabs as tab (tab.id)}
				<div
					use:registerTabEl={tab.id}
					data-tab-id={tab.id}
					role="tab"
					aria-selected={tab.id === state.activeId}
					animate:smartFlip={{ duration: 180 }}
					on:pointerdown={(e) => onTabPointerDown(e, tab.id)}
					on:pointermove={onTabPointerMove}
					on:pointerup={endPointerDrag}
					on:pointercancel={endPointerDrag}
					style={dragId === tab.id
						? `transform: translateX(${dragDx}px) scale(1.03); z-index: 20; box-shadow: 0 8px 20px rgba(0,0,0,0.18); position: relative;`
						: ''}
					class="flex items-center gap-1 pl-2.5 pr-1 py-1 text-sm rounded-lg whitespace-nowrap select-none touch-none cursor-grab active:cursor-grabbing
						{tab.id === state.activeId
						? 'bg-gray-100 dark:bg-gray-800 font-medium text-gray-900 dark:text-white'
						: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}"
				>
					<span>{$i18n.t(tabLabel(tab.type))}</span>
					<button
						type="button"
						class="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
						on:pointerdown|stopPropagation
						on:click|stopPropagation={() => close(tab.id)}
						aria-label={$i18n.t('Close')}
					>
						<XMark className="size-3.5" />
					</button>
				</div>
			{/each}
		</div>
		<button
			type="button"
			class="p-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
			on:click={() => (showPicker = !showPicker)}
			aria-label={$i18n.t('New tab')}
		>
			<Plus className="size-4" />
		</button>
	</div>

	<!-- Body -->
	<div class="flex-1 min-h-0 relative">
		{#if showPicker || !activeTab}
			<div class="h-full flex flex-col items-center justify-center gap-2 px-6">
				<div class="w-full max-w-xs flex flex-col gap-2">
					<button
						type="button"
						class="flex items-center gap-3 rounded-xl bg-gray-100 dark:bg-gray-850 px-4 py-3 text-left hover:bg-gray-200/70 dark:hover:bg-gray-800"
						on:click={() => open('terminal')}
					>
						<span class="text-sm font-medium">{$i18n.t('Terminal')}</span>
					</button>
					{#if hasBrowser}
						<button
							type="button"
							class="flex items-center gap-3 rounded-xl bg-gray-100 dark:bg-gray-850 px-4 py-3 text-left hover:bg-gray-200/70 dark:hover:bg-gray-800"
							on:click={() => open('browser')}
						>
							<span class="text-sm font-medium">{$i18n.t('Browser')}</span>
						</button>
					{/if}
					<button
						type="button"
						class="flex items-center gap-3 rounded-xl bg-gray-100 dark:bg-gray-850 px-4 py-3 text-left hover:bg-gray-200/70 dark:hover:bg-gray-800"
						on:click={() => open('files')}
					>
						<span class="text-sm font-medium">{$i18n.t('Files')}</span>
					</button>
				</div>
			</div>
		{/if}

		<!-- Keep each opened tab body mounted so terminal/browser state survives
		     tab switches; toggle visibility rather than destroying. -->
		{#each state.tabs as tab (tab.id)}
			<div
				class="absolute inset-0 {tab.id === state.activeId && !showPicker ? '' : 'hidden'}"
			>
				{#if tab.type === 'terminal'}
					{#if isLocalProject}
						<LocalTerminal folderId={$selectedFolder?.id ?? null} />
					{:else}
						<XTerminal {chatId} />
					{/if}
				{:else if tab.type === 'browser'}
					{#if hasBrowser}
						<BrowserView url={tab.url ?? null} onUrlChange={(u) => onBrowserUrl(tab.id, u)} />
					{:else}
						<div class="h-full flex items-center justify-center px-6 text-center text-sm text-gray-500 dark:text-gray-400">
							{$i18n.t('The browser is only available in the ENOS desktop app.')}
						</div>
					{/if}
				{:else if tab.type === 'files'}
					<slot name="files" />
				{/if}
			</div>
		{/each}
	</div>
</div>
