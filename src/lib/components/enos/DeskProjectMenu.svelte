<script lang="ts">
	import { getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { Readable } from 'svelte/store';

	import { selectedFolder, selectedTerminalId, terminalServers } from '$lib/stores';
	import { getTerminalServers } from '$lib/apis/terminal';
	import {
		createCloudWorkspace,
		getGithubStatus,
		connectGithub,
		disconnectGithub,
		cloneRepo,
		listGithubRepos,
		type GithubRepo
	} from '$lib/apis/workspace';
	import { bindGithubRepoToFolder } from '$lib/enos/bindLocalWorkspace';
	import { workspaceBadgeFromFolder, workspaceKindLabel } from '$lib/enos/workspaceBadge';

	import Dropdown from '$lib/components/common/Dropdown.svelte';
	import Check from '$lib/components/icons/Check.svelte';
	import Cloud from '$lib/components/icons/Cloud.svelte';
	import Folder from '$lib/components/icons/Folder.svelte';
	import Github from '$lib/components/icons/Github.svelte';

	type I18nStore = Readable<{ t: (key: string, options?: Record<string, unknown>) => string }>;

	const i18n = getContext<I18nStore>('i18n');

	export let show = false;
	export let activeFolderId: string | null = null;
	export let activeFolder: any = null;

	$: badge = workspaceBadgeFromFolder(activeFolder);
	$: projectName = String(activeFolder?.name ?? '').trim() || $i18n.t('Project');
	$: source = activeFolder?.data?.project_context_source ?? null;
	$: sourceKind = source?.kind ?? badge.kind;
	$: sourceLabel = sourceLabelFor(sourceKind, source, badge.name);
	$: sourceDetail = sourceDetailFor(source);

	const sourceLabelFor = (kind: string | null | undefined, value: any, fallback: string) => {
		if (kind === 'github') return value?.repo ?? fallback ?? $i18n.t('GitHub');
		if (kind === 'cloud') return value?.rootName ?? fallback ?? $i18n.t('Cloud');
		if (kind === 'local') return value?.rootName ?? fallback ?? $i18n.t('Local folder');
		return $i18n.t('No source');
	};

	const sourceDetailFor = (value: any) => {
		if (!value) return $i18n.t('Choose Local, Cloud, or GitHub when ready');
		if (value.kind === 'github')
			return value.branch ? `${value.repo} @ ${value.branch}` : value.repo;
		if (value.kind === 'cloud') return value.cloudPath ?? value.dest ?? value.rootName ?? '';
		if (value.kind === 'local') return value.rootDisplay ?? value.rootName ?? '';
		return '';
	};

	let githubStatus: { connected: boolean; login: string | null } = {
		connected: false,
		login: null
	};
	let githubRepos: GithubRepo[] = [];
	let githubError = '';

	const loadGithubStatus = async () => {
		try {
			githubStatus = await getGithubStatus(localStorage.token);
			githubRepos = githubStatus.connected ? await listGithubRepos(localStorage.token) : [];
		} catch {
			githubStatus = { connected: false, login: null };
			githubRepos = [];
		}
	};
	$: if (show) loadGithubStatus();

	const connectGithubAccount = async () => {
		githubError = '';
		try {
			await connectGithub(localStorage.token);
			await loadGithubStatus();
		} catch (e) {
			githubError = e instanceof Error ? e.message : 'GitHub connect failed';
		}
	};

	let disconnectingGithub = false;
	const disconnectGithubAccount = async () => {
		if (disconnectingGithub || !githubStatus.connected) return;
		if (
			!window.confirm(
				$i18n.t(
					'Disconnect GitHub? Existing cloned files stay in cloud. New clones need reconnect.'
				)
			)
		) {
			return;
		}
		disconnectingGithub = true;
		githubError = '';
		try {
			await disconnectGithub(localStorage.token);
			githubStatus = { connected: false, login: null };
			githubRepos = [];
			repoInput = '';
			branchInput = '';
			toast.info($i18n.t('GitHub disconnected'));
		} catch (e) {
			githubError = e instanceof Error ? e.message : 'GitHub disconnect failed';
		} finally {
			disconnectingGithub = false;
		}
	};

	let repoInput = '';
	let branchInput = '';
	let cloning = false;
	let cloneError = '';
	$: matchedRepo = githubRepos.find((r) => r.full_name === repoInput.trim());

	const cloneRepoIntoWorkspace = async () => {
		const repo = repoInput.trim();
		if (!repo || cloning) return;
		if (!activeFolderId) {
			cloneError = 'Select or create a project before cloning a repo.';
			return;
		}
		cloning = true;
		cloneError = '';
		try {
			let ws = await createCloudWorkspace(localStorage.token);
			terminalServers.set(await getTerminalServers(localStorage.token));
			if (ws?.id) selectedTerminalId.set(ws.id);
			const cloned = await cloneRepo(localStorage.token, repo, branchInput.trim());
			const updated = await bindGithubRepoToFolder(
				localStorage.token,
				activeFolderId,
				activeFolder,
				cloned
			);
			if (updated) await selectedFolder.set(updated);
			repoInput = '';
			branchInput = '';
			show = false;
			toast.success($i18n.t('Repo cloned'));
		} catch (e) {
			cloneError = e instanceof Error ? e.message : 'clone failed';
		} finally {
			cloning = false;
		}
	};
</script>

<Dropdown bind:show align="start">
	<slot />

	<div slot="content">
		<div
			class="min-w-80 max-w-96 rounded-2xl px-1 py-1 border border-gray-100 dark:border-gray-800 z-50 bg-white dark:bg-gray-850 dark:text-white shadow-lg max-h-96 overflow-y-auto overflow-x-hidden scrollbar-thin"
		>
			<div class="px-3 py-2">
				<div
					class="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
				>
					{$i18n.t('Project')}
				</div>
				<div class="mt-1 flex items-start gap-2">
					<Folder
						className="mt-0.5 size-4 shrink-0 text-gray-500 dark:text-gray-400"
						strokeWidth="2"
					/>
					<div class="min-w-0">
						<div class="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
							{projectName}
						</div>
						<div class="truncate text-xs text-gray-500 dark:text-gray-400">
							{sourceDetail}
						</div>
					</div>
				</div>
			</div>

			<hr class="border-gray-100 dark:border-gray-800 my-1" />

			<div class="px-3 py-2">
				<div
					class="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
				>
					{$i18n.t('Source')}
				</div>
				<div class="mt-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
					{#if sourceKind === 'github'}
						<Github className="size-4 shrink-0" />
					{:else if sourceKind === 'cloud'}
						<Cloud className="size-4 shrink-0" strokeWidth="2" />
					{:else}
						<Folder className="size-4 shrink-0" strokeWidth="2" />
					{/if}
					<span class="truncate">{sourceLabel}</span>
					{#if sourceKind}
						<span
							class="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400"
						>
							{$i18n.t(workspaceKindLabel(sourceKind))}
						</span>
					{/if}
				</div>
			</div>

			<hr class="border-gray-100 dark:border-gray-800 my-1" />

			<div class="px-3 py-1">
				<div
					class="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
				>
					{$i18n.t('GitHub')}
				</div>
			</div>

			<button
				type="button"
				disabled={githubStatus.connected}
				class="flex w-full justify-between gap-2 items-center px-3 py-2 text-sm rounded-xl {githubStatus.connected
					? 'opacity-75 cursor-default'
					: 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
				on:click={connectGithubAccount}
			>
				<div class="flex flex-1 gap-2 items-center truncate">
					<Github className="size-4 shrink-0" />
					<span class="truncate"
						>{githubStatus.connected ? githubStatus.login : $i18n.t('Connect GitHub')}</span
					>
				</div>
				{#if githubStatus.connected}
					<div class="shrink-0 text-emerald-600 dark:text-emerald-400">
						<Check className="size-4" strokeWidth="2" />
					</div>
				{/if}
			</button>

			{#if githubStatus.connected}
				<div class="px-3 pb-1">
					<button
						type="button"
						disabled={disconnectingGithub}
						class="rounded-lg px-2 py-1 text-xs text-gray-500 dark:text-gray-400 {disconnectingGithub
							? 'cursor-wait opacity-50'
							: 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200'}"
						on:click={disconnectGithubAccount}
					>
						{disconnectingGithub ? $i18n.t('Disconnecting...') : $i18n.t('Disconnect')}
					</button>
				</div>
			{/if}

			{#if githubError}
				<p class="px-3 pb-1 text-xs text-amber-600 dark:text-amber-500">{githubError}</p>
			{/if}

			{#if githubStatus.connected}
				<div class="px-3 py-1.5">
					<form class="flex flex-col gap-1.5" on:submit|preventDefault={cloneRepoIntoWorkspace}>
						<input
							bind:value={repoInput}
							list="enos-gh-repos"
							placeholder="owner/repo"
							disabled={cloning}
							class="w-full rounded-lg bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-emerald-500/40"
						/>
						<datalist id="enos-gh-repos">
							{#each githubRepos as r}
								<option value={r.full_name}></option>
							{/each}
						</datalist>
						<div class="flex gap-1.5 items-center">
							<input
								bind:value={branchInput}
								placeholder={matchedRepo ? matchedRepo.default_branch : 'branch (optional)'}
								disabled={cloning}
								class="flex-1 min-w-0 rounded-lg bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-emerald-500/40"
							/>
							<button
								type="submit"
								disabled={cloning || !repoInput.trim()}
								class="shrink-0 rounded-lg px-2.5 py-1 text-xs {cloning || !repoInput.trim()
									? 'opacity-50 cursor-not-allowed'
									: 'cursor-pointer bg-emerald-600 text-white hover:bg-emerald-500'}"
							>
								{cloning ? $i18n.t('Cloning...') : $i18n.t('Clone')}
							</button>
						</div>
					</form>
					{#if cloneError}
						<p class="mt-1 text-xs text-red-500 truncate">{cloneError}</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</Dropdown>
