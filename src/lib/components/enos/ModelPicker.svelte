<script lang="ts">
	import Dropdown from '$lib/components/common/Dropdown.svelte';

	const MINDS = [
		{ id: 'enos.subconscious', label: 'Subconscious', subtitle: 'Quick responses.' },
		{ id: 'enos.conscious', label: 'Conscious', subtitle: 'Everyday tasks.' },
		{ id: 'enos.ego', label: 'Ego', subtitle: 'Toughest problems.' }
	] as const;

	export let value: string = 'enos.conscious';
	export let onSelect: (id: string) => void = () => {};

	let show = false;

	$: currentLabel = MINDS.find((m) => m.id === value)?.label ?? 'Conscious';

	function select(id: string) {
		onSelect(id);
		show = false;
	}
</script>

<Dropdown bind:show>
	<button
		type="button"
		class="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200 transition select-none"
		aria-haspopup="listbox"
		aria-expanded={show}
	>
		<span>{currentLabel}</span>
		<svg
			class="opacity-40 transition-transform duration-150 {show ? 'rotate-180' : ''}"
			xmlns="http://www.w3.org/2000/svg"
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="m6 9 6 6 6-6" />
		</svg>
	</button>

	<div slot="content">
		<div
			class="w-48 rounded-2xl px-1 py-1 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-850 dark:text-white shadow-lg"
		>
			{#each MINDS as mind}
				<button
					type="button"
					class="flex w-full gap-2 items-center px-3 py-1.5 text-sm select-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl {value ===
					mind.id
						? 'font-medium'
						: ''}"
					on:click={() => select(mind.id)}
				>
					<div class="flex-1 min-w-0 flex flex-col items-start leading-tight">
						<span class="text-left truncate">{mind.label}</span>
						<span class="text-left text-[11px] text-gray-400 dark:text-gray-500 truncate"
							>{mind.subtitle}</span
						>
					</div>
					{#if value === mind.id}
						<svg
							class="shrink-0 text-gray-400 dark:text-gray-500 self-center"
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg
						>
					{/if}
				</button>
			{/each}
		</div>
	</div>
</Dropdown>
