import { describe, expect, test } from 'vitest';

import {
	DESK_CHATS_GROUP_NAME,
	isLooseDeskChat,
	looseDeskChats,
	showDeskChatsGroup
} from './deskLooseChats';

describe('deskLooseChats — native Chats group', () => {
	test('the group is named "Chats"', () => {
		expect(DESK_CHATS_GROUP_NAME).toBe('Chats');
	});

	test('a folder-less, desk-tagged chat is a loose Desk chat', () => {
		expect(isLooseDeskChat({ folder_id: null, meta: { surface: 'desk' } })).toBe(true);
		expect(isLooseDeskChat({ meta: { surface: 'desk' } })).toBe(true); // folder_id absent == null
	});

	test('a chat in a project (folder_id set) is NOT loose', () => {
		expect(isLooseDeskChat({ folder_id: 'f1', meta: { surface: 'desk' } })).toBe(false);
	});

	test('a folder-less chat WITHOUT the desk tag is not a loose Desk chat (it is Chat-surface)', () => {
		expect(isLooseDeskChat({ folder_id: null })).toBe(false);
		expect(isLooseDeskChat({ folder_id: null, meta: { surface: 'chat' } })).toBe(false);
	});

	test('looseDeskChats filters the list', () => {
		const chats = [
			{ id: 'a', folder_id: null, meta: { surface: 'desk' } },
			{ id: 'b', folder_id: 'proj', meta: { surface: 'desk' } },
			{ id: 'c', folder_id: null, meta: { surface: 'chat' } },
			{ id: 'd', folder_id: null, meta: { surface: 'desk' } }
		];
		expect(looseDeskChats(chats).map((c) => c.id)).toEqual(['a', 'd']);
	});

	test('the group shows only when it holds a loose Desk chat (conditional visibility)', () => {
		expect(showDeskChatsGroup([])).toBe(false);
		expect(showDeskChatsGroup([{ folder_id: 'proj', meta: { surface: 'desk' } }])).toBe(false);
		expect(showDeskChatsGroup([{ folder_id: null, meta: { surface: 'desk' } }])).toBe(true);
	});
});
