import { describe, expect, test } from 'vitest';

import { deskChatTitleLabel, deskTitlePathLabel } from './deskTitle';

describe('desk title labels', () => {
	test('uses project/chat path when the chat belongs to a project', () => {
		expect(deskTitlePathLabel({ projectName: 'Codex', chatName: 'FIFA World Cup matches' })).toBe(
			'Codex / FIFA World Cup matches'
		);
	});

	test('uses only the chat title for no-project chats', () => {
		expect(deskTitlePathLabel({ projectName: '', chatName: 'New Chat' })).toBe('New Chat');
	});

	test('normalizes chat title sources before falling back', () => {
		expect(
			deskChatTitleLabel({
				title: ' ',
				chatTitle: ' Initial Assistant Greeting ',
				fallback: 'New Chat'
			})
		).toBe('Initial Assistant Greeting');
	});
});
