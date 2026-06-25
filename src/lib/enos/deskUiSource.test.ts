import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('ENOS Desk UI source guardrails', () => {
	test('sidebar chats are always surface-scoped with a legacy fallback (no chat vanishes)', () => {
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');

		// Chats are always scoped per surface now; legacy fallback lives in filterChatsBySurface.
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
		// Desk is project-first: the full standalone Chats section stays chat-surface-only.
		expect(sidebar).toContain('$: showDeskChats = !isDeskSurface;');
		// But no-project Desk chats still need a visible home.
		expect(sidebar).toContain("name={$i18n.t('Unfiled')}");
		expect(sidebar).toContain('deskLooseChatIds');
		expect(sidebar).toContain('{#if showDeskUnfiledChats}');
		expect(sidebar).toMatch(
			/\$: showDeskUnfiledChats =[\s\S]*isDeskSurface && \(sidebarPinnedChats\.length > 0 \|\| sidebarChats\.length > 0\);/
		);
		expect(sidebar).toContain('desk-unfiled-pinned-chat-');
		// Stores hold raw chats; the old opt-in scoping helper is gone.
		expect(sidebar).not.toContain('scopeSidebarChats(');
		expect(sidebar).not.toContain('shouldScopeSidebarChatsBySurface');
		// Folders are still surface-scoped via filterBySurface.
		expect(sidebar).toMatch(/const folderList = filterBySurface/);
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

	test('desk-web shows a calm "desktop only" cue on local-bound folders (visible, not blocked)', () => {
		const folder = read('src/lib/components/layout/Sidebar/RecursiveFolder.svelte');
		// Browser desk (no bridge) + a local-bound project → a muted cue, not a block.
		expect(folder).toContain('isDesktopOnlyHere');
		expect(folder).toContain('workspaceBadgeFromFolder');
		expect(folder).toContain('!getEnosDesktopBridge()');
		expect(folder).toContain('{#if isDesktopOnlyHere}');
		expect(folder).toContain('files are available in the ENOS desktop app');
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
		expect(chat).toContain('/api/ws/oc/');
		// Local (Electron) path still uses the kimi loop — no regression.
		expect(chat).toContain('runDeskAgentLoop({');
	});

	test('cloud runtime Files tab renders terminal/cloud files before local files', () => {
		const chatControls = read('src/lib/components/chat/ChatControls.svelte');
		const terminalBranch = chatControls.indexOf(
			"activeTab === 'files' && showActiveTerminalFileNav"
		);
		const localBranch = chatControls.indexOf("activeTab === 'files' && showProjectFileNav");

		expect(chatControls).toContain('showActiveTerminalFileNav');
		expect(terminalBranch).toBeGreaterThan(-1);
		expect(localBranch).toBeGreaterThan(-1);
		expect(terminalBranch).toBeLessThan(localBranch);
	});

	test('cloud runtime Files tab uses the Cloud Files presentation', () => {
		const chatControls = read('src/lib/components/chat/ChatControls.svelte');
		const fileNav = read('src/lib/components/chat/FileNav.svelte');
		const localFileNav = read('src/lib/components/chat/LocalFileNav.svelte');

		expect(chatControls).toContain('cloudWorkspace={isDeskSurface}');
		expect(chatControls).toContain('cloudWorkspaceName={selectedTerminalName}');
		expect(fileNav).toContain('CLOUD_FILES_DEFAULT_PATH');
		expect(fileNav).toContain('export let cloudWorkspace = false;');
		expect(fileNav).toContain('Cloud Files');
		expect(fileNav).toContain('formatCloudFilesStatus(cloudWorkspaceName)');
		expect(fileNav).toContain('resolveCloudFilesInitialPath');
		expect(localFileNav).toContain('Working on your device');
		expect(localFileNav).not.toContain('Project context ready');
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
			"showFileNavDir.set(imported.dest ? `${imported.dest.replace(/\\/$/, '')}/` : '/home/user/')"
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
		expect(chat).toContain('DeepMind');
		expect(chat).toMatch(/never claim to[\s\S]*Claude, GPT, Gemini/);
	});

	test('cross-machine bound project degrades to a calm read-only notice', () => {
		const nav = read('src/lib/components/chat/LocalFileNav.svelte');
		// Bridge present but the bound folder is missing on THIS machine: show a calm
		// "files live elsewhere / read-only history" notice instead of a raw error.
		expect(nav).toContain('let unreachable = false;');
		expect(nav).toContain('isPathMissingError');
		expect(nav).toContain('{:else if unreachable}');
		expect(nav).toContain('Files live on this project’s machine');
		expect(nav).toContain('read-only history');
	});
});
