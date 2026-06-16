import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Desk local files uses direct Open Terminal companion preset, not a second file browser', () => {
	const terminals = readFileSync(
		'src/lib/components/chat/Settings/Integrations/Terminals.svelte',
		'utf8',
	);
	const modal = readFileSync('src/lib/components/AddTerminalServerModal.svelte', 'utf8');

	assert.match(
		terminals,
		/LOCAL_DESK_TERMINAL_PRESET\s*=\s*{[\s\S]*name:\s*'Local files'[\s\S]*url:\s*'http:\/\/127\.0\.0\.1:9900'[\s\S]*path:\s*'\/openapi\.json'/,
		'Desk should offer a localhost direct-terminal preset for local files',
	);
	assert.match(
		terminals,
		/isDeskSurface\s*=[\s\S]*enosdesk\.duckdns\.org/,
		'The local-files preset should be Desk-surface specific',
	);
	assert.match(
		terminals,
		/preset={pendingPreset}/,
		'The direct terminal modal should receive the Desk local-files preset',
	);
	assert.match(
		terminals,
		/<AddTerminalServerModal[\s\S]*direct/,
		'Local files must reuse the direct Open Terminal connection flow',
	);
	assert.match(
		modal,
		/export let preset = null/,
		'The terminal modal should support a preset without changing edit semantics',
	);
	assert.match(
		modal,
		/else if \(preset\)[\s\S]*url = preset\.url/,
		'The terminal modal should initialize add-mode fields from the preset',
	);
});
