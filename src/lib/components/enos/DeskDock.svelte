<!-- src/lib/components/enos/DeskDock.svelte -->
<script lang="ts">
	import { getContext } from 'svelte';
	import {
		addTab,
		activateTab,
		closeTab,
		emptyDockState,
		loadDockState,
		saveDockState,
		setTabUrl,
		type DeskDockState,
		type DeskDockTabType
	} from '$lib/enos/tabDock';
	import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';

	import XTerminal from '$lib/components/chat/XTerminal.svelte';
	import BrowserView from './BrowserView.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';

	const i18n = getContext('i18n');

	export let folderId: string | null = null;
	export let chatId: string | null = null;

	let state: DeskDockState = emptyDockState();
	let showPicker = false;
	let lastFolderId: string | null | undefined = undefined;

	$: hasBrowser = Boolean(getEnosDesktopBridge());

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
</script>

<div class="flex flex-col h-full min-h-0">
	<!-- Tab strip -->
	<div class="flex items-center gap-1 px-2 pt-2 pb-2 shrink-0">
		<div class="flex gap-1 min-w-0 overflow-x-auto scrollbar-hidden">
			{#each state.tabs as tab (tab.id)}
				<div
					class="flex items-center gap-1 pl-2.5 pr-1 py-1 text-sm rounded-lg whitespace-nowrap {tab.id ===
					state.activeId
						? 'bg-gray-100 dark:bg-gray-800 font-medium text-gray-900 dark:text-white'
						: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}"
				>
					<button type="button" on:click={() => select(tab.id)}>
						{$i18n.t(tabLabel(tab.type))}
					</button>
					<button
						type="button"
						class="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
						on:click={() => close(tab.id)}
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
					<XTerminal {chatId} />
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
