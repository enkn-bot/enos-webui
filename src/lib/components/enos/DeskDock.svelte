<!-- src/lib/components/enos/DeskDock.svelte -->
<script lang="ts">
	import { getContext, tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import type { Readable } from 'svelte/store';
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
	import {
		clearRecentActivityShared,
		formatRelativeTime,
		recentActivityStore,
		removeRecentActivityShared,
		type RecentActivityItem
	} from '$lib/enos/recentActivity';
	import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';

	import XTerminal from '$lib/components/chat/XTerminal.svelte';
	import LocalTerminal from './LocalTerminal.svelte';
	import BrowserView from './BrowserView.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';
	import GlobeAlt from '$lib/components/icons/GlobeAlt.svelte';
	import Document from '$lib/components/icons/Document.svelte';
	import Terminal from '$lib/components/icons/Terminal.svelte';
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
	import EllipsisHorizontal from '$lib/components/icons/EllipsisHorizontal.svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import { selectedFolder, selectedTerminalId } from '$lib/stores';

	type I18nStore = Readable<{ t: (key: string, options?: Record<string, unknown>) => string }>;

	const i18n = getContext<I18nStore>('i18n');

	export let folderId: string | null = null;
	export let chatId: string | null = null;
	// Set only by the mobile full-screen drawer (ChatControls, !largeScreen) — the
	// drawer's own backdrop-click-to-dismiss is unreachable once this panel's content
	// fills the screen edge-to-edge, so that caller must give us an explicit way back.
	// Desktop's PaneResizer usage leaves this undefined: the header's panel toggle is
	// always reachable there, and this button would be redundant chrome.
	export let onClose: (() => void) | undefined = undefined;
	export let openType: DeskDockTabType | null = null;
	export let openToken = 0;
	export let openUrl: string | null = null;
	export let openUrlToken = 0;
	// Recent-file rows only carry a path (project-relative) — actually reopening the
	// file lives in LocalFileNav, a sibling slotted INTO this component by the caller
	// (ChatControls), not a child we can reach directly. So a click here just switches
	// to the Files tab and bubbles the item up for the caller to feed into its own
	// LocalFileNav via `openPath`/`openToken`.
	export let onOpenFile: ((item: RecentActivityItem) => void) | undefined = undefined;

	let state: DeskDockState = emptyDockState();
	let showPicker = false;
	let showDropdown = false;
	let openSectionExpanded = true;
	let openMenuItemId: string | null = null;
	let lastFolderId: string | null | undefined = undefined;
	let lastOpenToken = 0;
	let lastOpenUrlToken = 0;
	let addTabButtonEl: HTMLButtonElement | null = null;
	let addTabMenuStyle = '';

	$: hasBrowser = Boolean(getEnosDesktopBridge());

	// Desktop Local mode has a real local shell even when older folder rows lack
	// project_context_source.kind='local'. A selected terminal id means the user is
	// intentionally using a cloud/configured terminal instead.
	$: usesLocalTerminal = hasBrowser && !$selectedTerminalId;

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

	// Live-reactive Recent feed: a shared store (keyed by folderId) so a push from a
	// sibling component (ChatControls, on file preview) is reflected here without
	// needing this component to remount. See recentActivity.ts's module comment.
	$: recentItemsStore =
		folderId && typeof localStorage !== 'undefined'
			? recentActivityStore(localStorage, folderId)
			: null;
	$: recentItems = $recentItemsStore ?? [];

	const persist = () => {
		if (folderId && typeof localStorage !== 'undefined') {
			saveDockState(localStorage, folderId, state);
		}
	};

	const open = (type: DeskDockTabType) => {
		state = addTab(state, type);
		showPicker = false;
		showDropdown = false;
		persist();
	};

	const openBrowserUrl = (url: string) => {
		let next = addTab(state, 'browser');
		const browserTab = next.tabs.find((t) => t.type === 'browser');
		if (browserTab) {
			next = setTabUrl(next, browserTab.id, url);
		}
		state = next;
		showPicker = false;
		showDropdown = false;
		persist();
	};

	const positionAddTabMenu = () => {
		if (typeof window === 'undefined' || !addTabButtonEl) return;
		const rect = addTabButtonEl.getBoundingClientRect();
		const width = 160;
		const margin = 8;
		const left = Math.min(Math.max(margin, rect.right - width), window.innerWidth - width - margin);
		const top = Math.min(rect.bottom + 4, window.innerHeight - margin);
		addTabMenuStyle = `position:fixed;left:${left}px;top:${top}px;width:${width}px;`;
	};

	const toggleAddTabMenu = async () => {
		showDropdown = !showDropdown;
		if (showDropdown) {
			positionAddTabMenu();
			await tick();
			positionAddTabMenu();
		}
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

	const onRemoveRecent = (id: string) => {
		if (!folderId || typeof localStorage === 'undefined') return;
		removeRecentActivityShared(localStorage, folderId, id);
		openMenuItemId = null;
	};

	const onClearRecent = () => {
		if (!folderId || typeof localStorage === 'undefined') return;
		clearRecentActivityShared(localStorage, folderId);
	};

	const onRecentItemClick = (item: RecentActivityItem) => {
		open('files');
		onOpenFile?.(item);
	};

	const tabLabel = (type: DeskDockTabType) =>
		type === 'terminal' ? 'Terminal' : type === 'browser' ? 'Browser' : 'Files';

	const repairActiveTabState = () => {
		if (state.tabs.length === 0) return;
		const nextActiveId = activeTab?.id ?? state.tabs[state.tabs.length - 1]?.id ?? null;
		if (!nextActiveId) return;
		if (state.activeId !== nextActiveId) {
			state = { ...state, activeId: nextActiveId };
		}
		showPicker = false;
		persist();
	};

	$: activeTab = state.tabs.find((t) => t.id === state.activeId) ?? null;
	$: if (state.tabs.length > 0 && (showPicker || !activeTab)) {
		repairActiveTabState();
	}
	$: if (openToken !== lastOpenToken && openType) {
		lastOpenToken = openToken;
		open(openType);
	}
	$: if (openUrlToken !== lastOpenUrlToken && openUrl) {
		lastOpenUrlToken = openUrlToken;
		openBrowserUrl(openUrl);
	}

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
	{#if state.tabs.length > 0 || onClose}
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
		{#if state.tabs.length > 0}
			<!-- Landing page (no tabs yet) already offers Browser/Files/Terminal as
			     cards below — a "+" here would be redundant, inert chrome (it does
			     nothing until a tab exists). Reappears once a tab is picked, its
			     normal "add another tab" behaviour. -->
			<div class="relative">
				<button
					bind:this={addTabButtonEl}
					type="button"
					class="p-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
					on:click={toggleAddTabMenu}
					aria-label={$i18n.t('New tab')}
				>
					<Plus className="size-4" />
				</button>
				{#if showDropdown}
					<div class="fixed inset-0 z-30" on:click={() => (showDropdown = false)} role="presentation" />
					<div
						class="z-40 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden py-1"
						style={addTabMenuStyle}
					>
						{#if hasBrowser}
							<button type="button" class="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" on:click={() => open('browser')}>{$i18n.t('Browser')}</button>
						{/if}
						<button type="button" class="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" on:click={() => open('files')}>{$i18n.t('Files')}</button>
						<button type="button" class="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" on:click={() => open('terminal')}>{$i18n.t('Terminal')}</button>
					</div>
				{/if}
			</div>
		{/if}
		{#if onClose}
			<button
				type="button"
				class="ml-auto size-8 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
				on:click={onClose}
				aria-label={$i18n.t('Close')}
			>
				<XMark className="size-4" strokeWidth="1.5" />
			</button>
		{/if}
		</div>
	{/if}

	<!-- Body -->
	<div class="flex-1 min-h-0 relative">
		{#if showPicker || !activeTab}
			<div class="h-full flex justify-center items-start px-6 pt-0 pb-8 overflow-y-auto">
				<div class="w-full max-w-sm flex flex-col gap-5">
					<div class="flex flex-col gap-1">
						<button
							type="button"
							class="w-full flex items-center gap-2 px-1 py-1 text-xs font-medium text-gray-400 dark:text-gray-500"
							on:click={() => (openSectionExpanded = !openSectionExpanded)}
							aria-expanded={openSectionExpanded}
						>
							<ChevronDown
								className="size-3.5 transition-transform {openSectionExpanded ? '' : '-rotate-90'}"
							/>
							<span>{$i18n.t('Open')}</span>
						</button>
						{#if openSectionExpanded}
							<div class="flex flex-col gap-1">
								{#if hasBrowser}
									<button
										type="button"
										class="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
										on:click={() => open('browser')}
									>
										<span class="size-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
											<GlobeAlt className="size-4" />
										</span>
										<span class="flex flex-col min-w-0">
											<span class="text-sm font-medium">{$i18n.t('Browser')}</span>
											<span class="text-xs text-gray-500 dark:text-gray-400">
												{$i18n.t('Web access for research, docs, and live data.')}
											</span>
										</span>
										<ChevronRight className="size-4 text-gray-300 dark:text-gray-600 shrink-0 ml-auto" />
									</button>
								{/if}
								<button
									type="button"
									class="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
									on:click={() => open('files')}
								>
									<span class="size-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
										<Document className="size-4" />
									</span>
									<span class="flex flex-col min-w-0">
										<span class="text-sm font-medium">{$i18n.t('Files')}</span>
										<span class="text-xs text-gray-500 dark:text-gray-400">
											{$i18n.t('Search, preview, and reference files in your workspace.')}
										</span>
									</span>
									<ChevronRight className="size-4 text-gray-300 dark:text-gray-600 shrink-0 ml-auto" />
								</button>
								<button
									type="button"
									class="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
									on:click={() => open('terminal')}
								>
									<span class="size-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
										<Terminal className="size-4" />
									</span>
									<span class="flex flex-col min-w-0">
										<span class="text-sm font-medium">{$i18n.t('Terminal')}</span>
										<span class="text-xs text-gray-500 dark:text-gray-400">
											{$i18n.t('Run commands, scripts, and manage your environment.')}
										</span>
									</span>
									<ChevronRight className="size-4 text-gray-300 dark:text-gray-600 shrink-0 ml-auto" />
								</button>
							</div>
						{/if}
					</div>

					{#if recentItems.length > 0}
						<div class="flex flex-col gap-1">
							<div class="flex items-center justify-between px-1">
								<p class="text-xs font-medium text-gray-400 dark:text-gray-500">
									{$i18n.t('Recent')}
								</p>
								<button
									type="button"
									class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
									on:click={onClearRecent}
								>
									{$i18n.t('Clear')}
								</button>
							</div>
							<div class="flex flex-col gap-1">
								{#each recentItems as item (item.id)}
									<div class="relative flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
										<span class="size-7 rounded-full bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center shrink-0 text-gray-500 dark:text-gray-400">
											<Document className="size-4" />
										</span>
										<button
											type="button"
											class="flex-1 flex flex-col min-w-0 text-left"
											on:click={() => onRecentItemClick(item)}
										>
											<span class="text-sm truncate text-gray-700 dark:text-gray-300">{item.title}</span>
											<span class="text-xs text-gray-400">
												{formatRelativeTime(item.timestamp, Date.now())}
											</span>
										</button>
										<button
											type="button"
											class="p-1 rounded-full text-gray-300 hover:text-gray-500 dark:hover:text-gray-300"
											aria-label={$i18n.t('Remove')}
											on:click|stopPropagation={() =>
												(openMenuItemId = openMenuItemId === item.id ? null : item.id)}
										>
											<EllipsisHorizontal className="size-3.5" />
										</button>
										{#if openMenuItemId === item.id}
											<div
												class="fixed inset-0 z-10"
												on:click={() => (openMenuItemId = null)}
												role="presentation"
											></div>
											<div class="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden py-1 min-w-[7rem]">
												<button
													type="button"
													class="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
													on:click={() => onRemoveRecent(item.id)}
												>
													{$i18n.t('Remove')}
												</button>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}
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
					{#if usesLocalTerminal}
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
