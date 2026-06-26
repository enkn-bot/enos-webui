<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	import { workspaceBadgeFromFolder } from '$lib/enos/workspaceBadge';

	import Dropdown from '$lib/components/common/Dropdown.svelte';
	import Cloud from '$lib/components/icons/Cloud.svelte';
	import Folder from '$lib/components/icons/Folder.svelte';

	type I18nStore = Readable<{ t: (key: string, options?: Record<string, unknown>) => string }>;

	const i18n = getContext<I18nStore>('i18n');

	export let show = false;
	export let activeFolderId: string | null = null;
	export let activeFolder: any = null;

	$: badge = workspaceBadgeFromFolder(activeFolder);
	$: projectName = String(activeFolder?.name ?? '').trim() || $i18n.t('Project');
	$: source = activeFolder?.data?.project_context_source ?? null;
	$: sourceKind = source?.kind ?? badge.kind;
	$: projectStatusLabel = statusLabelFor(sourceKind);
	$: projectDetailLabel = detailLabelFor(source);
	$: showProjectDetailLabel = Boolean(projectDetailLabel && projectDetailLabel !== projectName);
	$: projectIcon = sourceKind === 'cloud' || sourceKind === 'github' ? 'cloud' : 'folder';

	const statusLabelFor = (kind: string | null | undefined) => {
		if (kind === 'local') return $i18n.t('Working on your device');
		if (kind === 'cloud' || kind === 'github') return $i18n.t('Working in ENOS Cloud');
		return $i18n.t('No workspace connected yet');
	};

	const detailLabelFor = (value: any) => {
		if (!value) return $i18n.t('Choose Local or ENOS Cloud to connect files.');
		if (value.kind === 'local') return value.rootDisplay ?? value.rootName ?? '';
		if (value.kind === 'cloud') return value.cloudPath ?? value.dest ?? value.rootName ?? '';
		if (value.kind === 'github') {
			const repo = value.repo ?? '';
			return value.branch && repo ? `${repo} @ ${value.branch}` : repo;
		}
		return '';
	};
</script>

<Dropdown bind:show align="start">
	<slot />

	<div slot="content">
		<div
			class="min-w-72 max-w-80 rounded-2xl px-1 py-1 border border-gray-100 dark:border-gray-800 z-50 bg-white dark:bg-gray-850 dark:text-white shadow-lg overflow-hidden"
		>
			<div class="px-3 py-2.5">
				<div
					class="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
				>
					{$i18n.t('Project')}
				</div>

				<div class="mt-2 flex items-start gap-2">
					{#if projectIcon === 'cloud'}
						<Cloud
							className="mt-0.5 size-4 shrink-0 text-gray-500 dark:text-gray-400"
							strokeWidth="2"
						/>
					{:else}
						<Folder
							className="mt-0.5 size-4 shrink-0 text-gray-500 dark:text-gray-400"
							strokeWidth="2"
						/>
					{/if}

					<div class="min-w-0 flex-1">
						<div class="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
							{projectName}
						</div>
						<div class="truncate text-xs text-gray-500 dark:text-gray-400">
							{projectStatusLabel}
						</div>
						{#if showProjectDetailLabel}
							<div class="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">
								{projectDetailLabel}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</Dropdown>
