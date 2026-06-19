import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('unfinished empty assistant responses render animated shimmer text', () => {
	const responseMessage = readFileSync(
		'src/lib/components/chat/Messages/ResponseMessage.svelte',
		'utf8'
	);

	assert.match(
		responseMessage,
		/message\.content === '' && !message\.done && !message\.error/,
		'ResponseMessage should have an explicit loading branch for empty unfinished assistant messages'
	);
	assert.doesNotMatch(
		responseMessage,
		/message\.content === '' && !message\.done && !message\.error && !hasVisibleStatus/,
		'The loading shimmer must not disappear during buffered tool/evidence turns that expose status'
	);
	assert.match(
		responseMessage,
		/class="[^"]*shimmer[^"]*"/,
		'Generating assistant messages should use the shared animated text-gradient shimmer'
	);
});

test('source tray keeps favicon chips and source count visible', () => {
	const citations = readFileSync('src/lib/components/chat/Messages/Citations.svelte', 'utf8');

	assert.match(
		citations,
		/https:\/\/www\.google\.com\/s2\/favicons\?sz=32&domain=\{citation\.source\.name\}/,
		'URL citations should render favicon chips for the source tray'
	);
	assert.match(
		citations,
		/urlCitations\.slice\(0, 3\)/,
		'The source tray should show up to three favicon chips before the count overflow'
	);
	assert.match(
		citations,
		/\{\$i18n\.t\('\{\{COUNT\}\} Sources'/,
		'The source tray should keep the visible N Sources count'
	);
});
