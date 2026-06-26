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
	import {
		workspaceBadgeFromFolder,
		deskCurrentLocation,
		systemCloudWorkspaceId
	} from '$lib/enos/workspaceBadge';

	import Dropdown from '$lib/components/common/Dropdown.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import Check from '$lib/components/icons/Check.svelte';
	import Cloud from '$lib/components/icons/Cloud.svelte';
	import Folder from '$lib/components/icons/Folder.svelte';

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
	let showEnvironmentSwitchConfirm = false;
	let pendingSwitchTarget: 'local' | 'cloud' | null = null;
	let pendingSwitchAction: (() => Promise<void> | void) | null = null;

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

			terminalServers.set(servers);
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

	const environmentSwitchTitle = () =>
		pendingSwitchTarget === 'cloud' ? 'Copy this project to cloud?' : 'Work locally?';

	const environmentSwitchMessage = () =>
		pendingSwitchTarget === 'cloud'
			? 'ENOS will upload this local folder to your private cloud workspace and continue there. Files stay on this device too.'
			: 'Choose or bind a folder on this device. Cloud files stay in cloud until cloud-to-local copy is added.';

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
		if (nextId) toast.info($i18n.t('Working in cloud'));
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

	let creatingCloud = false;
	const createCloud = async () => {
		if (creatingCloud) return;
		if (currentLocation === 'local' && isLocalBound) {
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

		creatingCloud = true;
		try {
			const ws = await createCloudWorkspace(localStorage.token);
			terminalServers.set(await getTerminalServers(localStorage.token));
			if (ws?.id) {
				selectedTerminalId.set(ws.id);
				show = false;
				toast.info($i18n.t('Working in cloud'));
			}
		} catch (e) {
			console.warn('cloud workspace create failed', e);
		} finally {
			creatingCloud = false;
		}
	};
</script>

<Dropdown bind:show align="end">
	<slot />

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

			<button
				type="button"
				disabled={!hasDesktopBridge}
				class="flex w-full justify-between gap-2 items-center px-3 py-2 text-sm rounded-xl {hasDesktopBridge
					? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'
					: 'cursor-not-allowed opacity-45'}"
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

			{#if systemTerminals.length === 0}
				<button
					type="button"
					disabled={creatingCloud}
					class="flex w-full justify-between gap-2 items-center px-3 py-2 text-sm rounded-xl {creatingCloud
						? 'cursor-wait opacity-50'
						: 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
					on:click={createCloud}
				>
					<div class="flex flex-1 gap-2 items-center truncate">
						<Cloud className="size-4 shrink-0" strokeWidth="2" />
						<span class="truncate"
							>{creatingCloud
								? $i18n.t('Creating cloud workspace...')
								: $i18n.t('Set up cloud workspace')}</span
						>
					</div>
				</button>
			{:else}
				<button
					type="button"
					class="flex w-full justify-between gap-2 items-center px-3 py-2 text-sm cursor-pointer rounded-xl {$selectedTerminalId ===
					firstSystemTerminal?.id
						? 'bg-gray-50 dark:bg-gray-800/50'
						: 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
					on:click={() => selectSystem(firstSystemTerminal)}
				>
					<div class="flex flex-1 gap-2 items-center truncate">
						<Cloud className="size-4 shrink-0" strokeWidth="2" />
						<span class="truncate">{$i18n.t('Cloud')}</span>
					</div>
					{#if $selectedTerminalId === firstSystemTerminal?.id}
						<div class="shrink-0 text-emerald-600 dark:text-emerald-400">
							<Check className="size-4" strokeWidth="2" />
						</div>
					{/if}
				</button>
			{/if}
		</div>
	</div>
</Dropdown>

<ConfirmDialog
	bind:show={showEnvironmentSwitchConfirm}
	title={$i18n.t(environmentSwitchTitle())}
	confirmLabel={$i18n.t(pendingSwitchTarget === 'cloud' ? 'Copy to cloud' : 'Continue')}
	onConfirm={confirmPendingSwitch}
	on:cancel={clearPendingSwitch}
>
	<div class="text-sm text-gray-500 dark:text-gray-400 flex-1">
		{$i18n.t(environmentSwitchMessage())}
	</div>
</ConfirmDialog>
