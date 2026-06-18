<script lang="ts">
	import { getContext, afterUpdate } from 'svelte';
	import { tick } from 'svelte';
	import Folder from '../../icons/Folder.svelte';
	import NewFolderAlt from '../../icons/NewFolderAlt.svelte';
	import FilePlusAlt from '../../icons/FilePlusAlt.svelte';
	import ChevronLeft from '../../icons/ChevronLeft.svelte';
	import ChevronRight from '../../icons/ChevronRight.svelte';
	import ChevronUp from '../../icons/ChevronUp.svelte';
	import ArrowPath from '../../icons/ArrowPath.svelte';
	import BarsArrowUp from '../../icons/BarsArrowUp.svelte';
	import ArrowDownTray from '../../icons/ArrowDownTray.svelte';
	import ArrowUpTray from '../../icons/ArrowUpTray.svelte';
	import Spinner from '../../common/Spinner.svelte';
	import Tooltip from '../../common/Tooltip.svelte';
	import Dropdown from '$lib/components/common/Dropdown.svelte';

	const i18n = getContext('i18n');

	export let breadcrumbs: { label: string; path: string }[] = [];
	export let selectedFile: string | null = null;
	export let loading = false;

	export let onNavigate: (path: string) => void = () => {};
	export let onRefresh: () => void = () => {};
	export let onNewFolder: () => void = () => {};
	export let onNewFile: () => void = () => {};
	export let onUploadFiles: (files: File[]) => void = () => {};
	export let onDownloadDir: () => void = () => {};
	export let onMove: (source: string, destFolder: string) => void = () => {};

	// Sort controls
	export let sortBy: 'name' | 'date' = 'name';
	export let sortAsc: boolean = true;
	export let onSort: (mode: 'name' | 'date') => void = () => {};

	// Back / forward navigation
	export let canGoBack = false;
	export let canGoForward = false;
	export let onGoBack: () => void = () => {};
	export let onGoForward: () => void = () => {};

	let dragOverCrumb: number | null = null;

	let uploadInput: HTMLInputElement;
	let breadcrumbEl: HTMLDivElement;

	// Scroll breadcrumb to the end after every DOM update
	afterUpdate(() => {
		if (breadcrumbEl) breadcrumbEl.scrollLeft = breadcrumbEl.scrollWidth;
	});
</script>

<div class="flex items-center px-2 pb-1.5 shrink-0 gap-1">
	<!-- Back -->
	<Tooltip content={$i18n.t('Back')}>
		<button
			class="shrink-0 p-1 rounded transition {canGoBack
				? 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-400'
				: 'text-gray-200 dark:text-gray-700 cursor-default'}"
			on:click={onGoBack}
			disabled={!canGoBack}
			aria-label={$i18n.t('Back')}
		>
			<ChevronLeft className="size-3.5" />
		</button>
	</Tooltip>

	<!-- Forward -->
	<Tooltip content={$i18n.t('Forward')}>
		<button
			class="shrink-0 p-1 rounded transition {canGoForward
				? 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-400'
				: 'text-gray-200 dark:text-gray-700 cursor-default'}"
			on:click={onGoForward}
			disabled={!canGoForward}
			aria-label={$i18n.t('Forward')}
		>
			<ChevronRight className="size-3.5" />
		</button>
	</Tooltip>

	<div
		bind:this={breadcrumbEl}
		class="flex items-center flex-1 min-w-0 overflow-x-auto scrollbar-none"
	>
		{#each breadcrumbs as crumb, i}
			{#if i > 1}
				<span class="text-gray-300 dark:text-gray-600 text-xs shrink-0 select-none mx-0.5">/</span>
			{/if}
			<button
				class="text-xs shrink-0 px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition
					{!selectedFile && i === breadcrumbs.length - 1
					? 'text-gray-700 dark:text-gray-300'
					: 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}
					{dragOverCrumb === i
					? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-400 dark:ring-blue-500'
					: ''}"
				on:click={() => onNavigate(crumb.path)}
				on:dragover={(e) => {
					if (!e.dataTransfer?.types.includes('application/x-terminal-file-move')) return;
					e.preventDefault();
					e.stopPropagation();
					dragOverCrumb = i;
				}}
				on:dragleave={() => {
					if (dragOverCrumb === i) dragOverCrumb = null;
				}}
				on:drop={(e) => {
					const raw = e.dataTransfer?.getData('application/x-terminal-file-move');
					if (!raw) return;
					e.preventDefault();
					e.stopPropagation();
					dragOverCrumb = null;
					try {
						const data = JSON.parse(raw);
						const paths = data.paths || (data.path ? [data.path] : []);
						for (const p of paths) onMove(p, crumb.path);
					} catch {}
				}}
			>
				{crumb.label}
			</button>
		{/each}
		{#if selectedFile}
			<span class="text-gray-300 dark:text-gray-600 text-xs shrink-0 select-none mx-0.5">/</span>
			<span class="text-xs shrink-0 px-1.5 py-0.5 text-gray-700 dark:text-gray-300">
				{selectedFile.split('/').pop()}
			</span>
		{/if}
	</div>

	<Tooltip content={$i18n.t('Refresh')}>
		<button
			class="shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
			on:click={onRefresh}
			aria-label={$i18n.t('Refresh')}
		>
			<ArrowPath className="size-3.5 {loading ? 'animate-spin' : ''}" />
		</button>
	</Tooltip>

	{#if !selectedFile}
		<Dropdown align="end" sideOffset={4}>
			<Tooltip content={$i18n.t('Sort')}>
				<button
					class="shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
					aria-label={$i18n.t('Sort')}
				>
					<BarsArrowUp className="size-3.5" />
				</button>
			</Tooltip>

			<div slot="content">
				<div
					class="min-w-[150px] rounded-2xl p-1 z-[9999999] bg-white dark:bg-gray-850 dark:text-white shadow-lg border border-gray-100 dark:border-gray-800"
				>
					<button
						type="button"
						class="select-none flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition items-center gap-2 text-sm"
						on:click={() => onSort('name')}
					>
						<span class="flex-1 text-left">{$i18n.t('Name')}</span>
						{#if sortBy === 'name'}
							<ChevronUp
								className="size-3 text-gray-500 dark:text-gray-400 transition-transform {sortAsc
									? ''
									: 'rotate-180'}"
							/>
						{/if}
					</button>
					<button
						type="button"
						class="select-none flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition items-center gap-2 text-sm"
						on:click={() => onSort('date')}
					>
						<span class="flex-1 text-left">{$i18n.t('Date Modified')}</span>
						{#if sortBy === 'date'}
							<ChevronUp
								className="size-3 text-gray-500 dark:text-gray-400 transition-transform {sortAsc
									? ''
									: 'rotate-180'}"
							/>
						{/if}
					</button>
				</div>
			</div>
		</Dropdown>
		<Tooltip content={$i18n.t('New Folder')}>
			<button
				class="shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
				on:click={onNewFolder}
				aria-label={$i18n.t('New Folder')}
			>
				<NewFolderAlt className="size-3.5" />
			</button>
		</Tooltip>
		<Tooltip content={$i18n.t('New File')}>
			<button
				class="shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
				on:click={onNewFile}
				aria-label={$i18n.t('New File')}
			>
				<FilePlusAlt className="size-3.5" />
			</button>
		</Tooltip>
		<Tooltip content={$i18n.t('Download')}>
			<button
				class="shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
				on:click={onDownloadDir}
				aria-label={$i18n.t('Download')}
			>
				<ArrowDownTray className="size-3.5" />
			</button>
		</Tooltip>
		<Tooltip content={$i18n.t('Upload')}>
			<button
				class="shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
				on:click={() => uploadInput?.click()}
				aria-label={$i18n.t('Upload')}
			>
				<ArrowUpTray className="size-3.5" />
			</button>
		</Tooltip>
		<input
			bind:this={uploadInput}
			type="file"
			multiple
			hidden
			on:change={async () => {
				if (!uploadInput?.files?.length) return;
				onUploadFiles(Array.from(uploadInput.files));
				uploadInput.value = '';
			}}
		/>
	{:else}
		<slot />
	{/if}
</div>
