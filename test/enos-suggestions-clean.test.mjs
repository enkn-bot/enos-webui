import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Suggested prompt heading renders without a leading lightning icon', () => {
	const suggestions = readFileSync('src/lib/components/chat/Suggestions.svelte', 'utf8');

	assert.match(suggestions, /\$i18n\.t\('Suggested'\)/, 'Suggestions should still show the heading');
	assert.doesNotMatch(
		suggestions,
		/import Bolt from '\$lib\/components\/icons\/Bolt\.svelte'/,
		'Suggestions should not import the lightning icon'
	);
	assert.doesNotMatch(
		suggestions,
		/<Bolt\s*\/>/,
		'Suggestions should not render the lightning icon before the heading'
	);
});
