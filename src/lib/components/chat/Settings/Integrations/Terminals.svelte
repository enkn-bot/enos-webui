<script lang="ts">
	import { getContext } from 'svelte';
	import { browser } from '$app/environment';
	const i18n = getContext('i18n');

	import Plus from '$lib/components/icons/Plus.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import Connection from './Terminals/Connection.svelte';
	import AddTerminalServerModal from '$lib/components/AddTerminalServerModal.svelte';

	export let servers = [];
	export let onChange: (servers: typeof servers) => void = () => {};

	let showAddModal = false;
	let pendingPreset = null;

	const LOCAL_DESK_TERMINAL_PRESET = {
		name: 'Local files',
		url: 'http://127.0.0.1:9900',
		key: '',
		auth_type: 'bearer',
		path: '/openapi.json',
		enabled: true,
		config: {
			scope: 'local-companion'
		}
	};

	$: isDeskSurface = browser && window.location.hostname === 'enosdesk.duckdns.org';

	const openAddModal = () => {
		pendingPreset = null;
		showAddModal = true;
	};

	const openLocalFilesModal = () => {
		pendingPreset = LOCAL_DESK_TERMINAL_PRESET;
		showAddModal = true;
	};

	const addServer = (server: (typeof servers)[0]) => {
		servers = [...servers, server];
		onChange(servers);
	};

	const enableServer = (idx: number) => {
		servers = servers.map((s, i) => ({ ...s, enabled: i === idx }));
		onChange(servers);
	};

	const disableServer = (idx: number) => {
		servers = servers.map((s, i) => (i === idx ? { ...s, enabled: false } : s));
		onChange(servers);
	};

	const updateServer = (idx: number, updated: (typeof servers)[0]) => {
		servers = servers.map((s, i) => (i === idx ? updated : s));
		onChange(servers);
	};

	const deleteServer = (idx: number) => {
		servers = servers.filter((_, i) => i !== idx);
		onChange(servers);
	};
</script>

<AddTerminalServerModal
	direct
	bind:show={showAddModal}
	preset={pendingPreset}
	onSubmit={(server) => addServer(server)}
/>

<div>
	<div class="flex justify-between items-center mb-1">
		<div class="flex items-center gap-2">
			<div class="font-medium">{$i18n.t('Open Terminal')}</div>
			<span
				class="text-[0.65rem] font-medium uppercase px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
				>{$i18n.t('Experimental')}</span
			>
		</div>
		<div class="flex items-center gap-1">
			{#if isDeskSurface}
				<Tooltip content={$i18n.t('Add Local Files')}>
					<button
						class="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
						on:click={openLocalFilesModal}
						type="button"
					>
						{$i18n.t('Local Files')}
					</button>
				</Tooltip>
			{/if}
			<Tooltip content={$i18n.t('Add Connection')}>
				<button
					class="px-1"
					on:click={openAddModal}
					type="button"
					aria-label={$i18n.t('Add Connection')}
				>
					<Plus />
				</button>
			</Tooltip>
		</div>
	</div>

	<div class="flex flex-col gap-1.5">
		{#each servers as server, idx}
			<Connection
				bind:connection={server}
				onSubmit={(updated) => updateServer(idx, updated)}
				onDelete={() => deleteServer(idx)}
				onEnable={() => enableServer(idx)}
				onDisable={() => disableServer(idx)}
			/>
		{/each}
	</div>

	{#if servers.length === 0}
		<div class="text-xs text-gray-400 dark:text-gray-500">
			{$i18n.t('No terminal connections configured.')}
			<a
				href="https://github.com/open-webui/open-terminal"
				target="_blank"
				rel="noopener noreferrer"
				class="underline hover:text-gray-700 dark:hover:text-gray-200"
			>
				{$i18n.t('Learn more')} ↗
			</a>
		</div>
	{/if}
</div>
