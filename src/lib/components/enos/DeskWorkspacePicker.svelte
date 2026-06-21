<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	import {
		settings,
		showDeskFolderPicker,
		selectedFolder,
		showSettings,
		showControls,
		showFileNavPath,
		showLocalFileFolderId,
		terminalServers,
		selectedTerminalId,
		user
	} from '$lib/stores';
	import { getToolServersData } from '$lib/apis';
	import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';
	import { bindLocalWorkspaceToFolder } from '$lib/enos/bindLocalWorkspace';

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
	$: systemTerminals = ($terminalServers ?? []).filter((terminal) => terminal.id);
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

	const selectLocal = async () => {
		if (!hasDesktopBridge) return;

		if (activeFolderId) {
			show = false;
			const updated = await bindLocalWorkspaceToFolder(
				localStorage.token,
				activeFolderId,
				activeFolder
			);
			if (updated) {
				await selectedFolder.set(updated);
				showLocalFileFolderId.set(activeFolderId);
				showControls.set(true);
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

	const addCloudEnvironment = () => {
		show = false;
		showSettings.set('tools' as never);
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
							{$i18n.t(activeFolderId ? 'Bind this project to a folder' : 'Desktop only')}
						</span>
					</div>
				</div>
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
							<span class="truncate">{directLabel(terminal)}</span>
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
						<span class="truncate">{terminal.name || terminal.id || $i18n.t('Cloud environment')}</span>
					</div>
					{#if $selectedTerminalId === terminal.id}
						<div class="shrink-0 text-emerald-600 dark:text-emerald-400">
							<Check className="size-4" strokeWidth="2" />
						</div>
					{/if}
				</button>
			{/each}

			<button
				type="button"
				class="flex w-full gap-2 items-center px-3 py-1.5 text-sm cursor-pointer rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
				on:click={addCloudEnvironment}
			>
				<Plus className="size-4 shrink-0" strokeWidth="2" />
				<span class="truncate">{$i18n.t('Add cloud environment…')}</span>
			</button>

			<hr class="border-gray-100 dark:border-gray-800 my-1" />

			<button
				type="button"
				disabled
				class="flex w-full justify-between gap-2 items-center px-3 py-2 text-sm rounded-xl cursor-not-allowed opacity-50"
			>
				<div class="flex flex-1 gap-2 items-center truncate">
					<Github className="size-4 shrink-0" />
					<div class="flex min-w-0 flex-1 flex-col items-start">
						<span class="truncate">{$i18n.t('GitHub repo')}</span>
						<span class="truncate text-xs text-gray-400 dark:text-gray-500">
							{$i18n.t('Coming soon')}
						</span>
					</div>
				</div>
			</button>
		</div>
	</div>
</Dropdown>
