<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	import {
		settings,
		showDeskFolderPicker,
		selectedFolder,
		showFileNavPath,
		showLocalFileFolderId,
		terminalServers,
		selectedTerminalId,
		user
	} from '$lib/stores';
	import { getToolServersData } from '$lib/apis';
	import { getTerminalServers } from '$lib/apis/terminal';
	import {
		createCloudWorkspace,
		getGithubStatus,
		connectGithub,
		cloneRepo,
		listGithubRepos,
		type GithubRepo
	} from '$lib/apis/workspace';
	import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';
	import { bindLocalWorkspaceToFolder } from '$lib/enos/bindLocalWorkspace';
	import { workspaceBadgeFromFolder, deskCurrentLocation } from '$lib/enos/workspaceBadge';

	import Dropdown from '$lib/components/common/Dropdown.svelte';
	import Check from '$lib/components/icons/Check.svelte';
	import Cloud from '$lib/components/icons/Cloud.svelte';
	import Folder from '$lib/components/icons/Folder.svelte';
	import Github from '$lib/components/icons/Github.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';

	type I18nStore = Readable<{ t: (key: string, options?: Record<string, unknown>) => string }>;

	const i18n = getContext<I18nStore>('i18n');

	export let show = false;
	export let activeFolderId: string | null = null;
	export let activeFolder: any = null;

	$: hasDesktopBridge = Boolean(getEnosDesktopBridge());
	// Reflect the project's CURRENT local binding so the Local row reads as state
	// ("Codex" + ✓), not a generic "Bind this project to a folder" action when it
	// is in fact already bound. Same source the badge reads.
	$: boundBadge = workspaceBadgeFromFolder(activeFolder);
	$: isLocalBound = hasDesktopBridge && boundBadge.kind === 'local' && Boolean(boundBadge.name);
	// Binary current location — the SAME signal the badge + Files panel use. The ✓ marks
	// where work is happening NOW (exactly one row), not every binding that merely exists.
	// (Before: Local ✓ = "bound locally" AND Cloud ✓ = "terminal selected" → two checks.)
	$: currentLocation = deskCurrentLocation({
		cloudWorkspaceActive: Boolean($selectedTerminalId),
		localBridgePresent: hasDesktopBridge,
		projectKind: boundBadge.kind
	});
	$: isLocalActive = currentLocation === 'local';
	// Cloud = ENOS-managed per-user workspaces (ws-*). Legacy/shared or externally
	// added terminal servers are filtered out so the picker reads cleanly as
	// Local · Cloud · GitHub (the user's mental model), not a pile of terminals.
	$: systemTerminals = ($terminalServers ?? []).filter(
		(terminal) => terminal.id && String(terminal.id).startsWith('ws-')
	);
	$: directTerminals = ($settings?.terminalServers ?? []).filter((terminal) => terminal.url);
	$: canUseDirectTerminals =
		$user?.role === 'admin' || ($user?.permissions?.features?.direct_tool_servers ?? true);

	const refreshTerminalServersStore = async (servers: typeof directTerminals) => {
		const existingSystemTerminals = ($terminalServers ?? []).filter((terminal) => terminal.id);
		const activeTerminals = servers.filter((server) => server.enabled);

		if (activeTerminals.length > 0) {
			let data = await getToolServersData(
				activeTerminals.map((terminal) => ({
					url: terminal.url,
					auth_type: terminal.auth_type ?? 'bearer',
					key: terminal.key ?? '',
					path: terminal.path ?? '/openapi.json',
					config: { enable: true }
				}))
			);
			data = data.filter((terminal) => terminal && !terminal.error);
			terminalServers.set([...(data as any[]), ...existingSystemTerminals]);
		} else {
			terminalServers.set(existingSystemTerminals);
		}
	};

	// Local and Cloud are mutually exclusive (binary location). Switching to Local must
	// deactivate any active cloud workspace/terminal, else both rows stay "selected".
	const deactivateCloudWorkspace = async () => {
		if ($selectedTerminalId) selectedTerminalId.set(null);
		if (($settings?.terminalServers ?? []).some((server) => server?.enabled)) {
			const updatedServers = ($settings.terminalServers ?? []).map((server) => ({
				...server,
				enabled: false
			}));
			settings.set({ ...$settings, terminalServers: updatedServers });
			await refreshTerminalServersStore(updatedServers);
		}
	};

	const selectLocal = async () => {
		if (!hasDesktopBridge) return;

		if (activeFolderId) {
			show = false;
			// Binary switch: leaving Cloud for Local.
			await deactivateCloudWorkspace();
			const updated = await bindLocalWorkspaceToFolder(
				localStorage.token,
				activeFolderId,
				activeFolder
			);
			if (updated) {
				await selectedFolder.set(updated);
				showLocalFileFolderId.set(activeFolderId);
				// Prep the file pane's content (root view) but do not force it open —
				// the user opens the right pane via the Controls toggle when they want it.
				showFileNavPath.set('.');
			}
			return;
		}

		showDeskFolderPicker.set(true);
		show = false;
	};

	const selectDirect = async (terminal: (typeof directTerminals)[0]) => {
		const terminalId = terminal.url ?? null;
		if (!terminalId) return;

		const newId = $selectedTerminalId === terminalId ? null : terminalId;
		selectedTerminalId.set(newId);

		const updatedServers = ($settings?.terminalServers ?? []).map((server) => ({
			...server,
			enabled: newId !== null && server.url === terminalId
		}));

		settings.set({
			...$settings,
			terminalServers: updatedServers
		});

		show = false;
		await refreshTerminalServersStore(updatedServers);
	};

	const selectSystem = async (terminal: (typeof systemTerminals)[0]) => {
		const terminalId = terminal.id ?? null;
		if (!terminalId) return;

		selectedTerminalId.set($selectedTerminalId === terminalId ? null : terminalId);

		if ($settings?.terminalServers?.some((server) => server.enabled)) {
			const updatedServers = ($settings.terminalServers ?? []).map((server) => ({
				...server,
				enabled: false
			}));

			settings.set({
				...$settings,
				terminalServers: updatedServers
			});

			await refreshTerminalServersStore(updatedServers);
		}

		show = false;
	};

	// --- S5: ENOS-managed cloud workspace + GitHub ---
	let creatingCloud = false;
	let githubStatus: { connected: boolean; login: string | null } = { connected: false, login: null };

	let githubRepos: GithubRepo[] = [];
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
	// Auto-fill the default branch when the typed repo matches one of the user's.
	$: matchedRepo = githubRepos.find((r) => r.full_name === repoInput.trim());

	// Provision (or reuse) the user's cloud workspace, then reload the system
	// terminals so the freshly-registered, owner-scoped connection appears + selects.
	const createCloud = async () => {
		if (creatingCloud) return;
		creatingCloud = true;
		try {
			const ws = await createCloudWorkspace(localStorage.token);
			terminalServers.set(await getTerminalServers(localStorage.token));
			if (ws?.id) {
				selectedTerminalId.set(ws.id);
				show = false;
			}
		} catch (e) {
			console.warn('cloud workspace create failed', e);
		} finally {
			creatingCloud = false;
		}
	};

	let githubError = '';
	const connectGithubAccount = async () => {
		githubError = '';
		try {
			await connectGithub(localStorage.token); // navigates to GitHub OAuth
		} catch (e) {
			githubError = e instanceof Error ? e.message : 'GitHub connect failed';
		}
	};

	// Clone a repo (owner/name) into the user's cloud workspace. Provisions one
	// first if none is running, so "connected → type repo → Clone" just works.
	let repoInput = '';
	let branchInput = '';
	let cloning = false;
	let cloneError = '';
	const cloneRepoIntoWorkspace = async () => {
		const repo = repoInput.trim();
		if (!repo || cloning) return;
		cloning = true;
		cloneError = '';
		try {
			let ws = await createCloudWorkspace(localStorage.token); // idempotent: reuse if exists
			terminalServers.set(await getTerminalServers(localStorage.token));
			if (ws?.id) selectedTerminalId.set(ws.id);
			await cloneRepo(localStorage.token, repo, branchInput.trim());
			repoInput = '';
			branchInput = '';
			show = false;
		} catch (e) {
			cloneError = e instanceof Error ? e.message : 'clone failed';
		} finally {
			cloning = false;
		}
	};

	const directLabel = (terminal: (typeof directTerminals)[0]) =>
		terminal.name || terminal.url?.replace(/^https?:\/\//, '') || $i18n.t('Cloud environment');
</script>

<Dropdown bind:show align="end">
	<slot />

	<div slot="content">
		<div
			class="min-w-64 max-w-64 rounded-2xl px-1 py-1 border border-gray-100 dark:border-gray-800 z-50 bg-white dark:bg-gray-850 dark:text-white shadow-lg max-h-80 overflow-y-auto overflow-x-hidden scrollbar-thin"
		>
			<button
				type="button"
				disabled={!hasDesktopBridge}
				class="flex w-full justify-between gap-2 items-center px-3 py-2 text-sm rounded-xl {hasDesktopBridge
					? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'
					: 'cursor-not-allowed opacity-50'}"
				on:click={selectLocal}
			>
				<div class="flex flex-1 gap-2 items-center truncate">
					<Folder className="size-4 shrink-0" strokeWidth="2" />
					<div class="flex min-w-0 flex-1 flex-col items-start">
						<span class="truncate">{$i18n.t('Local')}</span>
						<span class="truncate text-xs text-gray-400 dark:text-gray-500">
							{#if !hasDesktopBridge}
								{$i18n.t('Available in the desktop app')}
							{:else if isLocalBound}
								{boundBadge.name}
							{:else if activeFolderId}
								{$i18n.t('Bind this project to a folder')}
							{:else}
								{$i18n.t('Desktop only')}
							{/if}
						</span>
					</div>
				</div>
				{#if isLocalActive}
					<div class="shrink-0 text-emerald-600 dark:text-emerald-400">
						<Check className="size-4" strokeWidth="2" />
					</div>
				{/if}
			</button>

			<hr class="border-gray-100 dark:border-gray-800 my-1" />

			<div class="flex items-center justify-between px-3 py-1">
				<span class="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
					{$i18n.t('Cloud')}
				</span>
			</div>

			{#if canUseDirectTerminals}
				{#each directTerminals as terminal}
					<button
						type="button"
						class="flex w-full justify-between gap-2 items-center px-3 py-1.5 text-sm cursor-pointer rounded-xl {$selectedTerminalId ===
						terminal.url
							? 'bg-gray-50 dark:bg-gray-800/50'
							: 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
						on:click={() => selectDirect(terminal)}
					>
						<div class="flex flex-1 gap-2 items-center truncate">
							<Cloud className="size-4 shrink-0" strokeWidth="2" />
							<div class="flex min-w-0 flex-1 flex-col items-start">
								<span class="truncate">{directLabel(terminal)}</span>
								<span class="truncate text-xs text-gray-400 dark:text-gray-500">
									{$i18n.t('Cloud terminal')}
								</span>
							</div>
						</div>
						{#if $selectedTerminalId === terminal.url}
							<div class="shrink-0 text-emerald-600 dark:text-emerald-400">
								<Check className="size-4" strokeWidth="2" />
							</div>
						{/if}
					</button>
				{/each}
			{/if}

			{#each systemTerminals as terminal}
				<button
					type="button"
					class="flex w-full justify-between gap-2 items-center px-3 py-1.5 text-sm cursor-pointer rounded-xl {$selectedTerminalId ===
					terminal.id
						? 'bg-gray-50 dark:bg-gray-800/50'
						: 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
					on:click={() => selectSystem(terminal)}
				>
					<div class="flex flex-1 gap-2 items-center truncate">
						<Cloud className="size-4 shrink-0" strokeWidth="2" />
						<div class="flex min-w-0 flex-1 flex-col items-start">
							<span class="truncate">{terminal.name || terminal.id || $i18n.t('Cloud environment')}</span>
							<!-- Honest label: a cloud terminal/compute env, NOT where this project's
							     files live. Stops "ENOS Workspace ✓" reading as the project's location
							     while the badge says Local. The real cloud-hosted project (kind:'cloud'
							     + migration) is roadmap, not this. -->
							<span class="truncate text-xs text-gray-400 dark:text-gray-500">
								{$i18n.t('Cloud terminal')}
							</span>
						</div>
					</div>
					{#if $selectedTerminalId === terminal.id}
						<div class="shrink-0 text-emerald-600 dark:text-emerald-400">
							<Check className="size-4" strokeWidth="2" />
						</div>
					{/if}
				</button>
			{/each}

			<!-- One cloud workspace per user (provisioning is idempotent), so only offer
			     "New" when there isn't one yet — otherwise it just re-selects the existing
			     one, which reads as confusing ("new from what?"). -->
			{#if systemTerminals.length === 0}
				<button
					type="button"
					disabled={creatingCloud}
					class="flex w-full gap-2 items-center px-3 py-1.5 text-sm rounded-xl text-gray-600 dark:text-gray-300 {creatingCloud
						? 'opacity-50 cursor-wait'
						: 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
					on:click={createCloud}
				>
					<Cloud className="size-4 shrink-0" strokeWidth="2" />
					<span class="truncate"
						>{creatingCloud
							? $i18n.t('Creating cloud workspace…')
							: $i18n.t('Set up cloud workspace')}</span
					>
				</button>
			{/if}

			<hr class="border-gray-100 dark:border-gray-800 my-1" />

			<button
				type="button"
				disabled={githubStatus.connected}
				class="flex w-full justify-between gap-2 items-center px-3 py-2 text-sm rounded-xl {githubStatus.connected
					? 'opacity-70 cursor-default'
					: 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
				on:click={connectGithubAccount}
			>
				<div class="flex flex-1 gap-2 items-center truncate">
					<Github className="size-4 shrink-0" />
					<div class="flex min-w-0 flex-1 flex-col items-start">
						<span class="truncate"
							>{githubStatus.connected ? githubStatus.login : $i18n.t('Connect GitHub')}</span
						>
						<span class="truncate text-xs text-gray-400 dark:text-gray-500">
							{githubStatus.connected
								? $i18n.t('Connected')
								: $i18n.t('Clone a repo into your workspace')}
						</span>
					</div>
				</div>
				{#if githubStatus.connected}
					<div class="shrink-0 text-emerald-600 dark:text-emerald-400">
						<Check className="size-4" strokeWidth="2" />
					</div>
				{/if}
			</button>

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
								<option value={r.full_name} />
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
								{cloning ? $i18n.t('Cloning…') : $i18n.t('Clone')}
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
