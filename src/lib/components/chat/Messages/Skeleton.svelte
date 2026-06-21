<script lang="ts">
	import EnosOrb from '$lib/components/common/EnosOrb.svelte';

	export let size = 'md';
	export let modelId: string | null | undefined = null;
</script>

<span
	class="relative flex {size === 'md'
		? 'size-3 my-2'
		: size === 'xs'
			? 'size-1.5 my-1'
			: 'size-2 my-1'} mx-1"
>
	<EnosOrb
		{modelId}
		className={size === 'md' ? 'size-5' : size === 'xs' ? 'size-3' : 'size-4'}
	/>
</span>
