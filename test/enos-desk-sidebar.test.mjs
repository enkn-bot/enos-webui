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
		/projectMode \? 'New Subproject' : 'Create Project'/,
		'Nested project action should be labeled intentionally'
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
	assert.match(
		recursiveFolder,
		/import PencilSquare/,
		'Project rows should use the existing sidebar new-chat icon family'
	);
	assert.match(
		recursiveFolder,
		/const startProjectChatHandler = async/,
		'Each project row should expose a project-scoped new chat handler'
	);
	assert.match(
		recursiveFolder,
		/aria-label=\{\$i18n\.t\('New Project Chat'\)\}/,
		'Project row quick action should be labeled as a project chat'
	);
	assert.match(
		recursiveFolder,
		/showLocalFileFolderId\.set\(folderId\)/,
		'Project row new chat should retain the selected project file context'
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
