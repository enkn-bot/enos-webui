import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('welcome placeholder binds model selection back to Chat state', () => {
	const chat = readFileSync('src/lib/components/chat/Chat.svelte', 'utf8');
	const placeholder = readFileSync('src/lib/components/chat/Placeholder.svelte', 'utf8');

	assert.match(
		chat,
		/<Placeholder[\s\S]*bind:selectedModels[\s\S]*\/>/,
		'Chat.svelte must bind selectedModels into Placeholder so welcome-page choices reach submit',
	);

	assert.match(
		placeholder,
		/<MessageInput[\s\S]*bind:selectedModels[\s\S]*\/>/,
		'Placeholder.svelte must bind selectedModels into MessageInput so picker choices update Placeholder',
	);
});

test('Desk exposes Files tab without requiring a preselected terminal', () => {
	const controls = readFileSync('src/lib/components/chat/ChatControls.svelte', 'utf8');

	assert.match(
		controls,
		/isDeskSurface/,
		'ChatControls should identify the ENOS Desk surface',
	);
	assert.match(
		controls,
		/showTerminalFileNav\s*=[\s\S]*isDeskSurface[\s\S]*hasConfiguredTerminal/,
		'Desk should make terminal file navigation available before a terminal is preselected',
	);
	assert.match(
		controls,
		/showFilesTab\s*=[\s\S]*showTerminalFileNav/,
		'Files tab should be visible when Desk terminal file navigation is available',
	);
	assert.match(
		controls,
		/activeTab === 'files'[\s\S]*<FileNav/,
		'Files tab should render FileNav when selected',
	);
});
