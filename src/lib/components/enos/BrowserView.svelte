<!-- src/lib/components/enos/BrowserView.svelte -->
<script lang="ts">
	import { getContext } from 'svelte';
	import { normalizeUrl } from '$lib/enos/browserUrl';
	import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';
	import GlobeAlt from '$lib/components/icons/GlobeAlt.svelte';

	const i18n = getContext('i18n');

	export let url: string | null = null;
	export let onUrlChange: (url: string) => void = () => {};

	let inputValue = url ?? '';
	let webviewEl: any = null;
	let canGoBack = false;
	let canGoForward = false;
	let loading = false;

	// 3-dots menu
	let showMenu = false;
	let zoomFactor = 1.0;

	// Find in page
	let finding = false;
	let findQuery = '';
	let findEl: HTMLInputElement | null = null;
	let findResult = { active: 0, total: 0 };

	const go = () => {
		const next = normalizeUrl(inputValue);
		if (!next) return;
		url = next;
		inputValue = next;
		onUrlChange(next);
	};

	const onKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') go();
	};

	const reload = () => webviewEl?.reload?.();
	const back = () => webviewEl?.goBack?.();
	const forward = () => webviewEl?.goForward?.();

	const forceReload = () => {
		webviewEl?.reloadIgnoringCache?.();
		showMenu = false;
	};

	const adjustZoom = (delta: number) => {
		const next = Math.max(0.25, Math.min(5, Math.round((zoomFactor + delta) * 10) / 10));
		zoomFactor = next;
		webviewEl?.setZoomFactor?.(next);
	};
	const resetZoom = () => {
		zoomFactor = 1.0;
		webviewEl?.setZoomFactor?.(1.0);
	};

	const clearData = async () => {
		showMenu = false;
		await getEnosDesktopBridge()?.clearBrowserData?.();
		webviewEl?.reload?.();
	};

	const openFind = () => {
		showMenu = false;
		finding = true;
		setTimeout(() => findEl?.focus(), 50);
	};

	const closeFind = () => {
		finding = false;
		findQuery = '';
		findResult = { active: 0, total: 0 };
		webviewEl?.stopFindInPage?.('clearSelection');
	};

	const doFind = (forward = true) => {
		if (!findQuery) {
			webviewEl?.stopFindInPage?.('clearSelection');
			return;
		}
		webviewEl?.findInPage?.(findQuery, { findNext: true, forward });
	};

	const onFindKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') { e.shiftKey ? doFind(false) : doFind(true); }
		if (e.key === 'Escape') closeFind();
	};

	// Attach navigation/find listeners when the <webview> element mounts.
	const webviewListeners = (node: any) => {
		webviewEl = node;
		const onNav = () => {
			canGoBack = Boolean(node.canGoBack?.());
			canGoForward = Boolean(node.canGoForward?.());
			const current = node.getURL?.();
			if (current) {
				inputValue = current;
				onUrlChange(current);
			}
		};
		const onStart = () => (loading = true);
		const onStop = () => { loading = false; onNav(); };
		const onFound = (e: any) => {
			findResult = { active: e.result.activeMatchOrdinal ?? 0, total: e.result.matches ?? 0 };
		};
		node.addEventListener('did-navigate', onNav);
		node.addEventListener('did-navigate-in-page', onNav);
		node.addEventListener('did-start-loading', onStart);
		node.addEventListener('did-stop-loading', onStop);
		node.addEventListener('found-in-page', onFound);
		return {
			destroy() {
				node.removeEventListener('did-navigate', onNav);
				node.removeEventListener('did-navigate-in-page', onNav);
				node.removeEventListener('did-start-loading', onStart);
				node.removeEventListener('did-stop-loading', onStop);
				node.removeEventListener('found-in-page', onFound);
			}
		};
	};

	const menuBtnClass =
		'flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-default';
</script>

<!-- click-outside overlay to close menu -->
{#if showMenu}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="fixed inset-0 z-30" on:click={() => (showMenu = false)} />
{/if}

<div class="flex flex-col h-full min-h-0">
	<!-- toolbar -->
	<div class="flex items-center gap-1.5 px-2 py-1.5 shrink-0">
		<button
			type="button"
			class="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-40"
			disabled={!canGoBack}
			on:click={back}
			aria-label={$i18n.t('Back')}
		>
			<svg viewBox="0 0 20 20" fill="currentColor" class="size-4"
				><path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 0 1 0 1.06L9.06 10l3.73 3.71a.75.75 0 1 1-1.06 1.06l-4.25-4.24a.75.75 0 0 1 0-1.06l4.25-4.24a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" /></svg
			>
		</button>
		<button
			type="button"
			class="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-40"
			disabled={!canGoForward}
			on:click={forward}
			aria-label={$i18n.t('Forward')}
		>
			<svg viewBox="0 0 20 20" fill="currentColor" class="size-4"
				><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 0 1 0-1.06L10.94 10 7.21 6.29a.75.75 0 1 1 1.06-1.06l4.25 4.24a.75.75 0 0 1 0 1.06l-4.25 4.24a.75.75 0 0 1-1.06 0Z" clip-rule="evenodd" /></svg
			>
		</button>
		<button
			type="button"
			class="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
			on:click={reload}
			aria-label={$i18n.t('Reload')}
		>
			<svg viewBox="0 0 20 20" fill="currentColor" class="size-4 {loading ? 'animate-spin' : ''}"
				><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" /></svg
			>
		</button>
		<input
			class="flex-1 min-w-0 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm outline-none"
			type="text"
			bind:value={inputValue}
			on:keydown={onKeydown}
			placeholder={$i18n.t('Enter a URL')}
			autocomplete="off"
			spellcheck="false"
		/>

		<!-- 3-dots menu button -->
		<div class="relative">
			<button
				type="button"
				class="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
				on:click|stopPropagation={() => (showMenu = !showMenu)}
				aria-label="More options"
			>
				<svg viewBox="0 0 20 20" fill="currentColor" class="size-4">
					<path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
				</svg>
			</button>

			{#if showMenu}
				<div
					class="absolute right-0 top-full mt-1 z-40 min-w-48 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-850 shadow-lg py-1"
					on:click|stopPropagation={() => {}}
					role="menu"
				>
					<!-- Zoom row -->
					<div class="flex items-center justify-between gap-1 px-3 py-1.5">
						<span class="text-sm text-gray-500 dark:text-gray-400">Zoom</span>
						<div class="flex items-center gap-1">
							<button
								type="button"
								class="p-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium w-6 h-6 flex items-center justify-center"
								on:click={() => adjustZoom(-0.1)}
							>−</button>
							<button
								type="button"
								class="px-1.5 py-0.5 rounded-md text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 min-w-10 text-center"
								on:click={resetZoom}
							>{Math.round(zoomFactor * 100)}%</button>
							<button
								type="button"
								class="p-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium w-6 h-6 flex items-center justify-center"
								on:click={() => adjustZoom(0.1)}
							>+</button>
						</div>
					</div>

					<div class="h-px bg-gray-100 dark:bg-gray-700 mx-2 my-1" />

					<button type="button" class={menuBtnClass} on:click={openFind}>
						<svg viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400">
							<path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" />
						</svg>
						Find in page
					</button>

					<button type="button" class={menuBtnClass} on:click={forceReload}>
						<svg viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400">
							<path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" />
						</svg>
						Force reload
					</button>

					<div class="h-px bg-gray-100 dark:bg-gray-700 mx-2 my-1" />

					<button type="button" class={menuBtnClass} on:click={clearData}>
						<svg viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400">
							<path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
						</svg>
						Clear browser data
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- find bar -->
	{#if finding}
		<div class="flex items-center gap-1.5 px-2 py-1 shrink-0 bg-gray-50 dark:bg-gray-850 border-b border-gray-100 dark:border-gray-700">
			<input
				bind:this={findEl}
				bind:value={findQuery}
				on:input={() => doFind(true)}
				on:keydown={onFindKeydown}
				type="text"
				class="flex-1 min-w-0 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm outline-none"
				placeholder="Find in page"
				autocomplete="off"
				spellcheck="false"
			/>
			{#if findQuery}
				<span class="text-xs text-gray-400 shrink-0 min-w-10 text-center">
					{findResult.total > 0 ? `${findResult.active}/${findResult.total}` : 'No results'}
				</span>
			{/if}
			<button
				type="button"
				class="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-40"
				disabled={!findQuery}
				on:click={() => doFind(false)}
				aria-label="Previous"
			>
				<svg viewBox="0 0 20 20" fill="currentColor" class="size-3.5">
					<path fill-rule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clip-rule="evenodd" />
				</svg>
			</button>
			<button
				type="button"
				class="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-40"
				disabled={!findQuery}
				on:click={() => doFind(true)}
				aria-label="Next"
			>
				<svg viewBox="0 0 20 20" fill="currentColor" class="size-3.5">
					<path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
				</svg>
			</button>
			<button
				type="button"
				class="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
				on:click={closeFind}
				aria-label="Close"
			>
				<svg viewBox="0 0 20 20" fill="currentColor" class="size-3.5">
					<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
				</svg>
			</button>
		</div>
	{/if}

	<div class="flex-1 min-h-0 relative">
		{#if url}
			<!-- svelte-ignore a11y-missing-attribute -->
			<!-- Explicit inline width/height: Electron's <webview> doesn't always
			     honour percentage widths from CSS classes alone; inline style
			     guarantees the guest viewport matches the pane. -->
			<webview
				bind:this={webviewEl}
				use:webviewListeners
				src={url}
				partition="persist:enos-browser"
				allowpopups="true"
				style="position:absolute;inset:0;width:100%;height:100%;"
			></webview>
		{:else}
			<div class="h-full flex flex-col items-center justify-center text-center gap-2 px-6">
				<GlobeAlt className="size-10 text-gray-300 dark:text-gray-600" />
				<div class="text-sm font-medium text-gray-700 dark:text-gray-200">
					{$i18n.t('Start browsing')}
				</div>
				<div class="text-xs text-gray-400 dark:text-gray-500">
					{$i18n.t('Enter a URL to open a page')}
				</div>
			</div>
		{/if}
	</div>
</div>
