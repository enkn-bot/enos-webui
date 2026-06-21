import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('unfinished empty assistant responses use base skeleton unless visible status is present', () => {
	const responseMessage = readFileSync(
		'src/lib/components/chat/Messages/ResponseMessage.svelte',
		'utf8'
	);

	assert.match(
		responseMessage,
		/message\.content === '' && !message\.done && !message\.error && !hasVisibleStatus/,
		'ResponseMessage should only show the base skeleton when there is no visible status'
	);
	assert.match(
		responseMessage,
		/<Skeleton modelId=\{message\.model\} \/>/,
		'Empty unfinished assistant messages should render the model-keyed Skeleton placeholder'
	);
	assert.doesNotMatch(
		responseMessage,
		/class="[^"]*shimmer[^"]*"/,
		'ResponseMessage should not add a second textual thinking layer'
	);
	assert.doesNotMatch(responseMessage, /Thinking…|Thinking\.\.\./, 'Thinking copy should not be rendered');
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
