<script lang="ts">
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';

	const i18n: Writable<any> = getContext('i18n');

	import Knowledge from '$lib/components/workspace/Models/Knowledge.svelte';
</script>

<div class="space-y-1">
	<div class="text-sm font-medium dark:text-gray-300 px-1">
		{$i18n.t('Project Knowledge')}
	</div>
	<div class="text-xs text-gray-500 dark:text-gray-600 px-1 mb-2">
		{$i18n.t('Add documents, URLs, or text for ENOS to reference in this project.')}
	</div>
	<Knowledge />
</div>
