import { describe, expect, test } from 'vitest';

import { filterBySurface } from './surfaceScope';

describe('filterBySurface', () => {
	test('Desk only includes desk-tagged items', () => {
		const items = [
			{ id: 'desk', meta: { surface: 'desk' } },
			{ id: 'chat', meta: { surface: 'chat' } },
			{ id: 'legacy' }
		];

		expect(filterBySurface(items, 'desk').map((item) => item.id)).toEqual(['desk']);
	});

	test('Chat includes chat-tagged and legacy untagged items', () => {
		const items = [
			{ id: 'desk', meta: { surface: 'desk' } },
			{ id: 'chat', meta: { surface: 'chat' } },
			{ id: 'legacy' },
			{ id: 'null-meta', meta: null }
		];

		expect(filterBySurface(items, 'chat').map((item) => item.id)).toEqual([
			'chat',
			'legacy',
			'null-meta'
		]);
	});

	test('returns an empty list for empty input', () => {
		expect(filterBySurface([], 'chat')).toEqual([]);
		expect(filterBySurface(null, 'desk')).toEqual([]);
	});
});
