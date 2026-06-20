import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Desk sidebar scopes top-level Chats by opt-in setting and binds selected Mac folders to sidebar folders', () => {
	const sidebar = readFileSync('src/lib/components/layout/Sidebar.svelte', 'utf8');
	const folderModal = readFileSync(
		'src/lib/components/layout/Sidebar/Folders/FolderModal.svelte',
		'utf8'
	);
	const recursiveFolder = readFileSync(
		'src/lib/components/layout/Sidebar/RecursiveFolder.svelte',
		'utf8'
	);
	const chatControls = readFileSync('src/lib/components/chat/ChatControls.svelte', 'utf8');
	const localFileNav = readFileSync('src/lib/components/chat/LocalFileNav.svelte', 'utf8');
	const stores = readFileSync('src/lib/stores/index.ts', 'utf8');
	const bridge = readFileSync('src/lib/enos/desktopBridge.ts', 'utf8');

	assert.match(sidebar, /isDeskSurface/, 'Sidebar should identify the ENOS Desk surface');
	assert.match(
		sidebar,
		/showDeskChats\s*=\s*!\(isDeskSurface && \(\$settings\?\.enos\?\.scopeSidebarChatsBySurface \?\? false\)\)/,
		'Desk should show top-level Chats by default and hide them only when surface scoping is enabled'
	);
	assert.doesNotMatch(
		sidebar,
		/showDeskChats\s*=\s*!\s*isDeskSurface/,
		'Desk should not always suppress the top-level Chats section'
	);
	assert.match(
		sidebar,
		/handleDeskLocalFolderPick/,
		'Desk should have a native local-folder picker handler'
	);
	assert.match(
		sidebar,
		/bindWorkspaceToFolder\(res\.id\)/,
		'Creating a Desk folder after local selection should bind the OpenWebUI folder id locally'
	);
	assert.match(
		sidebar,
		/showLocalFileFolderId\.set\(res\.id\)/,
		'Creating a Desk folder from a local folder should select that local file folder'
	);
	assert.match(
		sidebar,
		/discoverLegacyDeskProjectIds/,
		'Desk should discover legacy sidebar projects already bound to local Mac folders'
	);
	assert.match(
		sidebar,
		/legacyDeskItemIds/,
		'Desk folder filtering should include locally bound legacy project ids'
	);
	assert.match(
		sidebar,
		/onLocalFolderPick=\{handleDeskLocalFolderPick\}/,
		'The folder modal should receive the Desk local-folder picker handler'
	);
	assert.match(
		sidebar,
		/{#if showDeskChats}\s*<Folder[\s\S]*id="sidebar-chats"/,
		'The top-level Chats section should be guarded by the Desk-aware policy'
	);
	assert.match(
		folderModal,
		/export let onLocalFolderPick/,
		'FolderModal should expose a local-folder action hook'
	);
	assert.match(
		folderModal,
		/Select Folder/,
		'FolderModal should surface Select Folder inside the existing Knowledge action row'
	);
	assert.doesNotMatch(
		folderModal,
		/Device Folder/,
		'FolderModal should not use a separate top device-folder card'
	);
	assert.match(
		folderModal,
		/localWorkspace/,
		'FolderModal should keep the selected local folder pending until Save creates the sidebar folder'
	);
	assert.match(
		recursiveFolder,
		/showLocalFileFolderId\.set\(folderId\)/,
		'Clicking a Desk folder should select its local file binding'
	);
	assert.match(
		chatControls,
		/<LocalFileNav folderId=\{\$showLocalFileFolderId\}/,
		'Files pane should receive the selected Desk folder id'
	);
	assert.match(
		localFileNav,
		/export let folderId/,
		'LocalFileNav should support folder-scoped bridge calls'
	);
	assert.match(
		localFileNav,
		/chooseWorkspaceForFolder\(folderId\)/,
		'LocalFileNav should relink a selected sidebar folder through the bridge if needed'
	);
	assert.match(
		stores,
		/showLocalFileFolderId/,
		'Shared stores should expose the selected local file folder id'
	);
	assert.match(
		stores,
		/showLocalFilePath/,
		'Shared stores should expose the active path inside the selected local file folder'
	);
	assert.match(
		bridge,
		/bindWorkspaceToFolder/,
		'Desktop bridge contract should include folder binding'
	);
});

test('Desk local file mode is gated by desktop bridge capabilities', () => {
	const chat = readFileSync('src/lib/components/chat/Chat.svelte', 'utf8');
	const chatControls = readFileSync('src/lib/components/chat/ChatControls.svelte', 'utf8');
	const bridge = readFileSync('src/lib/enos/desktopBridge.ts', 'utf8');

	assert.match(
		bridge,
		/export type EnosDesktopCapabilities/,
		'Desktop bridge contract should expose an explicit capabilities payload'
	);
	assert.match(
		bridge,
		/getEnosDesktopBridgeCapabilities/,
		'Web UI should verify the desktop bridge with an async capabilities handshake'
	);
	assert.match(
		bridge,
		/canUseEnosLocalProjectFiles/,
		'Local file mode should be derived from capabilities, not hostname alone'
	);
	assert.match(
		bridge,
		/canUseEnosLocalProjectMutations/,
		'Write/delete/rename should be separately gated from read/list capabilities'
	);
	assert.match(
		chatControls,
		/getEnosDesktopBridgeCapabilities/,
		'Files pane should hide local files unless the desktop bridge capability check succeeds'
	);
	assert.match(
		chatControls,
		/canUseEnosLocalProjectFiles/,
		'Files pane should be capability-gated instead of only checking window.enosDesktop'
	);
	assert.match(
		chat,
		/hasProjectListBridge/,
		'Chat action routing should verify the actual project-list bridge before local file operations'
	);
	// The Desk agent gets the FULL toolset and the confirmation dialog is the
	// safety gate — deliberately NOT a mutation capability flag, which desynced
	// and made the agent refuse legitimate file creation. See the desk
	// tool-calling architecture note.
	assert.match(
		chat,
		/tools:\s*DESK_FILE_TOOLS\b/,
		'Chat should always offer the full Desk toolset, not a mutation-gated subset'
	);
	assert.doesNotMatch(
		chat,
		/canUseEnosLocalProjectMutations/,
		'Chat must NOT gate writes on a mutation capability flag (confirmation dialog is the gate)'
	);
});

test('Electron hidden titlebar keeps the web sidebar layout untouched', () => {
	const appCss = readFileSync('src/app.css', 'utf8');
	const layout = readFileSync('src/routes/+layout.svelte', 'utf8');

	assert.match(
		layout,
		/documentElement\.setAttribute\('data-enos-desk-titlebar', 'hidden'\)/,
		'Electron should mark the document when the native titlebar is hidden'
	);
	assert.match(
		appCss,
		/\.drag-region\s*\{[\s\S]*-webkit-app-region:\s*drag/,
		'Electron shell surfaces should keep drag-region support for the transparent titlebar'
	);
	assert.match(
		appCss,
		/\.no-drag-region\s*\{[\s\S]*-webkit-app-region:\s*no-drag/,
		'Electron shell controls should keep no-drag-region support'
	);
	assert.doesNotMatch(
		appCss,
		/--enos-desk-titlebar-height/,
		'Electron should not introduce a separate app-layout titlebar height token'
	);
	assert.doesNotMatch(
		appCss,
		/html\[data-enos-desk-titlebar=['"]hidden['"]\][\s\S]*#sidebar/,
		'Electron should not fork sidebar sizing or spacing from the web layout'
	);
	assert.doesNotMatch(
		appCss,
		/html\[data-enos-desk-titlebar=['"]hidden['"]\][\s\S]*#navbar-right-actions/,
		'Electron should not lift chat navbar actions out of the web layout'
	);
	assert.doesNotMatch(
		appCss,
		/html\[data-enos-desk-titlebar=['"]hidden['"]\][\s\S]*#sidebar-titlebar-toggle/,
		'Electron should not lift the sidebar toggle away from the web layout'
	);
});

test('Desk chat reload restores a project anchor before showing no-project guidance', () => {
	const chat = readFileSync('src/lib/components/chat/Chat.svelte', 'utf8');

	assert.doesNotMatch(
		chat,
		/detectProjectChatAction/,
		'Desk chat handling should not classify file/project intent with the legacy regex router'
	);
	assert.match(
		chat,
		/ENOS_DESK_LAST_PROJECT_FOLDER_ID/,
		'Desk should persist the last selected project folder for reload/new-chat recovery'
	);
	assert.match(
		chat,
		/localStorage\.setItem\(ENOS_DESK_LAST_PROJECT_FOLDER_ID,\s*folder\.id\)/,
		'Selecting a project should remember it as the next Desk chat anchor'
	);
	assert.match(
		chat,
		/const restoreLastDeskProjectFolder = async/,
		'Desk should have a restore path for the last project folder'
	);
	assert.match(
		chat,
		/localStorage\.getItem\(ENOS_DESK_LAST_PROJECT_FOLDER_ID\)/,
		'Desk reload should read the persisted project folder id'
	);
	assert.match(
		chat,
		/knownProjectFolderById\(lastProjectFolderId\)/,
		'Desk restore should prefer already-loaded folders before fetching'
	);
	assert.match(
		chat,
		/await restoreLastDeskProjectFolder\(\)/,
		'New Desk chats should restore an anchor before leaving the user on an empty project state'
	);
	assert.match(
		chat,
		/const foldersSubscribe = folders\.subscribe/,
		'Desk should retry anchor restore when the sidebar folders list hydrates after chat mount'
	);
	assert.match(
		chat,
		/foldersSubscribe\(\)/,
		'Desk folder-list restore subscriptions should be cleaned up on unmount'
	);
	assert.doesNotMatch(
		chat,
		/Select a project first\. Local file actions are scoped to the active ENOS Desk project folder\./,
		'No-project file-action guidance should ask the user to start or choose a project instead of showing a dead-end selection error'
	);

	const handlerStart = chat.indexOf('const handleProjectChatAction = async');
	const handlerEnd = chat.indexOf('const addMessages', handlerStart);
	const handler = chat.slice(handlerStart, handlerEnd);
	const restoreIndex = handler.indexOf('await restoreLastDeskProjectFolder()');
	const availabilityIndex = handler.indexOf('if (!hasDesktopBridge || !folderId) return false');
	const loopIndex = handler.indexOf('runDeskAgentLoop');
	assert.ok(handlerStart > -1, 'Chat should have a project action handler');
	assert.ok(
		availabilityIndex > -1,
		'Prompts should fall through to normal chat when the bridge or project folder is unavailable'
	);
	assert.ok(
		restoreIndex > -1 && restoreIndex < availabilityIndex && restoreIndex < loopIndex,
		'Desk should restore a project anchor before deciding whether to run the model/tool loop'
	);
});

test('Projects language replaces folder copy while Desk project menus stay work-led', () => {
	const sidebar = readFileSync('src/lib/components/layout/Sidebar.svelte', 'utf8');
	const folderModal = readFileSync(
		'src/lib/components/layout/Sidebar/Folders/FolderModal.svelte',
		'utf8'
	);
	const folderMenu = readFileSync(
		'src/lib/components/layout/Sidebar/Folders/FolderMenu.svelte',
		'utf8'
	);
	const recursiveFolder = readFileSync(
		'src/lib/components/layout/Sidebar/RecursiveFolder.svelte',
		'utf8'
	);
	const folderTitle = readFileSync(
		'src/lib/components/chat/Placeholder/FolderTitle.svelte',
		'utf8'
	);
	const folderPlaceholder = readFileSync(
		'src/lib/components/chat/Placeholder/FolderPlaceholder.svelte',
		'utf8'
	);

	assert.match(
		sidebar,
		/name=\{\$i18n\.t\('Projects'\)\}/,
		'Sidebar should label the section Projects'
	);
	assert.match(
		sidebar,
		/onAddLabel=\{\$i18n\.t\('New Project'\)\}/,
		'Sidebar add action should say New Project'
	);
	assert.match(
		folderModal,
		/\$i18n\.t\('Create Project'\)/,
		'Create modal should say Create Project'
	);
	assert.match(folderModal, /\$i18n\.t\('Edit Project'\)/, 'Edit modal should say Edit Project');
	assert.match(folderModal, /\$i18n\.t\('Project Name'\)/, 'Name field should say Project Name');
	assert.match(
		folderModal,
		/\$i18n\.t\('Project Knowledge'\)/,
		'Attached context should be Project Knowledge'
	);
	assert.match(
		folderMenu,
		/export let projectMode/,
		'FolderMenu should support project-specific copy'
	);
	assert.match(
		folderMenu,
		/projectMode \? 'New Project Chat' : 'Create Project'/,
		'Desk project menu should start new project chats instead of nested subprojects'
	);
	assert.match(
		folderMenu,
		/export let onNewProjectChat/,
		'FolderMenu should expose a dedicated project-chat action'
	);
	assert.match(
		folderMenu,
		/{#if !projectMode}[\s\S]*\$i18n\.t\('Export'\)/,
		'Desk project menu should hide Export in project mode'
	);
	assert.match(
		recursiveFolder,
		/projectMode=\{isDeskSurface\}/,
		'Desk should enable project menu mode'
	);
	assert.match(folderTitle, /projectMode/, 'Selected project title menu should use project mode');
	assert.match(
		folderPlaceholder,
		/\$i18n\.t\('Project Knowledge'\)/,
		'Selected project view should label knowledge as project knowledge'
	);
});

test('Desk new work chats are project-led and Files waits for a selected project', () => {
	const sidebar = readFileSync('src/lib/components/layout/Sidebar.svelte', 'utf8');
	const recursiveFolder = readFileSync(
		'src/lib/components/layout/Sidebar/RecursiveFolder.svelte',
		'utf8'
	);
	const chatItem = readFileSync('src/lib/components/layout/Sidebar/ChatItem.svelte', 'utf8');
	const chatControls = readFileSync('src/lib/components/chat/ChatControls.svelte', 'utf8');

	assert.match(
		sidebar,
		/const handleDeskProjectChat = async/,
		'Sidebar should have a Desk-specific project chat handler'
	);
	assert.match(
		sidebar,
		/if \(!folder\?\.id\) \{[\s\S]*showCreateFolderModal = true/,
		'Desk New Chat without a selected project should open project creation'
	);
	assert.match(
		sidebar,
		/const startNewChatHandler = async/,
		'Top-level New Chat should route through a surface-aware handler'
	);
	assert.match(
		sidebar,
		/isDeskSurface[\s\S]*handleDeskProjectChat/,
		'Desk New Chat should preserve or request project context'
	);
	assert.match(
		sidebar,
		/on:click\|preventDefault=\{startNewChatHandler\}/,
		'The visible top-level New Chat action should use the surface-aware handler'
	);
	assert.doesNotMatch(
		recursiveFolder,
		/import PencilSquare/,
		'Project rows should not show a second quick new-chat icon'
	);
	assert.match(
		recursiveFolder,
		/const startProjectChatHandler = async/,
		'Each project row should expose a project-scoped new chat handler'
	);
	assert.match(
		recursiveFolder,
		/onNewProjectChat=\{startProjectChatHandler\}/,
		'Project menu should expose New Project Chat'
	);
	assert.match(
		recursiveFolder,
		/showLocalFileFolderId\.set\(folderId\)/,
		'Project row new chat should retain the selected project file context'
	);
	assert.match(
		recursiveFolder,
		/projectFolder=\{isDeskSurface \? folders\[folderId\] : null\}/,
		'Project chats should receive the parent project folder as selection context'
	);
	assert.match(
		chatItem,
		/export let projectFolder = null/,
		'ChatItem should accept optional project folder context'
	);
	assert.match(
		chatItem,
		/showLocalFileFolderId/,
		'ChatItem should update the selected local file folder when chats are selected'
	);
	assert.match(
		chatItem,
		/projectFolder\?\.id[\s\S]*selectedFolder\.set\(projectFolder\)[\s\S]*showLocalFileFolderId\.set\(projectFolder\.id\)/,
		'Selecting a project chat should re-select its project and local file pane'
	);
	assert.match(
		chatItem,
		/selectedFolder\.set\(null\)[\s\S]*showLocalFileFolderId\.set\(null\)/,
		'Selecting an unscoped chat should clear stale project file context'
	);
	assert.match(
		chatControls,
		/showDeskProjectFilesEmpty/,
		'Desk Files tab should have an explicit no-project empty state'
	);
	assert.match(
		chatControls,
		/showProjectFileNav = showLocalFileNav && Boolean\(\$showLocalFileFolderId\)/,
		'Local files should render only for a selected project id'
	);
	assert.match(
		chatControls,
		/\$i18n\.t\('Select a project to browse its files\.'\)/,
		'Files empty state should tell the user to select a project first'
	);
	assert.match(
		chatControls,
		/{#if activeTab === 'overview'}[\s\S]*{:else if activeTab === 'files' && showProjectFileNav}[\s\S]*<LocalFileNav/,
		'LocalFileNav should be gated by selected project state'
	);
});

test('Desk project folders can digest local files into project chat context', () => {
	const bridge = readFileSync('src/lib/enos/desktopBridge.ts', 'utf8');
	const localFileNav = readFileSync('src/lib/components/chat/LocalFileNav.svelte', 'utf8');
	const chatControls = readFileSync('src/lib/components/chat/ChatControls.svelte', 'utf8');
	const chat = readFileSync('src/lib/components/chat/Chat.svelte', 'utf8');
	const sidebar = readFileSync('src/lib/components/layout/Sidebar.svelte', 'utf8');

	assert.match(
		bridge,
		/buildProjectDigest/,
		'Desktop bridge contract should expose project digest generation'
	);
	assert.match(
		localFileNav,
		/export let onProjectDigest/,
		'LocalFileNav should report generated project digests to the chat shell'
	);
	assert.match(
		localFileNav,
		/const syncProjectContext = async/,
		'Files pane should automatically sync selected project context'
	);
	assert.match(
		localFileNav,
		/buildProjectDigest\(activeFolderId\)/,
		'Automatic project context sync should request a digest for the selected project folder'
	);
	assert.match(
		localFileNav,
		/syncProjectContext\(\)/,
		'Files pane should run project context sync as part of the normal folder load'
	);
	assert.match(
		localFileNav,
		/friendlyDesktopError/,
		'Files pane should normalize stale desktop bridge errors'
	);
	assert.match(
		localFileNav,
		/Restart ENOS Desk to enable local project actions\./,
		'Stale Electron bridge errors should ask the user to restart ENOS Desk'
	);
	assert.doesNotMatch(
		localFileNav,
		/Analyze Project/,
		'Project context should be automatic, not exposed as a user button'
	);
	assert.match(
		localFileNav,
		/\$i18n\.t\('Updating project context\.\.\.'\)/,
		'Files pane should show passive background context status'
	);
	assert.match(
		localFileNav,
		/export let hasProjectDigest/,
		'Files pane should receive whether the selected project has saved context'
	);
	assert.match(
		localFileNav,
		/onProjectDigest\(activeFolderId, digest\)/,
		'Files pane should save refreshed context against the active local project id'
	);
	assert.match(
		localFileNav,
		/localHasProjectDigest/,
		'Files pane should update context-ready status locally after a successful digest'
	);
	assert.match(
		localFileNav,
		/\$i18n\.t\('Preparing project context\.\.\.'\)/,
		'Files pane should avoid asking the user to manually analyze a project'
	);
	assert.match(
		localFileNav,
		/\$i18n\.t\('Project context ready'\)/,
		'Files pane should make saved context visible'
	);
	assert.match(
		chatControls,
		/const handleProjectDigest = async \(folderId: string, digest: EnosDesktopProjectDigest\)/,
		'ChatControls should save project context against the Files pane project id'
	);
	assert.match(
		chatControls,
		/updateFolderById\(localStorage\.token, folderId/,
		'Digest persistence should update the active project folder instead of relying on selected chat state'
	);
	assert.doesNotMatch(
		chatControls,
		/const folder = \$selectedFolder;\s*if \(!folder\?\.id\)/,
		'Digest persistence should not falsely require selectedFolder while a Files pane project is active'
	);
	assert.doesNotMatch(
		chatControls,
		/toast\.error\(\$i18n\.t\('Select a project first'\)\)/,
		'Background project digest refresh should not show a false project-selection toast'
	);
	assert.match(
		chatControls,
		/project_context_digest/,
		'Project digest should be saved into folder data'
	);
	assert.match(
		chatControls,
		/hasProjectDigest=\{Boolean\(\$selectedFolder\?\.data\?\.project_context_digest\)\}/,
		'ChatControls should pass digest status into the Files pane'
	);
	assert.match(
		chatControls,
		/<LocalFileNav[\s\S]*onProjectDigest=\{handleProjectDigest\}/,
		'Both project file panes should wire digest persistence'
	);
	assert.match(
		sidebar,
		/const saveProjectDigestForFolder = async/,
		'Project creation should share the same digest persistence path'
	);
	assert.match(
		sidebar,
		/buildProjectDigest\(folderId\)/,
		'Creating a project from a Mac folder should build an initial digest'
	);
	assert.match(
		sidebar,
		/project_context_digest/,
		'Creating a project from a Mac folder should save project context'
	);
	assert.match(
		sidebar,
		/saveProjectDigestForFolder\(res\.id, res\)/,
		'Project creation should auto-analyze the selected Mac folder'
	);
	assert.match(
		chat,
		/const projectContextDigest =/,
		'Chat completion should read the selected project context digest'
	);
	assert.match(
		chat,
		/Saved project summary \(BACKGROUND ONLY/,
		'Digest should be injected as explicit background context, not as a user message'
	);
	assert.match(
		chat,
		/local project context is still being prepared/,
		'Selected project chats without a digest should explain automatic context preparation'
	);
	assert.doesNotMatch(chat, /Analyze Project/, 'Model fallback text should not mention a removed button');
	assert.match(
		chat,
		/\.\.\.\(\$selectedFolder\?\.data \?\? \{\}\)/,
		'Saving model IDs should preserve existing project data such as context digests'
	);
});

test('Desk project chats attach live local file action context before model calls', () => {
	const bridge = readFileSync('src/lib/enos/desktopBridge.ts', 'utf8');
	const projectActions = readFileSync('src/lib/enos/projectActions.ts', 'utf8');
	const chat = readFileSync('src/lib/components/chat/Chat.svelte', 'utf8');
	const localFileNav = readFileSync('src/lib/components/chat/LocalFileNav.svelte', 'utf8');

	assert.match(
		bridge,
		/listProjectFiles/,
		'Desktop bridge contract should expose project-scoped file listing'
	);
	assert.match(
		bridge,
		/readProjectFile/,
		'Desktop bridge contract should expose project-scoped file reads'
	);
	assert.match(
		bridge,
		/requestProjectFileWrite/,
		'Desktop bridge contract should expose gated project file write requests'
	);
	assert.match(
		projectActions,
		/export const buildProjectActionContext/,
		'Project action helper should build compact local context for model calls'
	);
	assert.match(
		projectActions,
		/activePath/,
		'Project action helper should accept the active Files pane path'
	);
	assert.match(
		projectActions,
		/listProjectFiles\(folderId, activePath\)/,
		'Project action helper should list the active Files pane folder, not always the root'
	);
	assert.match(
		projectActions,
		/Active folder in ENOS Desk Files pane/,
		'Project action helper should tell the model which folder is currently active'
	);
	assert.match(
		projectActions,
		/This active folder listing is authoritative/,
		'Project action helper should make the active folder override stale digest summaries'
	);
	assert.match(
		projectActions,
		/readProjectFile\(folderId, entry\.path\)/,
		'Project action helper should read likely summary files from the selected project'
	);
	assert.match(
		projectActions,
		/extractRequestedProjectFilePaths/,
		'Project action helper should detect explicit project file paths in the prompt'
	);
	assert.match(
		projectActions,
		/readProjectFile\(folderId, requestedPath\)/,
		'Project action helper should read explicitly requested project files'
	);
	assert.match(
		projectActions,
		/Requested project files:/,
		'Project action helper should label explicitly requested file contents'
	);
	assert.match(
		projectActions,
		/Write\/edit project file actions require explicit confirmation/,
		'Project action helper should make write actions explicitly gated'
	);
	assert.match(
		chat,
		/buildProjectActionContext/,
		'Chat completion should build live project action context'
	);
	assert.match(
		chat,
		/activePath: activeProjectFilePath/,
		'Chat completion should pass the active Files pane path into live project context'
	);
	assert.match(
		chat,
		/showLocalFilePath/,
		'Chat completion should observe the active Files pane path'
	);
	assert.match(
		chat,
		/projectContextDigest[\s\S]*projectActionContext/,
		'Saved digest should be added before live context so active folder context has final authority'
	);
	assert.doesNotMatch(
		chat,
		/isProjectFileFactsPrompt/,
		'Chat completion should not classify file-list/count prompts with regex before injecting context'
	);
	assert.doesNotMatch(
		chat,
		/shouldInjectSavedProjectDigest/,
		'Saved project summaries should not depend on a regex helper gate'
	);
	assert.doesNotMatch(
		chat,
		/shouldEmitProjectFileFactsUnavailableGuard/,
		'File-list/count prompts should not use a regex helper fallback path'
	);
	assert.match(
		chat,
		/NEVER answer a question about which files exist/,
		'The saved digest instruction should still refuse stale digest-only file facts'
	);
	assert.match(
		localFileNav,
		/showLocalFilePath\.set\(currentPath\)/,
		'Files pane should publish the active folder path whenever it changes'
	);
	assert.match(
		chat,
		/projectActionContext/,
		'Chat completion should inject live project action context into messages'
	);
});

test('Desk Files pane exposes permissioned project file actions and local Git awareness', () => {
	const bridge = readFileSync('src/lib/enos/desktopBridge.ts', 'utf8');
	const localFileNav = readFileSync('src/lib/components/chat/LocalFileNav.svelte', 'utf8');
	const messageInput = readFileSync('src/lib/components/chat/MessageInput.svelte', 'utf8');

	for (const method of [
		'createProjectFile',
		'writeProjectFile',
		'createProjectFolder',
		'renameProjectEntry',
		'deleteProjectEntry',
		'revealProjectEntry',
		'getProjectGitStatus'
	]) {
		assert.match(bridge, new RegExp(`${method}:`), `Desktop bridge should type ${method}`);
		assert.match(localFileNav, new RegExp(`bridge\\.${method}`), `Files pane should call ${method}`);
	}

	for (const method of ['getPermissionProfile', 'setPermissionProfile']) {
		assert.match(bridge, new RegExp(`${method}:`), `Desktop bridge should type ${method}`);
		assert.match(
			messageInput,
			new RegExp(`bridge\\.${method}`),
			`Composer permission menu should call ${method}`
		);
		assert.doesNotMatch(
			localFileNav,
			new RegExp(`bridge\\.${method}`),
			`Files pane should not own ${method}`
		);
	}

	assert.match(
		bridge,
		/type EnosDesktopPermissionProfile = 'ask' \\| 'approve_safe_project_edits'/,
		'Bridge should restrict permission profiles to supported safe modes'
	);
	assert.match(
		messageInput,
		/Ask for approval/,
		'Composer should expose the default approval-first mode'
	);
	assert.match(
		messageInput,
		/Approve safe edits/,
		'Composer should expose the fast safe-edit mode'
	);
	assert.match(
		messageInput,
		/Project action permissions/,
		'Composer permission menu should identify the action permission control'
	);
	assert.match(
		messageInput,
		/UserBadgeCheck/,
		'Composer approval-first mode should use a distinct approval icon'
	);
	assert.match(
		messageInput,
		/CheckCircle/,
		'Composer safe-edit mode should use a distinct safe-edit icon'
	);
	assert.doesNotMatch(
		messageInput,
		/<LockClosed/,
		'Composer permission control should not use duplicate padlock icons for both modes'
	);
	assert.doesNotMatch(
		localFileNav,
		/Ask Before Changing|Approve Safe Project Edits|Ask for approval|Approve safe edits/,
		'Files pane should not carry the project permission mode selector'
	);
	assert.match(
		localFileNav,
		/Project file actions/,
		'Files pane should group project-level actions behind one overflow menu'
	);
	assert.match(
		localFileNav,
		/Entry actions/,
		'Files pane should group per-file actions behind a row overflow menu'
	);
	assert.match(localFileNav, /EllipsisHorizontal/, 'Files pane should use compact ellipsis menus');
	assert.doesNotMatch(
		localFileNav,
		/on:click=\{\(event\) => event\.stopPropagation\(\)\}/,
		'Row action menu triggers should let Dropdown receive the click event'
	);
	assert.match(localFileNav, /FilePlusAlt/, 'Files pane project menu should include a new-file icon');
	assert.match(localFileNav, /NewFolderAlt/, 'Files pane project menu should include a new-folder icon');
	assert.match(localFileNav, /ArrowPath/, 'Files pane project menu should keep refresh in overflow');
	assert.doesNotMatch(localFileNav, /\$i18n\.t\('Back'\)/, 'Files pane should avoid a Back button');
	assert.match(localFileNav, /New File/, 'Files pane should create new files');
	assert.match(localFileNav, /New Folder/, 'Files pane should create new folders');
	assert.match(localFileNav, /Save/, 'Files pane should save text edits');
	assert.match(localFileNav, /Rename/, 'Files pane should rename selected entries');
	assert.match(localFileNav, /Delete/, 'Files pane should delete selected entries after confirmation');
	assert.match(localFileNav, /Reveal/, 'Files pane should reveal selected entries in Finder');
	assert.match(localFileNav, /Git:/, 'Files pane should show local Git branch/status when available');
	assert.match(
		localFileNav,
		/runConfirmedProjectAction/,
		'Files pane should centralize confirmation-gated project mutations'
	);
	assert.match(
		localFileNav,
		/status === 'requires_confirmation'/,
		'Files pane should handle bridge confirmation requests before mutating files'
	);
});

test('Desk chat requests use the model-driven desktop tool loop without regex interception', () => {
	const chat = readFileSync('src/lib/components/chat/Chat.svelte', 'utf8');

	assert.match(
		chat,
		/if \(!isDeskSurface\(\)\) return false/,
		'Browser Chat should fall through to the normal chat pipeline'
	);
	assert.match(
		chat,
		/handleProjectChatAction/,
		'Chat submit path should have a Desk project tool-loop handler'
	);
	assert.match(
		chat,
		/runDeskAgentLoop/,
		'Desk project prompts should be handled by the model/tool loop'
	);
	assert.match(
		chat,
		/tools: DESK_FILE_TOOLS/,
		'Desk agent should receive the full file toolset'
	);
	assert.match(
		chat,
		/executeDeskFileTool/,
		'Desk tool calls should execute through the shared desktop bridge tool executor'
	);
	assert.match(
		chat,
		/window\.confirm/,
		'Desk tool mutations should keep the confirmation gate'
	);
	assert.match(
		chat,
		/if \(await handleProjectChatAction\(userPrompt\)\) return/,
		'Chat submit handler should stop before submitPrompt when a project write command was handled'
	);
	assert.doesNotMatch(
		chat,
		/detectProjectChatAction|isProjectFileFactsPrompt/,
		'Desk chat should not classify semantic project intent with regex helpers'
	);
	assert.doesNotMatch(
		chat,
		/ENOS Desktop bridge is unavailable|Start a new project first/,
		'Missing bridge/folder states should fall through instead of emitting canned assistant text'
	);
});

test('Desk chat tool loop offers all base file operations through the shared executor', () => {
	const chat = readFileSync('src/lib/components/chat/Chat.svelte', 'utf8');
	const deskFileTools = readFileSync('src/lib/enos/deskFileTools.ts', 'utf8');

	assert.match(chat, /handleProjectChatAction/, 'Chat should use the generic project action handler');
	assert.match(chat, /executeDeskFileTool/, 'Chat should delegate project file calls to the shared tool executor');
	for (const method of [
		'listProjectFiles',
		'readProjectFile',
		'writeProjectFile',
		'createProjectFolder',
		'renameProjectEntry',
		'deleteProjectEntry',
		'revealProjectEntry'
	]) {
		assert.match(
			deskFileTools,
			new RegExp(`bridge\\.${method}`),
			`${method} should be executed by the shared Desk file tool executor`
		);
	}
	assert.match(
		deskFileTools,
		/Create or overwrite a file/,
		'The write_file tool should cover both create and overwrite flows'
	);
	assert.match(
		chat,
		/if \(await handleProjectChatAction\(userPrompt\)\) return/,
		'Chat submit handler should stop before submitPrompt when any project action was handled'
	);

	const handlerStart = chat.indexOf('const handleProjectChatAction = async');
	const handlerEnd = chat.indexOf('const submitHandler', handlerStart);
	const handler = chat.slice(handlerStart, handlerEnd);
	assert.ok(handlerStart > -1, 'Chat should have a project action handler');
	assert.match(
		handler,
		/if \(!hasDesktopBridge \|\| !folderId\) return false/,
		'Desk project prompts should fall through when the bridge or project folder is unavailable'
	);
	assert.match(
		handler,
		/runDeskAgentLoop\(\{[\s\S]*tools: DESK_FILE_TOOLS[\s\S]*executeTool[\s\S]*confirm/,
		'Desk project prompts should go through the model-driven tool loop with confirmation'
	);
	assert.doesNotMatch(
		handler,
		/const action = detect/,
		'Desk project prompts should not be gated by a deterministic semantic classifier'
	);
});

test('Desk project chats recover project selection from saved chat folder id', () => {
	const chat = readFileSync('src/lib/components/chat/Chat.svelte', 'utf8');

	assert.match(
		chat,
		/folders,/,
		'Chat should observe the folders store so saved project folders can be recovered after reload'
	);
	assert.match(
		chat,
		/getFolderById/,
		'Chat should be able to fetch a project folder when the sidebar store is not hydrated yet'
	);
	assert.match(
		chat,
		/const projectFolderIdFromChat =/,
		'Chat should derive the active project from the loaded chat folder id'
	);
	assert.match(
		chat,
		/const hydrateProjectFolderFromChat = async/,
		'Chat should hydrate selectedFolder from chat.folder_id on load'
	);
	assert.match(
		chat,
		/hydrateProjectFolderFromChat\(chat\)/,
		'Loading or creating a project chat should restore selected project context'
	);
	assert.match(
		chat,
		/const activeProjectFolderId = \(\) =>[\s\S]*projectFolderIdFromChat\(chat\)/,
		'Project actions should fall back to chat.folder_id if selectedFolder was cleared'
	);
	assert.match(
		chat,
		/const activeProjectFolder = \(\) =>/,
		'Project context injection should use the same active project resolver as local actions'
	);
	assert.match(
		chat,
		/const activeProjectId = activeProjectFolderId\(\)/,
		'Project context injection should build live local context from the resolved project id'
	);
	assert.match(
		chat,
		/if \(activeProjectFolderId\(\)\) \{[\s\S]*await hydrateProjectFolderFromChat\(chat\)/,
		'Creating the first project chat message should keep project context instead of clearing selectedFolder'
	);
	assert.match(
		chat,
		/showLocalFileFolderId\.set\(folder\.id\)/,
		'Project chat hydration should restore the Files pane project id without waiting on bridge timing'
	);
});
