import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Desk local files uses the desktop bridge, not the old localhost companion preset', () => {
	const chatControls = readFileSync('src/lib/components/chat/ChatControls.svelte', 'utf8');
	const localFileNav = readFileSync('src/lib/components/chat/LocalFileNav.svelte', 'utf8');
	const bridge = readFileSync('src/lib/enos/desktopBridge.ts', 'utf8');
	const terminals = readFileSync(
		'src/lib/components/chat/Settings/Integrations/Terminals.svelte',
		'utf8',
	);

	assert.match(
		chatControls,
		/import LocalFileNav from '\.\/LocalFileNav\.svelte'/,
		'Desk Files should import the local desktop file navigator',
	);
	assert.match(
		chatControls,
		/getEnosDesktopBridgeCapabilities/,
		'Desk Files should detect the desktop bridge through the capabilities handshake',
	);
	assert.match(
		chatControls,
		/showLocalFileNav\s*=\s*isDeskSurface\s*&&\s*canUseEnosLocalProjectFiles\(desktopCapabilities\)/,
		'The local file navigator should remain Desk-surface scoped',
	);
	assert.match(
		localFileNav,
		/chooseWorkspace/,
		'Local Files should choose a folder through the desktop bridge',
	);
	assert.match(
		bridge,
		/window\.enosDesktop/,
		'The bridge accessor should read window.enosDesktop',
	);
	assert.doesNotMatch(
		terminals,
		/http:\/\/127\.0\.0\.1:9900|LOCAL_DESK_TERMINAL_PRESET|Add Local Files/,
		'The old localhost companion preset should not be user-facing',
	);
});
