import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('ENOS Desk UI source guardrails', () => {
	test('sidebar chats are always surface-scoped with a legacy fallback (no chat vanishes)', () => {
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');
		const recursiveFolder = read('src/lib/components/layout/Sidebar/RecursiveFolder.svelte');

		// Chats are always scoped per surface now; legacy fallback lives in filterChatsBySurface.
		expect(sidebar).toContain('filterProjectsForDeskRuntime');
		expect(sidebar).toContain(
			'$: sidebarChats = filterChatsBySurface($chats ?? [], currentSurface, deskFolderIds);'
		);
		expect(sidebar).toContain(
			'$: sidebarPinnedChats = filterChatsBySurface($pinnedChats ?? [], currentSurface, deskFolderIds);'
		);
		// Desk-folder ids are captured from the UNFILTERED folder list for chat scoping.
		expect(sidebar).toContain('deskFolderIds = allFolders');
		expect(sidebar).toContain("folder?.meta?.surface === 'desk'");
		expect(sidebar).toContain('Boolean(folder?.data?.project_context_source)');
		expect(sidebar).toContain('hasDesktopBridge');
		expect(sidebar).toMatch(
			/const folderList = filterProjectsForDeskRuntime\([\s\S]*legacyDeskItemIds: legacyDeskProjectIds[\s\S]*hasDesktopBridge/
		);
		// Desk is project-first: the full standalone Chats section stays chat-surface-only.
		expect(sidebar).toContain('$: showDeskChats = !isDeskSurface;');
		// Desk sessions are project-scoped only. No standalone top-level Sessions fallback.
		expect(sidebar).toContain('newChatLabel');
		expect(sidebar).not.toContain("name={$i18n.t('Unfiled')}");
		expect(sidebar).not.toContain('deskLooseChatIds');
		expect(sidebar).not.toContain('showDeskUnfiledChats');
		expect(sidebar).not.toContain('sidebar-desk-unfiled-chats');
		expect(sidebar).not.toContain('desk-unfiled-pinned-chat-');
		expect(sidebar).not.toContain('desk-unfiled-chat-');
		// Stores hold raw chats; the old opt-in scoping helper is gone.
		expect(sidebar).not.toContain('scopeSidebarChats(');
		expect(sidebar).not.toContain('shouldScopeSidebarChatsBySurface');
		// Folders are still surface-scoped, then web Desk hides local-only projects.
		expect(sidebar).toMatch(/const folderList = filterProjectsForDeskRuntime/);
		expect(recursiveFolder).toContain('deskSessionTitle');
		expect(recursiveFolder).toContain(
			'displayTitle={deskSessionTitle(chat.title, currentSurface)}'
		);
	});

	test('chat list summaries carry surface fields needed by the Desk sidebar', () => {
		const chatsModel = read('backend/open_webui/models/chats.py');

		expect(chatsModel).toMatch(/class ChatTitleIdResponse\(BaseModel\):[\s\S]*meta: dict = \{\}/);
		expect(chatsModel).toMatch(
			/class ChatTitleIdResponse\(BaseModel\):[\s\S]*folder_id: str \| None = None/
		);
		expect(chatsModel).toContain('Chat.meta');
		expect(chatsModel).toContain('Chat.folder_id');
		expect(chatsModel).toContain("'meta': chat[5]");
		expect(chatsModel).toContain("'folder_id': chat[6]");
	});

	test('chat create/update mirrors chat meta into the row used by sidebar summaries', () => {
		const chatsModel = read('backend/open_webui/models/chats.py');

		expect(chatsModel).toContain('def _row_meta_from_chat');
		expect(chatsModel).toMatch(
			/ChatModel\([\s\S]*'meta': self\._row_meta_from_chat\(form_data\.chat\)/
		);
		expect(chatsModel).toMatch(
			/chat_item\.chat = self\._clean_null_bytes\(chat\)[\s\S]*chat_item\.meta = self\._row_meta_from_chat\(chat, chat_item\.meta\)/
		);
	});

	test('a new local project binds optimistically so the badge reads "Local" before the digest scan', () => {
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');
		// The project_context_source (kind:'local') must be set on the selectedFolder BEFORE
		// saveProjectDigestForFolder runs — otherwise the badge flickers "Select" → "Local"
		// while the slow buildProjectDigest file-scan completes.
		expect(sidebar).toContain('const optimisticFolder = {');
		expect(sidebar).toMatch(
			/optimisticFolder = \{[\s\S]*project_context_source:\s*\{[\s\S]*kind: 'local'/
		);
		expect(sidebar).toMatch(
			/selectedFolder\.set\(optimisticFolder\)[\s\S]*saveProjectDigestForFolder\(res\.id, optimisticFolder\)/
		);
	});

	test('Desk side pane defaults to Files only when no tab has been explicitly saved', () => {
		const chatControls = read('src/lib/components/chat/ChatControls.svelte');

		expect(chatControls).toContain('let savedTab: ControlTab | null = null;');
		expect(chatControls).not.toContain(
			"let savedTab: 'controls' | 'files' | 'overview' = 'controls';"
		);
		expect(chatControls).toContain("$: defaultControlTab = isDeskSurface ? 'files' : 'controls';");
		expect(chatControls).toContain(
			'$: canApplyInitialTab = savedTab !== null || !isDeskSurface || showFilesTab;'
		);
		expect(chatControls).toMatch(
			/if \(!hasAppliedInitialTab && canApplyInitialTab\) \{[\s\S]*activeTab = savedTab \?\? defaultControlTab;[\s\S]*hasAppliedInitialTab = true;[\s\S]*\}/
		);
		expect(chatControls).toMatch(
			/const selectControlTab = \(tab: ControlTab\) => \{[\s\S]*activeTab = tab;[\s\S]*savedTab = tab;[\s\S]*\};/
		);
		expect(chatControls.match(/on:click=\{\(\) => selectControlTab\(tab\)\}/g)?.length).toBe(2);
		// Desk drops the advanced "controls" tab (params/system-prompt) — it's the
		// least power-user-facing surface. Web keeps it via DEFAULT_CONTROL_TAB_ORDER.
		expect(chatControls).toContain(
			"const DESK_CONTROL_TAB_ORDER = ['overview', 'files'] satisfies ControlTab[];"
		);
		expect(chatControls).toContain(
			"const DEFAULT_CONTROL_TAB_ORDER = ['controls', 'files', 'overview'] satisfies ControlTab[];"
		);
	});

	test('visible chrome uses canonical close and menu icons for clear duplicates', () => {
		const chatControls = read('src/lib/components/chat/ChatControls.svelte');
		const chatItem = read('src/lib/components/layout/Sidebar/ChatItem.svelte');
		const messageInput = read('src/lib/components/chat/MessageInput.svelte');
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');

		expect(chatControls).toContain("import XMark from '../icons/XMark.svelte';");
		expect(chatControls.match(/<XMark className="size-4"/g)?.length).toBe(2);
		expect(chatControls).not.toContain('M6 18 18 6M6 6l12 12');

		expect(chatItem).toContain(
			"import EllipsisHorizontal from '$lib/components/icons/EllipsisHorizontal.svelte';"
		);
		expect(chatItem.match(/<EllipsisHorizontal className="w-4 h-4"/g)?.length).toBe(2);
		expect(chatItem).not.toContain('M2 8a1.5');

		expect(messageInput).toContain('<XMark className="size-4" />');
		expect(messageInput).not.toContain('M6.28 5.22a.75.75 0 00-1.06 1.06');

		expect(sidebar).toContain("import XMark from '../icons/XMark.svelte';");
		expect(sidebar).toContain('<XMark className="size-3.5" strokeWidth="2" />');
		expect(sidebar).not.toContain('M6 18 18 6M6 6l12 12');
	});

	test('sidebar folder and chat selection use a pending tray request across surfaces', () => {
		const recursiveFolder = read('src/lib/components/layout/Sidebar/RecursiveFolder.svelte');
		const chatItem = read('src/lib/components/layout/Sidebar/ChatItem.svelte');
		const chatControls = read('src/lib/components/chat/ChatControls.svelte');
		const stores = read('src/lib/stores/index.ts');

		expect(stores).toContain('export const pendingTrayOpen: Writable<PendingTrayOpenTab | null>');
		expect(stores).toContain(
			"export const trayTabForSurface = (isDeskSurface: boolean): PendingTrayOpenTab =>\n\tisDeskSurface ? 'files' : 'default';"
		);

		expect(chatControls).toContain('pendingTrayOpen');
		expect(chatControls).toContain('export const openTray = async');
		expect(chatControls).toMatch(
			/const tab = resolveTrayTab\(requestedTab\);[\s\S]*showControls\.set\(true\);[\s\S]*openPane\(\);/
		);
		expect(chatControls).toMatch(
			/if \(visibleControlTabs\.length === 0\) \{[\s\S]*showControls\.set\(false\);[\s\S]*\}/
		);
		// A selected terminal sets the default tab but must NOT force the pane open
		// (a default-enabled cloud terminal was popping the right sidebar on load).
		// The pinned `{ activeTab = 'files'; }` body inherently excludes any auto-open.
		expect(chatControls).toMatch(
			/if \(\$selectedTerminalId && showFilesTab\) \{\s*activeTab = 'files';\s*\}/
		);

		expect(recursiveFolder).toContain('requestTrayOpenForSurface(isDeskSurface);');
		expect(recursiveFolder).toMatch(
			/clickTimer = setTimeout\(async \(\) => \{[\s\S]*open = !open;[\s\S]*isExpandedUpdateDebounceHandler\(\);[\s\S]*await selectProjectFolderHandler\(\{ openFiles: true \}\);/
		);
		expect(recursiveFolder).not.toContain('(e) => e.stopPropagation();');

		expect(chatItem).toContain('export let openFilesOnSelect = false;');
		expect(chatItem).toMatch(
			/const requestTrayOpenOnSelect = \(\) => \{[\s\S]*if \(isDeskSurface && !openFilesOnSelect\) return;[\s\S]*requestTrayOpenForSurface\(isDeskSurface\);[\s\S]*\};/
		);
		expect(chatItem).toMatch(
			/const selectProjectContext = \(\) => \{[\s\S]*requestTrayOpenOnSelect\(\);[\s\S]*\};/
		);
	});

	test('surface detection is centralized in deskRuntime (no inline hostname checks)', () => {
		const files = [
			'src/lib/components/chat/ChatControls.svelte',
			'src/lib/components/chat/MessageInput.svelte',
			'src/lib/components/chat/Navbar.svelte',
			'src/lib/components/chat/Chat.svelte',
			'src/lib/components/layout/Sidebar.svelte',
			'src/lib/components/layout/Sidebar/RecursiveFolder.svelte',
			'src/lib/components/layout/Sidebar/ChatItem.svelte',
			'src/lib/components/chat/Placeholder/FolderTitle.svelte'
		];
		for (const file of files) {
			const src = read(file);
			expect(src).not.toContain("window.location.hostname === 'enosdesk.duckdns.org'");
			expect(src).toContain("from '$lib/enos/deskRuntime'");
		}
	});

	test('browser desk degrades to a calm lite-mode notice, not a red error', () => {
		const nav = read('src/lib/components/chat/LocalFileNav.svelte');
		// Lite mode replaces the old red "bridge unavailable" error string.
		expect(nav).toContain('liteMode = true;');
		expect(nav).not.toContain('ENOS Desktop bridge is unavailable.');
		expect(nav).toContain('Local files live in the desktop app');
	});

	test('missing local folders show a recovery-first project home', () => {
		const nav = read('src/lib/components/chat/LocalFileNav.svelte');

		expect(nav).toContain('Project folder missing');
		expect(nav).toContain('Relink Folder');
		expect(nav).toContain('Keep Read-Only');
		expect(nav).toContain('local files and agent actions are paused');
		expect(nav).not.toContain('Files live on this project’s machine');
	});

	test('desk-web filters local-bound projects instead of rendering a desktop-only cue', () => {
		const folder = read('src/lib/components/layout/Sidebar/RecursiveFolder.svelte');
		// Browser Desk (no bridge) + local-bound project is filtered before this row renders.
		expect(folder).not.toContain('isDesktopOnlyHere');
		expect(folder).not.toContain('files are available in the ENOS desktop app');
	});

	test('Desk navbar uses session language while Chat keeps chat language', () => {
		const nav = read('src/lib/components/chat/Navbar.svelte');

		expect(nav).toContain("import { deskSurfaceLabel } from '$lib/enos/deskSessionLabels';");
		expect(nav).toContain("deskSurfaceLabel('new', currentSurface)");
		expect(nav).toContain("deskSurfaceLabel('rename', currentSurface)");
		expect(nav).toContain('newChatLabel');
		expect(nav).toContain('renameChatLabel');
	});

	test('direct web Desk access to unavailable local projects redirects with cloud guidance', () => {
		const chat = read('src/lib/components/chat/Chat.svelte');

		expect(chat).toContain('isProjectAvailableInDeskRuntime');
		expect(chat).toContain('redirectUnavailableDeskProject');
		expect(chat).toContain('Local projects open in ENOS Desktop');
		expect(chat).toMatch(/hydrateProjectFolderFromChat[\s\S]*redirectUnavailableDeskProject/);
		expect(chat).toMatch(/restoreLastDeskProjectFolder[\s\S]*isProjectAvailableInDeskRuntime/);
	});

	test('cloud desk chat routes to OpenCode BEFORE the bridge gate (web path), local keeps the loop', () => {
		const chat = read('src/lib/components/chat/Chat.svelte');
		// The cloud-workspace check must run before the `!hasDesktopBridge ... return false`
		// gate — else cloud-web chat falls through to the plain pipe (no tools, hallucinates).
		const cloudIdx = chat.indexOf('handleCloudOpencodeChat(userPrompt, cloudWsId)');
		const gateIdx = chat.indexOf('if (!hasDesktopBridge || !folderId) return false;');
		expect(cloudIdx).toBeGreaterThan(-1);
		expect(gateIdx).toBeGreaterThan(-1);
		expect(cloudIdx).toBeLessThan(gateIdx); // cloud handled before the bridge bail
		expect(chat).toContain('runOpencodeDeskTurn');
		expect(chat).toContain('/api/ws/oc2/'); // Pi relay (OpenCode proxy /oc retired 2026-06-26)
		// Local (Electron) path still uses the desk agent loop — no regression.
		expect(chat).toContain('runDeskAgentLoop({');
	});

	test('cloud runtime Files tab renders terminal/cloud files before local files', () => {
		const chatControls = read('src/lib/components/chat/ChatControls.svelte');
		const terminalBranch = chatControls.indexOf(
			"activeTab === 'files' && showActiveTerminalFileNav"
		);
		const localBranch = chatControls.indexOf("activeTab === 'files' && showProjectFileNav");

		expect(chatControls).toContain('showActiveTerminalFileNav');
		expect(chatControls).toMatch(
			/showActiveTerminalFileNav =[\s\S]*showTerminalFileNav[\s\S]*Boolean\(\$selectedTerminalId\)[\s\S]*!isDeskSurface \|\| Boolean\(selectedCloudProjectRoot\)/
		);
		expect(terminalBranch).toBeGreaterThan(-1);
		expect(localBranch).toBeGreaterThan(-1);
		expect(terminalBranch).toBeLessThan(localBranch);
	});

	test('cloud runtime Files tab uses project-scoped ENOS Cloud files presentation', () => {
		const chatControls = read('src/lib/components/chat/ChatControls.svelte');
		const fileNav = read('src/lib/components/chat/FileNav.svelte');
		const localFileNav = read('src/lib/components/chat/LocalFileNav.svelte');

		expect(chatControls).toContain(
			"import { resolveCloudProjectRoot } from '$lib/enos/cloudFiles';"
		);
		expect(chatControls).toContain('selectedCloudProjectRoot');
		expect(chatControls).toContain('cloudWorkspace={isDeskSurface}');
		expect(chatControls).toContain('cloudWorkspaceName={selectedTerminalName}');
		expect(chatControls).toContain('cloudProjectRoot={selectedCloudProjectRoot}');
		expect(fileNav).toContain('CLOUD_FILES_DEFAULT_PATH');
		expect(fileNav).toContain('export let cloudWorkspace = false;');
		expect(fileNav).toContain('export let cloudProjectRoot: string | null = null;');
		expect(fileNav).toContain('previousCloudProjectRoot');
		expect(fileNav).toContain('Project Files');
		expect(fileNav).toContain('formatCloudFilesStatus(cloudWorkspaceName)');
		expect(fileNav).toContain('resolveCloudFilesInitialPath');
		expect(fileNav).toContain('const resolveProjectPath');
		expect(fileNav).toContain('path = resolveProjectPath(path);');
		expect(localFileNav).toContain('Working on your device');
		expect(localFileNav).not.toContain('Project context ready');
	});

	test('desk web locks to cloud when a cloud workspace exists and presents a lean environment card', () => {
		const picker = read('src/lib/components/enos/DeskWorkspacePicker.svelte');
		const chat = read('src/lib/components/chat/Chat.svelte');
		const nav = read('src/lib/components/chat/Navbar.svelte');

		expect(picker).toContain('webDeskCloudLocked');
		expect(picker).toContain('ensureWebDeskCloudSelected');
		expect(picker).toContain("{$i18n.t('Environment')}");
		expect(picker).toContain("{$i18n.t('Local')}");
		expect(picker).toContain("{$i18n.t('ENOS Cloud')}");
		expect(picker).not.toContain("{$i18n.t('Project')}");
		expect(picker).not.toContain('Loose Desk chats live in Unfiled');
		expect(picker).not.toContain("{$i18n.t('GitHub source')}");
		expect(picker).not.toContain('connectGithubAccount');
		expect(picker).not.toContain('disconnectGithubAccount');
		expect(picker).not.toContain('cloneRepoIntoWorkspace');
		expect(picker).not.toContain('owner/repo');
		expect(picker).not.toContain('Cloud terminal');
		expect(picker).not.toContain('directLabel');
		expect(picker).toContain(
			"import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';"
		);
		expect(picker).not.toContain('window.confirm');
		expect(picker).toContain('pendingSwitchTarget');
		expect(picker).toContain('copyLocalProjectIntoCloudWorkspace');
		// F4: the local→cloud move is reframed as adopting a home, not "uploading".
		expect(picker).toContain('Give this project a home in ENOS Cloud');
		expect(picker).not.toContain('Copy this project to cloud?');
		expect(picker).toContain('exportProjectArchive');
		expect(picker).toContain('uploadLocalProjectToCloud');
		expect(picker).not.toContain(
			'Local files stay on this device until you copy the project to cloud.'
		);
		expect(picker).toContain('Work locally?');
		expect(picker).toContain('ENOS Cloud files stay in ENOS Cloud until a local copy is added.');
		expect(picker).not.toContain('$selectedTerminalId === terminal.id ? null : terminal.id');

		expect(chat).toContain('ensureWebDeskCloudDefault');
		expect(chat).toContain('systemCloudWorkspaceId($terminalServers)');
		expect(nav).toContain("title={$i18n.t('Environment')}");
		expect(nav).not.toContain("title={$i18n.t('Project and environment')}");
	});

	test('desk title chrome splits project path from chat actions', () => {
		const nav = read('src/lib/components/chat/Navbar.svelte');

		expect(nav).toContain(
			"import DeskProjectMenu from '$lib/components/enos/DeskProjectMenu.svelte';"
		);
		expect(nav).toContain('let showDeskProjectMenu = false;');
		expect(nav).toContain('id="desk-project-menu-button"');
		expect(nav).toContain('bind:show={showDeskProjectMenu}');
		expect(nav).toContain('activeFolderId={deskWorkspaceFolderId}');
		expect(nav).toContain('activeFolder={deskWorkspaceFolder}');
		expect(nav).toContain('<span aria-hidden="true"');
		expect(nav).toContain('>{chatTitleLabel()}</span>');
		expect(nav).toContain('titleDraft = chatTitleLabel();');
		const projectButton =
			nav.match(/<button[\s\S]*id="desk-project-menu-button"[\s\S]*?<\/button>/)?.[0] ?? '';
		expect(projectButton).toContain('{deskWorkspaceFolder.name}');
		expect(projectButton).not.toContain('ChevronDown');
		expect(nav).not.toContain('deskTitlePathLabel');
		expect(nav).not.toContain('{deskTitleLabel()}');
	});

	test('project menu stays project-scoped and does not expose GitHub plumbing', () => {
		const menu = read('src/lib/components/enos/DeskProjectMenu.svelte');

		expect(menu).toContain("{$i18n.t('Project')}");
		expect(menu).toContain('workspaceBadgeFromFolder(activeFolder)');
		expect(menu).toContain('projectStatusLabel');
		expect(menu).toContain('Working on your device');
		expect(menu).toContain('Working in ENOS Cloud');
		expect(menu).toContain('No workspace connected yet');
		expect(menu).toContain('Choose Local or ENOS Cloud to connect files.');
		expect(menu).not.toContain("{$i18n.t('Source')}");
		expect(menu).not.toContain('getGithubStatus');
		expect(menu).not.toContain('connectGithubAccount');
		expect(menu).not.toContain('disconnectGithubAccount');
		expect(menu).not.toContain('cloneRepoIntoWorkspace');
		expect(menu).not.toContain('bindGithubRepoToFolder');
		expect(menu).not.toContain('owner/repo');
		expect(menu).not.toContain('Connect GitHub');
		expect(menu).not.toContain('Disconnect');
	});

	test('project menu hides duplicate local detail labels', () => {
		const menu = read('src/lib/components/enos/DeskProjectMenu.svelte');

		expect(menu).toContain('showProjectDetailLabel');
		expect(menu).toContain('projectDetailLabel !== projectName');
		expect(menu).not.toContain('{#if projectDetailLabel}');
	});

	test('new project modal is lean and workspace-first in create mode', () => {
		const modal = read('src/lib/components/layout/Sidebar/Folders/FolderModal.svelte');

		expect(modal).toContain("{$i18n.t('New project')}");
		expect(modal).toContain('projectEnvironment');
		expect(modal).toContain('projectStartMode');
		expect(modal).toContain('export let cloudOnlyProjectMode = false;');
		expect(modal).toContain('showProjectSetupOptions = !edit && !cloudOnlyProjectMode');
		expect(modal).toMatch(/\{#if showProjectSetupOptions\}[\s\S]*Where should this project live\?/);
		expect(modal).toContain("{$i18n.t('Where should this project live?')}");
		expect(modal).toContain("{$i18n.t('How do you want to start?')}");
		expect(modal).toContain("{$i18n.t('Local project')}");
		expect(modal).toContain("{$i18n.t('ENOS Cloud project')}");
		expect(modal).toContain("{$i18n.t('Create a new project')}");
		expect(modal).toContain("$i18n.t('Use an existing folder')");
		expect(modal).toContain("projectStartMode = 'clean'");
		expect(modal).toContain("$i18n.t('Create project')");
		expect(modal).toContain("{$i18n.t('Cancel')}");
		expect(modal).toContain('createCleanWorkspace');
		expect(modal).toContain("placeholder={$i18n.t('Untitled project')}");
		expect(modal).toContain('app-managed folder on this device');
		expect(modal).not.toContain("{$i18n.t('Start clean')}");
		expect(modal).not.toContain('Create clean local project');
		expect(modal).not.toContain('Documents/ENOS');
		expect(modal).not.toContain('Choose a local folder or start clean.');
		expect(modal).toMatch(/\{#if showLegacyFolderOptions\}[\s\S]*Folder Background Image/);
		expect(modal).toMatch(/\{#if showLegacyFolderOptions\}[\s\S]*System Prompt/);
		expect(modal).toMatch(/\{#if showLegacyFolderOptions\}[\s\S]*Project Knowledge/);
		expect(modal).not.toContain("placeholder={$i18n.t('Enter folder name')}");
	});

	test('Desk first run creates and selects a home project before Files opens', () => {
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');

		// Q3: the home scaffold is minted with the neutral name, not the literal
		// 'ENOS' / 'ENOS N' (legacy rows still resolve via isScaffoldName).
		expect(sidebar).toContain('const DESK_HOME_PROJECT_NAME = DESK_SCAFFOLD_NAME;');
		expect(sidebar).not.toContain("const DESK_HOME_PROJECT_NAME = 'ENOS';");
		expect(sidebar).toMatch(
			/import \{[\s\S]*isDuplicateDeskHomeProjectName,[\s\S]*isFolderAlreadyExistsError,[\s\S]*selectDeskHomeProject[\s\S]*\} from '\$lib\/enos\/deskHomeProject';/
		);
		expect(sidebar).toContain('let ensuringDeskHomeProject = false;');
		expect(sidebar).toContain('let deskHomeProjectAttempted = false;');
		expect(sidebar).toContain('selectInitialDeskProject(folderList, { force: true })');
		expect(sidebar).toMatch(
			/if \(\s*isDeskSurface &&\s*folderList\.length > 0[\s\S]*selectedDuplicateHome[\s\S]*selectInitialDeskProject\(folderList, \{ force: true \}\)/
		);
		expect(sidebar).toContain('ensureDeskHomeProject');
		expect(sidebar).toMatch(/folderList\.length === 0[\s\S]*ensureDeskHomeProject\(\)/);
		expect(sidebar).toContain('bridge.createCleanWorkspace(DESK_HOME_PROJECT_NAME)');
		expect(sidebar).toContain("projectEnvironment: hasDesktopBridge ? 'local' : 'cloud'");
		expect(sidebar).toContain('name: DESK_HOME_PROJECT_NAME');
		expect(sidebar).toContain('dedupeName: false');
		expect(sidebar).toContain('await createFolder({');
	});

	test('Desk home duplicate create adopts the existing project instead of showing a folder-exists toast', () => {
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');

		expect(sidebar).toContain('recoverDuplicateDeskHomeProject');
		expect(sidebar).toMatch(
			/isFolderAlreadyExistsError\(error\)[\s\S]*getFolders\(localStorage\.token\)[\s\S]*selectDeskHomeProject/
		);
		expect(sidebar).toMatch(
			/selectInitialDeskProject\(\[existingHomeProject\], \{ force: true \}\)/
		);
		expect(sidebar).toContain('findDeskHomeProjectByName(freshFolders)');
		expect(sidebar).toContain('canAdoptDeskHomeProjectToCloud(canonicalHomeProject)');
		expect(sidebar).toContain('updateFolderById(');
		expect(sidebar).toContain('applyDeskProjectFileRuntime');
		expect(sidebar).toContain('__enosRecoveredDuplicateHomeProject');
		expect(sidebar).toMatch(
			/if \(res\?\.__enosRecoveredDuplicateHomeProject\)[\s\S]*removeOptimisticFolder\(tempId\)[\s\S]*return true;/
		);
	});

	test('Desk project file activation is source-kind gated through the runtime helper', () => {
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');
		const chat = read('src/lib/components/chat/Chat.svelte');
		const recursiveFolder = read('src/lib/components/layout/Sidebar/RecursiveFolder.svelte');
		const chatItem = read('src/lib/components/layout/Sidebar/ChatItem.svelte');

		for (const src of [sidebar, chat, recursiveFolder, chatItem]) {
			expect(src).toContain('applyDeskProjectFileRuntime');
			expect(src).toContain('resolveDeskProjectFileRuntime');
		}

		expect(chat).not.toContain('showLocalFileFolderId.set(folder.id);');
		expect(recursiveFolder).not.toContain('showLocalFileFolderId.set(folderId);');
		expect(chatItem).not.toContain('showLocalFileFolderId.set(projectFolder.id);');
	});

	test('web Desk project create asks only for the project name', () => {
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');
		const modal = read('src/lib/components/layout/Sidebar/Folders/FolderModal.svelte');

		expect(sidebar).toContain('cloudOnlyProjectMode={isDeskSurface && !hasDesktopBridge}');
		expect(sidebar).toContain('webDeskCloudWorkspaceOptions');
		expect(modal).toContain('cloudOnlyProjectMode');
		expect(modal).toContain("cloudOnlyProjectMode ? 'cloud' : defaultProjectEnvironment()");
		expect(modal).toMatch(/if \(cloudOnlyProjectMode\) \{[\s\S]*projectEnvironment = 'cloud'/);
		expect(modal).toContain('ENOS Cloud space');
		expect(modal).toContain('cloudWorkspaceOptions.length > 1');
		expect(modal).toContain('onCloudWorkspaceSelect');
		expect(modal).toMatch(/\{#if showProjectSetupOptions\}[\s\S]*How do you want to start\?/);
		expect(modal).not.toContain('Open in the desktop app to create local projects.');
	});

	test('Projects header does not show a hover-fill button background', () => {
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');
		const folder = read('src/lib/components/common/Folder.svelte');

		expect(folder).toContain('export let headerHover = true;');
		expect(folder).toMatch(/headerHover[\s\S]*hover:bg-gray-100 dark:hover:bg-gray-900/);
		expect(sidebar).toMatch(/name=\{\$i18n\.t\('Projects'\)\}[\s\S]*headerHover=\{false\}/);
	});

	test('project menu uses session language on Desk', () => {
		const menu = read('src/lib/components/layout/Sidebar/Folders/FolderMenu.svelte');

		expect(menu).toContain("projectMode ? 'New Session' : 'Create Project'");
		expect(menu).not.toContain('New Project Chat');
	});

	test('Desk project edit opens with current project name and hides legacy folder options', () => {
		const modal = read('src/lib/components/layout/Sidebar/Folders/FolderModal.svelte');
		const folderTitle = read('src/lib/components/chat/Placeholder/FolderTitle.svelte');
		const recursiveFolder = read('src/lib/components/layout/Sidebar/RecursiveFolder.svelte');

		expect(modal).toContain('export let initialFolder = null;');
		expect(modal).toContain('export let projectEditMode = false;');
		expect(modal).toContain('applyInitialFolder(initialFolder)');
		expect(modal).toContain('showLegacyFolderOptions = edit && !projectEditMode');
		expect(modal).toMatch(/\{#if showLegacyFolderOptions\}[\s\S]*Folder Background Image/);
		expect(modal).toMatch(/\{#if showLegacyFolderOptions\}[\s\S]*System Prompt/);
		expect(modal).toMatch(/\{#if showLegacyFolderOptions\}[\s\S]*Project Knowledge/);
		expect(folderTitle).toContain('initialFolder={folder}');
		expect(folderTitle).toContain('projectEditMode={isDeskSurface()}');
		expect(recursiveFolder).toContain('initialFolder={folders[folderId]}');
		expect(recursiveFolder).toContain('projectEditMode={isDeskSurface}');
	});

	test('cloud project creation creates a cloud workspace folder and points Files at it', () => {
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');
		const picker = read('src/lib/components/enos/DeskWorkspacePicker.svelte');
		const chatControls = read('src/lib/components/chat/ChatControls.svelte');

		expect(sidebar).toContain('projectEnvironment');
		expect(sidebar).toContain('createCloudProjectRoot');
		expect(sidebar).toContain('createCloudWorkspace(localStorage.token)');
		expect(sidebar).toContain('waitForCloudWorkspaceTerminal');
		expect(sidebar).toContain('mergeCloudWorkspaceTerminalEntries');
		expect(sidebar).toContain('createDirectory(');
		expect(sidebar).toContain('listFiles(');
		expect(sidebar).toContain('project_context_source: {');
		expect(sidebar).toContain("kind: 'cloud'");
		expect(sidebar).toContain('showFileNavDir.set(cloudPath)');
		expect(sidebar).toMatch(
			/preferExistingRoot[\s\S]*const created = await createDirectory[\s\S]*const retriedEntries = await listFiles[\s\S]*showFileNavDir\.set\(cloudPath\);[\s\S]*return \{ cloudPath, rootName: baseRootName, ws \};/
		);
		expect(sidebar).toContain('selectedTerminalId.set(ws.id)');
		expect(sidebar).not.toContain('terminalServers.set(servers)');
		expect(picker).not.toContain('terminalServers.set(servers)');
		expect(chatControls).not.toContain('terminalServers.set(servers)');
		expect(picker).toContain("import { resolveCloudProjectRoot } from '$lib/enos/cloudFiles';");
		expect(picker).toContain('mergeCloudWorkspaceTerminalEntries');
		expect(chatControls).toContain('mergeCloudWorkspaceTerminalEntries');
		expect(picker).toContain('const cloudSource = cloudProjectContextSource(archive, imported);');
		expect(picker).toContain(
			"showFileNavDir.set(resolveCloudProjectRoot(cloudSource) ?? '/home/user/')"
		);
	});

	test('cloud project create failures keep the modal open and avoid duplicate roots', () => {
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');
		const modal = read('src/lib/components/layout/Sidebar/Folders/FolderModal.svelte');

		expect(sidebar).toContain('let allKnownFolders = [];');
		expect(sidebar).toContain('allKnownFolders = allFolders;');
		expect(sidebar).toContain('nextProjectFolderName(name, parent_id, allKnownFolders)');
		expect(sidebar).toContain('nextCloudProjectRootName');
		expect(sidebar).toContain('existingCloudProjectRootNames');
		expect(sidebar).toMatch(/for \(const folder of allKnownFolders\)[\s\S]*project_context_source/);
		expect(sidebar).toContain('Could not create a unique cloud project folder.');
		expect(sidebar).toContain('rollbackCloudProjectRoot');
		expect(sidebar).toContain('removeOptimisticFolder(tempId)');
		expect(sidebar).toContain('return false;');
		expect(sidebar).toContain('const created = await createFolder(folder);');
		expect(sidebar).toContain('if (created) showCreateFolderModal = false;');
		expect(modal).toContain('const submitted = await onSubmit');
		expect(modal).toContain('if (submitted === false) return;');
	});

	test('Desk cloud session errors use ENOS Cloud language without OpenCode leakage', () => {
		const chat = read('src/lib/components/chat/Chat.svelte');
		const opencode = read('src/lib/enos/deskOpencode.ts');

		expect(chat).toContain('ENOS Cloud error:');
		expect(chat).not.toContain('OpenCode error:');
		expect(chat).not.toContain('(No response from OpenCode.)');
		expect(opencode).toContain('ENOS Cloud error');
		expect(opencode).toContain('ENOS Cloud could not create a session');
		expect(opencode).not.toContain('opencode: could not create session');
	});

	test('deleting the active desk project resets the visible chat pane to the welcome state', () => {
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');
		const placeholder = read('src/lib/components/chat/Placeholder.svelte');
		const chat = read('src/lib/components/chat/Chat.svelte');

		expect(sidebar).toContain('resetDeletedProjectView');
		expect(sidebar).toContain("window.dispatchEvent(new CustomEvent('enos:project-deleted'");
		expect(placeholder).toContain("new CustomEvent('enos:project-deleted'");
		expect(chat).toContain('handleProjectDeleted');
		expect(chat).toContain("window.addEventListener('enos:project-deleted', handleProjectDeleted)");
		expect(chat).toContain('await initNewChat()');
		expect(chat).toContain('showLocalFileFolderId.set(null)');
	});

	test('desk repairs currently opened loose legacy chats by tagging them to the Desk surface', () => {
		const chat = read('src/lib/components/chat/Chat.svelte');

		expect(chat).toContain('repairDeskLooseChatSurface');
		expect(chat).toContain('repairedDeskLooseChatIds');
		expect(chat).toContain("currentSurface() !== 'desk'");
		expect(chat).toContain('projectFolderIdFromChat(source)');
		expect(chat).toContain("meta: withSurfaceMeta({ meta: existingMeta }, 'desk').meta");
	});

	test('local project can be copied into the active cloud workspace from Files', () => {
		const chatControls = read('src/lib/components/chat/ChatControls.svelte');
		const localFileNav = read('src/lib/components/chat/LocalFileNav.svelte');
		const workspaceApi = read('src/lib/apis/workspace.ts');
		const desktopBridge = read('src/lib/enos/desktopBridge.ts');

		expect(localFileNav).toContain('onCopyToCloud');
		expect(localFileNav).toContain('copyProjectToCloud');
		expect(localFileNav).toContain('Copy Project to Cloud');
		expect(localFileNav).toContain('exportProjectArchive');
		expect(chatControls).toContain('handleCopyLocalProjectToCloud');
		expect(chatControls).toContain('createCloudWorkspace(localStorage.token)');
		expect(chatControls).toContain('uploadLocalProjectToCloud(localStorage.token, archive)');
		expect(chatControls).toContain('selectedTerminalId.set(ws.id)');
		expect(chatControls).toContain(
			'const cloudSource = cloudProjectContextSource(archive, imported);'
		);
		expect(chatControls).toContain(
			"showFileNavDir.set(resolveCloudProjectRoot(cloudSource) ?? '/home/user/')"
		);
		expect(workspaceApi).toContain('/migrate/upload');
		expect(desktopBridge).toContain('localProjectCloudUpload?: boolean');
	});

	test('persisted ENOS web sources render real labels instead of raw tool ids', () => {
		const contentRenderer = read('src/lib/components/chat/Messages/ContentRenderer.svelte');
		const citations = read('src/lib/components/chat/Messages/Citations.svelte');

		expect(contentRenderer).toContain("import { getEnosSourceIds } from '$lib/enos/sourceLabels';");
		expect(contentRenderer).toContain('sourceIds = getEnosSourceIds');
		expect(contentRenderer).not.toContain('source?.source?.name ?? id');
		expect(citations).toContain("from '$lib/enos/sourceLabels';");
		expect(citations).toContain('getEnosCitationLabel');
		expect(citations).toContain('getEnosCitationUrl');
		expect(citations).toContain('citation.source.url');
	});

	test('Desk status narration uses compact ENOS presentation without changing Chat history', () => {
		const responseMessage = read('src/lib/components/chat/Messages/ResponseMessage.svelte');
		const statusHistory = read(
			'src/lib/components/chat/Messages/ResponseMessage/StatusHistory.svelte'
		);
		const statusItem = read(
			'src/lib/components/chat/Messages/ResponseMessage/StatusHistory/StatusItem.svelte'
		);

		expect(responseMessage).toContain("import { isDeskHostname } from '$lib/enos/deskRuntime';");
		expect(responseMessage).toContain('compactDesk={isDeskSurface}');
		expect(statusHistory).toContain('export let compactDesk = false;');
		expect(statusHistory).toContain('{#if compactDesk}');
		expect(statusHistory).toContain('aria-label={$i18n.t');
		expect(statusItem).toContain("import { formatDeskStatusLabel } from '$lib/enos/deskStatus';");
		expect(statusItem).toContain('{formatDeskStatusLabel(status)}');
		expect(statusItem).toContain('WebSearchResults');
	});

	test('OpenCode Desk paths share background title generation', () => {
		const chat = read('src/lib/components/chat/Chat.svelte');

		expect(chat).toContain(
			"import { maybeGenerateOpencodeChatTitle } from '$lib/enos/opencodeTitle';"
		);
		expect(chat.match(/void maybeGenerateOpencodeChatTitle/g)?.length).toBeGreaterThanOrEqual(2);
		expect(chat).toContain('notifyFolderChatsChanged');
		expect(chat).not.toContain("console.error('[enos desk title]'");
	});

	test('Desk no-project state is explicit in chrome and prompt grounding', () => {
		const nav = read('src/lib/components/chat/Navbar.svelte');
		const chat = read('src/lib/components/chat/Chat.svelte');
		const grounding = read('src/lib/enos/grounding.ts');

		expect(nav).toContain("const deskWorkspaceEmptyLabel = () => $i18n.t('No Project');");
		expect(nav).toContain('deskWorkspaceEmptyLabel()');
		expect(nav).not.toContain(">{$i18n.t('Select')}</span>");
		expect(chat).toContain(
			"import { deskSurfaceGroundingLine, groundingLine } from '$lib/enos/grounding';"
		);
		expect(chat).toContain('deskSurfaceGroundingLine({');
		expect(chat).toContain('deskSurfaceLine');
		expect(grounding).toContain('not a terminal');
		expect(grounding).toContain('chat-only');
	});

	test('active chat title events update Navbar before message lookup', () => {
		const chat = read('src/lib/components/chat/Chat.svelte');
		const titleEventIdx = chat.indexOf("if (type === 'chat:title') {");
		const messageLookupIdx = chat.indexOf('let message = history.messages[event.message_id];');

		expect(chat).toContain(
			"import { normalizeChatTitleEventData } from '$lib/enos/chatTitleEvents';"
		);
		expect(titleEventIdx).toBeGreaterThan(-1);
		expect(messageLookupIdx).toBeGreaterThan(-1);
		expect(titleEventIdx).toBeLessThan(messageLookupIdx);
		expect(chat).toContain('chatTitle.set(title);');
	});

	test('desk agent carries ENOS identity (three minds, no underlying-model leak) — B4', () => {
		const chat = read('src/lib/components/chat/Chat.svelte');
		// The desk agent must know it is ENOS (three minds), not leak/deny an underlying
		// model (the "I don't have three models / Claude models" gap).
		expect(chat).toContain('IDENTITY: You are ENOS');
		expect(chat).toContain('three minds');
		expect(chat).toContain('Subconscious');
		expect(chat).toContain('Ego');
		expect(chat).toMatch(/never claim to[\s\S]*Claude, GPT, Gemini/);
	});

	test('cross-machine bound project opens the recovery state', () => {
		const nav = read('src/lib/components/chat/LocalFileNav.svelte');
		// Bridge present but bound folder missing on this machine: show recovery,
		// not raw error or passive read-only copy.
		expect(nav).toContain('let unreachable = false;');
		expect(nav).toContain('isPathMissingError');
		expect(nav).toContain('{:else if unreachable}');
		expect(nav).toContain('Project folder missing');
		expect(nav).toContain('Relink Folder');
		expect(nav).toContain('Keep Read-Only');
	});
});
