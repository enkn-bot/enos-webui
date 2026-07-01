import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('Desk chat action intents route through visible pane request stores', () => {
	const stores = read('src/lib/stores/index.ts');
	const chat = read('src/lib/components/chat/Chat.svelte');
	const controls = read('src/lib/components/chat/ChatControls.svelte');
	const dock = read('src/lib/components/enos/DeskDock.svelte');
	const terminal = read('src/lib/components/enos/LocalTerminal.svelte');

	for (const name of [
		'pendingDeskTerminalInput',
		'requestDeskTerminalInput',
		'pendingDeskBrowserUrl',
		'requestDeskBrowserUrl',
		'pendingDeskFileOpenPath',
		'requestDeskFileOpenPath'
	]) {
		assert.match(stores, new RegExp(`export const ${name}\\b`));
	}

	assert.match(chat, /deskActionIntentFromPrompt/);
	assert.match(chat, /requestDeskTerminalInput\(/);
	assert.match(chat, /requestDeskBrowserUrl\(/);
	assert.match(chat, /requestDeskFileOpenPath\(/);

	assert.match(controls, /pendingDeskFileOpenPath/);
	assert.match(controls, /pendingFileOpenPath\s*=\s*\$pendingDeskFileOpenPath\.path/);

	assert.match(dock, /openUrlToken/);
	assert.match(dock, /openBrowserUrl\(/);
	assert.match(dock, /setTabUrl\(/);

	assert.match(terminal, /pendingDeskTerminalInput/);
	assert.match(terminal, /lastTerminalInputToken/);
	assert.match(terminal, /lt\.write\(sessionId,\s*\$pendingDeskTerminalInput\.input\)/);
});
