<script lang="ts">
	import {
		enosOrbAssetForModel,
		enosOrbAssetForTone,
		type EnosOrbTone
	} from '$lib/enos/modelTier';

	export let modelId: string | null | undefined = null;
	export let tone: EnosOrbTone | null = null;
	export let className = 'size-5';

	$: src = tone ? enosOrbAssetForTone(tone) : enosOrbAssetForModel(modelId);
</script>

<img
	src={src}
	class="enos-orb-loader {className}"
	alt=""
	aria-hidden="true"
	draggable="false"
	decoding="async"
/>
