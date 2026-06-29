<!-- src/lib/components/enos/BrowserView.svelte -->
<script lang="ts">
	import { getContext } from 'svelte';
	import { normalizeUrl } from '$lib/enos/browserUrl';
	import GlobeAlt from '$lib/components/icons/GlobeAlt.svelte';

	const i18n = getContext('i18n');

	export let url: string | null = null;
	export let onUrlChange: (url: string) => void = () => {};

	let inputValue = url ?? '';
	let webviewEl: any = null;
	let canGoBack = false;
	let canGoForward = false;
	let loading = false;

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

	// Attach navigation listeners when the <webview> element itself mounts.
	// The element lives inside {#if url}, so it may appear after the component
	// has already mounted — a component-level onMount would miss it.
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
		const onStop = () => {
			loading = false;
			onNav();
		};
		node.addEventListener('did-navigate', onNav);
		node.addEventListener('did-navigate-in-page', onNav);
		node.addEventListener('did-start-loading', onStart);
		node.addEventListener('did-stop-loading', onStop);
		return {
			destroy() {
				node.removeEventListener('did-navigate', onNav);
				node.removeEventListener('did-navigate-in-page', onNav);
				node.removeEventListener('did-start-loading', onStart);
				node.removeEventListener('did-stop-loading', onStop);
			}
		};
	};
</script>

<div class="flex flex-col h-full min-h-0">
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
	</div>

	<div class="flex-1 min-h-0 relative">
		{#if url}
			<!-- svelte-ignore a11y-missing-attribute -->
			<webview
				bind:this={webviewEl}
				use:webviewListeners
				src={url}
				partition="persist:enos-browser"
				allowpopups="true"
				class="absolute inset-0 w-full h-full"
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
