<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';
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
	import { showLocalFilePath } from '$lib/stores';

	import Folder from '../icons/Folder.svelte';
	import Document from '../icons/Document.svelte';
	import Spinner from '../common/Spinner.svelte';
	import Dropdown from '../common/Dropdown.svelte';
	import EllipsisHorizontal from '../icons/EllipsisHorizontal.svelte';
	import FilePlusAlt from '../icons/FilePlusAlt.svelte';
	import NewFolderAlt from '../icons/NewFolderAlt.svelte';
	import ArrowPath from '../icons/ArrowPath.svelte';
	import Eye from '../icons/Eye.svelte';
	import Pencil from '../icons/Pencil.svelte';
	import GarbageBin from '../icons/GarbageBin.svelte';
	import CloudArrowUp from '../icons/CloudArrowUp.svelte';
	import { pendingAnnotation } from '$lib/stores/annotations';

	const i18n = getContext('i18n');

	export let folderId: string | null = null;
	export let onAttach: (
		blob: Blob,
		name: string,
		contentType: string
	) => void | Promise<void> = () => {};
	export let onProjectDigest: (
		folderId: string,
		digest: EnosDesktopProjectDigest
	) => void | Promise<void> = () => {};
	export let onCopyToCloud: (
		folderId: string,
		workspace: EnosDesktopWorkspace
	) => void | Promise<void> = () => {};

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
	let copyingToCloud = false;
	let error: string | null = null;
	// Desk in the browser (no desktop runtime). This is a supported lite mode,
	// not an error — local files / Git live in the desktop app only.
	let liteMode = false;
	// Desktop app IS present, but the project's bound folder does not exist on
	// THIS machine (e.g. the project was bound on another Mac, or the folder was
	// moved/removed). Treat it as a calm read-only state — the chats are still
	// here — rather than a raw error. `unreachableRoot` holds the bound path so
	// the notice can point the user at where the files actually live.
	let unreachable = false;
	let unreachableRoot = '';
	let recoveryActionsVisible = true;
	let loadedFolderId: string | null = null;
	let removeProjectFilesChangedListener = () => {};

	const pathCrumbs = (name: string, path: string) => {
		const parts = path === '.' ? [] : path.split('/').filter(Boolean);
		return [
			{ label: name, path: '.' },
			...parts.map((part, index) => ({
				label: part,
				path: parts.slice(0, index + 1).join('/')
			}))
		];
	};

	// The bound folder cannot be reached on this machine — distinct from a
	// transient read error. Used to switch into the calm "files live elsewhere"
	// notice instead of surfacing a raw error banner.
	const isPathMissingError = (e: any) => {
		const message = e?.message ?? String(e);
		return (
			message.includes('ENOENT') ||
			message.includes('no such file') ||
			message.includes('not a directory') ||
			message.includes('EACCES') ||
			message.includes('permission denied') ||
			message.includes('No local workspace selected')
		);
	};

	const friendlyDesktopError = (e: any) => {
		const message = e?.message ?? String(e);
		if (
			message.includes('No handler registered') ||
			message.includes('build-project-digest') ||
			message.includes('list-project-files') ||
			message.includes('read-project-file') ||
			message.includes('create-project-file') ||
			message.includes('write-project-file') ||
			message.includes('create-project-folder') ||
			message.includes('rename-project-entry') ||
			message.includes('delete-project-entry') ||
			message.includes('reveal-project-entry') ||
			message.includes('get-project-git-status') ||
			message.includes('export-project-archive') ||
			message.includes('exportProjectArchive')
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
		currentPath = '.';
		showLocalFilePath.set(currentPath);
		error = null;
		unreachable = false;
		unreachableRoot = '';
		recoveryActionsVisible = true;
		try {
			workspace = await bridge.getWorkspace(folderId);
			if (workspace) {
				await loadDir('.');
				await loadGitStatus();
				await syncProjectContext();
			} else {
				listing = null;
				currentPath = '.';
				showLocalFilePath.set(currentPath);
				selectedFile = null;
				gitStatus = null;
			}
		} catch (e) {
			error = friendlyDesktopError(e);
			workspace = null;
			listing = null;
			currentPath = '.';
			showLocalFilePath.set(currentPath);
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
				unreachable = false;
				recoveryActionsVisible = true;
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
			showLocalFilePath.set(currentPath);
		} catch (e) {
			// Root path of a bound project is missing on this machine → the project's
			// files live elsewhere. Show the calm read-only notice, not a raw error.
			if (path === '.' && workspace && isPathMissingError(e)) {
				unreachable = true;
				unreachableRoot = workspace?.rootDisplay ?? '';
				recoveryActionsVisible = true;
				error = null;
			} else {
				error = friendlyDesktopError(e);
			}
			listing = null;
			currentPath = '.';
			showLocalFilePath.set(currentPath);
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

	const handleQuoteInChat = () => {
		if (!selectedFile || selectedFile.encoding !== 'utf8') return;
		const ext = selectedFile.path.split('.').pop() ?? '';
		const formatted = `**\`${selectedFile.path}\`**\n\`\`\`${ext}\n${editContent}\n\`\`\`\n\n`;
		pendingAnnotation.set(formatted);
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

	const copyProjectToCloud = async () => {
		if (!bridge || !folderId || !workspace || copyingToCloud) return;
		if (!bridge.exportProjectArchive) {
			error = $i18n.t('Restart ENOS Desk to enable local project actions.');
			return;
		}

		copyingToCloud = true;
		error = null;
		try {
			await onCopyToCloud(folderId, workspace);
		} catch (e) {
			error = friendlyDesktopError(e);
		} finally {
			copyingToCloud = false;
		}
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
				Promise.resolve(onProjectDigest(activeFolderId, digest)).catch(() => {});
			}
		} catch (e) {
			error = friendlyDesktopError(e);
		} finally {
			syncingProjectContext = false;
		}
	};

	onMount(async () => {
		const handleProjectFilesChanged = async (event: Event) => {
			const detail = (event as CustomEvent)?.detail ?? {};
			if (!folderId || detail.folderId !== folderId) return;
			await refreshProjectState();
		};
		window.addEventListener('enos:project-files-changed', handleProjectFilesChanged);
		removeProjectFilesChangedListener = () => {
			window.removeEventListener('enos:project-files-changed', handleProjectFilesChanged);
		};

		bridge = getEnosDesktopBridge();
		if (!bridge) {
			// Lite mode: chats work here; local files need the desktop app.
			liteMode = true;
			return;
		}
		await loadWorkspace();
	});

	onDestroy(() => {
		removeProjectFilesChangedListener();
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
					{#if liteMode}
						{$i18n.t('Browser preview')}
					{:else if workspace}
						{workspace.rootDisplay}
					{:else}
						{$i18n.t('Choose one Mac folder for ENOS Desk.')}
					{/if}
				</div>
				{#if workspace && folderId}
					<div class="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
						{$i18n.t('Working on this Mac')}
					</div>
					<div class="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
						{#if gitStatus?.isRepo}
							<span class="truncate text-gray-400 dark:text-gray-500">
								{$i18n.t('Git:')}
								{gitStatus.branch ?? 'unknown'}
								{#if gitStatus.statusLines.length > 0}
									· {gitStatus.statusLines.length} {$i18n.t('changes')}
								{/if}
							</span>
						{/if}
					</div>
				{/if}
			</div>
			{#if !liteMode && (!workspace || !folderId)}
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

	{#if liteMode}
		<div class="flex-1 min-h-0 flex items-center justify-center px-6 text-center">
			<div class="max-w-xs">
				<div class="text-sm font-medium mb-1">
					{$i18n.t('Local files live in the desktop app')}
				</div>
				<div class="text-xs text-gray-400 dark:text-gray-500">
					{$i18n.t(
						'Viewing ENOS Desk in the browser. Chats and conversations work here — open the ENOS desktop app for local project files, Git, and edits.'
					)}
				</div>
			</div>
		</div>
	{:else if unreachable}
		<div class="flex-1 min-h-0 flex items-center justify-center px-6 text-center">
			<div class="max-w-xs">
				<div class="text-sm font-medium mb-1">
					{$i18n.t('Project folder missing')}
				</div>
				<div class="text-xs text-gray-400 dark:text-gray-500">
					{#if unreachableRoot}
						{$i18n.t(
							'This project is bound to {{path}}, but that folder was moved, renamed, or deleted outside ENOS. Sessions stay here, but local files and agent actions are paused until you recover the folder.',
							{ path: unreachableRoot }
						)}
					{:else}
						{$i18n.t(
							'This project folder was moved, renamed, or deleted outside ENOS. Sessions stay here, but local files and agent actions are paused until you recover the folder.'
						)}
					{/if}
				</div>
				{#if recoveryActionsVisible}
					<div class="mt-4 flex flex-wrap justify-center gap-2">
						<button
							class="px-3 py-1.5 rounded-lg text-xs font-medium bg-black text-white dark:bg-white dark:text-black"
							on:click={chooseWorkspace}
							type="button"
						>
							{$i18n.t('Relink Folder')}
						</button>
						<button
							class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
							on:click={() => {
								recoveryActionsVisible = false;
							}}
							type="button"
						>
							{$i18n.t('Keep Read-Only')}
						</button>
					</div>
				{/if}
			</div>
		</div>
	{:else if !workspace}
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
			class="flex items-center gap-2 px-3 pb-1.5 shrink-0 border-b border-gray-50 dark:border-gray-800"
		>
			<div class="min-w-0 flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none text-xs">
				{#each pathCrumbs(workspace.name, currentPath) as crumb, index}
					{#if index > 0}
						<span class="text-gray-300 dark:text-gray-600 shrink-0">/</span>
					{/if}
					<button
						class="shrink-0 max-w-36 truncate rounded px-1 py-0.5 {crumb.path === currentPath
							? 'text-gray-700 dark:text-gray-200'
							: 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}"
						on:click={() => loadDir(crumb.path)}
						type="button"
					>
						{crumb.label}{crumb.path === currentPath ? '/' : ''}
					</button>
				{/each}
			</div>
			{#if loading}
				<Spinner className="size-4" />
			{/if}
			<Dropdown align="end" sideOffset={4}>
				<button
					class="shrink-0 size-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800"
					type="button"
					aria-label={$i18n.t('Project file actions')}
					title={$i18n.t('Project file actions')}
				>
					<EllipsisHorizontal className="size-5" strokeWidth="1.75" />
				</button>

				<div slot="content">
					<div
						class="min-w-[180px] rounded-2xl p-1 bg-white dark:bg-gray-850 dark:text-white shadow-lg border border-gray-100 dark:border-gray-800"
					>
						<div class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
							{$i18n.t('Project file actions')}
						</div>
						{#if folderId}
							<button
								class="select-none flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition items-center gap-2 text-sm disabled:opacity-50"
								on:click={copyProjectToCloud}
								disabled={copyingToCloud}
								type="button"
							>
								{#if copyingToCloud}
									<Spinner className="size-4" />
								{:else}
									<CloudArrowUp className="size-4" />
								{/if}
								<span>{$i18n.t(copyingToCloud ? 'Copying Project' : 'Copy Project to Cloud')}</span>
							</button>
							<button
								class="select-none flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition items-center gap-2 text-sm"
								on:click={createFile}
								type="button"
							>
								<FilePlusAlt className="size-4" />
								<span>{$i18n.t('New File')}</span>
							</button>
							<button
								class="select-none flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition items-center gap-2 text-sm"
								on:click={createFolder}
								type="button"
							>
								<NewFolderAlt className="size-4" />
								<span>{$i18n.t('New Folder')}</span>
							</button>
						{/if}
						<button
							class="select-none flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition items-center gap-2 text-sm"
							on:click={refreshProjectState}
							type="button"
						>
							<ArrowPath className="size-4" />
							<span>{$i18n.t('Refresh')}</span>
						</button>
					</div>
				</div>
			</Dropdown>
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
						<li
							class="flex items-center gap-2 pl-3 pr-3 hover:bg-gray-50 dark:hover:bg-gray-800 {selectedFile?.path ===
							entry.path
								? 'bg-gray-50 dark:bg-gray-800'
								: ''}"
						>
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
							<Dropdown align="end" sideOffset={4}>
								<button
									class="shrink-0 size-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700"
									type="button"
									aria-label={$i18n.t('Entry actions')}
									title={$i18n.t('Entry actions')}
								>
									<EllipsisHorizontal className="size-5" strokeWidth="1.75" />
								</button>
								<div slot="content">
									<div
										class="min-w-[150px] rounded-2xl p-1 bg-white dark:bg-gray-850 dark:text-white shadow-lg border border-gray-100 dark:border-gray-800"
									>
										<div class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
											{$i18n.t('Entry actions')}
										</div>
										<button
											class="select-none flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition items-center gap-2 text-sm"
											on:click={() => revealEntry(entry)}
											type="button"
										>
											<Eye className="size-4" />
											<span>{$i18n.t('Reveal')}</span>
										</button>
										<button
											class="select-none flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition items-center gap-2 text-sm"
											on:click={() => renameEntry(entry)}
											type="button"
										>
											<Pencil className="size-4" />
											<span>{$i18n.t('Rename')}</span>
										</button>
										<button
											class="select-none flex rounded-xl py-1.5 px-3 w-full hover:bg-red-50 dark:hover:bg-red-950/40 transition items-center gap-2 text-sm text-red-600 dark:text-red-300"
											on:click={() => deleteEntry(entry)}
											type="button"
										>
											<GarbageBin className="size-4" />
											<span>{$i18n.t('Delete')}</span>
										</button>
									</div>
								</div>
							</Dropdown>
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
					{#if selectedFile && selectedFile.encoding === 'utf8'}
						<button
							class="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg
               bg-transparent hover:bg-black/5 dark:hover:bg-white/10 transition"
							on:click={handleQuoteInChat}
							title="Quote file content in chat"
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5">
								<path d="M3.75 2A1.75 1.75 0 0 0 2 3.75v.836a3.253 3.253 0 0 1 1.5-.586V3.75A.25.25 0 0 1 3.75 3.5h2.5a.25.25 0 0 1 .25.25v5.5a.25.25 0 0 1-.25.25H3.75a.25.25 0 0 1-.25-.25V8.5H2v.75C2 10.216 2.784 11 3.75 11H6.5V8.25A1.75 1.75 0 0 0 4.75 6.5h-.5A1.25 1.25 0 0 1 3 5.25V3.75A1.75 1.75 0 0 1 4.75 2h-1ZM9.25 2A1.75 1.75 0 0 0 7.5 3.75v.836a3.253 3.253 0 0 1 1.5-.586V3.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25v5.5a.25.25 0 0 1-.25.25H9.25A.25.25 0 0 1 9 9.25V8.5H7.5v.75C7.5 10.216 8.284 11 9.25 11H12V8.25A1.75 1.75 0 0 0 10.25 6.5h-.5A1.25 1.25 0 0 1 8.5 5.25V3.75A1.75 1.75 0 0 1 10.25 2h-1Z"/>
							</svg>
							Quote in chat
						</button>
					{/if}
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
