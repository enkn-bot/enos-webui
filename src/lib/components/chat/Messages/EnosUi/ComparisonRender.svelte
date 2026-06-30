<script>
	/** @type {{ title?: string, columns?: string[], rows?: string[][] }} */
	export let data = {};

	$: columns = data?.columns ?? [];
	$: rows = data?.rows ?? [];
</script>

<div class="rounded-2xl border border-gray-100/30 dark:border-gray-850/30 overflow-hidden flex flex-col">
	{#if data?.title}
		<div class="px-4 py-3 border-b border-gray-100/30 dark:border-gray-850/30">
			<h2 class="text-sm font-semibold text-black dark:text-white">{data.title}</h2>
		</div>
	{/if}

	<div class="overflow-x-auto">
		<table class="w-full text-sm text-left text-black dark:text-white">
			{#if columns.length > 0}
				<thead class="bg-gray-50 dark:bg-gray-900/50">
					<tr>
						{#each columns as col}
							<th
								class="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap"
								>{col}</th
							>
						{/each}
					</tr>
				</thead>
			{/if}
			<tbody class="divide-y divide-gray-100/30 dark:divide-gray-850/30">
				{#each rows as row}
					<tr class="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition">
						{#each row as cell, i}
							<td
								class="px-4 py-2.5 {i === 0
									? 'font-medium'
									: 'text-gray-600 dark:text-gray-300'}">{cell}</td
							>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
