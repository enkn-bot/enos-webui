<script>
	export let caveatText;
</script>

<div
	class="mt-3 text-sm text-gray-600 dark:text-gray-400 border-l-2 border-yellow-500 dark:border-yellow-600 pl-3 py-1"
>
	<p>I couldn't fully verify this with the available sources. Please double-check before acting.</p>
	{#if caveatText && caveatText !== "I couldn't fully verify this with the available sources. Please double-check before acting."}
		<details class="mt-1">
			<summary class="cursor-pointer text-xs text-gray-500 dark:text-gray-500 hover:underline select-none">
				Show details
			</summary>
			<p class="mt-1 text-xs opacity-90 whitespace-pre-wrap">{caveatText}</p>
		</details>
	{/if}
</div>
