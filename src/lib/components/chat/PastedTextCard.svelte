<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import XMark from '$lib/components/icons/XMark.svelte';
	import {
		getPastedTextContent,
		getPastedTextPreview,
		getTextStats
	} from '$lib/enos/pastedText';
	import { formatFileSize } from '$lib/utils';

	const dispatch = createEventDispatcher();

	export let item: any = null;
	export let content = '';
	export let title = '';
	export let size: number | null = null;
	export let dismissible = false;
	export let compact = false;
	export let className = '';

	let expanded = false;

	$: text = content || getPastedTextContent(item);
	$: stats = getTextStats(text);
	$: displayTitle =
		title || (String(item?.name ?? '').startsWith('Pasted_Text_') ? 'Pasted text' : item?.name) || 'Pasted text';
	$: preview = item?.pastedTextPreview || getPastedTextPreview(text || displayTitle);
	$: displayedSize = size ?? item?.size ?? null;

	const toggleExpanded = () => {
		if (!text) return;
		expanded = !expanded;
	};
</script>

<div class="max-w-full {compact ? 'w-64' : 'w-full'} {className}">
	<div class="relative group/pasted">
		<button
			type="button"
			class="w-full text-left rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gray-50/60 dark:bg-gray-850/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition overflow-hidden"
			aria-expanded={expanded}
			on:click={toggleExpanded}
		>
			<div class="px-3.5 pt-3 pb-2.5">
				<div class="text-sm leading-5 text-gray-600 dark:text-gray-300 line-clamp-3">
					{preview || displayTitle}
				</div>

				<div class="mt-2.5 flex items-center justify-between gap-3">
					<div class="min-w-0 flex items-center gap-2">
						<span
							class="shrink-0 rounded-md border border-gray-300/60 dark:border-gray-600/60 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-gray-500 dark:text-gray-400"
						>
							PASTED
						</span>
					</div>

					{#if text}
						<span class="shrink-0 text-[11px] font-medium text-gray-400 dark:text-gray-500">
							{expanded ? 'Hide text' : 'Show text'}
						</span>
					{/if}
				</div>
			</div>
		</button>

		{#if dismissible}
			<button
				type="button"
				aria-label="Remove pasted text"
				class="absolute -top-1.5 -right-1.5 rounded-full bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm opacity-0 group-hover/pasted:opacity-100 transition"
				on:click|stopPropagation={() => dispatch('dismiss')}
			>
				<XMark />
			</button>
		{/if}
	</div>

	{#if expanded && text}
		<pre
			class="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-900 px-3.5 py-3 text-sm leading-6 text-gray-800 dark:text-gray-200"
		>{text}</pre>
	{/if}
</div>
