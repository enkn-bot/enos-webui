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
