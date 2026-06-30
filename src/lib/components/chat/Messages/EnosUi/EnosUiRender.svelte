<script>
	import RecipeRender from './RecipeRender.svelte';
	import ComparisonRender from './ComparisonRender.svelte';
	import HowToRender from './HowToRender.svelte';

	/** @type {any} */
	export let spec = null;
</script>

{#if spec?.component === 'recipe'}
	<RecipeRender data={spec.data ?? {}} />
{:else if spec?.component === 'comparison_table'}
	<ComparisonRender data={spec.data ?? {}} />
{:else if spec?.component === 'how_to'}
	<HowToRender data={spec.data ?? {}} />
{:else}
	<div class="p-4 rounded-2xl border border-gray-100/30 dark:border-gray-850/30">
		<p class="text-sm text-gray-400 dark:text-gray-500 italic mb-2">unsupported render</p>
		<pre class="text-xs text-gray-500 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(
				spec,
				null,
				2
			)}</pre>
	</div>
{/if}
