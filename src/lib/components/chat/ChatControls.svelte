<script context="module" lang="ts">
	import type { ControlPaneTab, PendingTrayOpenTab } from '$lib/stores';

	type ControlTab = ControlPaneTab;
	let savedTab: ControlTab | null = null;
</script>

<script lang="ts">
	import { browser } from '$app/environment';
	import { SvelteFlowProvider } from '@xyflow/svelte';
	import { slide } from 'svelte/transition';
	import type { Readable } from 'svelte/store';
	import { Pane, PaneResizer } from 'paneforge';
	import { v4 as uuidv4 } from 'uuid';

	import { onDestroy, onMount, tick, getContext } from 'svelte';
	import {
		config,
		terminalServers,
		mobile,
		showControls,
		showCallOverlay,
		showArtifacts,
		showEmbeds,
		settings,
		showFileNavPath,
		showFileNavDir,
		showLocalFileFolderId,
		pendingTrayOpen,
		selectedFolder,
		selectedTerminalId,
		user
	} from '$lib/stores';

	import { uploadFile } from '$lib/apis/files';
	import { updateFolderById } from '$lib/apis/folders';
	import { getTerminalServers } from '$lib/apis/terminal';
	import { createCloudWorkspace, uploadLocalProjectToCloud } from '$lib/apis/workspace';
	import { toast } from 'svelte-sonner';

	import Controls from './Controls/Controls.svelte';
	import CallOverlay from './MessageInput/CallOverlay.svelte';
	import Drawer from '../common/Drawer.svelte';
	import Artifacts from './Artifacts.svelte';
	import Embeds from './ChatControls/Embeds.svelte';
	import FileNav from './FileNav.svelte';
	import LocalFileNav from './LocalFileNav.svelte';
	import DeskDock from '$lib/components/enos/DeskDock.svelte';
	import PyodideFileNav from './PyodideFileNav.svelte';
	import Overview from './Overview.svelte';
	import XMark from '../icons/XMark.svelte';
	import {
		canUseEnosLocalProjectFiles,
		getEnosDesktopBridge,
		getEnosDesktopBridgeCapabilities,
		type EnosDesktopCapabilities,
		type EnosDesktopProjectDigest,
		type EnosDesktopWorkspace
	} from '$lib/enos/desktopBridge';
	import { cloudProjectContextSource } from '$lib/enos/cloudUpload';
	import { resolveCloudProjectRoot } from '$lib/enos/cloudFiles';
	import { mergeCloudWorkspaceTerminalEntries } from '$lib/enos/cloudWorkspaceTerminal';
	import { isDeskHostname } from '$lib/enos/deskRuntime';
	import { pushRecentActivityShared } from '$lib/enos/recentActivity';

	type I18nStore = Readable<{ t: (key: string, options?: Record<string, unknown>) => string }>;

	const i18n = getContext<I18nStore>('i18n');

	const DESK_CONTROL_TAB_ORDER = ['files'] satisfies ControlTab[];
	const DEFAULT_CONTROL_TAB_ORDER = ['controls', 'files'] satisfies ControlTab[];
	const controlTabLabel = (tab: ControlTab) =>
		tab === 'overview' ? 'Overview' : tab === 'files' ? 'Files' : 'Controls';

	export let history;
	export let models = [];

	export let chatId = null;

	export let chatFiles = [];
	export let params = {};

	export let eventTarget: EventTarget;
	export let submitPrompt: Function;
	export let stopResponse: Function;
	export let showMessage: Function;
	export let files;
	export let modelId;

	export let codeInterpreterEnabled = false;

	export let pane: Pane | null = null;

	let largeScreen = false;
	let dragged = false;
	let minSize = 0;
	let paneReady = false;

	// Tab state for the shared surface side pane.
	let activeTab: ControlTab = 'controls';
	let defaultControlTab: ControlTab = 'controls';
	let controlTabOrder: ControlTab[] = DEFAULT_CONTROL_TAB_ORDER;
	let visibleControlTabs: ControlTab[] = [];
	let desktopCapabilities: EnosDesktopCapabilities | null | undefined = undefined;
	let canApplyInitialTab = false;
	let hasAppliedInitialTab = false;
	let applyingPendingTrayOpen = false;

	$: hasMessages = history?.messages && Object.keys(history.messages).length > 0;

	$: showControlsTab = $user?.role === 'admin' || ($user?.permissions?.chat?.controls ?? true);
	$: isDeskSurface = browser && isDeskHostname();
	$: canUseDirectTerminal =
		$user?.role === 'admin' || ($user?.permissions?.features?.direct_tool_servers ?? true);
	$: hasConfiguredTerminal =
		($terminalServers ?? []).length > 0 ||
		($settings?.terminalServers ?? []).some((server) => Boolean(server?.url));
	$: hasSelectedTerminalAccess =
		$selectedTerminalId &&
		(($terminalServers ?? []).some((t) => t.id && t.id === $selectedTerminalId) ||
			canUseDirectTerminal);
	$: showTerminalFileNav =
		hasSelectedTerminalAccess || (isDeskSurface && hasConfiguredTerminal && canUseDirectTerminal);
	$: selectedCloudProjectRoot = resolveCloudProjectRoot(
		$selectedFolder?.data?.project_context_source
	);
	$: showActiveTerminalFileNav =
		showTerminalFileNav &&
		Boolean($selectedTerminalId) &&
		(!isDeskSurface || Boolean(selectedCloudProjectRoot));
	$: showGenericTerminalFileNav = !isDeskSurface && showTerminalFileNav;
	$: selectedTerminalName =
		($terminalServers ?? []).find((t) => t.id && t.id === $selectedTerminalId)?.name ??
		($settings?.terminalServers ?? []).find((server) => server?.url === $selectedTerminalId)
			?.name ??
		null;
	$: showLocalFileNav = isDeskSurface && canUseEnosLocalProjectFiles(desktopCapabilities);
	// Fall back to the active project folder when a chat is open inside one.
	$: effectiveFileFolderId = $showLocalFileFolderId ?? $selectedFolder?.id ?? null;
	$: showProjectFileNav = showLocalFileNav && Boolean(effectiveFileFolderId);
	$: showDeskProjectFilesEmpty = showLocalFileNav && !effectiveFileFolderId;
	$: showFilesTab =
		showLocalFileNav ||
		showActiveTerminalFileNav ||
		showGenericTerminalFileNav ||
		(codeInterpreterEnabled && $config?.code?.interpreter_engine !== 'jupyter');
	$: showOverviewTab = isDeskSurface || hasMessages;
	$: defaultControlTab = isDeskSurface ? 'files' : 'controls';
	$: controlTabOrder = isDeskSurface ? DESK_CONTROL_TAB_ORDER : DEFAULT_CONTROL_TAB_ORDER;
	$: visibleControlTabs = controlTabOrder.filter((tab) => {
		if (tab === 'overview') return showOverviewTab;
		if (tab === 'files') return showFilesTab;
		return showControlsTab;
	});
	$: canApplyInitialTab = savedTab !== null || !isDeskSurface || showFilesTab;
	$: if (!hasAppliedInitialTab && canApplyInitialTab) {
		activeTab = savedTab ?? defaultControlTab;
		hasAppliedInitialTab = true;
	}

	// Tab fallback: if active tab becomes hidden, switch to the first surface tab.
	$: if (hasAppliedInitialTab && !visibleControlTabs.includes(activeTab)) {
		activeTab = visibleControlTabs[0] ?? defaultControlTab;
	}

	// Auto-close if there are no visible tabs
	$: if (visibleControlTabs.length === 0) {
		showControls.set(false);
	}

	// Auto-switch to Files tab when display_file is triggered.
	// Only force the pane OPEN for an explicit file display — a real path. The
	// project-root default ('.') is set on bind/restore, and should NOT pop the
	// pane open on its own (the user opens it via the Controls toggle).
	$: if ($showFileNavPath) {
		activeTab = 'files';
		if ($showFileNavPath !== '.') {
			showControls.set(true);
		}
	}

	// A selected terminal sets the default tab, but must NOT pop the right pane open
	// on its own — e.g. a default-enabled cloud terminal (ENOS Workspace) on load
	// was force-opening the pane. Mirror the showFileNavPath '.' gate above: the
	// user opens the pane via the Controls toggle.
	$: if ($selectedTerminalId && showFilesTab) {
		activeTab = 'files';
	}

	// Clear selected direct terminal if user lost permission
	$: if (
		$selectedTerminalId &&
		!($terminalServers ?? []).some((t) => t.id && t.id === $selectedTerminalId) &&
		!($user?.role === 'admin' || ($user?.permissions?.features?.direct_tool_servers ?? true))
	) {
		selectedTerminalId.set(null);
	}

	// Attach a terminal file to the chat input
	const handleTerminalAttach = async (blob: Blob, name: string, contentType: string) => {
		const tempItemId = uuidv4();
		const fileItem = {
			type: 'file',
			file: '',
			id: null,
			url: '',
			name,
			collection_name: '',
			status: 'uploading',
			error: '',
			itemId: tempItemId,
			size: blob.size
		};

		files = [...files, fileItem];

		try {
			const file = new File([blob], name, { type: contentType || 'application/octet-stream' });
			const uploaded = await uploadFile(localStorage.token, file);
			if (!uploaded) throw new Error('Upload failed');

			const idx = files.findIndex((f) => f.itemId === tempItemId);
			if (idx !== -1) {
				files[idx] = {
					...fileItem,
					status: 'uploaded',
					file: uploaded,
					id: uploaded.id,
					url: `${uploaded.id}`,
					collection_name: uploaded?.meta?.collection_name
				};
				files = files;
			}
			toast.success($i18n.t('File attached to chat'));
		} catch (e) {
			files = files.filter((f) => f.itemId !== tempItemId);
			toast.error($i18n.t('Failed to attach file'));
		}
	};

	const handleDeskFilePreview = (name: string, path: string) => {
		if (effectiveFileFolderId && typeof localStorage !== 'undefined') {
			pushRecentActivityShared(
				localStorage,
				effectiveFileFolderId,
				{ kind: 'file', title: name, subtitle: path, timestamp: Date.now() },
				Date.now()
			);
		}
	};

	// A Recent-list click (DeskDock) bubbles up here; LocalFileNav is slotted INTO
	// DeskDock by us, not a child of it, so DeskDock can't reach it directly. We hold
	// the target path and hand it to LocalFileNav via openPath/openToken — token bumps
	// on every click (even re-clicking the same file) since a same-value prop change
	// wouldn't otherwise re-trigger LocalFileNav's reactive open.
	let pendingFileOpenPath: string | null = null;
	let pendingFileOpenToken = 0;
	const handleDeskOpenFile = (item: { subtitle?: string }) => {
		if (!item.subtitle) return;
		pendingFileOpenPath = item.subtitle;
		pendingFileOpenToken += 1;
	};

	const handleProjectDigest = async (folderId: string, digest: EnosDesktopProjectDigest) => {
		if (!folderId) {
			return;
		}
		const folder = $selectedFolder?.id === folderId ? $selectedFolder : { id: folderId, data: {} };

		const data = {
			...(folder?.data ?? {}),
			project_context_digest: digest.text,
			project_context_updated_at: digest.generatedAt,
			project_context_source: {
				kind: 'local',
				rootName: digest.rootName,
				fileCount: digest.fileCount,
				sampledFileCount: digest.sampledFileCount,
				skippedCount: digest.skippedCount
			}
		};

		const updated = await updateFolderById(localStorage.token, folderId, { data });
		if ($selectedFolder?.id === folderId) {
			selectedFolder.set({
				...folder,
				...(updated ?? {}),
				id: folderId,
				data
			});
		}
	};

	const handleCopyLocalProjectToCloud = async (
		folderId: string,
		_workspace: EnosDesktopWorkspace
	) => {
		const bridge = getEnosDesktopBridge();
		if (!bridge?.exportProjectArchive) {
			throw new Error('Restart ENOS Desk to enable local project actions.');
		}

		const ws = await createCloudWorkspace(localStorage.token);
		const archive = await bridge.exportProjectArchive(folderId);
		const imported = await uploadLocalProjectToCloud(localStorage.token, archive);

		const servers = await getTerminalServers(localStorage.token);
		terminalServers.update((existing) =>
			mergeCloudWorkspaceTerminalEntries(existing, servers, localStorage.token)
		);
		if (ws?.id) selectedTerminalId.set(ws.id);

		activeTab = 'files';
		showControls.set(true);
		const cloudSource = cloudProjectContextSource(archive, imported);
		showFileNavDir.set(resolveCloudProjectRoot(cloudSource) ?? '/home/user/');

		const folder = $selectedFolder?.id === folderId ? $selectedFolder : { id: folderId, data: {} };
		const data = {
			...(folder?.data ?? {}),
			project_context_source: cloudSource,
			project_context_updated_at: new Date().toISOString()
		};

		const updated = await updateFolderById(localStorage.token, folderId, { data });
		if ($selectedFolder?.id === folderId) {
			selectedFolder.set({
				...folder,
				...(updated ?? {}),
				id: folderId,
				data
			});
		}

		toast.success($i18n.t('Project copied to cloud'));
	};

	// While we programmatically open/resize the pane it can transition through a
	// "collapsed" (size 0) state — the pane starts at defaultSize={0} and opening
	// also restructures the layout (e.g. when $selectedFolder flips). paneforge fires
	// onCollapse for those transient collapses, which would otherwise immediately close
	// the tray we just opened. Suppress onCollapse-driven close during that window only;
	// genuine user closes (the X button, dragging the resizer shut) happen outside it.
	let suppressCollapseClose = false;
	let suppressCollapseTimer: ReturnType<typeof setTimeout> | null = null;
	const guardCollapseDuringOpen = () => {
		suppressCollapseClose = true;
		if (suppressCollapseTimer) clearTimeout(suppressCollapseTimer);
		suppressCollapseTimer = setTimeout(() => {
			suppressCollapseClose = false;
			suppressCollapseTimer = null;
		}, 300);
	};

	export const openPane = () => {
		if (!pane) return;

		guardCollapseDuringOpen();

		const container = document.getElementById('chat-container');
		if (parseInt(localStorage?.chatControlsSize) && container) {
			let size = Math.floor(
				(parseInt(localStorage?.chatControlsSize) / container.clientWidth) * 100
			);
			pane.resize(size);
		} else {
			pane.resize(minSize);
		}
	};

	const resolveTrayTab = (requestedTab: PendingTrayOpenTab): ControlTab | null => {
		if (requestedTab === 'default') {
			return visibleControlTabs[0] ?? null;
		}

		return visibleControlTabs.includes(requestedTab) ? requestedTab : null;
	};

	const isWaitingForTrayTab = (requestedTab: PendingTrayOpenTab) =>
		requestedTab === 'files' && isDeskSurface && desktopCapabilities === undefined;

	export const openTray = async (requestedTab: PendingTrayOpenTab = 'default') => {
		const tab = resolveTrayTab(requestedTab);

		if (!tab) {
			return !isWaitingForTrayTab(requestedTab);
		}

		guardCollapseDuringOpen();

		activeTab = tab;
		savedTab = tab;
		showControls.set(true);

		await tick();

		if (pane && largeScreen) {
			openPane();
		}

		return true;
	};

	const consumePendingTrayOpen = async (requestedTab: PendingTrayOpenTab) => {
		if (applyingPendingTrayOpen || !paneReady) return;

		applyingPendingTrayOpen = true;
		const handled = await openTray(requestedTab);
		if (handled && $pendingTrayOpen === requestedTab) {
			pendingTrayOpen.set(null);
		}
		applyingPendingTrayOpen = false;
	};

	$: if (paneReady && $pendingTrayOpen) {
		visibleControlTabs;
		desktopCapabilities;
		void consumePendingTrayOpen($pendingTrayOpen);
	}

	const handleMediaQuery = async (e) => {
		if (e.matches) {
			largeScreen = true;
			if ($showCallOverlay) {
				showCallOverlay.set(false);
				await tick();
				showCallOverlay.set(true);
			}
		} else {
			largeScreen = false;
			if ($showCallOverlay) {
				showCallOverlay.set(false);
				await tick();
				showCallOverlay.set(true);
			}
			pane = null;
		}
	};

	const onMouseDown = () => {
		dragged = true;
	};
	const onMouseUp = () => {
		dragged = false;
	};

	onMount(() => {
		void getEnosDesktopBridgeCapabilities().then((capabilities) => {
			desktopCapabilities = capabilities;
		});

		const mediaQuery = window.matchMedia('(min-width: 1024px)');
		mediaQuery.addEventListener('change', handleMediaQuery);
		handleMediaQuery(mediaQuery);

		let resizeObserver: ResizeObserver | null = null;
		let isDestroyed = false;

		// Wait for Svelte to render the Pane after largeScreen changed
		const init = async () => {
			await tick();

			if (isDestroyed) return;

			// If controls were persisted as open, set the pane to the saved size
			if ($showControls && pane) {
				openPane();
			}

			setTimeout(() => {
				paneReady = true;
			}, 0);

			const container = document.getElementById('chat-container') as HTMLElement;
			if (!container) return;

			minSize = Math.floor((350 / container.clientWidth) * 100);
			resizeObserver = new ResizeObserver((entries) => {
				for (let entry of entries) {
					const width = entry.contentRect.width;
					minSize = Math.floor((350 / width) * 100);
					if ($showControls) {
						if (pane && pane.isExpanded() && pane.getSize() < minSize) {
							pane.resize(minSize);
						} else {
							let size = Math.floor(
								(parseInt(localStorage?.chatControlsSize) / container.clientWidth) * 100
							);
							if (size < minSize && pane) pane.resize(minSize);
						}
					}
				}
			});
			resizeObserver.observe(container);
		};
		init();

		document.addEventListener('mousedown', onMouseDown);
		document.addEventListener('mouseup', onMouseUp);

		return () => {
			isDestroyed = true;
			paneReady = false;
			if (suppressCollapseTimer) clearTimeout(suppressCollapseTimer);
			resizeObserver?.disconnect();
			if (!largeScreen) {
				showControls.set(false);
			}
			mediaQuery.removeEventListener('change', handleMediaQuery);
			document.removeEventListener('mousedown', onMouseDown);
			document.removeEventListener('mouseup', onMouseUp);
		};
	});

	const closeHandler = () => {
		if (!largeScreen) {
			showControls.set(false);
		}
		showArtifacts.set(false);
		showEmbeds.set(false);
		if ($showCallOverlay) showCallOverlay.set(false);
	};

	// On Desk the side pane (Files) is useful without an active chat — e.g. after
	// selecting a project folder from the sidebar — so don't auto-close it there.
	$: if (paneReady && !chatId && !isDeskSurface) closeHandler();

	// Helper: is a "special" full-screen panel active?
	$: specialPanel = $showCallOverlay || $showArtifacts || $showEmbeds;

	const selectControlTab = (tab: ControlTab) => {
		activeTab = tab;
		savedTab = tab;
	};
</script>

{#if !largeScreen}
	{#if $showControls}
		<Drawer
			show={$showControls}
			onClose={() => showControls.set(false)}
			className="min-h-[100dvh] !bg-white dark:!bg-gray-850"
		>
			<div class="h-[100dvh] flex flex-col">
				{#if $showCallOverlay}
					<div
						class="h-full max-h-[100dvh] bg-white text-gray-700 dark:bg-black dark:text-gray-300 flex justify-center"
					>
						<CallOverlay
							bind:files
							{submitPrompt}
							{stopResponse}
							{modelId}
							{chatId}
							{eventTarget}
							on:close={() => showControls.set(false)}
						/>
					</div>
				{:else if $showEmbeds}
					<Embeds />
				{:else if $showArtifacts}
					<Artifacts {history} />
				{:else if isDeskSurface}
					<!-- Desk: Codex-style tabbed dock -->
					<DeskDock
						folderId={effectiveFileFolderId}
						{chatId}
						onClose={() => showControls.set(false)}
						onOpenFile={handleDeskOpenFile}
					>
						<svelte:fragment slot="files">
							{#if showProjectFileNav}
								<LocalFileNav
									folderId={effectiveFileFolderId}
									onAttach={handleTerminalAttach}
									onPreview={handleDeskFilePreview}
									openPath={pendingFileOpenPath}
									openToken={pendingFileOpenToken}
									onProjectDigest={handleProjectDigest}
									onCopyToCloud={handleCopyLocalProjectToCloud}
								/>
							{:else if showActiveTerminalFileNav}
								<FileNav
									onAttach={handleTerminalAttach}
									{chatId}
									cloudWorkspace={isDeskSurface}
									cloudWorkspaceName={selectedTerminalName}
									cloudProjectRoot={selectedCloudProjectRoot}
									hideTerminalPanel={isDeskSurface}
								/>
							{:else}
								<div class="h-full flex items-center justify-center px-6 text-center">
									<div class="max-w-xs text-sm text-gray-500 dark:text-gray-400">
										{$i18n.t('Select a project to browse its files.')}
									</div>
								</div>
							{/if}
						</svelte:fragment>
					</DeskDock>
				{:else}
					<!-- Shared surface tabs -->
					<div class="flex flex-col h-full min-h-0">
						<!-- Tab bar -->
						<div class="flex items-center justify-between px-2 pt-2 pb-2 shrink-0">
							<div class="flex gap-1 min-w-0 overflow-x-auto scrollbar-hidden">
								{#each visibleControlTabs as tab}
									<button
										class="px-2.5 py-1 text-sm rounded-lg transition whitespace-nowrap {activeTab ===
										tab
											? 'bg-gray-100 dark:bg-gray-800 font-medium text-gray-900 dark:text-white'
											: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}"
										on:click={() => selectControlTab(tab)}
									>
										{$i18n.t(controlTabLabel(tab))}
									</button>
								{/each}
							</div>
							<button
								class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400"
								on:click={() => showControls.set(false)}
								aria-label={$i18n.t('Close')}
							>
								<XMark className="size-4" strokeWidth="1.5" />
							</button>
						</div>

						<div
							class="flex-1 min-h-0 {activeTab === 'overview'
								? 'h-full'
								: activeTab === 'controls'
									? 'overflow-y-auto px-3 pt-1'
									: ''}"
						>
							{#if activeTab === 'overview'}
								<Overview
									{history}
									onNodeClick={(e) => {
										const node = e.node;
										showMessage(node.data.message, true);
									}}
									onClose={() => showControls.set(false)}
								/>
							{:else if activeTab === 'files' && showActiveTerminalFileNav}
								<FileNav
									onAttach={handleTerminalAttach}
									{chatId}
									cloudWorkspace={isDeskSurface}
									cloudWorkspaceName={selectedTerminalName}
									cloudProjectRoot={selectedCloudProjectRoot}
								/>
							{:else if activeTab === 'files' && showProjectFileNav}
								<LocalFileNav
									folderId={effectiveFileFolderId}
									onAttach={handleTerminalAttach}
									onProjectDigest={handleProjectDigest}
									onCopyToCloud={handleCopyLocalProjectToCloud}
								/>
							{:else if activeTab === 'files' && showDeskProjectFilesEmpty}
								<div class="h-full flex items-center justify-center px-6 text-center">
									<div class="max-w-xs text-sm text-gray-500 dark:text-gray-400">
										{$i18n.t('Select a project to browse its files.')}
									</div>
								</div>
							{:else if activeTab === 'files' && showGenericTerminalFileNav}
								<FileNav onAttach={handleTerminalAttach} {chatId} />
							{:else if activeTab === 'files' && codeInterpreterEnabled}
								<PyodideFileNav />
							{:else}
								<Controls embed={true} {models} bind:chatFiles bind:params />
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</Drawer>
	{/if}
{:else}
	{#if $showControls}
		<PaneResizer
			class="relative flex items-center justify-center group border-l border-gray-50 dark:border-gray-850/30 hover:border-gray-200 dark:hover:border-gray-800 transition z-20"
			id="controls-resizer"
		>
			<div
				class="absolute -left-1.5 -right-1.5 -top-0 -bottom-0 z-20 cursor-col-resize bg-transparent"
			/>
		</PaneResizer>
	{/if}

	<Pane
		bind:pane
		defaultSize={0}
		onResize={(size) => {
			if ($showControls && pane.isExpanded()) {
				if (size < minSize) pane.resize(minSize);
				if (size < minSize) {
					localStorage.chatControlsSize = 0;
				} else {
					const container = document.getElementById('chat-container');
					localStorage.chatControlsSize = Math.floor((size / 100) * container.clientWidth);
				}
			}
		}}
		onCollapse={() => {
			if (paneReady && !suppressCollapseClose) showControls.set(false);
		}}
		collapsible={true}
		class="z-10 bg-white dark:bg-gray-850"
	>
		{#if $showControls}
			<div class="flex h-full">
				<div
					class="w-full {specialPanel && !$showCallOverlay
						? ' '
						: 'bg-white dark:shadow-lg dark:bg-gray-850'} z-40 pointer-events-auto {isDeskSurface
						? 'h-full flex flex-col'
						: activeTab === 'files'
							? ''
							: 'overflow-y-auto'} scrollbar-hidden"
					id="controls-container"
				>
					{#if $showCallOverlay}
						<div class="w-full h-full flex justify-center">
							<CallOverlay
								bind:files
								{submitPrompt}
								{stopResponse}
								{modelId}
								{chatId}
								{eventTarget}
								on:close={() => showControls.set(false)}
							/>
						</div>
					{:else if $showEmbeds}
						<Embeds overlay={dragged} />
					{:else if $showArtifacts}
						<Artifacts {history} overlay={dragged} />
					{:else if isDeskSurface}
						<!-- Desk: Codex-style tabbed dock -->
						<DeskDock folderId={effectiveFileFolderId} {chatId} onOpenFile={handleDeskOpenFile}>
							<svelte:fragment slot="files">
								{#if showProjectFileNav}
									<LocalFileNav
										folderId={effectiveFileFolderId}
										onAttach={handleTerminalAttach}
										onPreview={handleDeskFilePreview}
										openPath={pendingFileOpenPath}
										openToken={pendingFileOpenToken}
										onProjectDigest={handleProjectDigest}
										onCopyToCloud={handleCopyLocalProjectToCloud}
									/>
								{:else if showActiveTerminalFileNav}
									<FileNav
										onAttach={handleTerminalAttach}
										{chatId}
										cloudWorkspace={isDeskSurface}
										cloudWorkspaceName={selectedTerminalName}
										cloudProjectRoot={selectedCloudProjectRoot}
										hideTerminalPanel={isDeskSurface}
									/>
								{:else}
									<div class="h-full flex items-center justify-center px-6 text-center">
										<div class="max-w-xs text-sm text-gray-500 dark:text-gray-400">
											{$i18n.t('Select a project to browse its files.')}
										</div>
									</div>
								{/if}
							</svelte:fragment>
						</DeskDock>
					{:else}
						<!-- Shared surface tabs -->
						<div class="flex flex-col h-full min-h-0">
							<!-- Tab bar -->
							<div class="flex items-center justify-between px-2 pt-2 pb-2 shrink-0">
								<div class="flex gap-1 min-w-0 overflow-x-auto scrollbar-hidden">
									{#each visibleControlTabs as tab}
										<button
											class="px-2.5 py-1 text-sm rounded-lg transition whitespace-nowrap {activeTab ===
											tab
												? 'bg-gray-100 dark:bg-gray-800 font-medium text-gray-900 dark:text-white'
												: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}"
											on:click={() => selectControlTab(tab)}
										>
											{$i18n.t(controlTabLabel(tab))}
										</button>
									{/each}
								</div>
								<button
									class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400"
									on:click={() => showControls.set(false)}
									aria-label={$i18n.t('Close')}
								>
									<XMark className="size-4" strokeWidth="1.5" />
								</button>
							</div>

							<div
								class="flex-1 min-h-0 {activeTab === 'overview'
									? 'h-full'
									: activeTab === 'controls'
										? 'overflow-y-auto px-3 pt-1'
										: ''}"
							>
								{#if activeTab === 'overview'}
									<Overview
										{history}
										onNodeClick={(e) => {
											const node = e.node;
											if (node?.data?.message?.favorite) {
												history.messages[node.data.message.id].favorite = true;
											} else {
												history.messages[node.data.message.id].favorite = null;
											}
											showMessage(node.data.message, true);
										}}
										onClose={() => showControls.set(false)}
									/>
								{:else if activeTab === 'files' && showActiveTerminalFileNav}
									<FileNav
										onAttach={handleTerminalAttach}
										overlay={dragged}
										{chatId}
										cloudWorkspace={isDeskSurface}
										cloudWorkspaceName={selectedTerminalName}
										cloudProjectRoot={selectedCloudProjectRoot}
									/>
								{:else if activeTab === 'files' && showProjectFileNav}
									<LocalFileNav
										folderId={effectiveFileFolderId}
										onAttach={handleTerminalAttach}
										onProjectDigest={handleProjectDigest}
										onCopyToCloud={handleCopyLocalProjectToCloud}
									/>
								{:else if activeTab === 'files' && showDeskProjectFilesEmpty}
									<div class="h-full flex items-center justify-center px-6 text-center">
										<div class="max-w-xs text-sm text-gray-500 dark:text-gray-400">
											{$i18n.t('Select a project to browse its files.')}
										</div>
									</div>
								{:else if activeTab === 'files' && showGenericTerminalFileNav}
									<FileNav onAttach={handleTerminalAttach} overlay={dragged} {chatId} />
								{:else if activeTab === 'files' && codeInterpreterEnabled}
									<PyodideFileNav overlay={dragged} />
								{:else}
									<Controls embed={true} {models} bind:chatFiles bind:params />
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</Pane>
{/if}
