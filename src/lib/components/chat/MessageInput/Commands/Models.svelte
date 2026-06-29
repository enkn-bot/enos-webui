<script lang="ts">
	import Fuse from 'fuse.js';
	import { createEventDispatcher, tick } from 'svelte';
	import { getContext } from 'svelte';
	import { models } from '$lib/stores';
	import { settings } from '$lib/stores';
	import { WEBUI_API_BASE_URL } from '$lib/constants';
	import Tooltip from '$lib/components/common/Tooltip.svelte';

	const i18n = getContext('i18n');

	export let query = '';
	export let onSelect = (e) => {};
	export let filteredItems = [];
	let selectedIdx = 0;

	// ── Vendor helpers ──────────────────────────────────────────────────────────

	function getVendorId(model: any): string {
		// Direct connection: urlIdx is the connection index
		if (model.urlIdx !== undefined && model.urlIdx !== null) {
			const idx = Number(model.urlIdx);
			const conns = $settings?.directConnections ?? {};
			const keys = Object.keys(conns);
			if (keys[idx] !== undefined) {
				return `conn:${keys[idx]}`;
			}
			return `conn:${idx}`;
		}
		// Built-in / owned-by
		return model.owned_by ?? 'unknown';
	}

	function getVendorLabel(vendorId: string): string {
		if (vendorId.startsWith('conn:')) {
			const idx = vendorId.slice(5);
			const conns = $settings?.directConnections ?? {};
			const conn = conns[idx];
			if (conn?.info?.name) return conn.info.name;
			return `Connection ${idx}`;
		}
		const labels: Record<string, string> = {
			ollama: 'Ollama',
			openai: 'OpenAI',
			arena: 'Arena',
			anthropic: 'Anthropic',
			groq: 'Groq',
			openrouter: 'OpenRouter',
			azure: 'Azure',
			google: 'Google',
		};
		return labels[vendorId] ?? vendorId;
	}

	// ── Free tier heuristics ─────────────────────────────────────────────────────

	function isFreeModel(model: any): boolean {
		const id = (model.id ?? '').toLowerCase();
		const name = (model.name ?? '').toLowerCase();

		// Explicit free-in-name patterns
		if (/[-_.]?free[-_.]/.test(id) || /[-_.]?free[-_.]/.test(name)) return true;
		if (/\bfree\b/.test(id) || /\bfree\b/.test(name)) return true;

		// OpenRouter free providers (by known slug segments)
		if (id.includes('groq/') || id.includes('cerebras/') || id.includes('opencode/')) return true;
		if (id.includes('openrouter/') && (id.includes('-free') || id.includes('/free/'))) return true;
		if (id.includes('together/') && (id.includes('-free') || id.includes('/free/'))) return true;

		// OpenWebUI direct connections with URL patterns implying free
		const conns = $settings?.directConnections ?? {};
		if (model.urlIdx !== undefined && model.urlIdx !== null) {
			const conn = conns[Number(model.urlIdx)];
			const baseUrl = (conn?.url ?? '').toLowerCase();
			if (
				baseUrl.includes('openrouter.ai') ||
				baseUrl.includes('groq.com') ||
				baseUrl.includes('cerebras.ai') ||
				baseUrl.includes('opencode.ai') ||
				baseUrl.includes('siliconflow') ||
				baseUrl.includes('api.siliconflow') ||
				baseUrl.includes('hailuo') ||
				baseUrl.includes('deepinfra') ||
				baseUrl.includes('together.ai')
			) {
				return true;
			}
		}

		return false;
	}

	// ── Sorting / grouping ───────────────────────────────────────────────────────

	function sortModels(modelList: any[]): any[] {
		return [...modelList].sort((a, b) => {
			const aFree = isFreeModel(a) ? 0 : 1;
			const bFree = isFreeModel(b) ? 0 : 1;
			if (aFree !== bFree) return aFree - bFree;
			return (a.name ?? a.id ?? '').localeCompare(b.name ?? b.id ?? '');
		});
	}

	function buildGroups(allModels: any[]): Array<{ vendor: string; label: string; models: any[] }> {
		const hidden = new Set(
			allModels
				.filter((m) => m?.info?.meta?.hidden)
				.map((m) => m.id)
		);
		const visible = allModels.filter((m) => !hidden.has(m.id));

		// Group by vendor
		const groups = new Map<string, any[]>();
		for (const model of visible) {
			const vid = getVendorId(model);
			if (!groups.has(vid)) groups.set(vid, []);
			groups.get(vid)!.push(model);
		}

		// Sort groups: groups with free models first, then alphabetically
		const sorted = [...groups.entries()].sort(([aId, aModels], [bId, bModels]) => {
			const aHasFree = aModels.some((m) => isFreeModel(m));
			const bHasFree = bModels.some((m) => isFreeModel(m));
			if (aHasFree && !bHasFree) return -1;
			if (!aHasFree && bHasFree) return 1;
			return getVendorLabel(aId).localeCompare(getVendorLabel(bId));
		});

		return sorted.map(([vid, ms]) => ({
			vendor: vid,
			label: getVendorLabel(vid),
			models: sortModels(ms)
		}));
	}

	// Fuse for search
	let fuse = new Fuse([], { keys: ['value', 'tags', 'modelName'], threshold: 0.5 });

	$: {
		const source = $models ?? [];
		fuse = new Fuse(
			source
				.filter((m) => !m?.info?.meta?.hidden)
				.map((m) => ({ ...m, modelName: m?.name, tags: m?.info?.meta?.tags?.map((t: any) => t.name).join(' ') })),
			{ keys: ['value', 'tags', 'modelName'], threshold: 0.5 }
		);
	}

	// Refresh command item (always first if no query)
	const REFRESH_CMD = { id: '__refresh__', name: '↻ Refresh models', isRefresh: true };

	$: searchResults = query ? fuse.search(query).map((e) => e.item) : null;

	$: groups = searchResults === null ? buildGroups($models ?? []) : null;

	// Flat list for keyboard nav (refresh + all models grouped)
	$: flatItems = searchResults !== null
		? searchResults
		: [REFRESH_CMD, ...(groups ?? []).flatMap((g) => g.models)];

	$: filteredItems = flatItems;

	$: if (query) {
		selectedIdx = 0;
	}

	// ── Actions ─────────────────────────────────────────────────────────────────

	export const selectUp = () => {
		selectedIdx = Math.max(0, selectedIdx - 1);
	};

	export const selectDown = () => {
		selectedIdx = Math.min(selectedIdx + 1, flatItems.length - 1);
	};

	export const select = async () => {
		const item = flatItems[selectedIdx];
		if (!item) return;

		if ((item as any).isRefresh) {
			await refreshModels();
			return;
		}
		onSelect({ type: 'model', data: item });
	};

	async function refreshModels() {
		window.dispatchEvent(new CustomEvent('models:refresh'));
		// Brief visual feedback — select stays at top
		selectedIdx = 0;
	}

	// ── Rendering helpers ───────────────────────────────────────────────────────

	let groupPositions: number[] = []; // flat index where each group header starts

	$: {
		if (groups) {
			let pos = 1; // 0 is refresh
			groupPositions = [pos];
			for (const g of groups) {
				pos += 1 + g.models.length; // 1 for header
				groupPositions.push(pos);
			}
		}
	}
</script>

<div class="px-2 text-xs text-gray-500 py-1 flex items-center justify-between">
	<span>{$i18n.t('Models')}</span>
	{#if groups}
		<button
			class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-xs px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
			on:click={refreshModels}
			title="Refresh model list"
		>
			↻
		</button>
	{/if}
</div>

{#if flatItems.length > 0}
	{#if searchResults !== null}
		<!-- Ungrouped search results -->
		{#each flatItems as model, modelIdx}
			<Tooltip content={model.id} placement="top-start">
				<button
					class="px-2.5 py-1.5 rounded-xl w-full text-left {modelIdx === selectedIdx
						? 'bg-gray-50 dark:bg-gray-800 selected-command-option-button'
						: ''}"
					type="button"
					on:click={() => onSelect({ type: 'model', data: model })}
					on:mousemove={() => { selectedIdx = modelIdx; }}
					data-selected={modelIdx === selectedIdx}
				>
					<div class="flex text-black dark:text-gray-100 line-clamp-1">
						<img
							src={`${WEBUI_API_BASE_URL}/models/model/profile/image?id=${model.id}&lang=${$i18n.language}`}
							alt={model?.name ?? model.id}
							class="rounded-full size-5 items-center mr-2"
							on:error={(e) => { e.currentTarget.src = '/favicon.png'; }}
						/>
						<div class="truncate">{model.name}</div>
						{#if isFreeModel(model)}
							<span class="ml-auto text-[9px] text-green-600 dark:text-green-400 font-medium shrink-0">free</span>
						{/if}
					</div>
				</button>
			</Tooltip>
		{/each}
	{:else}
		<!-- Grouped by vendor, free first -->
		<!-- Refresh item -->
		<button
			class="px-2.5 py-1.5 rounded-xl w-full text-left {0 === selectedIdx
				? 'bg-gray-50 dark:bg-gray-800 selected-command-option-button'
				: 'text-gray-600 dark:text-gray-400'}"
			type="button"
			on:click={refreshModels}
			on:mousemove={() => { selectedIdx = 0; }}
			data-selected={0 === selectedIdx}
		>
			<div class="flex items-center gap-2">
				<span class="text-sm">↻</span>
				<span class="text-sm">Refresh models</span>
			</div>
		</button>

		{#each groups ?? [] as group, gi}
			{@const groupStart = 1 + groups.slice(0, gi).reduce((acc, g) => acc + 1 + g.models.length, 0)}
			<!-- Group header -->
			<div class="px-2.5 pt-2 pb-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wide">
				{group.label}
				{#if group.models.some((m) => isFreeModel(m))}
					<span class="ml-1 text-green-500 normal-case font-normal">· free</span>
				{/if}
			</div>

			{#each group.models as model, mi}
				{@const flatIdx = groupStart + mi}
				<Tooltip content={model.id} placement="top-start">
					<button
						class="px-2.5 py-1.5 rounded-xl w-full text-left {flatIdx === selectedIdx
							? 'bg-gray-50 dark:bg-gray-800 selected-command-option-button'
							: ''}"
						type="button"
						on:click={() => onSelect({ type: 'model', data: model })}
						on:mousemove={() => { selectedIdx = flatIdx; }}
						data-selected={flatIdx === selectedIdx}
					>
						<div class="flex text-black dark:text-gray-100 line-clamp-1">
							<img
								src={`${WEBUI_API_BASE_URL}/models/model/profile/image?id=${model.id}&lang=${$i18n.language}`}
								alt={model?.name ?? model.id}
								class="rounded-full size-5 items-center mr-2 shrink-0"
								on:error={(e) => { e.currentTarget.src = '/favicon.png'; }}
							/>
							<div class="truncate">{model.name}</div>
							{#if isFreeModel(model)}
								<span class="ml-auto text-[9px] text-green-600 dark:text-green-400 font-medium shrink-0">free</span>
							{/if}
						</div>
					</button>
				</Tooltip>
			{/each}
		{/each}
	{/if}
{/if}