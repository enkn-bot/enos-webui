<script>
	/** @type {{ title?: string, images?: {src: string, alt?: string}[] }} */
	export let data = {};

	$: images = Array.isArray(data?.images) ? data.images.filter((i) => i && i.src) : [];

	// Drop tiles whose image fails to load (hotlink-blocked / 404) so the grid
	// never shows broken-image placeholders.
	let broken = {};
	const onError = (src) => {
		broken = { ...broken, [src]: true };
	};
	$: visible = images.filter((i) => !broken[i.src]);
</script>

{#if visible.length > 0}
	<div class="rounded-2xl border border-gray-100/30 dark:border-gray-850/30 overflow-hidden flex flex-col">
		{#if data?.title}
			<div class="px-4 py-3 border-b border-gray-100/30 dark:border-gray-850/30">
				<h2 class="text-sm font-semibold text-black dark:text-white capitalize">{data.title}</h2>
			</div>
		{/if}
		<div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1.5">
			{#each images as img (img.src)}
				{#if !broken[img.src]}
					<a
						href={img.src}
						target="_blank"
						rel="noopener noreferrer"
						class="block aspect-square overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-900/50"
					>
						<img
							src={img.src}
							alt={img.alt ?? ''}
							loading="lazy"
							referrerpolicy="no-referrer"
							on:error={() => onError(img.src)}
							class="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
						/>
					</a>
				{/if}
			{/each}
		</div>
	</div>
{/if}
