import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('large pasted text renders as an expandable card in composer and sent messages', () => {
	const card = readFileSync('src/lib/components/chat/PastedTextCard.svelte', 'utf8');
	const messageInput = readFileSync('src/lib/components/chat/MessageInput.svelte', 'utf8');
	const userMessage = readFileSync('src/lib/components/chat/Messages/UserMessage.svelte', 'utf8');

	assert.match(card, /aria-expanded=\{expanded\}/, 'Pasted text card should expose expand state');
	assert.match(card, /PASTED/, 'Pasted text card should use a compact pasted label');
	assert.match(card, /Show text/, 'Pasted text card should have an explicit expand action');
	assert.match(card, /Hide text/, 'Pasted text card should have an explicit collapse action');

	assert.match(
		messageInput,
		/import PastedTextCard/,
		'Composer should import the pasted text card'
	);
	assert.match(
		messageInput,
		/isPastedText: true/,
		'Large text paste uploads should preserve pasted-text metadata'
	);
	assert.match(
		messageInput,
		/pastedTextContent: text/,
		'Composer should keep the pasted text available for local expansion'
	);
	assert.match(
		messageInput,
		/isPastedTextFile\(file\)/,
		'Composer should render pasted text files with the special card'
	);
	assert.match(
		messageInput,
		/shouldCollapseUserText\(prompt\)/,
		'Composer should collapse long raw prompt text before it floods the input'
	);
	assert.match(
		messageInput,
		/Edit text/,
		'Composer collapsed prompt card should provide an explicit edit path'
	);
	assert.match(
		messageInput,
		/class:hidden=\{composerPromptCollapsed\}/,
		'Composer should hide the rich text editor while the pasted prompt card is collapsed'
	);

	assert.match(
		userMessage,
		/import PastedTextCard/,
		'User messages should import the pasted text card'
	);
	assert.match(
		userMessage,
		/shouldCollapseUserText\(message\.content\)/,
		'Long user text should be collapsed by default'
	);
	assert.match(
		userMessage,
		/isPastedTextFile\(file\)/,
		'Sent pasted text files should render with the special card'
	);
});
