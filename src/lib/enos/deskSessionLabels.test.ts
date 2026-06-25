import { describe, expect, test } from 'vitest';

import { deskSurfaceLabel } from './deskSessionLabels';

describe('deskSurfaceLabel', () => {
	test('uses session language on Desk', () => {
		expect(deskSurfaceLabel('new', 'desk')).toBe('New Session');
		expect(deskSurfaceLabel('collection', 'desk')).toBe('Sessions');
		expect(deskSurfaceLabel('empty', 'desk')).toBe('No sessions yet');
		expect(deskSurfaceLabel('rename', 'desk')).toBe('Rename session');
	});

	test('keeps chat language on Chat', () => {
		expect(deskSurfaceLabel('new', 'chat')).toBe('New Chat');
		expect(deskSurfaceLabel('collection', 'chat')).toBe('Chats');
		expect(deskSurfaceLabel('empty', 'chat')).toBe('No chats found');
		expect(deskSurfaceLabel('rename', 'chat')).toBe('Rename chat');
	});
});
