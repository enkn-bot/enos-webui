<script lang="ts">
	import { getContext } from 'svelte';
	import { LinkPreview } from 'bits-ui';
	import { decodeString } from '$lib/utils';
	import { getPreviewSnippet } from '$lib/enos/sourceCitations';
	import type { Writable } from 'svelte/store';
	import type { EnosCitationRecord } from '$lib/enos/sourceCitations';

	type PreviewSource = EnosCitationRecord & { sourceId?: string | number };

	const i18n: Writable<any> = getContext('i18n');

	export let id;
	export let title: string = 'N/A';
	export let extraCount = 0;
	export let previewSources: PreviewSource[] = [];
	export let onClick: Function = () => {};

	let openPreview = false;

	// Helper function to return only the domain from a URL
	function getDomain(url: string): string {
		const domain = url.replace('http://', '').replace('https://', '').split(/[/?#]/)[0];

		if (domain.startsWith('www.')) {
			return domain.slice(4);
		}
		return domain;
	}

	const getDisplayTitle = (title: string) => {
		if (!title) return 'N/A';
		if (title.length > 30) {
			return title.slice(0, 15) + '...' + title.slice(-10);
		}
		return title;
	};

	// Helper function to check if text is a URL and return the domain
	function formattedTitle(title: string): string {
		if (title.startsWith('http')) {
			return getDomain(title);
		}

		return title;
	}

	const decodedTitle = () => formattedTitle(decodeString(title));
	const typedPreviewSources = () => previewSources;
	const hasPreviewSources = () => typedPreviewSources().length > 0;
	const sourceUrl = (preview: PreviewSource) =>
		typeof preview?.source?.url === 'string' ? preview.source.url : '';
	const hasExternalUrl = (preview: PreviewSource) => sourceUrl(preview).startsWith('http');
	const faviconSrc = (preview: PreviewSource) =>
		hasExternalUrl(preview)
			? `https://www.google.com/s2/favicons?sz=32&domain=${sourceUrl(preview)}`
			: '/favicon.png';
	const previewTitle = (preview: PreviewSource) =>
		decodeString(preview?.source?.name ?? preview?.id ?? title ?? 'N/A');
	const previewLabel = (preview: PreviewSource) => {
		const url = sourceUrl(preview);
		if (url?.startsWith('http')) return getDomain(url);
		const sourceId = preview?.source?.id;
		return decodeString(typeof sourceId === 'string' ? sourceId : (preview?.id ?? decodedTitle()));
	};
	const previewSnippet = (preview: PreviewSource) =>
		getPreviewSnippet(preview?.document?.[0] ?? '', 130);

	const handleFaviconError = (event: Event) => {
		const image = event.currentTarget as HTMLImageElement;
		image.src = '/favicon.png';
	};

	const openModalFallback = (preview: PreviewSource) => {
		const sourceId = preview.sourceId ?? id;
		openPreview = false;
		onClick(sourceId);
	};

	const openExternalSource = (preview: PreviewSource) => {
		const url = sourceUrl(preview);
		if (!url) {
			openModalFallback(preview);
			return;
		}

		openPreview = false;
		window.open(url, '_blank', 'noopener,noreferrer');
	};

	const openSourceLink = (preview: PreviewSource) => {
		openExternalSource(preview);
	};

	const togglePreview = () => {
		if (hasPreviewSources()) {
			openPreview = !openPreview;
			return;
		}

		onClick(id);
	};
</script>

{#if title !== 'N/A'}
	{#if hasPreviewSources()}
		<LinkPreview.Root openDelay={0} closeDelay={150} bind:open={openPreview}>
			<LinkPreview.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						aria-label={$i18n.t('View source: {{title}}', { title: decodedTitle() })}
						class="text-[10px] w-fit translate-y-[2px] px-2 py-0.5 dark:bg-white/5 dark:text-white/80 dark:hover:text-white bg-gray-50 text-black/80 hover:text-black transition rounded-xl"
						on:click={togglePreview}
					>
						<span class="line-clamp-1">
							{getDisplayTitle(decodedTitle())}
							{#if extraCount > 0}
								<span class="dark:text-white/50 text-black/50">+{extraCount}</span>
							{/if}
						</span>
					</button>
				{/snippet}
			</LinkPreview.Trigger>
			<LinkPreview.Portal>
				<LinkPreview.Content
					class="z-[9999] w-[320px] max-w-[calc(100vw-24px)] rounded-xl border border-gray-100 bg-white p-2 text-gray-900 shadow-lg dark:border-gray-800 dark:bg-gray-850 dark:text-white"
					align="start"
					side="bottom"
					sideOffset={8}
				>
					{#if typedPreviewSources().length > 1}
						<div class="flex items-center gap-2 px-2 pb-2 pt-1">
							<div class="flex -space-x-1">
								{#each typedPreviewSources().slice(0, 3) as preview}
									<img
										src={faviconSrc(preview)}
										alt=""
										class="size-4 rounded-full border border-white bg-white dark:border-gray-850 dark:bg-gray-900"
										on:error={handleFaviconError}
									/>
								{/each}
							</div>
							<div class="text-xs font-medium text-gray-700 dark:text-gray-200">
								{`${typedPreviewSources().length} sources`}
							</div>
						</div>
					{/if}

					<div class="flex flex-col gap-1">
						{#each typedPreviewSources() as preview}
							{@const snippet = previewSnippet(preview)}
							<div
								class="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/5"
							>
								<img
									src={faviconSrc(preview)}
									alt=""
									class="mt-0.5 size-5 shrink-0 rounded bg-white dark:bg-gray-900"
									on:error={handleFaviconError}
								/>
								<button
									type="button"
									class="min-w-0 flex-1 text-left"
									on:click={() => openSourceLink(preview)}
								>
									<div class="line-clamp-2 text-xs font-medium text-gray-900 dark:text-white">
										{previewTitle(preview)}
									</div>
									<div class="mt-0.5 line-clamp-1 text-[11px] text-gray-500 dark:text-gray-400">
										{previewLabel(preview)}
									</div>
									{#if snippet}
										<div class="mt-1 line-clamp-2 text-[11px] text-gray-600 dark:text-gray-300">
											{snippet}
										</div>
									{/if}
								</button>
								{#if hasExternalUrl(preview)}
									<button
										type="button"
										class="flex size-6 shrink-0 items-center justify-center rounded-md text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
										aria-label={$i18n.t('Open source in new tab')}
										on:click={(event) => {
											event.stopPropagation();
											openExternalSource(preview);
										}}
									>
										↗
									</button>
								{/if}
							</div>
						{/each}
					</div>
				</LinkPreview.Content>
			</LinkPreview.Portal>
		</LinkPreview.Root>
	{:else}
		<button
			aria-label={$i18n.t('View source: {{title}}', { title: decodedTitle() })}
			class="text-[10px] w-fit translate-y-[2px] px-2 py-0.5 dark:bg-white/5 dark:text-white/80 dark:hover:text-white bg-gray-50 text-black/80 hover:text-black transition rounded-xl"
			on:click={() => {
				onClick(id);
			}}
		>
			<span class="line-clamp-1">
				{getDisplayTitle(decodedTitle())}
				{#if extraCount > 0}
					<span class="dark:text-white/50 text-black/50">+{extraCount}</span>
				{/if}
			</span>
		</button>
	{/if}
{/if}
