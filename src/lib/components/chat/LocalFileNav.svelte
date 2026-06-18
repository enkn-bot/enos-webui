<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { formatFileSize } from '$lib/utils';
	import {
		getEnosDesktopBridge,
		type EnosDesktopBridge,
		type EnosDesktopDirectoryListing,
		type EnosDesktopEntry,
		type EnosDesktopFilePreview,
		type EnosDesktopProjectActionRequest,
		type EnosDesktopProjectActionResult,
		type EnosDesktopProjectDigest,
		type EnosDesktopProjectGitStatus,
		type EnosDesktopWorkspace
	} from '$lib/enos/desktopBridge';

	import Folder from '../icons/Folder.svelte';
	import Document from '../icons/Document.svelte';
	import Spinner from '../common/Spinner.svelte';

	const i18n = getContext('i18n');

	export let folderId: string | null = null;
	export let onAttach: (
		blob: Blob,
		name: string,
		contentType: string
	) => void | Promise<void> = () => {};
	export let onProjectDigest: (digest: EnosDesktopProjectDigest) => void | Promise<void> = () => {};
	export let hasProjectDigest = false;
	export let projectContextUpdatedAt: string | null = null;

	let bridge: EnosDesktopBridge | null = null;
	let workspace: EnosDesktopWorkspace | null = null;
	let listing: EnosDesktopDirectoryListing | null = null;
	let currentPath = '.';
	let selectedFile: EnosDesktopFilePreview | null = null;
	let editContent = '';
	let gitStatus: EnosDesktopProjectGitStatus | null = null;
	let loading = false;
	let fileLoading = false;
	let syncingProjectContext = false;
	let error: string | null = null;
	let loadedFolderId: string | null = null;

	const displayPath = (path: string) => (path === '.' ? '/' : `/${path}`);

	const friendlyDesktopError = (e: any) => {
		const message = e?.message ?? String(e);
		if (
			message.includes("No handler registered") ||
			message.includes('build-project-digest') ||
			message.includes('list-project-files') ||
			message.includes('read-project-file') ||
			message.includes('create-project-file') ||
			message.includes('write-project-file') ||
			message.includes('create-project-folder') ||
			message.includes('rename-project-entry') ||
			message.includes('delete-project-entry') ||
			message.includes('reveal-project-entry') ||
			message.includes('get-project-git-status')
		) {
			return $i18n.t('Restart ENOS Desk to enable local project actions.');
		}
		if (
			message.includes('ENOENT') ||
			message.includes('no such file') ||
			message.includes('No local workspace selected')
		) {
			return $i18n.t('This project folder is unavailable. Select the project folder again.');
		}
		return message;
	};

	const parentPath = (path: string) => {
		if (path === '.') return null;
		const parts = path.split('/').filter(Boolean);
		parts.pop();
		return parts.length ? parts.join('/') : '.';
	};

	const decodePreview = (preview: EnosDesktopFilePreview) => {
		if (preview.encoding === 'utf8') {
			return new Blob([preview.data], { type: preview.mime || 'text/plain' });
		}
		const binary = atob(preview.data);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i += 1) {
			bytes[i] = binary.charCodeAt(i);
		}
		return new Blob([bytes], { type: preview.mime || 'application/octet-stream' });
	};

	const loadWorkspace = async () => {
		if (!bridge) return;
		loadedFolderId = folderId;
		error = null;
		try {
			workspace = await bridge.getWorkspace(folderId);
			if (workspace) {
				await loadDir('.');
				await loadGitStatus();
				await syncProjectContext();
			} else {
				listing = null;
				currentPath = '.';
				selectedFile = null;
				gitStatus = null;
			}
		} catch (e) {
			error = friendlyDesktopError(e);
			workspace = null;
			listing = null;
			currentPath = '.';
			selectedFile = null;
			gitStatus = null;
		}
	};

	const chooseWorkspace = async () => {
		if (!bridge) return;
		error = null;
		try {
			workspace = folderId
				? await bridge.chooseWorkspaceForFolder(folderId)
				: await bridge.chooseWorkspace();
			if (workspace) {
				await loadDir('.');
				await loadGitStatus();
				await syncProjectContext();
			}
		} catch (e) {
			error = friendlyDesktopError(e);
		}
	};

	const loadDir = async (path: string) => {
		if (!bridge) return;
		loading = true;
		error = null;
		selectedFile = null;
		editContent = '';
		try {
			listing = await bridge.listDir(path, folderId);
			currentPath = listing.path;
		} catch (e) {
			error = friendlyDesktopError(e);
			listing = null;
			currentPath = '.';
			selectedFile = null;
			editContent = '';
		} finally {
			loading = false;
		}
	};

	const openEntry = async (entry: EnosDesktopEntry) => {
		if (entry.type === 'directory') {
			await loadDir(entry.path);
			return;
		}
		if (!bridge) return;
		fileLoading = true;
		error = null;
		try {
			selectedFile = await bridge.readFile(entry.path, folderId);
			editContent = selectedFile.encoding === 'utf8' ? selectedFile.data : '';
		} catch (e) {
			error = friendlyDesktopError(e);
		} finally {
			fileLoading = false;
		}
	};

	const attachSelectedFile = async () => {
		if (!selectedFile) return;
		await onAttach(decodePreview(selectedFile), selectedFile.name, selectedFile.mime);
	};

	const loadGitStatus = async () => {
		if (!bridge || !folderId) return;
		try {
			gitStatus = await bridge.getProjectGitStatus(folderId);
		} catch {
			gitStatus = null;
		}
	};

	const refreshProjectState = async () => {
		await loadDir(currentPath);
		await loadGitStatus();
		await syncProjectContext();
	};

	const actionLabel = (result: EnosDesktopProjectActionRequest) => {
		if (result.action === 'deleteProjectEntry') return $i18n.t('Delete');
		if (result.action === 'renameProjectEntry') return $i18n.t('Rename');
		if (result.action === 'createProjectFolder') return $i18n.t('New Folder');
		if (result.action === 'createProjectFile') return $i18n.t('New File');
		return $i18n.t('Save');
	};

	const confirmationMessage = (result: EnosDesktopProjectActionRequest) => {
		const target = result.toPath ? `${result.path} -> ${result.toPath}` : result.path;
		const preview = result.preview ? `\n\n${result.preview}` : '';
		return `${actionLabel(result)} ${target}?${preview}`;
	};

	const runConfirmedProjectAction = async (
		run: (
			confirmed: boolean
		) => Promise<EnosDesktopProjectActionRequest | EnosDesktopProjectActionResult>
	) => {
		const first = await run(false);
		if (first.status === 'requires_confirmation') {
			if (!window.confirm(confirmationMessage(first))) return first;
			await run(true);
		}
		await refreshProjectState();
		return first;
	};

	const createFile = async () => {
		if (!bridge || !folderId) return;
		const path = window.prompt($i18n.t('New file path'));
		if (!path) return;
		error = null;
		try {
			await runConfirmedProjectAction((confirmed) =>
				bridge.createProjectFile(folderId, path, '', { confirmed })
			);
		} catch (e) {
			error = friendlyDesktopError(e);
		}
	};

	const createFolder = async () => {
		if (!bridge || !folderId) return;
		const path = window.prompt($i18n.t('New folder path'));
		if (!path) return;
		error = null;
		try {
			await runConfirmedProjectAction((confirmed) =>
				bridge.createProjectFolder(folderId, path, { confirmed })
			);
		} catch (e) {
			error = friendlyDesktopError(e);
		}
	};

	const saveSelectedFile = async () => {
		if (!bridge || !folderId || !selectedFile || selectedFile.encoding !== 'utf8') return;
		error = null;
		try {
			await runConfirmedProjectAction((confirmed) =>
				bridge.writeProjectFile(folderId, selectedFile.path, editContent, { confirmed })
			);
		} catch (e) {
			error = friendlyDesktopError(e);
		}
	};

	const renameEntry = async (entry: EnosDesktopEntry) => {
		if (!bridge || !folderId) return;
		const toPath = window.prompt($i18n.t('Rename to'), entry.path);
		if (!toPath || toPath === entry.path) return;
		error = null;
		try {
			await runConfirmedProjectAction((confirmed) =>
				bridge.renameProjectEntry(folderId, entry.path, toPath, { confirmed })
			);
		} catch (e) {
			error = friendlyDesktopError(e);
		}
	};

	const deleteEntry = async (entry: EnosDesktopEntry) => {
		if (!bridge || !folderId) return;
		error = null;
		try {
			await runConfirmedProjectAction((confirmed) =>
				bridge.deleteProjectEntry(folderId, entry.path, { confirmed })
			);
		} catch (e) {
			error = friendlyDesktopError(e);
		}
	};

	const revealEntry = async (entry: EnosDesktopEntry) => {
		if (!bridge || !folderId) return;
		error = null;
		try {
			await bridge.revealProjectEntry(folderId, entry.path);
		} catch (e) {
			error = friendlyDesktopError(e);
		}
	};

	const syncProjectContext = async () => {
		const activeFolderId = folderId;
		if (!bridge || !workspace || !activeFolderId || syncingProjectContext) return;
		syncingProjectContext = true;
		error = null;
		try {
			const digest = await bridge.buildProjectDigest(activeFolderId);
			if (folderId === activeFolderId) {
				await onProjectDigest(digest);
			}
		} catch (e) {
			error = friendlyDesktopError(e);
		} finally {
			syncingProjectContext = false;
		}
	};

	onMount(async () => {
		bridge = getEnosDesktopBridge();
		if (!bridge) {
			error = 'ENOS Desktop bridge is unavailable.';
			return;
		}
		await loadWorkspace();
	});

	$: if (bridge && folderId !== loadedFolderId) {
		loadWorkspace();
	}
</script>

<div class="h-full min-h-0 flex flex-col text-gray-700 dark:text-gray-200">
	<div class="px-3 pb-2 shrink-0">
		<div class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<div class="text-sm font-medium">{$i18n.t('Local Files')}</div>
				<div class="text-xs text-gray-400 dark:text-gray-500 truncate">
					{#if workspace}
						{workspace.rootDisplay}
					{:else}
						{$i18n.t('Choose one Mac folder for ENOS Desk.')}
					{/if}
				</div>
				{#if workspace && folderId}
					<div class="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
						{#if syncingProjectContext}
							{$i18n.t('Updating project context...')}
						{:else if hasProjectDigest}
							{$i18n.t('Project context ready')}
							{#if projectContextUpdatedAt}
								<span>· {new Date(projectContextUpdatedAt).toLocaleString()}</span>
							{/if}
						{:else}
							{$i18n.t('Preparing project context...')}
						{/if}
					</div>
					<div class="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
						{#if gitStatus?.isRepo}
							<span class="truncate text-gray-400 dark:text-gray-500">
								{$i18n.t('Git:')} {gitStatus.branch ?? 'unknown'}
								{#if gitStatus.statusLines.length > 0}
									· {gitStatus.statusLines.length} {$i18n.t('changes')}
								{/if}
							</span>
						{/if}
					</div>
				{/if}
			</div>
			{#if !workspace || !folderId}
				<button
					class="shrink-0 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
					on:click={chooseWorkspace}
					type="button"
				>
					{$i18n.t(workspace ? 'Change' : 'Choose')}
				</button>
			{/if}
		</div>
	</div>

	{#if !workspace}
		<div class="flex-1 min-h-0 flex items-center justify-center px-6 text-center">
			<div>
				<div class="text-sm font-medium mb-1">{$i18n.t('No local folder selected')}</div>
				<div class="text-xs text-gray-400 dark:text-gray-500 mb-3">
					{$i18n.t('Pick a project folder to browse it from ENOS Desk.')}
				</div>
				<button
					class="px-3 py-1.5 rounded-lg text-sm font-medium bg-black text-white dark:bg-white dark:text-black"
					on:click={chooseWorkspace}
					type="button"
				>
					{$i18n.t(folderId ? 'Select Folder' : 'Choose Local Folder')}
				</button>
			</div>
		</div>
	{:else}
		<div
			class="flex items-center gap-1 px-2 pb-1.5 shrink-0 border-b border-gray-50 dark:border-gray-800"
		>
			<button
				class="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-40"
				disabled={parentPath(currentPath) === null}
				on:click={() => {
					const parent = parentPath(currentPath);
					if (parent) loadDir(parent);
				}}
				type="button"
			>
				{$i18n.t('Back')}
			</button>
			<button
				class="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
				on:click={async () => {
					await loadDir(currentPath);
					await syncProjectContext();
					await loadGitStatus();
				}}
				type="button"
			>
				{$i18n.t('Refresh')}
			</button>
			{#if folderId}
				<button
					class="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
					on:click={createFile}
					type="button"
				>
					{$i18n.t('New File')}
				</button>
				<button
					class="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
					on:click={createFolder}
					type="button"
				>
					{$i18n.t('New Folder')}
				</button>
			{/if}
			<div class="min-w-0 flex-1 truncate text-xs text-gray-500 dark:text-gray-400">
				{workspace.name}{displayPath(currentPath)}
			</div>
			{#if loading}
				<Spinner className="size-4" />
			{/if}
		</div>

		{#if error}
			<div
				class="mx-3 my-2 px-2 py-1.5 rounded-md bg-red-50 dark:bg-red-950/30 text-xs text-red-600 dark:text-red-300"
			>
				{error}
			</div>
		{/if}

		<div class="flex-1 min-h-0 overflow-y-auto">
			{#if listing && listing.entries.length > 0}
				<ul class="py-1">
					{#each listing.entries as entry}
						<li class="flex items-center gap-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 {selectedFile?.path ===
						entry.path
							? 'bg-gray-50 dark:bg-gray-800'
							: ''}">
							<button
								class="min-w-0 flex-1 flex items-center gap-2 py-1.5 text-left"
								on:click={() => openEntry(entry)}
								type="button"
							>
								{#if entry.type === 'directory'}
									<Folder className="size-4 text-blue-500 shrink-0" />
								{:else}
									<Document className="size-4 text-gray-400 shrink-0" />
								{/if}
								<span class="min-w-0 flex-1 truncate text-sm">{entry.name}</span>
								{#if entry.type === 'file'}
									<span class="text-xs text-gray-400 shrink-0">
										{formatFileSize(entry.size ?? 0)}
									</span>
								{/if}
							</button>
							<button
								class="shrink-0 px-1 py-0.5 rounded text-[11px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
								on:click={() => revealEntry(entry)}
								type="button"
							>
								{$i18n.t('Reveal')}
							</button>
							<button
								class="shrink-0 px-1 py-0.5 rounded text-[11px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
								on:click={() => renameEntry(entry)}
								type="button"
							>
								{$i18n.t('Rename')}
							</button>
							<button
								class="shrink-0 px-1 py-0.5 rounded text-[11px] text-gray-400 hover:text-red-600 dark:hover:text-red-300"
								on:click={() => deleteEntry(entry)}
								type="button"
							>
								{$i18n.t('Delete')}
							</button>
						</li>
					{/each}
				</ul>
			{:else if !loading}
				<div class="px-3 py-4 text-xs text-gray-400 dark:text-gray-500">
					{$i18n.t('This folder is empty.')}
				</div>
			{/if}
		</div>

		{#if selectedFile}
			<div class="shrink-0 border-t border-gray-50 dark:border-gray-800 p-3">
				<div class="flex items-center gap-2 mb-2">
					<div class="min-w-0 flex-1">
						<div class="truncate text-sm font-medium">{selectedFile.name}</div>
						<div class="text-xs text-gray-400">
							{formatFileSize(selectedFile.size)} · {selectedFile.mime}
						</div>
					</div>
					{#if selectedFile.encoding === 'utf8'}
						<button
							class="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
							on:click={saveSelectedFile}
							type="button"
						>
							{$i18n.t('Save')}
						</button>
					{/if}
					<button
						class="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
						on:click={attachSelectedFile}
						type="button"
					>
						{$i18n.t('Attach')}
					</button>
				</div>

				{#if fileLoading}
					<div class="text-xs text-gray-400">{$i18n.t('Loading preview...')}</div>
				{:else if selectedFile.encoding === 'utf8'}
					<textarea
						class="h-40 w-full resize-y rounded-md bg-gray-50 dark:bg-gray-900 p-2 text-xs outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700"
						spellcheck="false"
						bind:value={editContent}
					/>
				{:else}
					<div class="text-xs text-gray-400">
						{$i18n.t('Binary preview is unavailable. You can still attach the file.')}
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
