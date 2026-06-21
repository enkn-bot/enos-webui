<script lang="ts">
	import EnosOrb from '$lib/components/common/EnosOrb.svelte';

	export let size = 'md';
	export let modelId: string | null | undefined = null;
</script>

<span
	class="relative flex items-center {size === 'md'
		? 'size-9 my-1'
		: size === 'xs'
			? 'size-6'
			: 'size-7'} -mx-1.5"
>
	<EnosOrb
		{modelId}
		className={size === 'md' ? 'size-9' : size === 'xs' ? 'size-6' : 'size-7'}
	/>
</span>
