<script lang="ts">
	import { getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { Readable } from 'svelte/store';

	import {
		settings,
		showDeskFolderPicker,
		selectedFolder,
		showControls,
		showFileNavPath,
		showFileNavDir,
		showLocalFileFolderId,
		terminalServers,
		selectedTerminalId
	} from '$lib/stores';
	import { getToolServersData } from '$lib/apis';
	import { updateFolderById } from '$lib/apis/folders';
	import { getTerminalServers } from '$lib/apis/terminal';
	import { createCloudWorkspace, uploadLocalProjectToCloud } from '$lib/apis/workspace';
	import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';
	import { bindLocalWorkspaceToFolder } from '$lib/enos/bindLocalWorkspace';
	import { cloudProjectContextSource } from '$lib/enos/cloudUpload';
	import { resolveCloudProjectRoot } from '$lib/enos/cloudFiles';
	import { mergeCloudWorkspaceTerminalEntries } from '$lib/enos/cloudWorkspaceTerminal';
	import {
		workspaceBadgeFromFolder,
		deskCurrentLocation,
		deskBadgeKind,
		systemCloudWorkspaceId
	} from '$lib/enos/workspaceBadge';
	import { consequenceLines, homeSection } from '$lib/enos/workspaceConsequences';

	import Dropdown from '$lib/components/common/Dropdown.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import Modal from '$lib/components/common/Modal.svelte';
	import Check from '$lib/components/icons/Check.svelte';
	import Cloud from '$lib/components/icons/Cloud.svelte';
	import Folder from '$lib/components/icons/Folder.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';

	type I18nStore = Readable<{ t: (key: string, options?: Record<string, unknown>) => string }>;
	type TerminalServerConfig = {
		url?: string;
		enabled?: boolean;
		auth_type?: string;
		key?: string;
		path?: string;
	};

	const i18n = getContext<I18nStore>('i18n');

	export let show = false;
	export let activeFolderId: string | null = null;
	export let activeFolder: any = null;

	$: hasDesktopBridge = Boolean(getEnosDesktopBridge());
	$: boundBadge = workspaceBadgeFromFolder(activeFolder);
	$: isLocalBound = hasDesktopBridge && boundBadge.kind === 'local' && Boolean(boundBadge.name);
	$: currentLocation = deskCurrentLocation({
		cloudWorkspaceActive: Boolean($selectedTerminalId),
		localBridgePresent: hasDesktopBridge,
		projectKind: boundBadge.kind
	});
	$: isLocalActive = currentLocation === 'local';
	// Single source of truth for the trigger chip: the SAME reactive currentLocation
	// the menu uses, so the trigger label/icon can never disagree with the checkmark.
	$: triggerKind = deskBadgeKind({ location: currentLocation, projectKind: boundBadge.kind });
	// F3/Q7 explainer: what the current location MEANS (where files live, privacy,
	// reach). Kind = the live location when known, else the bound origin.
	$: explainerKind = currentLocation ?? boundBadge.kind;
	$: explainerLines = consequenceLines({ kind: explainerKind, repo: boundBadge.name });
	// Cloud "home" section. wiredCloudTools = the cloud workspace's connected MCP/
	// tool servers by display name. No such list is in scope here without a new
	// fetch, so default to [] → the honest teach line renders (not a dead chips row).
	// TODO(home-chips): wire real connected-tool names (e.g. GitHub, context7).
	$: wiredCloudTools = [] as string[];
	$: cloudHome = currentLocation === 'cloud' ? homeSection({ wiredTools: wiredCloudTools }) : null;
	$: systemTerminals = ($terminalServers ?? []).filter(
		(terminal) => terminal.id && String(terminal.id).startsWith('ws-')
	);
	$: firstSystemTerminal = systemTerminals[0] ?? null;
	$: webDeskCloudLocked = !hasDesktopBridge;
	$: firstSystemTerminalId = systemCloudWorkspaceId($terminalServers);
	const ensureWebDeskCloudSelected = () => {
		if (webDeskCloudLocked && firstSystemTerminalId && !$selectedTerminalId) {
			selectedTerminalId.set(firstSystemTerminalId);
		}
	};
	$: ensureWebDeskCloudSelected();

	const refreshTerminalServersStore = async (servers: TerminalServerConfig[]) => {
		const existingSystemTerminals = ($terminalServers ?? []).filter((terminal) => terminal.id);
		const activeTerminals = servers.filter((server) => server.enabled && server.url);

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

	const notifyDesktopBridgeActive = () => {
		window.dispatchEvent(new CustomEvent('enos:desktop-bridge-active'));
	};

	let copyingLocalProjectToCloud = false;
	let creatingCloud = false;
	let showEnvironmentSwitchConfirm = false;
	let showCreateCloudEnvironmentModal = false;
	let pendingSwitchTarget: 'local' | 'cloud' | null = null;
	let pendingSwitchAction: (() => Promise<void> | void) | null = null;
	let cloudEnvironmentName = 'Default';
	let cloudEnvironmentNetworkAccess = 'trusted';
	let cloudEnvironmentVariables = '';
	let cloudEnvironmentSetupScript = '';

	$: canCreateCloudEnvironment = cloudEnvironmentName.trim().length > 0 && !creatingCloud;

	const cloudEnvironmentLabel = (terminal: (typeof systemTerminals)[0] | null) => {
		const name = String(terminal?.name ?? '').trim();
		if (!name || name === terminal?.id || name.startsWith('ws-') || name === 'Cloud Workspace') {
			return $i18n.t('ENOS Cloud');
		}
		return name;
	};

	const resetCloudEnvironmentForm = () => {
		cloudEnvironmentName = systemTerminals.length === 0 ? 'Default' : '';
		cloudEnvironmentNetworkAccess = 'trusted';
		cloudEnvironmentVariables = '';
		cloudEnvironmentSetupScript = '';
	};

	const openCreateCloudEnvironment = () => {
		resetCloudEnvironmentForm();
		show = false;
		showCreateCloudEnvironmentModal = true;
	};

	// T9 dependency: the "Private to your workspace only" promise in the F4 home-
	// adoption copy requires per-user cloud isolation. Do not present that as a
	// privacy GUARANTEE in prod until T9 isolation is verified.
	// TODO(f4-publish): a "Publish to GitHub instead" alternative (the portable
	// bridge) is deferred until an app→GitHub publish action exists — connectGithub
	// only starts OAuth, so offering it here would be a dead/misleading affordance.
	const copyLocalProjectIntoCloudWorkspace = async () => {
		if (!activeFolderId || copyingLocalProjectToCloud) return;

		const bridge = getEnosDesktopBridge();
		if (!bridge?.exportProjectArchive) {
			throw new Error($i18n.t('Restart ENOS Desk to enable local project actions.'));
		}

		copyingLocalProjectToCloud = true;
		try {
			const ws = await createCloudWorkspace(localStorage.token);
			const archive = await bridge.exportProjectArchive(activeFolderId);
			const imported = await uploadLocalProjectToCloud(localStorage.token, archive);
			const servers = await getTerminalServers(localStorage.token);
			const cloudSource = cloudProjectContextSource(archive, imported);

			terminalServers.update((existing) =>
				mergeCloudWorkspaceTerminalEntries(existing, servers, localStorage.token)
			);
			if (ws?.id) selectedTerminalId.set(ws.id);
			showFileNavDir.set(resolveCloudProjectRoot(cloudSource) ?? '/home/user/');
			showControls.set(true);

			const folder =
				$selectedFolder?.id === activeFolderId ? $selectedFolder : { id: activeFolderId, data: {} };
			const data = {
				...(folder?.data ?? {}),
				project_context_source: cloudSource,
				project_context_updated_at: new Date().toISOString()
			};
			const updated = await updateFolderById(localStorage.token, activeFolderId, { data });
			if ($selectedFolder?.id === activeFolderId) {
				selectedFolder.set({
					...folder,
					...(updated ?? {}),
					id: activeFolderId,
					data
				});
			}

			toast.success($i18n.t('Project copied to cloud'));
		} finally {
			copyingLocalProjectToCloud = false;
		}
	};

	const needsEnvironmentSwitchConfirm = (target: 'local' | 'cloud') => {
		if (webDeskCloudLocked) return false;
		return (
			(target === 'cloud' && currentLocation === 'local') ||
			(target === 'local' && currentLocation === 'cloud')
		);
	};

	// F4: moving local→cloud is adopting a HOME, not "uploading files". The triad
	// (comes-along / stays-here / private-to) kills the deletion fear — it's a COPY.
	// REACTIVE (not a function): the dialog title/message must recompute when
	// pendingSwitchTarget flips — a plain `() =>` call isn't tracked by Svelte, so the
	// title rendered STALE (showed "Work locally?" while switching TO cloud).
	$: environmentSwitchTitle =
		pendingSwitchTarget === 'cloud' ? 'Give this project a home in ENOS Cloud' : 'Work locally?';

	$: environmentSwitchMessage =
		pendingSwitchTarget === 'cloud'
			? 'A copy runs on ENOS’s always-on machine — reachable from any device. ' +
				'Comes along: this project’s files + history. Stays here: the original, on this Mac. ' +
				'Private to: your workspace only.'
			: 'Choose or bind a folder on this device. ENOS Cloud files stay in ENOS Cloud until a local copy is added.';

	const clearPendingSwitch = () => {
		pendingSwitchTarget = null;
		pendingSwitchAction = null;
	};

	const runWithEnvironmentConfirmation = async (
		target: 'local' | 'cloud',
		action: () => Promise<void> | void
	) => {
		if (!needsEnvironmentSwitchConfirm(target)) {
			await action();
			return;
		}
		pendingSwitchTarget = target;
		pendingSwitchAction = action;
		showEnvironmentSwitchConfirm = true;
	};

	const confirmPendingSwitch = async () => {
		const action = pendingSwitchAction;
		clearPendingSwitch();
		await action?.();
	};

	const selectLocal = async () => {
		if (!hasDesktopBridge) return;
		await runWithEnvironmentConfirmation('local', async () => {
			if (activeFolderId) {
				show = false;
				notifyDesktopBridgeActive();
				await deactivateCloudWorkspace();
				const updated = await bindLocalWorkspaceToFolder(
					localStorage.token,
					activeFolderId,
					activeFolder
				);
				if (updated) {
					await selectedFolder.set(updated);
					showLocalFileFolderId.set(activeFolderId);
					showFileNavPath.set('.');
					toast.info($i18n.t('Working on your device'));
				}
				return;
			}

			show = false;
			showDeskFolderPicker.set(true);
		});
	};

	const activateSystemTerminal = async (nextId: string | null) => {
		selectedTerminalId.set(nextId);

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
		if (nextId) toast.info($i18n.t('Working in ENOS Cloud'));
	};

	const selectSystem = async (terminal: (typeof systemTerminals)[0]) => {
		const terminalId = terminal?.id ?? null;
		if (!terminalId) return;

		const nextId = webDeskCloudLocked
			? terminalId
			: $selectedTerminalId === terminalId
				? null
				: terminalId;
		if (nextId && currentLocation === 'local' && isLocalBound) {
			await runWithEnvironmentConfirmation('cloud', async () => {
				try {
					await copyLocalProjectIntoCloudWorkspace();
					show = false;
				} catch (e) {
					toast.error(e instanceof Error ? e.message : $i18n.t('Failed to copy project to cloud'));
				}
			});
			return;
		}
		if (nextId && currentLocation !== 'cloud') {
			await runWithEnvironmentConfirmation('cloud', () => activateSystemTerminal(nextId));
			return;
		}
		await activateSystemTerminal(nextId);
	};

	const createCloud = async () => {
		if (creatingCloud) return false;
		if (currentLocation === 'local' && isLocalBound) {
			await runWithEnvironmentConfirmation('cloud', async () => {
				try {
					await copyLocalProjectIntoCloudWorkspace();
					show = false;
					showCreateCloudEnvironmentModal = false;
				} catch (e) {
					toast.error(e instanceof Error ? e.message : $i18n.t('Failed to copy project to cloud'));
				}
			});
			return false;
		}

		creatingCloud = true;
		try {
			const ws = await createCloudWorkspace(localStorage.token);
			const servers = await getTerminalServers(localStorage.token);
			terminalServers.update((existing) =>
				mergeCloudWorkspaceTerminalEntries(existing, servers, localStorage.token)
			);
			if (ws?.id) {
				selectedTerminalId.set(ws.id);
				show = false;
				toast.info($i18n.t('Working in ENOS Cloud'));
			}
			return Boolean(ws?.id);
		} catch (e) {
			console.warn('ENOS Cloud environment create failed', e);
			toast.error($i18n.t('Failed to create ENOS Cloud environment.'));
			return false;
		} finally {
			creatingCloud = false;
		}
	};

	const createCloudEnvironment = async () => {
		if (!canCreateCloudEnvironment) return;
		const created = await createCloud();
		if (created) showCreateCloudEnvironmentModal = false;
	};
</script>

<Dropdown bind:show align="end">
	<slot {triggerKind} />

	<div slot="content">
		<div
			class="min-w-64 max-w-72 rounded-2xl px-1 py-1 border border-gray-100 dark:border-gray-800 z-50 bg-white dark:bg-gray-850 dark:text-white shadow-lg max-h-96 overflow-y-auto overflow-x-hidden scrollbar-thin"
		>
			<div class="flex items-center justify-between px-3 py-1">
				<span
					class="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
				>
					{$i18n.t('Environment')}
				</span>
			</div>

			{#if explainerLines.length > 0}
				<div class="px-3 pb-2 pt-1 space-y-0.5">
					{#each explainerLines as line}
						<div class="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
							{$i18n.t(line)}
						</div>
					{/each}
					{#if cloudHome}
						<div class="pt-1.5">
							{#if cloudHome.tools.length > 0}
								<div class="flex flex-wrap gap-1">
									{#each cloudHome.tools as tool}
										<span
											class="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] text-gray-600 dark:text-gray-300"
											>{tool}</span
										>
									{/each}
								</div>
								<div class="pt-1 text-[10px] text-gray-400 dark:text-gray-500">
									{$i18n.t(cloudHome.tagline)}
								</div>
							{:else}
								<div class="text-[10px] text-gray-400 dark:text-gray-500">
									{$i18n.t(cloudHome.tagline)}
								</div>
							{/if}
						</div>
					{/if}
				</div>
				<div class="mx-3 mb-1 border-t border-gray-100 dark:border-gray-800"></div>
			{/if}

			{#if !webDeskCloudLocked}
				<button
					type="button"
					class="flex w-full justify-between gap-2 items-center px-3 py-2 text-sm rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
					on:click={selectLocal}
				>
					<div class="flex flex-1 gap-2 items-center truncate">
						<Folder className="size-4 shrink-0" strokeWidth="2" />
						<span class="truncate">{$i18n.t('Local')}</span>
					</div>
					{#if isLocalActive}
						<div class="shrink-0 text-emerald-600 dark:text-emerald-400">
							<Check className="size-4" strokeWidth="2" />
						</div>
					{/if}
				</button>
			{/if}

			{#if systemTerminals.length > 0}
				<button
					type="button"
					aria-label={$i18n.t('ENOS Cloud')}
					class="flex w-full justify-between gap-2 items-center px-3 py-2 text-sm cursor-pointer rounded-xl {$selectedTerminalId ===
					firstSystemTerminal?.id
						? 'bg-gray-50 dark:bg-gray-800/50'
						: 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
					on:click={() => selectSystem(firstSystemTerminal)}
				>
					<div class="flex flex-1 gap-2 items-center truncate">
						<Cloud className="size-4 shrink-0" strokeWidth="2" />
						<span class="truncate">{cloudEnvironmentLabel(firstSystemTerminal)}</span>
					</div>
					{#if $selectedTerminalId === firstSystemTerminal?.id}
						<div class="shrink-0 text-emerald-600 dark:text-emerald-400">
							<Check className="size-4" strokeWidth="2" />
						</div>
					{/if}
				</button>
			{/if}

			<button
				type="button"
				disabled={creatingCloud}
				class="flex w-full justify-between gap-2 items-center px-3 py-2 text-sm rounded-xl text-gray-500 dark:text-gray-400 {creatingCloud
					? 'cursor-wait opacity-50'
					: 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
				on:click={openCreateCloudEnvironment}
			>
				<div class="flex flex-1 gap-2 items-center truncate">
					<Plus className="size-4 shrink-0" strokeWidth="2" />
					<span class="truncate"
						>{creatingCloud
							? $i18n.t('Creating ENOS Cloud environment...')
							: $i18n.t('Add ENOS Cloud environment...')}</span
					>
				</div>
			</button>
		</div>
	</div>
</Dropdown>

<Modal
	size="lg"
	bind:show={showCreateCloudEnvironmentModal}
	className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-[1.5rem]"
>
	<form
		class="px-6 py-5 dark:text-gray-200"
		on:submit|preventDefault={() => {
			createCloudEnvironment();
		}}
	>
		<div class="flex items-start justify-between gap-4">
			<div class="text-xl font-semibold tracking-normal">{$i18n.t('New ENOS Cloud environment')}</div>
			<button
				type="button"
				class="rounded-full p-1 text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-850"
				aria-label={$i18n.t('Close')}
				on:click={() => {
					showCreateCloudEnvironmentModal = false;
				}}
			>
				<XMark className="size-5" />
			</button>
		</div>

		<div class="mt-6 space-y-5">
			<div>
				<label
					for="cloud-environment-name"
					class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					{$i18n.t('Name')}
				</label>
				<input
					id="cloud-environment-name"
					class="w-full rounded-xl border border-gray-200 bg-transparent px-4 py-2.5 text-sm outline-hidden transition placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-800 dark:placeholder:text-gray-600 dark:focus:border-gray-600"
					type="text"
					bind:value={cloudEnvironmentName}
					placeholder={$i18n.t('Default')}
					autocomplete="off"
				/>
			</div>

			<div>
				<label
					for="cloud-environment-network-access"
					class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					{$i18n.t('Network access')}
				</label>
				<select
					id="cloud-environment-network-access"
					class="w-full rounded-xl border border-gray-200 bg-transparent px-4 py-2.5 text-sm outline-hidden transition focus:border-gray-400 dark:border-gray-800 dark:focus:border-gray-600"
					bind:value={cloudEnvironmentNetworkAccess}
				>
					<option value="trusted">{$i18n.t('Trusted')}</option>
					<option value="restricted">{$i18n.t('Restricted')}</option>
				</select>
			</div>

			<div>
				<label
					for="cloud-environment-variables"
					class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					{$i18n.t('Environment variables')}
				</label>
				<textarea
					id="cloud-environment-variables"
					class="min-h-32 w-full resize-y rounded-xl border border-gray-200 bg-transparent px-4 py-3 text-sm outline-hidden transition placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-800 dark:placeholder:text-gray-600 dark:focus:border-gray-600"
					bind:value={cloudEnvironmentVariables}
					placeholder={'NODE_ENV=production\nGIT_AUTHOR_NAME=Your Name'}
				></textarea>
			</div>

			<div>
				<label
					for="cloud-environment-setup-script"
					class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					{$i18n.t('Setup script')}
				</label>
				<textarea
					id="cloud-environment-setup-script"
					class="min-h-32 w-full resize-y rounded-xl border border-gray-200 bg-transparent px-4 py-3 text-sm outline-hidden transition placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-800 dark:placeholder:text-gray-600 dark:focus:border-gray-600"
					bind:value={cloudEnvironmentSetupScript}
					placeholder={'#!/bin/bash\nnpm install'}
				></textarea>
			</div>
		</div>

		<div class="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4 text-sm font-medium dark:border-gray-800">
			<button
				type="button"
				class="rounded-full px-4 py-2 transition hover:bg-gray-100 dark:hover:bg-gray-850"
				on:click={() => {
					showCreateCloudEnvironmentModal = false;
				}}
			>
				{$i18n.t('Cancel')}
			</button>
			<button
				class="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-950 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-gray-100"
				type="submit"
				disabled={!canCreateCloudEnvironment}
			>
				{$i18n.t('Create environment')}
			</button>
		</div>
	</form>
</Modal>

<ConfirmDialog
	bind:show={showEnvironmentSwitchConfirm}
	title={$i18n.t(environmentSwitchTitle)}
	confirmLabel={$i18n.t(pendingSwitchTarget === 'cloud' ? 'Give it a home in Cloud' : 'Continue')}
	onConfirm={confirmPendingSwitch}
	on:cancel={clearPendingSwitch}
>
	<div class="text-sm text-gray-500 dark:text-gray-400 flex-1">
		{$i18n.t(environmentSwitchMessage)}
	</div>
</ConfirmDialog>
