import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Desk sidebar suppresses top-level Chats and routes device folder selection to Files', () => {
	const sidebar = readFileSync('src/lib/components/layout/Sidebar.svelte', 'utf8');
	const folderModal = readFileSync(
		'src/lib/components/layout/Sidebar/Folders/FolderModal.svelte',
		'utf8'
	);

	assert.match(sidebar, /isDeskSurface/, 'Sidebar should identify the ENOS Desk surface');
	assert.match(
		sidebar,
		/showDeskChats\s*=\s*!\s*isDeskSurface/,
		'Desk should suppress the top-level Chats section without affecting Chat'
	);
	assert.match(
		sidebar,
		/handleDeskDeviceFolderPick/,
		'Desk should have a native device-folder picker handler'
	);
	assert.match(
		sidebar,
		/showControls\.set\(true\)/,
		'Choosing a device folder should open the shared right pane'
	);
	assert.match(
		sidebar,
		/showFileNavPath\.set\('\.'\)/,
		'Choosing a device folder should switch the shared pane to Files'
	);
	assert.match(
		sidebar,
		/onDeviceFolderPick=\{handleDeskDeviceFolderPick\}/,
		'The folder modal should receive the Desk device-folder picker handler'
	);
	assert.match(
		sidebar,
		/{#if showDeskChats}\s*<Folder[\s\S]*id="sidebar-chats"/,
		'The top-level Chats section should be guarded by the Desk-aware policy'
	);
	assert.match(
		folderModal,
		/export let onDeviceFolderPick/,
		'FolderModal should expose a device-folder action hook'
	);
	assert.match(
		folderModal,
		/Choose Device Folder/,
		'FolderModal should surface the device-folder option when asked'
	);
});
