import { describe, expect, test } from 'vitest';

import { formatDeskStatusLabel } from './deskStatus';

describe('ENOS Desk status presentation', () => {
	test('collapses base web-search site counts into a calm Desk label', () => {
		expect(
			formatDeskStatusLabel({
				action: 'web_search',
				description: 'Searched {{count}} sites',
				urls: ['https://a.test', 'https://b.test'],
				done: true
			})
		).toBe('Checked web');
	});

	test('turns raw tool ids into readable Desk labels', () => {
		expect(formatDeskStatusLabel({ action: 'enos_desk', description: 'web_search…' })).toBe(
			'Checking web'
		);
		expect(
			formatDeskStatusLabel({ action: 'enos_desk', description: 'read_file', done: true })
		).toBe('Read file');
	});
});
