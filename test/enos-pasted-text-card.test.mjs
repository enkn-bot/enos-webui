import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('pasted text card is limited to explicit pasted-text file attachments', () => {
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
	assert.doesNotMatch(
		messageInput,
		/shouldCollapseUserText\(prompt\)/,
		'Composer should not collapse raw prompt text with a length threshold'
	);
	assert.doesNotMatch(
		messageInput,
		/composerPromptCollapsed|Full text is attached|Pasted prompt/,
		'Composer should not show a non-file pasted prompt card'
	);
	assert.doesNotMatch(
		messageInput,
		/class:hidden=\{composerPromptCollapsed\}/,
		'Composer should keep the rich text editor visible for long prompt text'
	);

	assert.match(
		userMessage,
		/import PastedTextCard/,
		'User messages should import the pasted text card'
	);
	assert.doesNotMatch(
		userMessage,
		/shouldCollapseUserText\(message\.content\)/,
		'Submitted user message content should render plainly instead of collapsing by length'
	);
	assert.doesNotMatch(
		userMessage,
		/content=\{message\.content\}[\s\S]*title="Pasted prompt"/,
		'Submitted user message content should not be wrapped in a pasted prompt card'
	);
	assert.match(
		userMessage,
		/isPastedTextFile\(file\)/,
		'Sent pasted text files should render with the special card'
	);
});
