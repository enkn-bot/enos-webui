import { describe, expect, test } from 'vitest';

import { filterBySurface, filterChatsBySurface } from './surfaceScope';

describe('filterBySurface', () => {
	test('Desk only includes desk-tagged items', () => {
		const items = [
			{ id: 'desk', meta: { surface: 'desk' } },
			{ id: 'chat', meta: { surface: 'chat' } },
			{ id: 'legacy' }
		];

		expect(filterBySurface(items, 'desk').map((item) => item.id)).toEqual(['desk']);
	});

	test('Desk can include legacy projects explicitly adopted from local folder bindings', () => {
		const items = [
			{ id: 'desk', meta: { surface: 'desk' } },
			{ id: 'chat', meta: { surface: 'chat' } },
			{ id: 'bound-legacy' },
			{ id: 'plain-legacy' }
		];

		expect(
			filterBySurface(items, 'desk', { legacyDeskItemIds: ['bound-legacy'] }).map(
				(item) => item.id
			)
		).toEqual(['desk', 'bound-legacy']);
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

describe('filterChatsBySurface (legacy fallback, no chat vanishes)', () => {
	const chats = [
		{ id: 'tagged-desk', meta: { surface: 'desk' } },
		{ id: 'tagged-chat', meta: { surface: 'chat' } },
		{ id: 'loose-untagged' }, // no folder, no tag
		{ id: 'untagged-in-desk-folder', folder_id: 'fDesk' },
		{ id: 'untagged-in-chat-folder', folder_id: 'fChat' }
	];
	const deskFolderIds = ['fDesk'];

	test('desk surface: tagged-desk + untagged chats inside desk folders', () => {
		expect(filterChatsBySurface(chats, 'desk', deskFolderIds).map((c) => c.id)).toEqual([
			'tagged-desk',
			'untagged-in-desk-folder'
		]);
	});

	test('chat surface: tagged-chat + loose untagged + untagged in non-desk folders', () => {
		expect(filterChatsBySurface(chats, 'chat', deskFolderIds).map((c) => c.id)).toEqual([
			'tagged-chat',
			'loose-untagged',
			'untagged-in-chat-folder'
		]);
	});

	test('every chat appears on exactly one surface (never vanishes, never duplicated)', () => {
		const onDesk = new Set(filterChatsBySurface(chats, 'desk', deskFolderIds).map((c) => c.id));
		const onChat = new Set(filterChatsBySurface(chats, 'chat', deskFolderIds).map((c) => c.id));
		for (const c of chats) {
			expect(onDesk.has(c.id) !== onChat.has(c.id)).toBe(true); // XOR: exactly one
		}
	});

	test('empty / null input', () => {
		expect(filterChatsBySurface([], 'desk', [])).toEqual([]);
		expect(filterChatsBySurface(null, 'chat')).toEqual([]);
	});
});
