<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { v4 as uuidv4 } from 'uuid';
	import Sortable from 'sortablejs';

	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import {
		user,
		chats,
		settings,
		showSettings,
		chatId,
		tags,
		folders as _folders,
		showSidebar,
		showSearch,
		mobile,
		showArchivedChats,
		pinnedChats,
		pinnedNotes,
		scrollPaginationEnabled,
		currentChatPage,
		temporaryChatEnabled,
		channels,
		socket,
		config,
		isApp,
		models,
		selectedFolder,
		WEBUI_NAME,
		sidebarWidth,
		activeChatIds,
		showFileNavPath,
		showFileNavDir,
		showLocalFileFolderId,
		showDeskFolderPicker,
		deskHomeProjectRequest,
		terminalServers,
		selectedTerminalId
	} from '$lib/stores';
	import { onMount, getContext, tick, onDestroy } from 'svelte';

	const i18n = getContext('i18n');

	import {
		getChatList,
		getAllTags,
		getPinnedChatList,
		toggleChatPinnedStatusById,
		getChatById,
		updateChatFolderIdById,
		importChats,
		deleteAllChats,
		getChatListBySearchText
	} from '$lib/apis/chats';
	import {
		createNewFolder,
		getFolders,
		updateFolderById,
		updateFolderParentIdById
	} from '$lib/apis/folders';
	import { createNewNote, getPinnedNoteList, toggleNotePinnedStatusById } from '$lib/apis/notes';
	import { updateUserSettings } from '$lib/apis/users';
	import { checkActiveChats } from '$lib/apis/tasks';
	import { createNoteHandler } from '$lib/components/notes/utils';
	import { WEBUI_API_BASE_URL, WEBUI_BASE_URL } from '$lib/constants';

	import ArchivedChatsModal from './ArchivedChatsModal.svelte';
	import UserMenu from './Sidebar/UserMenu.svelte';
	import ChatItem from './Sidebar/ChatItem.svelte';
	import Spinner from '../common/Spinner.svelte';
	import Loader from '../common/Loader.svelte';
	import Folder from '../common/Folder.svelte';
	import Tooltip from '../common/Tooltip.svelte';
	import Folders from './Sidebar/Folders.svelte';
	import { getChannels, createNewChannel } from '$lib/apis/channels';
	import { getTerminalServers, createDirectory, listFiles } from '$lib/apis/terminal';
	import { createCloudWorkspace } from '$lib/apis/workspace';
	import ChannelModal from './Sidebar/ChannelModal.svelte';
	import ChannelItem from './Sidebar/ChannelItem.svelte';
	import PencilSquare from '../icons/PencilSquare.svelte';
	import NewFolderAlt from '../icons/NewFolderAlt.svelte';
	import Search from '../icons/Search.svelte';
	import SearchModal from './SearchModal.svelte';
	import FolderModal from './Sidebar/Folders/FolderModal.svelte';
	import Sidebar from '../icons/Sidebar.svelte';
	import PinnedModelList from './Sidebar/PinnedModelList.svelte';
	import Note from '../icons/Note.svelte';
	import Code from '../icons/Code.svelte';
	import XMark from '../icons/XMark.svelte';
	import { slide } from 'svelte/transition';
	import HotkeyHint from '../common/HotkeyHint.svelte';
	import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';
	import {
		filterChatsBySurface,
		filterProjectsForDeskRuntime,
		surfaceFromIsDesk,
		withSurfaceMeta
	} from '$lib/enos/surfaceScope';
	import { isDeskHostname } from '$lib/enos/deskRuntime';
	import { isProjectVisibleOnSurface } from '$lib/enos/deskFolderVisibility';
	import { workspaceBadgeFromFolder, systemCloudWorkspaceId } from '$lib/enos/workspaceBadge';
	import { deskSurfaceLabel } from '$lib/enos/deskSessionLabels';
	import {
		canAdoptDeskHomeProjectToCloud,
		findDeskHomeProjectByName,
		isDuplicateDeskHomeProjectName,
		isFolderAlreadyExistsError,
		selectDeskHomeProject
	} from '$lib/enos/deskHomeProject';
	import UserAvatar from '$lib/components/enos/UserAvatar.svelte';
	import {
		isSystemCloudWorkspaceTerminal,
		mergeCloudWorkspaceTerminalEntries,
		selectCloudWorkspaceTerminal
	} from '$lib/enos/cloudWorkspaceTerminal';
	import {
		applyDeskProjectFileRuntime,
		resolveDeskProjectFileRuntime
	} from '$lib/enos/deskProjectRuntime';
	import { nextProjectFolderName } from '$lib/enos/projectFolderNames';
	import { DESK_SCAFFOLD_NAME, isScaffoldName } from '$lib/enos/deskProjectName';

	const BREAKPOINT = 768;
	const DEFAULT_PINNED_ITEMS = ['notes', 'workspace'];
	// The home scaffold is minted with the neutral placeholder name (no literal
	// 'ENOS' / 'ENOS N'). Detection of an EXISTING home scaffold uses isScaffoldName
	// so legacy 'ENOS' rows still resolve (migration without renaming live data).
	const DESK_HOME_PROJECT_NAME = DESK_SCAFFOLD_NAME;

	let scrollTop = 0;

	let navElement;
	let shiftKey = false;

	let selectedChatId = null;
	let showCreateChannel = false;

	// Pagination variables
	let chatListLoading = false;
	let allChatsLoaded = false;

	let showCreateFolderModal = false;

	let pinnedModels = [];

	let showPinnedModels = false;
	let showPinnedNotes = false;
	let showChannels = false;
	let showFolders = false;

	let folders = {};
	let allKnownFolders = [];
	let folderRegistry = {};
	let ensuringDeskHomeProject = false;
	let deskHomeProjectAttempted = false;
	// Ids of folders that belong to the desk surface (tagged desk, locally bound,
	// or legacy bridge workspace). Captured from the UNFILTERED folder list so the
	// chat surface filter can also recognize desk folders. Drives filterChatsBySurface.
	let deskFolderIds = [];

	let newFolderId = null;

	$: pinnedItems = $settings?.pinnedMenuItems ?? DEFAULT_PINNED_ITEMS;
	$: isDeskSurface = browser && isDeskHostname();
	$: currentSurface = surfaceFromIsDesk(isDeskSurface);
	// Chats are ALWAYS scoped per surface now (folders already are). The legacy
	// fallback in filterChatsBySurface guarantees no untagged chat vanishes.
	$: sidebarChats = filterChatsBySurface($chats ?? [], currentSurface, deskFolderIds);
	$: sidebarPinnedChats = filterChatsBySurface($pinnedChats ?? [], currentSurface, deskFolderIds);
	$: hasDesktopBridge = browser && Boolean(getEnosDesktopBridge());
	// Desk Local/Cloud separation (F1): on the Desk web surface, purely-local
	// projects must not appear at all — their files live on a machine this surface
	// can't reach. `folders` is a map (id -> folder); rebuild it keeping only the
	// visible entries. Off Desk (or in the app, where the bridge reaches the disk)
	// nothing is filtered. Unbound scaffolds have a null kind → stay visible.
	$: visibleFolders = isDeskSurface
		? Object.fromEntries(
				Object.entries(folders ?? {}).filter(([, folder]) =>
					isProjectVisibleOnSurface({
						folderKind: workspaceBadgeFromFolder(folder).kind,
						hasBridge: hasDesktopBridge
					})
				)
			)
		: (folders ?? {});
	const cloudWorkspaceOptionLabel = (terminal) => {
		const name = String(terminal?.name ?? '').trim();
		if (!name || name === terminal?.id || name.startsWith('ws-') || name === 'Cloud Workspace') {
			return $i18n.t('ENOS Cloud');
		}
		return name;
	};
	$: webDeskCloudWorkspaceOptions = ($terminalServers ?? [])
		.filter(isSystemCloudWorkspaceTerminal)
		.map((terminal) => ({
			id: String(terminal.id),
			name: cloudWorkspaceOptionLabel(terminal)
		}));
	$: newChatLabel = $i18n.t(deskSurfaceLabel('new', currentSurface));
	// Desk is project-first: the full standalone Chats section stays chat-surface-only.
	$: showDeskChats = !isDeskSurface;
	$: if ($showDeskFolderPicker) {
		showCreateFolderModal = true;
		showDeskFolderPicker.set(false);
	}
	// F2: Chat asks for the project to be created on the user's first message (no
	// project yet → the welcome was showing). Create + select it here, where the
	// create machinery lives; Chat awaits $selectedFolder, then renames it from the
	// message. `force` bypasses the once-per-load attempted guard.
	$: if ($deskHomeProjectRequest && isDeskSurface) {
		deskHomeProjectRequest.set(false);
		void ensureDeskHomeProject({ force: true });
	}

	const isMenuItemVisible = (id) => {
		switch (id) {
			case 'notes':
				return (
					($config?.features?.enable_notes ?? false) &&
					($user?.role === 'admin' || ($user?.permissions?.features?.notes ?? true))
				);
			case 'workspace':
				return (
					$user?.role === 'admin' ||
					$user?.permissions?.workspace?.models ||
					$user?.permissions?.workspace?.knowledge ||
					$user?.permissions?.workspace?.prompts ||
					$user?.permissions?.workspace?.tools ||
					$user?.permissions?.workspace?.skills
				);
			case 'automations':
				return (
					$config?.features?.enable_automations &&
					($user?.role === 'admin' || $user?.permissions?.features?.automations)
				);
			case 'calendar':
				return (
					$config?.features?.enable_calendar &&
					($user?.role === 'admin' || $user?.permissions?.features?.calendar)
				);
			case 'playground':
				return $user?.role === 'admin';
			default:
				return false;
		}
	};

	const getMenuItemMeta = (id) => {
		const items = {
			notes: { label: 'Notes', href: '/notes', iconType: 'note' },
			workspace: { label: 'Workspace', href: '/workspace', iconType: 'workspace' },
			automations: { label: 'Automations', href: '/automations', iconType: 'automations' },
			calendar: { label: 'Calendar', href: '/calendar', iconType: 'calendar' },
			playground: { label: 'Playground', href: '/playground', iconType: 'playground' }
		};
		return items[id];
	};

	const initPinnedMenuSortable = () => {
		const el = document.getElementById('pinned-menu-items-list');
		if (el && !$mobile) {
			new Sortable(el, {
				animation: 150,
				onUpdate: async (event) => {
					const itemId = event.item.dataset.id;
					const newIndex = event.newIndex;
					const current = [...pinnedItems];
					const oldIndex = current.indexOf(itemId);
					current.splice(oldIndex, 1);
					current.splice(newIndex, 0, itemId);
					settings.set({ ...$settings, pinnedMenuItems: current });
					await updateUserSettings(localStorage.token, { ui: $settings });
				}
			});
		}
	};

	$: if ($selectedFolder) {
		initFolders();
	}

	const initFolders = async () => {
		if ($config?.features?.enable_folders === false) {
			return;
		}

		const allFolders = await getFolders(localStorage.token).catch((error) => {
			return [];
		});
		allKnownFolders = allFolders;
		const legacyDeskProjectIds = await discoverLegacyDeskProjectIds(allFolders);
		// Desk-folder ids from the FULL list (both surfaces need this for chat scoping):
		// tagged desk, locally bound (project_context_source), or legacy bridge workspace.
		const legacyDeskSet = new Set(legacyDeskProjectIds.map(String));
		deskFolderIds = allFolders
			.filter(
				(folder) =>
					folder?.id &&
					(folder?.meta?.surface === 'desk' ||
						Boolean(folder?.data?.project_context_source) ||
						legacyDeskSet.has(String(folder.id)))
			)
			.map((folder) => String(folder.id));
		const folderList = filterProjectsForDeskRuntime(allFolders, {
			surface: currentSurface,
			hasDesktopBridge,
			legacyDeskItemIds: legacyDeskProjectIds
		});
		_folders.set(folderList.sort((a, b) => b.updated_at - a.updated_at));

		const selectedFolderInList = folderList.some(
			(folder) => folder?.id && folder.id === $selectedFolder?.id
		);
		const selectedDuplicateHome =
			isDuplicateDeskHomeProjectName($selectedFolder?.name) &&
			selectDeskHomeProject(folderList)?.id !== $selectedFolder?.id;
		if (
			isDeskSurface &&
			folderList.length > 0 &&
			(!$selectedFolder?.id || !selectedFolderInList || selectedDuplicateHome)
		) {
			void selectInitialDeskProject(folderList, { force: true });
		}

		// F2: do NOT auto-create a project at 0 folders anymore — the welcome IS the
		// empty state. The project is created on the user's first message instead
		// (Chat sets deskHomeProjectRequest → the reactive below). This keeps returning
		// users (folderList > 0, handled above) unchanged.

		folders = {};

		// First pass: Initialize all folder entries
		for (const folder of folderList) {
			// Ensure folder is added to folders with its data
			folders[folder.id] = { ...(folders[folder.id] || {}), ...folder };

			if (newFolderId && folder.id === newFolderId) {
				folders[folder.id].new = true;
				newFolderId = null;
			}
		}

		// Second pass: Tie child folders to their parents
		for (const folder of folderList) {
			if (folder.parent_id) {
				// Ensure the parent folder is initialized if it doesn't exist
				if (!folders[folder.parent_id]) {
					folders[folder.parent_id] = {}; // Create a placeholder if not already present
				}

				// Initialize childrenIds array if it doesn't exist and add the current folder id
				folders[folder.parent_id].childrenIds = folders[folder.parent_id].childrenIds
					? [...folders[folder.parent_id].childrenIds, folder.id]
					: [folder.id];

				// Sort the children by updated_at field
				folders[folder.parent_id].childrenIds.sort((a, b) => {
					return folders[b].updated_at - folders[a].updated_at;
				});
			}
		}
	};

	const selectInitialDeskProject = async (folderList = [], { force = false } = {}) => {
		const folder = selectDeskHomeProject(folderList);
		if (!folder?.id || ($selectedFolder?.id && !force)) return false;

		await selectedFolder.set(folder);
		applyDeskProjectFileRuntime(
			resolveDeskProjectFileRuntime(folder, {
				hasDesktopBridge,
				cloudWorkspaceId: $selectedTerminalId ?? systemCloudWorkspaceId($terminalServers)
			}),
			{
				showLocalFileFolderId,
				showFileNavDir,
				showFileNavPath,
				selectedTerminalId
			}
		);
		return true;
	};

	const discoverLegacyDeskProjectIds = async (allFolders = []) => {
		if (!isDeskSurface) return [];
		const bridge = getEnosDesktopBridge();
		if (!bridge?.getWorkspace) return [];

		const legacyFolders = allFolders.filter((folder) => {
			const surface = folder?.meta?.surface;
			return folder?.id && surface !== 'desk' && surface !== 'chat';
		});

		const ids = await Promise.all(
			legacyFolders.map(async (folder) => {
				try {
					const workspace = await bridge.getWorkspace(folder.id);
					return workspace ? folder.id : null;
				} catch {
					return null;
				}
			})
		);

		return ids.filter(Boolean);
	};

	const saveProjectDigestForFolder = async (folderId, folder = null) => {
		const bridge = getEnosDesktopBridge();
		if (!bridge?.buildProjectDigest || !folderId) return null;

		try {
			const digest = await bridge.buildProjectDigest(folderId);
			const nextData = {
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

			const updated = await updateFolderById(localStorage.token, folderId, { data: nextData });
			const nextFolder = {
				...(folder ?? {}),
				...(updated ?? {}),
				id: folderId,
				data: nextData
			};

			await selectedFolder.set(nextFolder);
			folders = {
				...folders,
				[folderId]: {
					...(folders[folderId] ?? {}),
					...nextFolder
				}
			};
			return nextFolder;
		} catch (error) {
			toast.error($i18n.t('Project created. Restart ENOS Desk, then run Analyze Project.'));
			return null;
		}
	};

	const safeCloudProjectRootName = (value) => {
		const cleaned = String(value ?? '')
			.trim()
			.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-')
			.replace(/\s+/g, ' ')
			.replace(/^\.+$/, '')
			.slice(0, 80)
			.trim();
		return cleaned || 'Project';
	};

	const cloudRootNameFromPath = (path) =>
		String(path ?? '')
			.replace(/\\/g, '/')
			.replace(/\/+$/, '')
			.split('/')
			.filter(Boolean)
			.at(-1);

	const existingCloudProjectRootNames = () => {
		const names = new Set();
		for (const folder of allKnownFolders) {
			const source = folder?.data?.project_context_source ?? {};
			if (source?.kind !== 'cloud' && source?.kind !== 'github') continue;
			for (const value of [
				source?.rootName,
				cloudRootNameFromPath(source?.cloudPath),
				cloudRootNameFromPath(source?.dest)
			]) {
				if (!String(value ?? '').trim()) continue;
				names.add(safeCloudProjectRootName(value).toLowerCase());
			}
		}
		return names;
	};

	const nextCloudProjectRootName = (baseRootName, usedRootNames) => {
		let rootName = baseRootName;
		let i = 1;
		while (usedRootNames.has(rootName.toLowerCase())) {
			rootName = safeCloudProjectRootName(`${baseRootName} ${i}`);
			i += 1;
		}
		return rootName;
	};

	const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

	const waitForCloudWorkspaceTerminal = async (workspaceId = null) => {
		for (let attempt = 0; attempt < 6; attempt += 1) {
			const servers = await getTerminalServers(localStorage.token);
			terminalServers.update((existing) =>
				mergeCloudWorkspaceTerminalEntries(existing, servers, localStorage.token)
			);
			const terminal = selectCloudWorkspaceTerminal({
				terminals: servers,
				workspaceId,
				selectedId: $selectedTerminalId,
				token: localStorage.token
			});
			if (terminal?.url && terminal?.key) return terminal;
			if (attempt < 5) await wait(500);
		}
		return null;
	};

	const createCloudProjectRoot = async (projectName, { preferExistingRoot = false } = {}) => {
		const baseRootName = safeCloudProjectRootName(projectName);
		const usedRootNames = existingCloudProjectRootNames();
		const ws = await createCloudWorkspace(localStorage.token);

		if (ws?.id) selectedTerminalId.set(ws.id);

		const terminal = await waitForCloudWorkspaceTerminal(ws?.id ?? null);
		if (!terminal?.url || !terminal?.key) {
			throw new Error($i18n.t('ENOS Cloud is not ready yet.'));
		}

		if (preferExistingRoot) {
			const cloudPath = `/home/user/${baseRootName}/`;
			const existingEntries = await listFiles(terminal.url, terminal.key, cloudPath);
			if (existingEntries !== null) {
				showFileNavDir.set(cloudPath);
				return { cloudPath, rootName: baseRootName, ws };
			}
			const created = await createDirectory(terminal.url, terminal.key, cloudPath);
			if (created) {
				showFileNavDir.set(cloudPath);
				return { cloudPath, rootName: baseRootName, ws };
			}
			const retriedEntries = await listFiles(terminal.url, terminal.key, cloudPath);
			if (retriedEntries !== null) {
				showFileNavDir.set(cloudPath);
				return { cloudPath, rootName: baseRootName, ws };
			}
			showFileNavDir.set(cloudPath);
			return { cloudPath, rootName: baseRootName, ws };
		}

		for (let attempt = 0; attempt < 20; attempt += 1) {
			const rootName = nextCloudProjectRootName(baseRootName, usedRootNames);
			const cloudPath = `/home/user/${rootName}/`;
			const created = await createDirectory(terminal.url, terminal.key, cloudPath);
			if (created) {
				showFileNavDir.set(cloudPath);
				return { cloudPath, rootName, ws };
			}
			usedRootNames.add(rootName.toLowerCase());
		}

		throw new Error($i18n.t('Could not create a unique cloud project folder.'));
	};

	const createFolder = async ({
		name,
		meta,
		data,
		parent_id,
		localWorkspace,
		projectEnvironment,
		dedupeName = true,
		preferExistingCloudRoot = false
	}) => {
		name = name?.trim();
		if (!name) {
			toast.error($i18n.t('Folder name cannot be empty.'));
			return false;
		}

		if (dedupeName) {
			name = nextProjectFolderName(name, parent_id, allKnownFolders);
		}

		let nextData = data;
		let cloudProjectRoot = null;
		if (projectEnvironment === 'cloud' && isDeskSurface && !localWorkspace) {
			try {
				cloudProjectRoot = await createCloudProjectRoot(name, {
					preferExistingRoot: preferExistingCloudRoot
				});
				nextData = {
					...(data ?? {}),
					project_context_source: {
						kind: 'cloud',
						rootName: cloudProjectRoot.rootName,
						cloudPath: cloudProjectRoot.cloudPath
					},
					project_context_updated_at: new Date().toISOString()
				};
			} catch (error) {
				toast.error(error instanceof Error ? error.message : `${error}`);
				return false;
			}
		}

		// Add a dummy folder to the list to show the user that the folder is being created
		const tempId = uuidv4();
		folders = {
			...folders,
			[tempId]: {
				id: tempId,
				name: name,
				meta: withSurfaceMeta({ meta }, currentSurface).meta,
				data: nextData,
				parent_id: parent_id,
				created_at: Date.now(),
				updated_at: Date.now()
			}
		};

		const removeOptimisticFolder = (id) => {
			const { [id]: _removed, ...remaining } = folders;
			folders = remaining;
			if ($selectedFolder?.id === id) selectedFolder.set(null);
		};

		const recoverDuplicateDeskHomeProject = async (error) => {
			if (
				!isDeskSurface ||
				parent_id !== null ||
				!isScaffoldName(name) ||
				!isFolderAlreadyExistsError(error)
			) {
				return false;
			}

			const freshFolders = await getFolders(localStorage.token).catch(() => []);
			allKnownFolders = freshFolders;
			const legacyDeskProjectIds = await discoverLegacyDeskProjectIds(freshFolders);
			const folderList = filterProjectsForDeskRuntime(freshFolders, {
				surface: currentSurface,
				hasDesktopBridge,
				legacyDeskItemIds: legacyDeskProjectIds
			});
			const existingHomeProject = selectDeskHomeProject(folderList);
			if (existingHomeProject?.id && isScaffoldName(existingHomeProject?.name)) {
				await selectInitialDeskProject([existingHomeProject], { force: true });
				return true;
			}
			const canonicalHomeProject = findDeskHomeProjectByName(freshFolders);
			if (
				canonicalHomeProject?.id &&
				cloudProjectRoot &&
				canAdoptDeskHomeProjectToCloud(canonicalHomeProject)
			) {
				const adoptedProject = await updateFolderById(
					localStorage.token,
					canonicalHomeProject.id,
					withSurfaceMeta(
						{
							name: String(canonicalHomeProject?.name ?? '').trim() || DESK_HOME_PROJECT_NAME,
							meta: canonicalHomeProject?.meta ?? {},
							data: {
								...(canonicalHomeProject?.data ?? {}),
								...(nextData ?? {})
							},
							parent_id: canonicalHomeProject?.parent_id ?? null
						},
						currentSurface
					)
				).catch((updateError) => {
					console.warn('[desk home duplicate recovery]', updateError);
					return null;
				});
				if (adoptedProject?.id) {
					await selectedFolder.set(adoptedProject);
					applyDeskProjectFileRuntime(
						resolveDeskProjectFileRuntime(adoptedProject, { hasDesktopBridge }),
						{ showLocalFileFolderId, showFileNavDir, showFileNavPath, selectedTerminalId }
					);
					return true;
				}
			}
			return false;
		};

		const res = await createNewFolder(
			localStorage.token,
			withSurfaceMeta(
				{
					name,
					meta,
					data: nextData,
					parent_id
				},
				currentSurface
			)
		).catch(async (error) => {
			if (await recoverDuplicateDeskHomeProject(error)) {
				return { __enosRecoveredDuplicateHomeProject: true };
			}
			toast.error(`${error}`);
			return null;
		});

		const rollbackCloudProjectRoot = async (root) => {
			// Do not delete cloud paths here. Terminal mkdir can succeed for paths with
			// existing content, while the OWUI folder DB write can still fail afterward.
			return root;
		};

		if (res) {
			if (res?.__enosRecoveredDuplicateHomeProject) {
				removeOptimisticFolder(tempId);
				await initFolders();
				return true;
			}
			if (localWorkspace && isDeskSurface && hasDesktopBridge) {
				const bridge = getEnosDesktopBridge();
				await bridge.bindWorkspaceToFolder(res.id);
				// Optimistic local binding: write project_context_source.kind='local' (from the
				// workspace we already picked) BEFORE the slow buildProjectDigest file-scan, so the
				// badge reads "Local" instantly instead of flickering "Select" → "Local" while the
				// scan runs. saveProjectDigestForFolder then enriches the source (fileCount, etc.).
				const optimisticFolder = {
					...res,
					data: {
						...(res?.data ?? {}),
						project_context_source: {
							kind: 'local',
							rootName: localWorkspace?.name ?? res?.name ?? '',
							...(localWorkspace?.rootDisplay ? { rootDisplay: localWorkspace.rootDisplay } : {})
						}
					}
				};
				await selectedFolder.set(optimisticFolder);
				applyDeskProjectFileRuntime(
					resolveDeskProjectFileRuntime(optimisticFolder, { hasDesktopBridge }),
					{ showLocalFileFolderId, showFileNavDir, showFileNavPath, selectedTerminalId }
				);
				await saveProjectDigestForFolder(res.id, optimisticFolder);
			} else if (cloudProjectRoot) {
				const cloudFolder = {
					...res,
					data: nextData
				};
				await selectedFolder.set(cloudFolder);
				applyDeskProjectFileRuntime(
					resolveDeskProjectFileRuntime(cloudFolder, { hasDesktopBridge }),
					{ showLocalFileFolderId, showFileNavDir, showFileNavPath, selectedTerminalId }
				);
				toast.success($i18n.t('Working in ENOS Cloud'));
			}
			// newFolderId = res.id;
			await initFolders();
			showFolders = true;
			return true;
		}
		removeOptimisticFolder(tempId);
		await rollbackCloudProjectRoot(cloudProjectRoot);
		return false;
	};

	const ensureDeskHomeProject = async ({ force = false } = {}) => {
		if (
			!isDeskSurface ||
			ensuringDeskHomeProject ||
			(!force && deskHomeProjectAttempted) ||
			$selectedFolder?.id
		) {
			return false;
		}

		ensuringDeskHomeProject = true;
		deskHomeProjectAttempted = true;

		try {
			const existingHomeProject = selectDeskHomeProject(
				filterProjectsForDeskRuntime(allKnownFolders, {
					surface: currentSurface,
					hasDesktopBridge,
					legacyDeskItemIds: []
				})
			);
			if (existingHomeProject?.id) {
				return await selectInitialDeskProject([existingHomeProject], { force: true });
			}

			const freshFolders = await getFolders(localStorage.token).catch(() => []);
			allKnownFolders = freshFolders;
			const freshHomeProject = selectDeskHomeProject(
				filterProjectsForDeskRuntime(freshFolders, {
					surface: currentSurface,
					hasDesktopBridge,
					legacyDeskItemIds: []
				})
			);
			if (freshHomeProject?.id) {
				return await selectInitialDeskProject([freshHomeProject], { force: true });
			}

			let localWorkspace = null;
			if (hasDesktopBridge) {
				const bridge = getEnosDesktopBridge();
				if (!bridge?.createCleanWorkspace) return false;
				localWorkspace = await bridge.createCleanWorkspace(DESK_HOME_PROJECT_NAME);
				if (!localWorkspace) return false;
			}

			return await createFolder({
				name: DESK_HOME_PROJECT_NAME,
				meta: {},
				data: {},
				parent_id: null,
				localWorkspace,
				projectEnvironment: hasDesktopBridge ? 'local' : 'cloud',
				// Folder-first model: every project is its OWN folder. `preferExistingCloudRoot`
				// reused `/home/user/New project/` for EVERY web project → all projects collided
				// on one cloud dir (no isolation). Always mint a UNIQUE root; dedupe the display
				// name too. (selectDeskHomeProject above still reuses an existing empty scaffold,
				// so this only creates when there's genuinely no scaffold to reuse.)
				dedupeName: true,
				preferExistingCloudRoot: false
			});
		} finally {
			ensuringDeskHomeProject = false;
		}
	};

	const handleDeskLocalFolderPick = async () => {
		const bridge = getEnosDesktopBridge();
		if (!bridge) {
			toast.error($i18n.t('ENOS Desktop bridge is unavailable.'));
			return null;
		}

		try {
			const workspace = await bridge.chooseWorkspace();
			if (workspace) {
				toast.success($i18n.t('Local folder selected'));
				return workspace;
			}
		} catch (error) {
			toast.error(error?.message ?? `${error}`);
		}
		return null;
	};

	const initChannels = async () => {
		// default (none), group, dm type
		const res = await getChannels(localStorage.token).catch((error) => {
			return null;
		});

		if (res) {
			await channels.set(
				res.sort(
					(a, b) =>
						['', null, 'group', 'dm'].indexOf(a.type) - ['', null, 'group', 'dm'].indexOf(b.type)
				)
			);
		}
	};

	const initChatList = async () => {
		// Reset pagination variables
		console.log('initChatList');
		currentChatPage.set(1);
		allChatsLoaded = false;
		scrollPaginationEnabled.set(false);

		initFolders();
		await Promise.all([
			await (async () => {
				console.log('Init tags');
				const _tags = await getAllTags(localStorage.token);
				tags.set(_tags);
			})(),
			await (async () => {
				console.log('Init pinned chats');
				// Store raw; surface scoping happens in the sidebarPinnedChats reactive.
				const _pinnedChats = await getPinnedChatList(localStorage.token);
				pinnedChats.set(_pinnedChats);
			})(),
			await (async () => {
				if (
					$config?.features?.enable_notes &&
					($user?.role === 'admin' || ($user?.permissions?.features?.notes ?? true))
				) {
					console.log('Init pinned notes');
					const _pinnedNotes = await getPinnedNoteList(localStorage.token).catch(() => []);
					pinnedNotes.set(_pinnedNotes);
				}
			})(),
			await (async () => {
				console.log('Init chat list');
				// Store raw; surface scoping happens in the sidebarChats reactive.
				const _chats = await getChatList(localStorage.token, $currentChatPage);
				await chats.set(_chats);
			})()
		]);

		// Enable pagination
		scrollPaginationEnabled.set(true);
	};

	const loadMoreChats = async () => {
		chatListLoading = true;

		currentChatPage.set($currentChatPage + 1);

		let newChatList = [];

		const rawChatList = await getChatList(localStorage.token, $currentChatPage);
		// Store raw; surface scoping happens in the sidebarChats reactive.
		newChatList = rawChatList;

		// once the bottom of the list has been reached (no results) there is no need to continue querying
		allChatsLoaded = rawChatList.length === 0;
		const existingIds = new Set(($chats ?? []).map((c) => c.id));
		const uniqueNewChats = newChatList.filter((c) => !existingIds.has(c.id));
		await chats.set([...($chats ? $chats : []), ...uniqueNewChats]);

		chatListLoading = false;
	};

	const importChatHandler = async (items, pinned = false, folderId = null) => {
		console.log('importChatHandler', items, pinned, folderId);
		for (const item of items) {
			console.log(item);
			if (item.chat) {
				await importChats(localStorage.token, [
					{
						chat: item.chat,
						meta: withSurfaceMeta({ meta: item?.meta ?? {} }, currentSurface).meta,
						pinned: pinned,
						folder_id: folderId,
						created_at: item?.created_at ?? null,
						updated_at: item?.updated_at ?? null
					}
				]);
			}
		}

		initChatList();
	};

	const inputFilesHandler = async (files) => {
		console.log(files);

		for (const file of files) {
			const reader = new FileReader();
			reader.onload = async (e) => {
				const content = e.target.result;

				try {
					const chatItems = JSON.parse(content);
					importChatHandler(chatItems);
				} catch {
					toast.error($i18n.t(`Invalid file format.`));
				}
			};

			reader.readAsText(file);
		}
	};

	const tagEventHandler = async (type, tagName, chatId) => {
		console.log(type, tagName, chatId);
		if (type === 'delete') {
			initChatList();
		} else if (type === 'add') {
			initChatList();
		}
	};

	let draggedOver = false;

	const onDragOver = (e) => {
		e.preventDefault();

		// Check if a file is being draggedOver.
		if (e.dataTransfer?.types?.includes('Files')) {
			draggedOver = true;
		} else {
			draggedOver = false;
		}
	};

	const onDragLeave = () => {
		draggedOver = false;
	};

	const onDrop = async (e) => {
		e.preventDefault();
		console.log(e); // Log the drop event

		// Perform file drop check and handle it accordingly
		if (e.dataTransfer?.files) {
			const inputFiles = Array.from(e.dataTransfer?.files);

			if (inputFiles && inputFiles.length > 0) {
				console.log(inputFiles); // Log the dropped files
				inputFilesHandler(inputFiles); // Handle the dropped files
			}
		}

		draggedOver = false; // Reset draggedOver status after drop
	};

	let touchstart;
	let touchend;

	function checkDirection() {
		const screenWidth = window.innerWidth;
		const swipeDistance = Math.abs(touchend.screenX - touchstart.screenX);
		if (touchstart.clientX < 40 && swipeDistance >= screenWidth / 8) {
			if (touchend.screenX < touchstart.screenX) {
				showSidebar.set(false);
			}
			if (touchend.screenX > touchstart.screenX) {
				showSidebar.set(true);
			}
		}
	}

	const onTouchStart = (e) => {
		touchstart = e.changedTouches[0];
		console.log(touchstart.clientX);
	};

	const onTouchEnd = (e) => {
		touchend = e.changedTouches[0];
		checkDirection();
	};

	const onKeyDown = (e) => {
		if (e.key === 'Shift') {
			shiftKey = true;
		}
	};

	const onKeyUp = (e) => {
		if (e.key === 'Shift') {
			shiftKey = false;
		}
	};

	const onFocus = () => {};

	const onBlur = () => {
		shiftKey = false;
		selectedChatId = null;
	};

	const MIN_WIDTH = 220;
	const MAX_WIDTH = 480;

	let isResizing = false;

	let startWidth = 0;
	let startClientX = 0;

	const resizeStartHandler = (e: MouseEvent) => {
		if ($mobile) return;
		isResizing = true;

		startClientX = e.clientX;
		startWidth = $sidebarWidth ?? 260;

		document.body.style.userSelect = 'none';
	};

	const resizeEndHandler = () => {
		if (!isResizing) return;
		isResizing = false;

		document.body.style.userSelect = '';
		localStorage.setItem('sidebarWidth', String($sidebarWidth));
	};

	const resizeSidebarHandler = (endClientX) => {
		const dx = endClientX - startClientX;
		const newSidebarWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + dx));

		sidebarWidth.set(newSidebarWidth);
		document.documentElement.style.setProperty('--sidebar-width', `${newSidebarWidth}px`);
	};

	onMount(async () => {
		try {
			const width = Number(localStorage.getItem('sidebarWidth'));
			if (!Number.isNaN(width) && width >= MIN_WIDTH && width <= MAX_WIDTH) {
				sidebarWidth.set(width);
			}
		} catch {}

		document.documentElement.style.setProperty('--sidebar-width', `${$sidebarWidth}px`);
		sidebarWidth.subscribe((w) => {
			document.documentElement.style.setProperty('--sidebar-width', `${w}px`);
		});

		showSidebar.set(!$mobile ? localStorage.sidebar === 'true' : false);

		const unsubscribers = [
			mobile.subscribe((value) => {
				if ($showSidebar && value) {
					showSidebar.set(false);
				}

				if ($showSidebar && !value) {
					const navElement = document.getElementsByTagName('nav')[0];
					if (navElement) {
						navElement.style['-webkit-app-region'] = 'drag';
					}
				}
			}),
			showSidebar.subscribe(async (value) => {
				localStorage.sidebar = value;

				// nav element is not available on the first render
				const navElement = document.getElementsByTagName('nav')[0];

				if (navElement) {
					if ($mobile) {
						if (!value) {
							navElement.style['-webkit-app-region'] = 'drag';
						} else {
							navElement.style['-webkit-app-region'] = 'no-drag';
						}
					} else {
						navElement.style['-webkit-app-region'] = 'drag';
					}
				}

				if (value) {
					// Only fetch channels if the feature is enabled and user has permission
					if (
						$config?.features?.enable_channels &&
						($user?.role === 'admin' || ($user?.permissions?.features?.channels ?? true))
					) {
						await initChannels();
					}
					await initChatList();

					// Check which chats have active tasks
					const allChatIds = [...$chats.map((c) => c.id), ...$pinnedChats.map((c) => c.id)];
					if (allChatIds.length > 0) {
						try {
							const res = await checkActiveChats(localStorage.token, allChatIds);
							activeChatIds.set(new Set(res.active_chat_ids || []));
						} catch (e) {
							console.debug('Failed to check active chats:', e);
						}
					}
				}
			}),
			settings.subscribe((value) => {
				if (pinnedModels != value?.pinnedModels ?? []) {
					pinnedModels = value?.pinnedModels ?? [];
					showPinnedModels = pinnedModels.length > 0;
				}
			})
		];

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);

		window.addEventListener('touchstart', onTouchStart);
		window.addEventListener('touchend', onTouchEnd);

		window.addEventListener('focus', onFocus);
		window.addEventListener('blur', onBlur);

		const dropZone = document.getElementById('sidebar');
		if (dropZone) {
			dropZone.addEventListener('dragover', onDragOver);
			dropZone.addEventListener('drop', onDrop);
			dropZone.addEventListener('dragleave', onDragLeave);
		}

		const socketInstance = $socket;
		socketInstance?.on('events', chatActiveEventHandler);

		await tick();
		initPinnedMenuSortable();

		return () => {
			unsubscribers.forEach((unsubscriber) => unsubscriber());

			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);

			window.removeEventListener('touchstart', onTouchStart);
			window.removeEventListener('touchend', onTouchEnd);

			window.removeEventListener('focus', onFocus);
			window.removeEventListener('blur', onBlur);

			if (dropZone) {
				dropZone.removeEventListener('dragover', onDragOver);
				dropZone.removeEventListener('drop', onDrop);
				dropZone.removeEventListener('dragleave', onDragLeave);
			}

			socketInstance?.off('events', chatActiveEventHandler);
		};
	});

	// Handler for chat events (defined outside onMount for proper cleanup)
	const chatActiveEventHandler = (event: {
		chat_id: string;
		message_id: string;
		data: { type: string; data: any };
	}) => {
		if (event.data?.type === 'chat:active') {
			const { active } = event.data.data;
			activeChatIds.update((ids) => {
				const newSet = new Set(ids);
				if (active) {
					newSet.add(event.chat_id);
				} else {
					newSet.delete(event.chat_id);
				}
				return newSet;
			});
		} else if (event.data?.type === 'chat:list') {
			initChatList();
		}
	};

	const applyTemporaryChatPolicy = async () => {
		if ($user?.role !== 'admin' && $user?.permissions?.chat?.temporary_enforced) {
			await temporaryChatEnabled.set(true);
		} else {
			await temporaryChatEnabled.set(false);
		}
	};

	const closeMobileSidebar = () => {
		setTimeout(() => {
			if ($mobile) {
				showSidebar.set(false);
			}
		}, 0);
	};

	const newChatHandler = async () => {
		selectedChatId = null;
		selectedFolder.set(null);
		showLocalFileFolderId.set(null);

		await applyTemporaryChatPolicy();
		await goto('/');
		closeMobileSidebar();
	};

	const resetDeletedProjectView = async (folderId) => {
		const wasActiveProject =
			$selectedFolder?.id === folderId || $showLocalFileFolderId === folderId;
		if (!wasActiveProject) return;

		window.dispatchEvent(new CustomEvent('enos:project-deleted', { detail: { folderId } }));
		selectedChatId = null;
		selectedFolder.set(null);
		showLocalFileFolderId.set(null);
		chatId.set('');
		await goto('/');
	};

	const handleDeskProjectChat = async (folder = $selectedFolder) => {
		selectedChatId = null;
		chatId.set('');

		if (!folder?.id) {
			showFolders = true;
			showCreateFolderModal = true;
			showLocalFileFolderId.set(null);
			await applyTemporaryChatPolicy();
			await goto('/');
			closeMobileSidebar();
			return;
		}

		await selectedFolder.set(folder);
		applyDeskProjectFileRuntime(resolveDeskProjectFileRuntime(folder, { hasDesktopBridge }), {
			showLocalFileFolderId,
			showFileNavDir,
			showFileNavPath,
			selectedTerminalId
		});

		await applyTemporaryChatPolicy();
		await goto('/');
		closeMobileSidebar();
	};

	const startNewChatHandler = async () => {
		if (isDeskSurface) {
			await handleDeskProjectChat();
			return;
		}
		await newChatHandler();
	};

	const itemClickHandler = async () => {
		selectedChatId = null;
		chatId.set('');

		if ($mobile) {
			showSidebar.set(false);
		}

		await tick();
	};

	const isWindows = /Windows/i.test(navigator.userAgent);
</script>

<ArchivedChatsModal
	bind:show={$showArchivedChats}
	onUpdate={async () => {
		await initChatList();
	}}
	onDelete={(id) => {
		if ($chatId === id) {
			goto('/');
			chatId.set('');
		}
	}}
/>

<ChannelModal
	bind:show={showCreateChannel}
	onSubmit={async (payload: any) => {
		let { type, name, is_private, access_grants, group_ids, user_ids } = payload ?? {};
		name = name?.trim();

		if (type === 'dm') {
			if (!user_ids || user_ids.length === 0) {
				toast.error($i18n.t('Please select at least one user for Direct Message channel.'));
				return;
			}
		} else {
			if (!name) {
				toast.error($i18n.t('Channel name cannot be empty.'));
				return;
			}
		}

		const res = await createNewChannel(localStorage.token, {
			type: type,
			name: name,
			is_private: is_private,
			access_grants: access_grants,
			group_ids: group_ids,
			user_ids: user_ids
		}).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (res) {
			$socket.emit('join-channels', { auth: { token: $user?.token } });
			await initChannels();
			showCreateChannel = false;
			showChannels = true;
			goto(`/channels/${res.id}`);
		}
	}}
/>

<FolderModal
	bind:show={showCreateFolderModal}
	showLocalFolderAction={isDeskSurface && hasDesktopBridge}
	cloudOnlyProjectMode={isDeskSurface && !hasDesktopBridge}
	cloudWorkspaceOptions={webDeskCloudWorkspaceOptions}
	selectedCloudWorkspaceId={$selectedTerminalId}
	onCloudWorkspaceSelect={(id) => selectedTerminalId.set(id)}
	onLocalFolderPick={handleDeskLocalFolderPick}
	onSubmit={async (folder) => {
		const created = await createFolder(folder);
		if (created) showCreateFolderModal = false;
		return created;
	}}
/>

<!-- svelte-ignore a11y-no-static-element-interactions -->

{#if $showSidebar}
	<div
		class=" {$isApp
			? ' ml-[4.5rem] md:ml-0'
			: ''} fixed md:hidden z-40 top-0 right-0 left-0 bottom-0 bg-black/60 w-full min-h-screen h-screen flex justify-center overflow-hidden overscroll-contain"
		on:mousedown={() => {
			showSidebar.set(!$showSidebar);
		}}
	/>
{/if}

<SearchModal
	bind:show={$showSearch}
	onClose={() => {
		if ($mobile) {
			showSidebar.set(false);
		}
	}}
/>

<button id="sidebar-new-chat-button" class="hidden" on:click={startNewChatHandler} />

<svelte:window
	on:mousemove={(e) => {
		if (!isResizing) return;
		resizeSidebarHandler(e.clientX);
	}}
	on:mouseup={() => {
		resizeEndHandler();
	}}
/>

{#if !$mobile && !$showSidebar}
	<div
		class=" pt-[7px] pb-2 px-2 flex flex-col justify-between text-black dark:text-white hover:bg-gray-50/30 dark:hover:bg-gray-950/30 h-full z-10 transition-all border-e-[0.5px] border-gray-50 dark:border-gray-850/30"
		id="sidebar"
	>
		<button
			class="flex flex-col flex-1 {isWindows ? 'cursor-pointer' : 'cursor-[e-resize]'}"
			on:click={async () => {
				showSidebar.set(!$showSidebar);
			}}
		>
			<div class="pb-1.5">
				<Tooltip
					content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
					placement="right"
				>
					<button
						class="flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition group {isWindows
							? 'cursor-pointer'
							: 'cursor-[e-resize]'}"
						aria-label={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
					>
						<div class=" self-center flex items-center justify-center size-9">
							<img
								src="{WEBUI_BASE_URL}/static/favicon.png"
								class="sidebar-new-chat-icon size-6 rounded-full group-hover:hidden"
								alt=""
							/>

							<Sidebar className="size-5 hidden group-hover:flex" />
						</div>
					</button>
				</Tooltip>
			</div>

			<div class="-mt-[0.5px]">
				<div class="">
					<Tooltip content={newChatLabel} placement="right">
						<a
							class=" cursor-pointer flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition group"
							href="/"
							draggable="false"
							on:click={async (e) => {
								e.stopImmediatePropagation();
								e.preventDefault();

								await startNewChatHandler();
							}}
							aria-label={newChatLabel}
						>
							<div class=" self-center flex items-center justify-center size-9">
								<PencilSquare className="size-4.5" />
							</div>
						</a>
					</Tooltip>
				</div>

				<div>
					<Tooltip content={$i18n.t('Search')} placement="right">
						<button
							class=" cursor-pointer flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition group"
							on:click={(e) => {
								e.stopImmediatePropagation();
								e.preventDefault();

								showSearch.set(true);
							}}
							draggable="false"
							aria-label={$i18n.t('Search')}
						>
							<div class=" self-center flex items-center justify-center size-9">
								<Search className="size-4.5" />
							</div>
						</button>
					</Tooltip>
				</div>

				{#each pinnedItems as itemId (itemId)}
					{@const meta = getMenuItemMeta(itemId)}
					{#if meta && isMenuItemVisible(itemId)}
						<div class="">
							<Tooltip content={$i18n.t(meta.label)} placement="right">
								<a
									class=" cursor-pointer flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition group"
									href={meta.href}
									on:click={async (e) => {
										e.stopImmediatePropagation();
										e.preventDefault();
										goto(meta.href);
										itemClickHandler();
									}}
									draggable="false"
									aria-label={$i18n.t(meta.label)}
								>
									<div class=" self-center flex items-center justify-center size-9">
										{#if itemId === 'notes'}
											<Note className="size-4.5" />
										{:else if itemId === 'workspace'}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												stroke-width="1.5"
												stroke="currentColor"
												class="size-4.5"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z"
												/>
											</svg>
										{:else if itemId === 'automations'}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												stroke-width="1.5"
												stroke="currentColor"
												class="size-4.5"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
												/>
											</svg>
										{:else if itemId === 'calendar'}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												stroke-width="1.5"
												stroke="currentColor"
												class="size-4.5"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
												/>
											</svg>
										{:else if itemId === 'playground'}
											<Code className="size-4.5" />
										{/if}
									</div>
								</a>
							</Tooltip>
						</div>
					{/if}
				{/each}
			</div>
		</button>

		<div>
			<div>
				<div class=" py-2 flex justify-center items-center">
					{#if $user !== undefined && $user !== null}
						<UserMenu
							role={$user?.role}
							profile={$config?.features?.enable_user_status ?? true}
							showActiveUsers={false}
							on:show={(e) => {
								if (e.detail === 'archived-chat') {
									showArchivedChats.set(true);
								}
							}}
						>
							<button
								type="button"
								class=" cursor-pointer flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition group"
								aria-label={$i18n.t('User menu')}
							>
								<div class="self-center relative">
									<UserAvatar name={$user?.name} className="size-7" />

									{#if $config?.features?.enable_user_status}
										<div class="absolute -bottom-0.5 -right-0.5">
											<span class="relative flex size-2.5">
												<span
													class="relative inline-flex size-2.5 rounded-full {true
														? 'bg-green-500'
														: 'bg-gray-300 dark:bg-gray-700'} border-2 border-white dark:border-gray-900"
												></span>
											</span>
										</div>
									{/if}
								</div>
							</button>
						</UserMenu>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- {$i18n.t('New Project')} -->
<!-- {$i18n.t('Pinned')} -->

{#if $showSidebar}
	<div
		bind:this={navElement}
		id="sidebar"
		class="h-screen max-h-[100dvh] min-h-screen select-none {$showSidebar
			? `${$mobile ? 'bg-gray-50 dark:bg-gray-950' : 'bg-gray-50/70 dark:bg-gray-950/70'} z-50`
			: ' bg-transparent z-0 '} {$isApp
			? `ml-[4.5rem] md:ml-0 `
			: ' transition-all duration-300 '} shrink-0 text-gray-900 dark:text-gray-200 text-sm fixed top-0 left-0 overflow-x-hidden
        "
		transition:slide={{ duration: 250, axis: 'x' }}
		data-state={$showSidebar}
	>
		<div
			class=" my-auto flex flex-col justify-between h-screen max-h-[100dvh] w-[var(--sidebar-width)] overflow-x-hidden scrollbar-hidden z-50 {$showSidebar
				? ''
				: 'invisible'}"
		>
			<div
				class="sidebar px-[0.5625rem] pt-2 pb-1.5 flex justify-between space-x-1 text-gray-600 dark:text-gray-400 sticky top-0 z-10 -mb-3"
			>
				<a
					class="flex items-center rounded-xl size-8.5 h-full justify-center hover:bg-gray-100/50 dark:hover:bg-gray-850/50 transition no-drag-region"
					href="/"
					draggable="false"
					on:click|preventDefault={startNewChatHandler}
				>
					<img
						crossorigin="anonymous"
						src="{WEBUI_BASE_URL}/static/favicon.png"
						class="sidebar-new-chat-icon size-6 rounded-full"
						alt=""
					/>
				</a>

				<a href="/" class="flex flex-1 px-0.5" on:click|preventDefault={startNewChatHandler}>
					<div
						id="sidebar-webui-name"
						class=" self-center font-medium text-gray-850 dark:text-white font-primary"
					>
						{$WEBUI_NAME}
					</div>
				</a>
				<Tooltip
					content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
					placement="bottom"
				>
					<button
						id="sidebar-titlebar-toggle"
						class="flex rounded-xl size-8.5 justify-center items-center hover:bg-gray-100/50 dark:hover:bg-gray-850/50 transition {isWindows
							? 'cursor-pointer'
							: 'cursor-[w-resize]'}"
						on:click={() => {
							showSidebar.set(!$showSidebar);
						}}
						aria-label={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
					>
						<div class=" self-center p-1.5">
							<Sidebar />
						</div>
					</button>
				</Tooltip>

				<div
					class="{scrollTop > 0
						? 'visible'
						: 'invisible'} sidebar-bg-gradient-to-b bg-linear-to-b from-gray-50 dark:from-gray-950 to-transparent from-50% pointer-events-none absolute inset-0 -z-10 -mb-6"
				></div>
			</div>

			<div
				class="relative flex flex-col flex-1 overflow-y-auto scrollbar-hidden pt-3 pb-3"
				on:scroll={(e) => {
					if (e.target.scrollTop === 0) {
						scrollTop = 0;
					} else {
						scrollTop = e.target.scrollTop;
					}
				}}
			>
				<div class="pb-1.5">
					<div class="px-[0.4375rem] flex justify-center text-gray-800 dark:text-gray-200">
						<a
							id="sidebar-new-chat-button"
							class="group grow flex items-center space-x-3 rounded-2xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition outline-none"
							href="/"
							draggable="false"
							on:click|preventDefault={startNewChatHandler}
							aria-label={newChatLabel}
						>
							<div class="self-center">
								<PencilSquare className=" size-4.5" strokeWidth="2" />
							</div>

							<div class="flex flex-1 self-center translate-y-[0.5px]">
								<div class=" self-center text-sm font-primary">{newChatLabel}</div>
							</div>

							<HotkeyHint name="newChat" className=" group-hover:visible invisible" />
						</a>
					</div>

					<div class="px-[0.4375rem] flex justify-center text-gray-800 dark:text-gray-200">
						<button
							id="sidebar-search-button"
							class="group grow flex items-center space-x-3 rounded-2xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition outline-none"
							on:click={() => {
								showSearch.set(true);
							}}
							draggable="false"
							aria-label={$i18n.t('Search')}
						>
							<div class="self-center">
								<Search strokeWidth="2" className="size-4.5" />
							</div>

							<div class="flex flex-1 self-center translate-y-[0.5px]">
								<div class=" self-center text-sm font-primary">{$i18n.t('Search')}</div>
							</div>
							<HotkeyHint name="search" className=" group-hover:visible invisible" />
						</button>
					</div>

					<div id="pinned-menu-items-list">
						{#each pinnedItems as itemId (itemId)}
							{@const meta = getMenuItemMeta(itemId)}
							{#if meta && isMenuItemVisible(itemId)}
								<div
									class="px-[0.4375rem] flex justify-center text-gray-800 dark:text-gray-200"
									data-id={itemId}
								>
									<a
										id="sidebar-{itemId}-button"
										class="grow flex items-center space-x-3 rounded-2xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition"
										href={meta.href}
										on:click={itemClickHandler}
										draggable="false"
										aria-label={$i18n.t(meta.label)}
									>
										<div class="self-center">
											{#if itemId === 'notes'}
												<Note className="size-4.5" strokeWidth="2" />
											{:else if itemId === 'workspace'}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													stroke-width="2"
													stroke="currentColor"
													class="size-4.5"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z"
													/>
												</svg>
											{:else if itemId === 'automations'}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													stroke-width="2"
													stroke="currentColor"
													class="size-4.5"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
													/>
												</svg>
											{:else if itemId === 'calendar'}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													stroke-width="2"
													stroke="currentColor"
													class="size-4.5"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
													/>
												</svg>
											{:else if itemId === 'playground'}
												<Code className="size-4.5" strokeWidth="2" />
											{/if}
										</div>

										<div class="flex self-center translate-y-[0.5px]">
											<div class=" self-center text-sm font-primary">{$i18n.t(meta.label)}</div>
										</div>
									</a>
								</div>
							{/if}
						{/each}
					</div>
				</div>

				{#if ($models ?? []).length > 0 && (($settings?.pinnedModels ?? []).length > 0 || $config?.default_pinned_models)}
					<Folder
						id="sidebar-models"
						bind:open={showPinnedModels}
						className="px-2 mt-0.5"
						name={$i18n.t('Models')}
						chevron={false}
						dragAndDrop={false}
					>
						<PinnedModelList bind:selectedChatId {shiftKey} />
					</Folder>
				{/if}

				{#if ($config?.features?.enable_notes ?? false) && ($user?.role === 'admin' || ($user?.permissions?.features?.notes ?? true)) && $pinnedNotes.length > 0}
					<Folder
						id="sidebar-pinned-notes"
						bind:open={showPinnedNotes}
						className="px-2 mt-0.5"
						name={$i18n.t('Notes')}
						chevron={false}
						dragAndDrop={false}
						onAdd={async () => {
							const note = await createNoteHandler('New Note');
							if (note) {
								goto(`/notes/${note.id}`);
							}
						}}
						onAddLabel={$i18n.t('New Note')}
					>
						<div class="mt-0.5 pb-1.5">
							{#each $pinnedNotes as note (note.id)}
								<a
									class="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-900 transition group text-sm"
									href={`/notes/${note.id}`}
									on:click={() => {
										itemClickHandler();
									}}
									draggable="false"
								>
									<div class="self-center">
										<Note className="size-4" strokeWidth="2" />
									</div>
									<div class="flex-1 text-ellipsis line-clamp-1">
										{note.title}
									</div>
									<button
										class="invisible group-hover:visible self-center p-0.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition"
										on:click|preventDefault|stopPropagation={async () => {
											await toggleNotePinnedStatusById(localStorage.token, note.id);
											const _pinnedNotes = await getPinnedNoteList(localStorage.token).catch(
												() => []
											);
											pinnedNotes.set(_pinnedNotes);
										}}
										aria-label={$i18n.t('Unpin')}
									>
										<XMark className="size-3.5" strokeWidth="2" />
									</button>
								</a>
							{/each}
						</div>
					</Folder>
				{/if}

				{#if $config?.features?.enable_channels && ($user?.role === 'admin' || ($user?.permissions?.features?.channels ?? true))}
					<Folder
						id="sidebar-channels"
						bind:open={showChannels}
						className="px-2 mt-0.5"
						name={$i18n.t('Channels')}
						chevron={false}
						dragAndDrop={false}
						onAdd={$user?.role === 'admin' || ($user?.permissions?.features?.channels ?? true)
							? async () => {
									await tick();

									setTimeout(() => {
										showCreateChannel = true;
									}, 0);
								}
							: null}
						onAddLabel={$i18n.t('Create Channel')}
					>
						{#each $channels as channel, channelIdx (`${channel?.id}`)}
							<ChannelItem
								{channel}
								onUpdate={async () => {
									await initChannels();
								}}
							/>

							{#if channelIdx < $channels.length - 1 && channel.type !== $channels[channelIdx + 1]?.type}<hr
									class=" border-gray-100/40 dark:border-gray-800/10 my-1.5 w-full"
								/>
							{/if}
						{/each}
					</Folder>
				{/if}

				{#if $config?.features?.enable_folders && ($user?.role === 'admin' || ($user?.permissions?.features?.folders ?? true))}
					<Folder
						id="sidebar-folders"
						bind:open={showFolders}
						className="px-2 mt-0.5"
						name={$i18n.t('Projects')}
						chevron={false}
						headerHover={false}
						addIcon={NewFolderAlt}
						onAdd={() => {
							showCreateFolderModal = true;
						}}
						onAddLabel={$i18n.t('New Project')}
						on:drop={async (e) => {
							const { type, id, item } = e.detail;

							if (type === 'folder') {
								if (folders[id].parent_id === null) {
									return;
								}

								const res = await updateFolderParentIdById(localStorage.token, id, null).catch(
									(error) => {
										toast.error(`${error}`);
										return null;
									}
								);

								if (res) {
									await initFolders();
								}
							}
						}}
					>
						<Folders
							bind:folderRegistry
							folders={visibleFolders}
							{shiftKey}
							onDelete={async (folderId) => {
								await resetDeletedProjectView(folderId);
								await initFolders();
								initChatList();
							}}
							on:update={() => {
								initChatList();
							}}
							on:import={(e) => {
								const { folderId, items } = e.detail;
								importChatHandler(items, false, folderId);
							}}
							on:change={async () => {
								initChatList();
							}}
						/>
					</Folder>
				{/if}

				{#if showDeskChats}
					<Folder
						id="sidebar-chats"
						className="px-2 mt-0.5"
						name={$i18n.t('Chats')}
						chevron={false}
						addIcon={PencilSquare}
						onAdd={() => {
							startNewChatHandler();
						}}
						onAddLabel={newChatLabel}
						on:change={async (e) => {
							selectedFolder.set(null);
						}}
						on:import={(e) => {
							importChatHandler(e.detail);
						}}
						on:drop={async (e) => {
							const { type, id, item } = e.detail;

							if (type === 'chat') {
								let chat = await getChatById(localStorage.token, id).catch((error) => {
									return null;
								});
								if (!chat && item) {
									chat = await importChats(localStorage.token, [
										{
											chat: item.chat,
											meta: withSurfaceMeta({ meta: item?.meta ?? {} }, currentSurface).meta,
											pinned: false,
											folder_id: null,
											created_at: item?.created_at ?? null,
											updated_at: item?.updated_at ?? null
										}
									]);
								}

								if (chat) {
									console.log(chat);
									if (chat.folder_id) {
										const res = await updateChatFolderIdById(
											localStorage.token,
											chat.id,
											null
										).catch((error) => {
											toast.error(`${error}`);
											return null;
										});

										folderRegistry[chat.folder_id]?.setFolderItems();
									}

									if (chat.pinned) {
										const res = await toggleChatPinnedStatusById(localStorage.token, chat.id);
									}

									initChatList();
								}
							} else if (type === 'folder') {
								if (folders[id].parent_id === null) {
									return;
								}

								const res = await updateFolderParentIdById(localStorage.token, id, null).catch(
									(error) => {
										toast.error(`${error}`);
										return null;
									}
								);

								if (res) {
									await initFolders();
								}
							}
						}}
					>
						{#if sidebarPinnedChats.length > 0}
							<div class="mb-1">
								<div class="flex flex-col space-y-1 rounded-xl">
									<Folder
										id="sidebar-pinned-chats"
										buttonClassName=" text-gray-500"
										on:import={(e) => {
											importChatHandler(e.detail, true);
										}}
										on:drop={async (e) => {
											const { type, id, item } = e.detail;

											if (type === 'chat') {
												let chat = await getChatById(localStorage.token, id).catch((error) => {
													return null;
												});
												if (!chat && item) {
													chat = await importChats(localStorage.token, [
														{
															chat: item.chat,
															meta: withSurfaceMeta({ meta: item?.meta ?? {} }, currentSurface)
																.meta,
															pinned: false,
															folder_id: null,
															created_at: item?.created_at ?? null,
															updated_at: item?.updated_at ?? null
														}
													]);
												}

												if (chat) {
													console.log(chat);
													if (chat.folder_id) {
														const res = await updateChatFolderIdById(
															localStorage.token,
															chat.id,
															null
														).catch((error) => {
															toast.error(`${error}`);
															return null;
														});
													}

													if (!chat.pinned) {
														const res = await toggleChatPinnedStatusById(
															localStorage.token,
															chat.id
														);
													}

													initChatList();
												}
											}
										}}
										name={$i18n.t('Pinned')}
									>
										<div
											class="ml-3 pl-1 mt-[1px] flex flex-col overflow-y-auto scrollbar-hidden border-s border-gray-100 dark:border-gray-900 text-gray-900 dark:text-gray-200"
										>
											{#each sidebarPinnedChats as chat, idx (`pinned-chat-${chat?.id ?? idx}`)}
												<ChatItem
													className=""
													id={chat.id}
													title={chat.title}
													createdAt={chat.created_at}
													updatedAt={chat.updated_at}
													lastReadAt={chat.last_read_at}
													{shiftKey}
													selected={selectedChatId === chat.id}
													openFilesOnSelect={isDeskSurface}
													on:select={() => {
														selectedChatId = chat.id;
													}}
													on:unselect={() => {
														selectedChatId = null;
													}}
													on:change={async () => {
														initChatList();
													}}
													on:tag={(e) => {
														const { type, name } = e.detail;
														tagEventHandler(type, name, chat.id);
													}}
												/>
											{/each}
										</div>
									</Folder>
								</div>
							</div>
						{/if}

						<div class=" flex-1 flex flex-col overflow-y-auto scrollbar-hidden">
							<div class="pt-1.5">
								{#if $chats}
									{#each sidebarChats as chat, idx (`chat-${chat?.id ?? idx}`)}
										{#if idx === 0 || (idx > 0 && chat.time_range !== sidebarChats[idx - 1].time_range)}
											<div
												class="w-full pl-2.5 text-xs text-gray-500 dark:text-gray-500 font-medium {idx ===
												0
													? ''
													: 'pt-5'} pb-1.5"
											>
												{$i18n.t(chat.time_range)}
												<!-- localisation keys for time_range to be recognized from the i18next parser (so they don't get automatically removed):
							{$i18n.t('Today')}
							{$i18n.t('Yesterday')}
							{$i18n.t('Previous 7 days')}
							{$i18n.t('Previous 30 days')}
							{$i18n.t('January')}
							{$i18n.t('February')}
							{$i18n.t('March')}
							{$i18n.t('April')}
							{$i18n.t('May')}
							{$i18n.t('June')}
							{$i18n.t('July')}
							{$i18n.t('August')}
							{$i18n.t('September')}
							{$i18n.t('October')}
							{$i18n.t('November')}
							{$i18n.t('December')}
							-->
											</div>
										{/if}

										<ChatItem
											className=""
											id={chat.id}
											title={chat.title}
											createdAt={chat.created_at}
											updatedAt={chat.updated_at}
											lastReadAt={chat.last_read_at}
											{shiftKey}
											selected={selectedChatId === chat.id}
											openFilesOnSelect={isDeskSurface}
											on:select={() => {
												selectedChatId = chat.id;
											}}
											on:unselect={() => {
												selectedChatId = null;
											}}
											on:change={async () => {
												initChatList();
											}}
											on:tag={(e) => {
												const { type, name } = e.detail;
												tagEventHandler(type, name, chat.id);
											}}
										/>
									{/each}

									{#if $scrollPaginationEnabled && !allChatsLoaded}
										<Loader
											on:visible={(e) => {
												if (!chatListLoading) {
													loadMoreChats();
												}
											}}
										>
											<div
												class="w-full flex justify-center py-1 text-xs animate-pulse items-center gap-2"
											>
												<Spinner className=" size-4" />
												<div class=" ">{$i18n.t('Loading...')}</div>
											</div>
										</Loader>
									{/if}
								{:else}
									<div
										class="w-full flex justify-center py-1 text-xs animate-pulse items-center gap-2"
									>
										<Spinner className=" size-4" />
										<div class=" ">{$i18n.t('Loading...')}</div>
									</div>
								{/if}
							</div>
						</div>
					</Folder>
				{/if}
			</div>

			<div class="px-1.5 pt-1.5 pb-2 sticky bottom-0 z-10 -mt-3 sidebar">
				<div
					class=" sidebar-bg-gradient-to-t bg-linear-to-t from-gray-50 dark:from-gray-950 to-transparent from-50% pointer-events-none absolute inset-0 -z-10 -mt-6"
				></div>
				<div class="flex flex-col font-primary">
					{#if $user !== undefined && $user !== null}
						<UserMenu
							role={$user?.role}
							profile={$config?.features?.enable_user_status ?? true}
							showActiveUsers={false}
							className="w-[calc(var(--sidebar-width)-1rem)]"
							on:show={(e) => {
								if (e.detail === 'archived-chat') {
									showArchivedChats.set(true);
								}
							}}
						>
							<button
								type="button"
								class=" flex items-center rounded-2xl py-2 px-1.5 w-full hover:bg-gray-100/50 dark:hover:bg-gray-900/50 transition"
								aria-label={$i18n.t('User menu')}
							>
								<div class=" self-center mr-3 relative flex-shrink-0">
									<UserAvatar name={$user?.name} className="size-7" />

									{#if $config?.features?.enable_user_status}
										<div class="absolute -bottom-0.5 -right-0.5">
											<span class="relative flex size-2.5">
												<span
													class="relative inline-flex size-2.5 rounded-full {true
														? 'bg-green-500'
														: 'bg-gray-300 dark:bg-gray-700'} border-2 border-white dark:border-gray-900"
												></span>
											</span>
										</div>
									{/if}
								</div>
								<div class=" self-center font-medium truncate">{$user?.name}</div>
							</button>
						</UserMenu>
					{/if}
				</div>
			</div>
		</div>
	</div>

	{#if !$mobile}
		<div
			class="relative flex items-center justify-center group border-l border-gray-50 dark:border-gray-850/30 hover:border-gray-200 dark:hover:border-gray-800 transition z-20"
			id="sidebar-resizer"
			on:mousedown={resizeStartHandler}
			role="separator"
		>
			<div
				class=" absolute -left-1.5 -right-1.5 -top-0 -bottom-0 z-20 cursor-col-resize bg-transparent"
			/>
		</div>
	{/if}
{/if}
