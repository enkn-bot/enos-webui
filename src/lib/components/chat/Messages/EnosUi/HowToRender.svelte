<script>
	/** @type {{ title?: string, steps?: Array<{title?: string, detail: string}> }} */
	export let data = {};

	$: steps = data?.steps ?? [];
</script>

<div class="p-4 rounded-2xl border border-gray-100/30 dark:border-gray-850/30 flex flex-col gap-4">
	{#if data?.title}
		<h2 class="text-base font-semibold text-black dark:text-white leading-snug">{data.title}</h2>
	{/if}

	{#if steps.length > 0}
		<ol class="flex flex-col gap-3">
			{#each steps as step, i}
				<li class="flex gap-3">
					<span
						class="shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center text-xs font-semibold mt-0.5"
						>{i + 1}</span
					>
					<div class="flex flex-col gap-0.5 flex-1 min-w-0">
						{#if step.title}
							<p class="text-sm font-medium text-black dark:text-white leading-snug">{step.title}</p>
						{/if}
						<p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{step.detail}</p>
					</div>
				</li>
			{/each}
		</ol>
	{/if}
</div>
