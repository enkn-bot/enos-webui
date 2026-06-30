<script>
	/**
	 * @typedef {{ qty?: any, unit?: string, item: string, displayQty?: string }} IngredientRow
	 * @type {{ title?: string, description?: string, servings?: number, time?: string, ingredients?: Array<{qty?: any, unit?: string, item: string}>, steps?: string[] }}
	 */
	export let data = {};

	const baseServings = +(data?.servings ?? 4) || 4;
	let currentServings = baseServings;

	function decrement() {
		if (currentServings > 1) currentServings--;
	}

	function increment() {
		currentServings++;
	}

	/** @type {IngredientRow[]} */
	$: scaledIngredients = (data?.ingredients ?? []).map((ing) => {
		const rawQty = ing.qty;
		if (typeof rawQty !== 'number' || baseServings === 0) {
			return { ...ing, displayQty: rawQty != null ? String(rawQty) : '' };
		}
		const scaled = (rawQty * currentServings) / baseServings;
		return { ...ing, displayQty: String(+(scaled.toFixed(2))) };
	});
</script>

<div class="p-4 rounded-2xl border border-gray-100/30 dark:border-gray-850/30 flex flex-col gap-4">
	{#if data?.title}
		<h2 class="text-base font-semibold text-black dark:text-white leading-snug">{data.title}</h2>
	{/if}

	{#if data?.description}
		<p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{data.description}</p>
	{/if}

	<div class="flex items-center gap-3 flex-wrap text-sm text-gray-500 dark:text-gray-400">
		{#if data?.time}
			<span>⏱ {data.time}</span>
		{/if}

		<!-- Servings stepper -->
		<div class="flex items-center gap-2 ml-auto">
			<span class="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Servings</span>
			<button
				class="w-6 h-6 flex items-center justify-center rounded-md text-black dark:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm font-medium leading-none"
				on:click={decrement}
				aria-label="Decrease servings"
			>−</button>
			<span class="text-sm font-medium text-black dark:text-white w-6 text-center tabular-nums"
				>{currentServings}</span
			>
			<button
				class="w-6 h-6 flex items-center justify-center rounded-md text-black dark:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm font-medium leading-none"
				on:click={increment}
				aria-label="Increase servings"
			>+</button>
		</div>
	</div>

	{#if scaledIngredients.length > 0}
		<div class="flex flex-col gap-2">
			<h3 class="text-xs uppercase tracking-wide font-medium text-gray-400 dark:text-gray-500">
				Ingredients
			</h3>
			<ul class="flex flex-col gap-1.5">
				{#each scaledIngredients as ing}
					<li class="flex items-baseline gap-1.5 text-sm text-black dark:text-white">
						{#if ing.displayQty}
							<span class="font-medium tabular-nums shrink-0">{ing.displayQty}</span>
						{/if}
						{#if ing.unit}
							<span class="text-gray-500 dark:text-gray-400 shrink-0">{ing.unit}</span>
						{/if}
						<span>{ing.item}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if data?.steps && data.steps.length > 0}
		<div class="flex flex-col gap-2">
			<h3 class="text-xs uppercase tracking-wide font-medium text-gray-400 dark:text-gray-500">
				Steps
			</h3>
			<ol class="flex flex-col gap-3">
				{#each data.steps as step, i}
					<li class="flex gap-3 text-sm text-black dark:text-white">
						<span
							class="shrink-0 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center text-xs font-medium mt-0.5"
							>{i + 1}</span
						>
						<span class="leading-relaxed">{step}</span>
					</li>
				{/each}
			</ol>
		</div>
	{/if}
</div>
