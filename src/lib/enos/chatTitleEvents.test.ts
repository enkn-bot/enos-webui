import { describe, expect, test } from 'vitest';

import { normalizeChatTitleEventData } from './chatTitleEvents';

describe('chat title event handling', () => {
	test('accepts string title event payloads', () => {
		expect(normalizeChatTitleEventData('FIFA World Cup matches')).toBe(
			'FIFA World Cup matches'
		);
	});

	test('accepts object title event payloads', () => {
		expect(normalizeChatTitleEventData({ title: 'FIFA World Cup matches' })).toBe(
			'FIFA World Cup matches'
		);
	});

	test('drops empty title payloads', () => {
		expect(normalizeChatTitleEventData('   ')).toBe('');
		expect(normalizeChatTitleEventData({ title: '' })).toBe('');
		expect(normalizeChatTitleEventData({})).toBe('');
	});
});
