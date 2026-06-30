<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	let hidden = false;
</script>

{#if !hidden}
	<div class="mt-4">
		<div class="flex flex-col text-left gap-1 mt-1.5">
			<button
				type="button"
				class=" py-1.5 bg-transparent text-left text-sm flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition cursor-pointer w-full"
				on:click={() => dispatch('confirm')}
			>
				<div class="line-clamp-1">Yes, dig in</div>
			</button>

			<hr class="border-gray-50 dark:border-gray-850/30" />

			<button
				type="button"
				class=" py-1.5 bg-transparent text-left text-sm flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition cursor-pointer w-full"
				on:click={() => {
					hidden = true;
				}}
			>
				<div class="line-clamp-1">Not now</div>
			</button>
		</div>
	</div>
{/if}
