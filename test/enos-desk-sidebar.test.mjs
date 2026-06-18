import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Desk sidebar suppresses top-level Chats and binds selected Mac folders to sidebar folders', () => {
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
		/showDeskChats\s*=\s*!\s*isDeskSurface/,
		'Desk should suppress the top-level Chats section without affecting Chat'
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
		bridge,
		/bindWorkspaceToFolder/,
		'Desktop bridge contract should include folder binding'
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
		/const handleProjectDigest = async/,
		'ChatControls should own saving project context onto the selected project'
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
		/Project context from the selected ENOS Desk project/,
		'Digest should be injected as explicit project context, not as a user message'
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
		/listProjectFiles\(folderId, '\.'\)/,
		'Project action helper should always list the selected project root'
	);
	assert.match(
		projectActions,
		/readProjectFile\(folderId, entry\.path\)/,
		'Project action helper should read likely summary files from the selected project'
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
