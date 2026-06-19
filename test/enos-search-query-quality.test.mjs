import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const config = readFileSync('backend/open_webui/config.py', 'utf8');

test('query generation prompt resolves referents before web search', () => {
	assert.match(
		config,
		/resolve pronouns and deictic references/i,
		'query generation must resolve "this/that/he/she/they" from chat context before searching'
	);
	assert.match(
		config,
		/quote exact person names/i,
		'query generation must preserve exact person names for search relevance'
	);
});
